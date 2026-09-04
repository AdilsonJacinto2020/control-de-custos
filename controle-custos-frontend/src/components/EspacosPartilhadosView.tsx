import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, RefreshCw, AlertCircle, UserPlus, Calculator, ShieldCheck } from 'lucide-react';
import { espacosPartilhadosApi } from '../api/financas';
import type { EspacoPartilhadoItem, ResumoAcertosEspaco, PapelEspaco } from '../types';

export const EspacosPartilhadosView: React.FC = () => {
  const [espacos, setEspacos] = useState<EspacoPartilhadoItem[]>([]);
  const [espacoSelecionado, setEspacoSelecionado] = useState<EspacoPartilhadoItem | null>(null);
  const [acertos, setAcertos] = useState<ResumoAcertosEspaco | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Form Criar Espaço
  const [nomeEspaco, setNomeEspaco] = useState('');
  const [descricaoEspaco, setDescricaoEspaco] = useState('');

  // Form Adicionar Membro
  const [emailMembro, setEmailMembro] = useState('');
  const [papelMembro, setPapelMembro] = useState<PapelEspaco>('membro');
  const [percentual, setPercentual] = useState('50');

  useEffect(() => {
    carregarEspacos();
  }, []);

  useEffect(() => {
    if (espacoSelecionado) {
      carregarAcertos(espacoSelecionado.id);
    }
  }, [espacoSelecionado]);

  async function carregarEspacos() {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await espacosPartilhadosApi.listar();
      setEspacos(dados);
      if (dados.length > 0 && !espacoSelecionado) {
        setEspacoSelecionado(dados[0]);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar espaços partilhados');
    } finally {
      setCarregando(false);
    }
  }

  async function carregarAcertos(id: string) {
    try {
      const dados = await espacosPartilhadosApi.obterAcertos(id);
      setAcertos(dados);
    } catch {
      // Erro silencioso
    }
  }

  async function handleCriarEspaco(e: React.FormEvent) {
    e.preventDefault();
    if (!nomeEspaco.trim()) return;

    try {
      const novo = await espacosPartilhadosApi.criar({
        nome: nomeEspaco.trim(),
        descricao: descricaoEspaco.trim() || undefined,
      });
      setNomeEspaco('');
      setDescricaoEspaco('');
      await carregarEspacos();
      setEspacoSelecionado(novo);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar espaço partilhado');
    }
  }

  async function handleAdicionarMembro(e: React.FormEvent) {
    e.preventDefault();
    if (!espacoSelecionado || !emailMembro.trim()) return;

    try {
      await espacosPartilhadosApi.adicionarMembro(espacoSelecionado.id, {
        emailOuId: emailMembro.trim(),
        papel: papelMembro,
        percentualDivisaoPadrao: Number(percentual) || 50,
      });
      setEmailMembro('');
      const atualizado = await espacosPartilhadosApi.obter(espacoSelecionado.id);
      setEspacoSelecionado(atualizado);
      await carregarAcertos(espacoSelecionado.id);
      await carregarEspacos();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao adicionar membro ao espaço');
    }
  }

  async function handleRemoverEspaco(id: string) {
    if (!confirm('Deseja excluir este espaço partilhado?')) return;
    try {
      await espacosPartilhadosApi.remover(id);
      setEspacoSelecionado(null);
      await carregarEspacos();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao excluir espaço');
    }
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="flex items-center gap-2">
          <Users className="text-primary" size={24} />
          <h2>Espaços Partilhados (Casal & Família)</h2>
        </div>
        <button onClick={carregarEspacos} className="btn-secondary" title="Atualizar">
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
        {/* Bloco 1: Gestão de Espaços */}
        <div className="flex flex-col gap-4">
          <section className="card">
            <h3>
              <Plus size={18} className="text-primary" /> Criar Novo Espaço
            </h3>
            <form onSubmit={handleCriarEspaco} className="despesa-form">
              <label>
                Nome do Espaço
                <input
                  type="text"
                  placeholder="Ex: Finanças do Casal, Despesas da Casa..."
                  value={nomeEspaco}
                  onChange={(e) => setNomeEspaco(e.target.value)}
                  required
                />
              </label>

              <label>
                Descrição / Objetivo
                <input
                  type="text"
                  placeholder="Ex: Divisão de contas e mercado..."
                  value={descricaoEspaco}
                  onChange={(e) => setDescricaoEspaco(e.target.value)}
                />
              </label>

              <button type="submit" className="btn-primary">
                Criar Espaço
              </button>
            </form>
          </section>

          <section className="card">
            <h3>Meus Espaços ({espacos.length})</h3>
            {carregando ? (
              <div className="empty-state">Carregando espaços...</div>
            ) : espacos.length === 0 ? (
              <div className="empty-state">Nenhum espaço partilhado criado ainda.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {espacos.map((esp) => (
                  <div
                    key={esp.id}
                    onClick={() => setEspacoSelecionado(esp)}
                    className={`conta-item-card cursor-pointer ${
                      espacoSelecionado?.id === esp.id ? 'border-primary' : ''
                    }`}
                  >
                    <div>
                      <strong className="text-base">{esp.nome}</strong>
                      <span className="text-xs text-muted block">
                        {esp.membros?.length || 0} membros • {esp.descricao || 'Sem descrição'}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoverEspaco(esp.id);
                      }}
                      className="btn-danger-ghost"
                      title="Excluir espaço"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Bloco 2: Detalhes do Espaço & Divisão */}
        {espacoSelecionado ? (
          <section className="card">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="m-0 text-lg flex items-center gap-2">
                  <ShieldCheck size={20} className="text-emerald-500" /> {espacoSelecionado.nome}
                </h3>
                <p className="text-xs text-muted mt-1">{espacoSelecionado.descricao}</p>
              </div>
            </div>

            {/* Adicionar Membro */}
            <form onSubmit={handleAdicionarMembro} className="despesa-form mb-4 border-b border-border pb-4">
              <label>
                Convidar Membro (E-mail ou ID)
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="email@exemplo.com"
                    value={emailMembro}
                    onChange={(e) => setEmailMembro(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <button type="submit" className="btn-secondary flex items-center gap-1">
                    <UserPlus size={15} /> Convidar
                  </button>
                </div>
              </label>

              <div className="grid-2col gap-2 mt-2">
                <label>
                  Papel
                  <select
                    value={papelMembro}
                    onChange={(e) => setPapelMembro(e.target.value as PapelEspaco)}
                  >
                    <option value="membro">Membro</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </label>

                <label>
                  Divisão Padrão (%)
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={percentual}
                    onChange={(e) => setPercentual(e.target.value)}
                  />
                </label>
              </div>
            </form>

            {/* Membros e Acertos */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Calculator size={16} className="text-primary" /> Rateio e Divisão de Custos
              </h4>

              {acertos && (
                <div className="alert-box mb-3 bg-surface-hover text-xs">
                  <span>Divisão sugerida por membro: <strong>{acertos.divisaoSugeridaPercentual}</strong></span>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {espacoSelecionado.membros?.map((m) => (
                  <div key={m.id} className="categoria-item-row">
                    <div>
                      <strong>{m.usuario?.nome || 'Utilizador'}</strong>
                      <span className="text-xs text-muted block">
                        {m.usuario?.email || m.usuarioId} • <span className="capitalize">{m.papel}</span>
                      </span>
                    </div>

                    <span className="badge font-bold">
                      {m.percentualDivisaoPadrao}% da conta
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <div className="card flex items-center justify-center text-muted">
            Selecione ou crie um espaço partilhado para gerenciar os membros e a divisão.
          </div>
        )}
      </div>
    </div>
  );
};
