import { useEffect, useMemo, useState } from 'react';
import {
  Wallet,
  Receipt,
  Trophy,
  Loader2,
  Inbox,
  Trash2,
  CircleAlert,
} from 'lucide-react';
import { despesasApi } from './api/despesas';
import { CategoriaBarChart } from './components/CategoriaBarChart';
import { StatCard } from './components/StatCard';
import { CATEGORIA_META } from './categoriaMeta';
import { CATEGORIAS, type Categoria, type Despesa } from './types';
import './App.css';

const hoje = () => new Date().toISOString().slice(0, 10);

const formatoMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function App() {
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
      <header className="page-header">
        <div className="page-header-icon">
          <Wallet size={26} strokeWidth={2.25} aria-hidden />
        </div>
        <div>
          <h1>FinControl Engine</h1>
          <p>Controlo diário de despesas pessoais</p>
        </div>
      </header>

      <section className="stat-row">
        <StatCard icon={Wallet} label="Total gasto" value={formatoMoeda.format(totalGeral)} />
        <StatCard
          icon={Receipt}
          label="Despesas registadas"
          value={String(despesas.length)}
        />
        <StatCard
          icon={Trophy}
          label="Maior categoria"
          value={categoriaTopo ? categoriaTopo[0] : '—'}
          hint={categoriaTopo ? formatoMoeda.format(categoriaTopo[1]) : undefined}
        />
      </section>

      <main className="content">
        <section className="card form-card">
          <h2>Nova despesa</h2>
          <form onSubmit={handleSubmit} className="despesa-form">
            <label>
              Descrição
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Almoço"
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
                  <Loader2 size={16} className="spin" aria-hidden /> A guardar...
                </>
              ) : (
                'Adicionar despesa'
              )}
            </button>
          </form>
          {erro && (
            <p className="erro">
              <CircleAlert size={15} aria-hidden /> {erro}
            </p>
          )}
        </section>

        <section className="card resumo-card">
          <h2>Gastos por categoria</h2>
          <CategoriaBarChart
            dados={totalPorCategoria}
            total={totalGeral}
            formatoMoeda={formatoMoeda}
          />
        </section>

        <section className="card lista-card">
          <h2>Despesas</h2>
          {carregando && (
            <p className="estado">
              <Loader2 size={16} className="spin" aria-hidden /> A carregar...
            </p>
          )}
          {!carregando && despesas.length === 0 && (
            <p className="estado vazio">
              <Inbox size={16} aria-hidden /> Nenhuma despesa registada.
            </p>
          )}
          {!carregando && despesas.length > 0 && (
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
                    <td>{d.descricao}</td>
                    <td>
                      {(() => {
                        const meta = CATEGORIA_META[d.categoria];
                        const Icon = meta.icon;
                        return (
                          <span
                            className="badge"
                            style={{ color: meta.cor, background: `color-mix(in srgb, ${meta.cor} 14%, transparent)` }}
                          >
                            <Icon size={13} strokeWidth={2.25} aria-hidden />
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
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
