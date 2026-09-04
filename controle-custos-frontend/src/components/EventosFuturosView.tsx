import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, RefreshCw, AlertCircle, Sparkles, Check, Play, Pause } from 'lucide-react';
import { eventosFuturosApi } from '../api/financas';
import type { EventoFuturoItem, StatusEvento } from '../types';

export const EventosFuturosView: React.FC = () => {
  const [eventos, setEventos] = useState<EventoFuturoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [custoTotal, setCustoTotal] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState<{ descricao: string; valorEstimado: number }[]>([]);
  const [itemDesc, setItemDesc] = useState('');
  const [itemValor, setItemValor] = useState('');

  useEffect(() => {
    carregarEventos();
  }, []);

  async function carregarEventos() {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await eventosFuturosApi.listar();
      setEventos(dados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar eventos futuros');
    } finally {
      setCarregando(false);
    }
  }

  function handleAddItem() {
    const val = Number(itemValor);
    if (!itemDesc.trim() || !val || val <= 0) return;
    setItens((prev) => [...prev, { descricao: itemDesc.trim(), valorEstimado: val }]);
    setItemDesc('');
    setItemValor('');
  }

  function handleRemoverItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCriarEvento(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !dataInicio) return;

    const totalItens = itens.reduce((acc, curr) => acc + curr.valorEstimado, 0);
    const custoFinal = Number(custoTotal) || totalItens;

    try {
      await eventosFuturosApi.criar({
        nome: nome.trim(),
        dataInicioPrevista: dataInicio,
        custoTotalEstimado: custoFinal,
        observacoes: observacoes.trim() || undefined,
        itensCusto: itens.length > 0 ? itens : undefined,
      });

      setNome('');
      setDataInicio('');
      setCustoTotal('');
      setObservacoes('');
      setItens([]);
      await carregarEventos();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar evento');
    }
  }

  async function handleAlternarStatus(id: string, novoStatus: StatusEvento) {
    try {
      await eventosFuturosApi.alterarStatus(id, novoStatus);
      await carregarEventos();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao atualizar status do evento');
    }
  }

  async function handleRemover(id: string) {
    if (!confirm('Deseja excluir este evento?')) return;
    try {
      await eventosFuturosApi.remover(id);
      await carregarEventos();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao remover evento');
    }
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="flex items-center gap-2">
          <Calendar className="text-primary" size={24} />
          <h2>Eventos Futuros & Simulador de Cenários</h2>
        </div>
        <button onClick={carregarEventos} className="btn-secondary" title="Atualizar">
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
        {/* Formulário de Criação de Evento */}
        <section className="card form-card">
          <h3>
            <Sparkles size={18} className="text-primary" /> Simular Novo Evento de Vida
          </h3>
          <form onSubmit={handleCriarEvento} className="despesa-form">
            <label>
              Nome do Evento
              <input
                type="text"
                placeholder="Ex: Viagem de Férias, Reforma da Casa, Casamento..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </label>

            <div className="grid-2col gap-2">
              <label>
                Data Prevista
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  required
                />
              </label>

              <label>
                Custo Total Estimado (Kz)
                <input
                  type="number"
                  placeholder="Ex: 800000"
                  value={custoTotal}
                  onChange={(e) => setCustoTotal(e.target.value)}
                />
              </label>
            </div>

            {/* Subitens de custo */}
            <div className="itens-custo-box">
              <label className="text-sm font-semibold mb-1 block">Itens / Parcelas do Evento (Opcional)</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Item (Ex: Passagem)"
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  className="flex-1"
                />
                <input
                  type="number"
                  placeholder="Valor (Kz)"
                  value={itemValor}
                  onChange={(e) => setItemValor(e.target.value)}
                  style={{ width: '120px' }}
                />
                <button type="button" onClick={handleAddItem} className="btn-secondary btn-sm">
                  + Add
                </button>
              </div>

              {itens.length > 0 && (
                <div className="itens-list mb-2">
                  {itens.map((it, idx) => (
                    <div key={idx} className="item-sub-row">
                      <span>{it.descricao}</span>
                      <div className="flex items-center gap-2">
                        <strong>{it.valorEstimado.toLocaleString('pt-AO')} Kz</strong>
                        <button type="button" onClick={() => handleRemoverItem(idx)} className="btn-danger-ghost">
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label>
              Observações / Planeamento
              <textarea
                placeholder="Detalhes sobre a poupança necessária, fornecedores..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
              />
            </label>

            <button type="submit" className="btn-primary">
              <Plus size={16} /> Salvar Cenário de Simulação
            </button>
          </form>
        </section>

        {/* Listagem de Cenários */}
        <section className="card list-card">
          <h3>Seus Cenários & Simulações Ativas</h3>

          {carregando ? (
            <div className="empty-state">Carregando eventos...</div>
          ) : eventos.length === 0 ? (
            <div className="empty-state">
              Nenhum evento futuro cadastrado. Crie um cenário para prever seu impacto no caixa!
            </div>
          ) : (
            <div className="eventos-list">
              {eventos.map((ev) => (
                <div key={ev.id} className="evento-card-item">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="m-0 text-base">{ev.nome}</h4>
                      <span className="text-xs text-muted">
                        📅 {new Date(ev.dataInicioPrevista).toLocaleDateString('pt-AO')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`badge-status status-${ev.status}`}>
                        {ev.status === 'ativo' ? '⚡ Ativo na Projeção' : '💡 Apenas Planeado'}
                      </span>
                      <button onClick={() => handleRemover(ev.id)} className="btn-danger-ghost">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="text-sm font-bold text-primary mb-2">
                    Custo Total: {Number(ev.custoTotalEstimado || 0).toLocaleString('pt-AO')} Kz
                  </div>

                  {ev.observacoes && <p className="text-xs text-muted mb-3">{ev.observacoes}</p>}

                  {/* Ações de Estado */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-700/40">
                    {ev.status === 'planeado' ? (
                      <button
                        onClick={() => handleAlternarStatus(ev.id, 'ativo')}
                        className="btn-secondary btn-sm flex items-center gap-1 text-emerald-400"
                        title="Incluir este evento na simulação do fluxo de caixa"
                      >
                        <Play size={14} /> Ativar no Fluxo de Caixa
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAlternarStatus(ev.id, 'planeado')}
                        className="btn-secondary btn-sm flex items-center gap-1 text-amber-400"
                        title="Pausar impacto deste evento na projeção"
                      >
                        <Pause size={14} /> Pausar Simulação
                      </button>
                    )}

                    {ev.status !== 'concluido' && (
                      <button
                        onClick={() => handleAlternarStatus(ev.id, 'concluido')}
                        className="btn-secondary btn-sm flex items-center gap-1"
                      >
                        <Check size={14} /> Concluir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
