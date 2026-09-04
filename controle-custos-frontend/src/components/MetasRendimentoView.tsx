import React, { useState, useEffect } from 'react';
import { TrendingUp, PiggyBank, Plus, Trash2, RefreshCw, AlertCircle, Coins, LineChart } from 'lucide-react';
import { fontesRendimentoApi, metasPoupancaApi, projecaoApi } from '../api/financas';
import type { FonteRendimento, MetaPoupanca, PontoProjecao, TipoRendimento, PeriodicidadeRendimento, PrioridadeMeta } from '../types';

export const MetasRendimentoView: React.FC = () => {
  const [fontes, setFontes] = useState<FonteRendimento[]>([]);
  const [metas, setMetas] = useState<MetaPoupanca[]>([]);
  const [projecoes, setProjecoes] = useState<PontoProjecao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Form Fonte
  const [nomeFonte, setNomeFonte] = useState('');
  const [tipoFonte, setTipoFonte] = useState<TipoRendimento>('fixo');
  const [periodicidade, setPeriodicidade] = useState<PeriodicidadeRendimento>('mensal');
  const [valorFonte, setValorFonte] = useState('');

  // Form Meta
  const [nomeMeta, setNomeMeta] = useState('');
  const [valorAlvo, setValorAlvo] = useState('');
  const [prioridade, setPrioridade] = useState<PrioridadeMeta>('alta');
  const [contribuicaoValor, setContribuicaoValor] = useState<Record<string, string>>({});

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);
    setErro(null);
    try {
      const [fList, mList, proj] = await Promise.all([
        fontesRendimentoApi.listar(),
        metasPoupancaApi.listar(),
        projecaoApi.obterFluxoCaixa(6),
      ]);
      setFontes(fList);
      setMetas(mList);
      setProjecoes(proj.projecaoMeses || []);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar metas e projeções');
    } finally {
      setCarregando(false);
    }
  }

  async function handleCriarFonte(e: React.FormEvent) {
    e.preventDefault();
    const val = Number(valorFonte);
    if (!nomeFonte.trim() || !val || val <= 0) return;

    try {
      await fontesRendimentoApi.criar({
        nome: nomeFonte.trim(),
        tipo: tipoFonte,
        periodicidade,
        valorBase: val,
      });
      setNomeFonte('');
      setValorFonte('');
      await carregarDados();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar fonte de rendimento');
    }
  }

  async function handleCriarMeta(e: React.FormEvent) {
    e.preventDefault();
    const val = Number(valorAlvo);
    if (!nomeMeta.trim() || !val || val <= 0) return;

    try {
      await metasPoupancaApi.criar({
        nome: nomeMeta.trim(),
        valorAlvo: val,
        prioridade,
      });
      setNomeMeta('');
      setValorAlvo('');
      await carregarDados();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar meta de poupança');
    }
  }

  async function handleContribuir(metaId: string) {
    const val = Number(contribuicaoValor[metaId]);
    if (!val || val <= 0) return;

    try {
      await metasPoupancaApi.contribuir(metaId, val);
      setContribuicaoValor((prev) => ({ ...prev, [metaId]: '' }));
      await carregarDados();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao adicionar contribuição');
    }
  }

  async function handleRemoverMeta(id: string) {
    if (!confirm('Deseja excluir esta meta?')) return;
    try {
      await metasPoupancaApi.remover(id);
      await carregarDados();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao remover meta');
    }
  }

  async function handleRemoverFonte(id: string) {
    if (!confirm('Deseja excluir esta fonte de rendimento?')) return;
    try {
      await fontesRendimentoApi.remover(id);
      await carregarDados();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao remover fonte');
    }
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-primary" size={24} />
          <h2>Rendimentos, Projeção & Metas de Poupança</h2>
        </div>
        <button onClick={carregarDados} className="btn-secondary" title="Atualizar">
          <RefreshCw size={16} />
        </button>
      </div>

      {erro && (
        <div className="alert-box error">
          <AlertCircle size={18} />
          <span>{erro}</span>
        </div>
      )}

      {/* Projeção de Fluxo de Caixa (Timeline) */}
      <section className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <LineChart className="text-emerald-500" size={20} />
          <h3 className="m-0">Projeção de Fluxo de Caixa (Próximos 6 Meses)</h3>
        </div>

        {carregando ? (
          <div className="empty-state">Gerando projeção determinística...</div>
        ) : projecoes.length === 0 ? (
          <div className="empty-state">Cadastre fontes de rendimento para visualizar a projeção de saldo futuro.</div>
        ) : (
          <div className="projecao-timeline-grid">
            {projecoes.map((p, idx) => (
              <div key={idx} className="projecao-month-card">
                <div className="projecao-header">
                  <span className="month-tag">{p.mes}</span>
                  <span className="year-tag">{p.ano}</span>
                </div>
                <div className="projecao-saldo">
                  <small>Saldo Estimado</small>
                  <strong>{Number(p.saldoProjetado || 0).toLocaleString('pt-AO')} Kz</strong>
                </div>
                <div className="projecao-detalhes text-xs text-muted">
                  <span>+ {Number(p.receitasEsperadas || 0).toLocaleString('pt-AO')} Kz</span>
                  <span>- {Number(p.despesasEsperadas || 0).toLocaleString('pt-AO')} Kz</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid-2col">
        {/* Bloco 1: Fontes de Rendimento */}
        <section className="card">
          <h3>
            <Coins size={18} className="text-emerald-500" /> Fontes de Rendimento
          </h3>
          <form onSubmit={handleCriarFonte} className="despesa-form mb-4">
            <label>
              Descrição da Fonte
              <input
                type="text"
                placeholder="Ex: Salário Empresa, Consultoria, Renda..."
                value={nomeFonte}
                onChange={(e) => setNomeFonte(e.target.value)}
                required
              />
            </label>

            <div className="grid-2col gap-2">
              <label>
                Tipo
                <select value={tipoFonte} onChange={(e) => setTipoFonte(e.target.value as TipoRendimento)}>
                  <option value="fixo">Rendimento Fixo</option>
                  <option value="variavel">Rendimento Variável</option>
                </select>
              </label>

              <label>
                Periodicidade
                <select
                  value={periodicidade}
                  onChange={(e) => setPeriodicidade(e.target.value as PeriodicidadeRendimento)}
                >
                  <option value="mensal">Mensal</option>
                  <option value="quinzenal">Quinzenal</option>
                  <option value="semanal">Semanal</option>
                  <option value="esporadico">Esporádico</option>
                </select>
              </label>
            </div>

            <label>
              Valor Base Estimado (Kz)
              <input
                type="number"
                min="1"
                step="any"
                placeholder="Ex: 250000"
                value={valorFonte}
                onChange={(e) => setValorFonte(e.target.value)}
                required
              />
            </label>

            <button type="submit" className="btn-primary">
              <Plus size={16} /> Adicionar Rendimento
            </button>
          </form>

          <div className="fontes-list">
            {fontes.map((f) => (
              <div key={f.id} className="fonte-item-row">
                <div>
                  <strong>{f.nome}</strong>
                  <span className="text-xs text-muted block">
                    {f.tipo === 'fixo' ? 'Fixo' : 'Variável'} • {f.periodicidade}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-500 font-bold">
                    {Number(f.valorBase).toLocaleString('pt-AO')} Kz
                  </span>
                  <button onClick={() => handleRemoverFonte(f.id)} className="btn-danger-ghost">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bloco 2: Metas de Poupança */}
        <section className="card">
          <h3>
            <PiggyBank size={18} className="text-purple-500" /> Metas de Poupança
          </h3>
          <form onSubmit={handleCriarMeta} className="despesa-form mb-4">
            <label>
              Nome do Objetivo
              <input
                type="text"
                placeholder="Ex: Fundo de Emergência, Viagem, Carro..."
                value={nomeMeta}
                onChange={(e) => setNomeMeta(e.target.value)}
                required
              />
            </label>

            <div className="grid-2col gap-2">
              <label>
                Valor Alvo (Kz)
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="Ex: 500000"
                  value={valorAlvo}
                  onChange={(e) => setValorAlvo(e.target.value)}
                  required
                />
              </label>

              <label>
                Prioridade
                <select value={prioridade} onChange={(e) => setPrioridade(e.target.value as PrioridadeMeta)}>
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
              </label>
            </div>

            <button type="submit" className="btn-primary">
              <Plus size={16} /> Criar Meta
            </button>
          </form>

          <div className="metas-list">
            {metas.map((m) => {
              const perc = Math.min(
                Math.round(((m.valorAcumulado || 0) / (m.valorAlvo || 1)) * 100),
                100,
              );
              return (
                <div key={m.id} className="meta-card-item">
                  <div className="flex justify-between items-center mb-1">
                    <strong>{m.nome}</strong>
                    <button onClick={() => handleRemoverMeta(m.id)} className="btn-danger-ghost">
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="text-xs text-muted mb-2 flex justify-between">
                    <span>
                      Guardado: <strong>{Number(m.valorAcumulado || 0).toLocaleString('pt-AO')} Kz</strong>
                    </span>
                    <span>
                      Alvo: <strong>{Number(m.valorAlvo).toLocaleString('pt-AO')} Kz</strong> ({perc}%)
                    </span>
                  </div>

                  <div className="progress-bar-track mb-3">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${perc}%`, backgroundColor: '#a855f7' }}
                    />
                  </div>

                  {/* Depósito / Contribuição */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Valor p/ depositar..."
                      value={contribuicaoValor[m.id] || ''}
                      onChange={(e) =>
                        setContribuicaoValor((prev) => ({ ...prev, [m.id]: e.target.value }))
                      }
                      className="deposit-input"
                    />
                    <button
                      type="button"
                      onClick={() => handleContribuir(m.id)}
                      className="btn-secondary btn-sm"
                    >
                      Depositar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
