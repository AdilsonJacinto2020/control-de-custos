import { useEffect, useMemo, useState } from 'react';
import {
  Wallet,
  Receipt,
  Trophy,
  Loader2,
  Inbox,
  Trash2,
  CircleAlert,
  PlusCircle,
  PieChart,
  ListOrdered,
} from 'lucide-react';
import { despesasApi } from './api/despesas';
import { CategoriaBarChart } from './components/CategoriaBarChart';
import { StatCard } from './components/StatCard';
import { StreakBanner } from './components/StreakBanner';
import { Navbar } from './components/Navbar';
import { CATEGORIA_META } from './categoriaMeta';
import { CATEGORIAS, type Categoria, type Despesa } from './types';
import { useAuth } from './context/AuthContext';
import './App.css';

const hoje = () => new Date().toISOString().slice(0, 10);

const formatoMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function App() {
  const { recordActivity } = useAuth();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hoje());
  const [categoria, setCategoria] = useState<Categoria>(CATEGORIAS[0]);

  useEffect(() => {
    carregarDespesas();
  }, []);

  async function carregarDespesas() {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await despesasApi.listar();
      setDespesas(dados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar despesas');
    } finally {
      setCarregando(false);
    }
  }

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    const valorNumerico = Number(valor);
    if (!descricao.trim() || !valorNumerico || valorNumerico <= 0 || !data) {
      setErro('Preencha descrição, valor e data corretamente.');
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      await despesasApi.criar({
        descricao: descricao.trim(),
        valor: valorNumerico,
        data,
        categoria,
      });
      setDescricao('');
      setValor('');
      setData(hoje());
      setCategoria(CATEGORIAS[0]);
      recordActivity();
      await carregarDespesas();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao registar despesa');
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover(id: string) {
    try {
      await despesasApi.remover(id);
      setDespesas((atual) => atual.filter((d) => d.id !== id));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao remover despesa');
    }
  }

  const totalGeral = useMemo(
    () => despesas.reduce((soma, d) => soma + Number(d.valor), 0),
    [despesas],
  );

  const totalPorCategoria = useMemo(() => {
    const totais = new Map<Categoria, number>();
    for (const d of despesas) {
      totais.set(d.categoria, (totais.get(d.categoria) ?? 0) + Number(d.valor));
    }
    return Array.from(totais.entries()).sort((a, b) => b[1] - a[1]);
  }, [despesas]);

  const categoriaTopo = totalPorCategoria[0];

  return (
    <div className="page">
      <Navbar />

      <StreakBanner />

      <section className="stat-row">
        <StatCard icon={Wallet} label="Total Investido/Gasto" value={formatoMoeda.format(totalGeral)} />
        <StatCard
          icon={Receipt}
          label="Lançamentos no Mês"
          value={String(despesas.length)}
        />
        <StatCard
          icon={Trophy}
          label="Maior Volume"
          value={categoriaTopo ? categoriaTopo[0] : '—'}
          hint={categoriaTopo ? formatoMoeda.format(categoriaTopo[1]) : undefined}
        />
      </section>

      <main className="content">
        <section className="card form-card">
          <h2>
            <PlusCircle size={20} className="text-primary" /> Novo Lançamento
          </h2>
          <form onSubmit={handleSubmit} className="despesa-form">
            <label>
              Descrição do Gasto
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Almoço de negócios, Assinatura SaaS..."
                required
              />
            </label>

            <label>
              Valor (R$)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                required
              />
            </label>

            <label>
              Data
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </label>

            <label>
              Categoria
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as Categoria)}
              >
                {CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" disabled={enviando}>
              {enviando ? (
                <>
                  <Loader2 size={16} className="spin" aria-hidden /> Registrando...
                </>
              ) : (
                'Adicionar despesa (+XP)'
              )}
            </button>
          </form>
          {erro && (
            <p className="erro">
              <CircleAlert size={16} aria-hidden /> {erro}
            </p>
          )}
        </section>

        <section className="card resumo-card">
          <h2>
            <PieChart size={20} className="text-primary" /> Distribuição por Categoria
          </h2>
          <CategoriaBarChart
            dados={totalPorCategoria}
            total={totalGeral}
            formatoMoeda={formatoMoeda}
          />
        </section>

        <section className="card lista-card">
          <h2>
            <ListOrdered size={20} className="text-primary" /> Histórico de Despesas
          </h2>
          {carregando && (
            <div className="estado">
              <Loader2 size={20} className="spin" aria-hidden /> Carregando seus dados...
            </div>
          )}
          {!carregando && despesas.length === 0 && (
            <div className="estado vazio">
              <Inbox size={24} aria-hidden /> Nenhuma despesa encontrada. Crie a primeira para ganhar XP!
            </div>
          )}
          {!carregando && despesas.length > 0 && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th>Valor</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {despesas.map((d) => (
                    <tr key={d.id}>
                      <td>{new Date(`${d.data}T00:00:00`).toLocaleDateString('pt-BR')}</td>
                      <td><strong>{d.descricao}</strong></td>
                      <td>
                        {(() => {
                          const meta = CATEGORIA_META[d.categoria];
                          const Icon = meta.icon;
                          return (
                            <span
                              className="badge"
                              style={{ color: meta.cor, background: `color-mix(in srgb, ${meta.cor} 14%, transparent)` }}
                            >
                              <Icon size={14} strokeWidth={2.25} aria-hidden />
                              {d.categoria}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="valor-cel">{formatoMoeda.format(Number(d.valor))}</td>
                      <td>
                        <button
                          type="button"
                          className="remover"
                          onClick={() => handleRemover(d.id)}
                          aria-label={`Remover despesa ${d.descricao}`}
                          title="Remover despesa"
                        >
                          <Trash2 size={15} aria-hidden />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
