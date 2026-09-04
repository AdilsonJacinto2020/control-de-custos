import React, { useState, useEffect } from 'react';
import { Target, Plus, Trash2, RefreshCw, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { orcamentosApi, categoriasApi } from '../api/financas';
import type { StatusOrcamento, CategoriaItem, OrcamentoItem } from '../types';

export const OrcamentosView: React.FC = () => {
  const [statusOrcamentos, setStatusOrcamentos] = useState<StatusOrcamento[]>([]);
  const [orcamentos, setOrcamentos] = useState<OrcamentoItem[]>([]);
  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [categoriaId, setCategoriaId] = useState('');
  const [limiteMensal, setLimiteMensal] = useState('');
  const [alertaPercentual, setAlertaPercentual] = useState('80');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);
    setErro(null);
    try {
      const [status, orcList, cats] = await Promise.all([
        orcamentosApi.obterStatus(),
        orcamentosApi.listar(),
        categoriasApi.listar(),
      ]);
      setStatusOrcamentos(status);
      setOrcamentos(orcList);
      setCategorias(cats);
      if (cats.length > 0 && !categoriaId) {
        setCategoriaId(cats[0].id);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar orçamentos');
    } finally {
      setCarregando(false);
    }
  }

  async function handleCriarOrcamento(e: React.FormEvent) {
    e.preventDefault();
    const limiteNum = Number(limiteMensal);
    if (!categoriaId || !limiteNum || limiteNum <= 0) return;

    setSalvando(true);
    try {
      await orcamentosApi.criar({
        categoriaId,
        limiteMensal: limiteNum,
        alertaPercentual: Number(alertaPercentual) || 80,
      });
      setLimiteMensal('');
      await carregarDados();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar orçamento');
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemover(categoriaId: string) {
    const orc = orcamentos.find((o) => o.categoriaId === categoriaId);
    if (!orc) return;
    if (!confirm('Deseja excluir este teto orçamentário?')) return;

    try {
      await orcamentosApi.remover(orc.id);
      await carregarDados();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao remover orçamento');
    }
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="flex items-center gap-2">
          <Target className="text-primary" size={24} />
          <h2>Tetos Orçamentários Mensais</h2>
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

      <div className="grid-2col">
        {/* Formulário de Criação */}
        <section className="card form-card">
          <h3>
            <Plus size={18} className="text-primary" /> Definir Novo Teto Mensal
          </h3>
          <form onSubmit={handleCriarOrcamento} className="despesa-form">
            <label>
              Categoria
              <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Limite Mensal (Kz / Valor)
              <input
                type="number"
                min="1"
                step="any"
                placeholder="Ex: 50000"
                value={limiteMensal}
                onChange={(e) => setLimiteMensal(e.target.value)}
                required
              />
            </label>

            <label>
              Alerta ao Atingir (%)
              <input
                type="number"
                min="50"
                max="100"
                value={alertaPercentual}
                onChange={(e) => setAlertaPercentual(e.target.value)}
                required
              />
            </label>

            <button type="submit" className="btn-primary" disabled={salvando || categorias.length === 0}>
              {salvando ? 'Salvando...' : 'Definir Teto'}
            </button>
          </form>
        </section>

        {/* Listagem de Progresso de Orçamentos */}
        <section className="card list-card">
          <h3>Progresso dos Orçamentos do Mês</h3>

          {carregando ? (
            <div className="empty-state">Calculando consumos...</div>
          ) : statusOrcamentos.length === 0 ? (
            <div className="empty-state">
              Nenhum teto orçamentário configurado. Defina limites ao lado para monitorar seus gastos!
            </div>
          ) : (
            <div className="orcamentos-list">
              {statusOrcamentos.map((st) => {
                const percentual = Math.min(Math.round(st.percentualUsado || 0), 100);
                const corBarra = st.estourou
                  ? '#ef4444'
                  : st.emAlerta
                  ? '#f59e0b'
                  : '#10b981';

                return (
                  <div key={st.categoriaId} className="orcamento-card-item">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-base">{st.categoriaNome}</strong>
                        {st.estourou ? (
                          <span className="badge-danger flex items-center gap-1">
                            <AlertCircle size={12} /> Limite Ultrapassado
                          </span>
                        ) : st.emAlerta ? (
                          <span className="badge-warning flex items-center gap-1">
                            <AlertTriangle size={12} /> {st.percentualUsado}% Usado
                          </span>
                        ) : (
                          <span className="badge-success flex items-center gap-1">
                            <CheckCircle2 size={12} /> Sob Controle ({st.percentualUsado}%)
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemover(st.categoriaId)}
                        className="btn-danger-ghost"
                        title="Remover orçamento"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="orcamento-valores-row text-xs text-muted mb-2">
                      <span>
                        Gasto: <strong>{Number(st.gastoAtual || 0).toLocaleString('pt-AO')} Kz</strong>
                      </span>
                      <span>
                        Teto: <strong>{Number(st.limiteMensal || 0).toLocaleString('pt-AO')} Kz</strong>
                      </span>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${percentual}%`,
                          backgroundColor: corBarra,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
