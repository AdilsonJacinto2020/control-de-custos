import React, { useState } from 'react';
import { useLoaderData, useRevalidator } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  Loader2,
  Trash2,
  Calendar,
  ListOrdered,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { transacoesApi } from '../api/financas';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import type {
  DashboardData,
  Conta,
  CategoriaItem,
  TipoTransacao,
  FonteRendimento,
  EspacoPartilhadoItem,
} from '../types';

interface DashboardLoaderData {
  dashboard: DashboardData;
  contas: Conta[];
  categorias: CategoriaItem[];
  fontes?: FonteRendimento[];
  espacos?: EspacoPartilhadoItem[];
  mes: string;
  ano: string;
}

const hoje = () => new Date().toISOString().slice(0, 10);

export function DashboardPage() {
  const {
    dashboard: initialDashboard,
    contas: initialContas,
    categorias: initialCategorias,
    fontes: initialFontes = [],
    espacos: initialEspacos = [],
    mes,
    ano,
  } = useLoaderData() as DashboardLoaderData;
  const revalidator = useRevalidator();
  const { recordActivity } = useAuth();

  const [mesFiltro, setMesFiltro] = useState(mes);
  const [anoFiltro, setAnoFiltro] = useState(ano);
  const [dashboard, setDashboard] = useState<DashboardData>(initialDashboard);
  const [contas] = useState<Conta[]>(initialContas);
  const [categorias] = useState<CategoriaItem[]>(initialCategorias);
  const [fontes] = useState<FonteRendimento[]>(initialFontes);
  const [espacos] = useState<EspacoPartilhadoItem[]>(initialEspacos);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Form de Lançamento
  const [tipo, setTipo] = useState<TipoTransacao>('despesa');
  const [contaId, setContaId] = useState(initialContas[0]?.id || '');
  const [contaDestinoId, setContaDestinoId] = useState('');
  const [categoriaId, setCategoriaId] = useState(initialCategorias[0]?.id || '');
  const [fonteRendimentoId, setFonteRendimentoId] = useState('');
  const [espacoPartilhadoId, setEspacoPartilhadoId] = useState('');
  const [divisaoConjunta, setDivisaoConjunta] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hoje());

  async function handleMudarPeriodo(novoMes: string, novoAno: string) {
    setMesFiltro(novoMes);
    setAnoFiltro(novoAno);
    setCarregando(true);
    setErro(null);
    try {
      const dados = await transacoesApi.obterDashboard(novoMes, novoAno);
      setDashboard(dados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar dados do dashboard');
    } finally {
      setCarregando(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valorNum = Number(valor);
    if (!descricao.trim() || !valorNum || valorNum <= 0 || !data || !contaId) {
      setErro('Preencha os campos obrigatórios e certifique-se de ter uma conta selecionada.');
      return;
    }

    if (tipo === 'transferencia_entre_contas' && (!contaDestinoId || contaDestinoId === contaId)) {
      setErro('Para transferência, selecione uma conta de destino diferente da de origem.');
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      await transacoesApi.criar({
        tipo,
        contaId,
        contaDestinoId: tipo === 'transferencia_entre_contas' ? contaDestinoId : undefined,
        categoriaId: tipo !== 'transferencia_entre_contas' ? (categoriaId || undefined) : undefined,
        fonteRendimentoId: tipo === 'receita' ? (fonteRendimentoId || undefined) : undefined,
        espacoPartilhadoId: espacoPartilhadoId || undefined,
        divisaoConjunta: espacoPartilhadoId ? divisaoConjunta : undefined,
        descricao: descricao.trim(),
        valor: valorNum,
        data,
      });

      setDescricao('');
      setValor('');
      setFonteRendimentoId('');
      setEspacoPartilhadoId('');
      setDivisaoConjunta(false);
      setData(hoje());
      recordActivity();
      revalidator.revalidate();
      const dados = await transacoesApi.obterDashboard(mesFiltro, anoFiltro);
      setDashboard(dados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar transação');
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover(id: string) {
    if (!confirm('Deseja excluir esta transação?')) return;
    try {
      await transacoesApi.remover(id);
      revalidator.revalidate();
      const dados = await transacoesApi.obterDashboard(mesFiltro, anoFiltro);
      setDashboard(dados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao remover transação');
    }
  }

  async function handleResetCiclo() {
    const confirmacao = window.confirm(
      '⚠️ ATENÇÃO: Deseja iniciar um NOVO CICLO?\n\nIsto irá apagar todas as transações e repor o saldo das suas contas a 0 Kz para que possa recomeçar do zero.\n\nTem a certeza que deseja continuar?'
    );
    if (!confirmacao) return;

    setCarregando(true);
    setErro(null);
    try {
      await transacoesApi.resetAll();
      revalidator.revalidate();
      const dados = await transacoesApi.obterDashboard(mesFiltro, anoFiltro);
      setDashboard(dados);
      alert('✅ Novo ciclo iniciado com sucesso! As transações anteriores foram limpas.');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao reiniciar o ciclo financeiro.');
    } finally {
      setCarregando(false);
    }
  }

  const formatarKz = (val: number) =>
    Number(val || 0).toLocaleString('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' Kz';

  const transacoesList = dashboard?.transacoes || [];

  return (
    <div className="space-y-6">
      {/* Seletor de Período e Métricas */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-primary" />
          <strong className="text-sm">Período de Análise:</strong>
          <select
            value={mesFiltro}
            onChange={(e) => handleMudarPeriodo(e.target.value, anoFiltro)}
            className="select-periodo"
          >
            <option value="01">Janeiro</option>
            <option value="02">Fevereiro</option>
            <option value="03">Março</option>
            <option value="04">Abril</option>
            <option value="05">Maio</option>
            <option value="06">Junho</option>
            <option value="07">Julho</option>
            <option value="08">Agosto</option>
            <option value="09">Setembro</option>
            <option value="10">Outubro</option>
            <option value="11">Novembro</option>
            <option value="12">Dezembro</option>
          </select>
          <select
            value={anoFiltro}
            onChange={(e) => handleMudarPeriodo(mesFiltro, e.target.value)}
            className="select-periodo"
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleMudarPeriodo(mesFiltro, anoFiltro)}
            className="btn-secondary flex items-center gap-1.5"
            title="Recarregar"
          >
            <RefreshCw size={14} className={carregando || revalidator.state === 'loading' ? 'spin' : ''} /> Atualizar
          </button>

          <button
            onClick={handleResetCiclo}
            className="btn-secondary !text-rose-600 hover:!bg-rose-500/10 flex items-center gap-1.5 text-xs font-medium"
            title="Limpar todos os dados e começar um novo ciclo do zero"
          >
            <Trash2 size={14} /> Novo Ciclo
          </button>
        </div>
      </div>

      <section className="stat-row">
        <StatCard
          icon={TrendingUp}
          label="Receitas do Mês"
          value={formatarKz(dashboard?.totalReceitas || 0)}
          hint="Entradas consolidadas"
        />
        <StatCard
          icon={TrendingDown}
          label="Despesas do Mês"
          value={formatarKz(dashboard?.totalDespesas || 0)}
          hint="Saídas consolidadas"
        />
        <StatCard
          icon={Wallet}
          label="Saldo do Período"
          value={formatarKz(dashboard?.saldoMes || 0)}
          hint={`${dashboard?.totalTransacoes || 0} lançamentos`}
        />
      </section>

      {/* Indicador de Confiança da Projeção Financeira (Ideia 4.3) */}
      <div className="card !p-3.5 flex items-center justify-between flex-wrap gap-3 bg-surface border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-sm">Confiança das Projeções & Fluxo de Caixa:</strong>
              <span className={`badge ${dashboard?.transacoes?.length >= 5 ? 'text-emerald-600 bg-emerald-500/10' : 'text-amber-600 bg-amber-500/10'}`}>
                {dashboard?.transacoes?.length >= 5 ? '🟢 Alta Confiança (Histórico Ativo)' : '🟡 Histórico em Construção'}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Cálculos baseados em médias móveis reais de 3 meses e conversão em tempo real sem números arbitrários.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Sparkles size={14} className="text-amber-500" />
          <span>Multi-Moeda (AOA / USD / EUR)</span>
        </div>
      </div>

      {erro && (
        <div className="alert-box error mb-4">
          <AlertCircle size={18} />
          <span>{erro}</span>
        </div>
      )}

      <div className="content">
        {/* Formulário de Novo Lançamento */}
        <section className="card form-card">
          <h2>
            <PlusCircle size={20} className="text-primary" /> Novo Lançamento
          </h2>

          <form onSubmit={handleSubmit} className="despesa-form">
            <label>
              Tipo de Operação
              <div className="tipo-btn-group">
                <button
                  type="button"
                  className={`tipo-btn ${tipo === 'despesa' ? 'active despesa' : ''}`}
                  onClick={() => setTipo('despesa')}
                >
                  Despesa (-)
                </button>
                <button
                  type="button"
                  className={`tipo-btn ${tipo === 'receita' ? 'active receita' : ''}`}
                  onClick={() => setTipo('receita')}
                >
                  Receita (+)
                </button>
                <button
                  type="button"
                  className={`tipo-btn ${tipo === 'transferencia_entre_contas' ? 'active transferencia' : ''}`}
                  onClick={() => setTipo('transferencia_entre_contas')}
                >
                  Transferência (⇄)
                </button>
              </div>
            </label>

            <div className="grid-2col gap-2">
              <label>
                {tipo === 'transferencia_entre_contas' ? 'Conta de Origem' : 'Conta'}
                <select
                  value={contaId}
                  onChange={(e) => setContaId(e.target.value)}
                  required
                >
                  {contas.length === 0 ? (
                    <option value="">Nenhuma conta cadastrada</option>
                  ) : (
                    contas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} ({c.moeda})
                      </option>
                    ))
                  )}
                </select>
              </label>

              {tipo === 'transferencia_entre_contas' ? (
                <label>
                  Conta de Destino
                  <select
                    value={contaDestinoId}
                    onChange={(e) => setContaDestinoId(e.target.value)}
                    required
                  >
                    <option value="">Selecione o destino</option>
                    {contas
                      .filter((c) => c.id !== contaId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} ({c.moeda})
                        </option>
                      ))}
                  </select>
                </label>
              ) : (
                <label>
                  Categoria
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                  >
                    <option value="">Sem categoria</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {/* Seletor de Fonte de Rendimento para Receitas */}
            {tipo === 'receita' && fontes.length > 0 && (
              <label>
                Fonte de Rendimento (Origem do Ganho)
                <select
                  value={fonteRendimentoId}
                  onChange={(e) => setFonteRendimentoId(e.target.value)}
                >
                  <option value="">Receita Avulsa / Geral</option>
                  {fontes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome} ({f.tipo === 'fixo' ? 'Salário/Fixo' : 'Variável/Biscate'} - {f.valorBase.toLocaleString('pt-AO')} {f.moeda})
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Seletor de Espaço Partilhado (divisão de contas) */}
            {espacos.length > 0 && tipo !== 'transferencia_entre_contas' && (
              <div className="espaco-partilhado-box border border-dashed border-border rounded-lg p-2.5 my-1 bg-surface">
                <label className="text-xs font-semibold mb-1 block">
                  Vincular a Espaço Partilhado (Opcional)
                  <select
                    value={espacoPartilhadoId}
                    onChange={(e) => setEspacoPartilhadoId(e.target.value)}
                    className="mt-1"
                  >
                    <option value="">Nenhum (Lançamento Pessoal)</option>
                    {espacos.map((esp) => (
                      <option key={esp.id} value={esp.id}>
                        👥 {esp.nome} ({esp.membros?.length || 0} membros)
                      </option>
                    ))}
                  </select>
                </label>

                {espacoPartilhadoId && (
                  <label className="flex items-center gap-2 text-xs text-primary font-medium mt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={divisaoConjunta}
                      onChange={(e) => setDivisaoConjunta(e.target.checked)}
                    />
                    <span>Esta despesa/receita entra no acerto conjunto de contas do grupo</span>
                  </label>
                )}
              </div>
            )}

            <label>
              Descrição
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Almoço, Salário mensal, Transferência Poupança..."
                required
              />
            </label>

            <div className="grid-2col gap-2">
              <label>
                Valor
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0.00"
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
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={enviando || contas.length === 0}
            >
              {enviando ? (
                <>
                  <Loader2 size={16} className="spin" /> Registando...
                </>
              ) : (
                'Registar Lançamento'
              )}
            </button>
          </form>
        </section>

        {/* Listagem e Distribuição */}
        <section className="card list-card">
          <h2>
            <ListOrdered size={20} className="text-primary" /> Histórico do Período
          </h2>

          {carregando ? (
            <div className="empty-state">
              <Loader2 size={24} className="spin text-primary" /> Carregando transações...
            </div>
          ) : transacoesList.length === 0 ? (
            <div className="empty-state">Nenhum lançamento registado neste mês.</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Tipo / Categoria</th>
                    <th>Valor</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {transacoesList.map((t) => {
                    const isReceita = t.tipo === 'receita';
                    const isTransf = t.tipo === 'transferencia_entre_contas';
                    const corValor = isReceita
                      ? 'text-emerald-500'
                      : isTransf
                      ? 'text-blue-500'
                      : 'text-red-500';
                    const sinal = isReceita ? '+' : isTransf ? '⇄' : '-';

                    return (
                      <tr key={t.id}>
                        <td className="text-xs text-muted whitespace-nowrap">
                          {new Date(t.data).toLocaleDateString('pt-AO')}
                        </td>
                        <td>
                          <strong>{t.descricao}</strong>
                        </td>
                        <td>
                          <span className="badge">
                            {isTransf
                              ? 'Transferência'
                              : isReceita
                              ? 'Receita'
                              : t.categoria?.nome || 'Despesa'}
                          </span>
                        </td>
                        <td className={`valor-cel ${corValor}`}>
                          {sinal} {Number(t.valor).toLocaleString('pt-AO')} {t.moeda || 'Kz'}
                        </td>
                        <td>
                          <button
                            onClick={() => handleRemover(t.id)}
                            className="remover"
                            title="Remover lançamento"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
