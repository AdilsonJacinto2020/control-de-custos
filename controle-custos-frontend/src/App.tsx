import { useEffect, useMemo, useState } from 'react';
import { despesasApi } from './api/despesas';
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
    const totais = new Map<string, number>();
    for (const d of despesas) {
      totais.set(d.categoria, (totais.get(d.categoria) ?? 0) + Number(d.valor));
    }
    return Array.from(totais.entries()).sort((a, b) => b[1] - a[1]);
  }, [despesas]);

  return (
    <div className="page">
      <header className="page-header">
        <h1>FinControl Engine</h1>
        <p>Controlo diário de despesas pessoais</p>
      </header>

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
              {enviando ? 'A guardar...' : 'Adicionar despesa'}
            </button>
          </form>
          {erro && <p className="erro">{erro}</p>}
        </section>

        <section className="card resumo-card">
          <h2>Resumo</h2>
          <p className="total-geral">
            Total: <strong>{formatoMoeda.format(totalGeral)}</strong>
          </p>
          <ul className="resumo-lista">
            {totalPorCategoria.map(([cat, total]) => (
              <li key={cat}>
                <span>{cat}</span>
                <span>{formatoMoeda.format(total)}</span>
              </li>
            ))}
            {totalPorCategoria.length === 0 && (
              <li className="vazio">Sem despesas registadas ainda.</li>
            )}
          </ul>
        </section>

        <section className="card lista-card">
          <h2>Despesas</h2>
          {carregando && <p>A carregar...</p>}
          {!carregando && despesas.length === 0 && (
            <p className="vazio">Nenhuma despesa registada.</p>
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
                      <span className="badge">{d.categoria}</span>
                    </td>
                    <td>{formatoMoeda.format(Number(d.valor))}</td>
                    <td>
                      <button
                        type="button"
                        className="remover"
                        onClick={() => handleRemover(d.id)}
                        aria-label={`Remover despesa ${d.descricao}`}
                      >
                        Remover
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
