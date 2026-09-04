import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Trash2, Building, Smartphone, Banknote, PiggyBank, RefreshCw, AlertCircle } from 'lucide-react';
import { contasApi } from '../api/financas';
import type { Conta, TipoConta, MoedaConta } from '../types';

interface ContasViewProps {
  onContaAlterada?: () => void;
}

export const ContasView: React.FC<ContasViewProps> = ({ onContaAlterada }) => {
  const [contas, setContas] = useState<Conta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoConta>('banco');
  const [moeda, setMoeda] = useState<MoedaConta>('AOA');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarContas();
  }, []);

  async function carregarContas() {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await contasApi.listar();
      setContas(dados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar contas');
    } finally {
      setCarregando(false);
    }
  }

  async function handleCriarConta(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;

    setSalvando(true);
    try {
      await contasApi.criar({ nome: nome.trim(), tipo, moeda });
      setNome('');
      await carregarContas();
      onContaAlterada?.();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemover(id: string) {
    if (!confirm('Tem a certeza que deseja remover esta conta?')) return;
    try {
      await contasApi.remover(id);
      setContas((prev) => prev.filter((c) => c.id !== id));
      onContaAlterada?.();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao remover conta');
    }
  }

  const getIconeTipo = (t: TipoConta) => {
    switch (t) {
      case 'banco':
        return <Building size={20} className="text-blue-500" />;
      case 'carteira_movel':
        return <Smartphone size={20} className="text-emerald-500" />;
      case 'dinheiro_fisico':
        return <Banknote size={20} className="text-amber-500" />;
      case 'poupanca':
        return <PiggyBank size={20} className="text-purple-500" />;
      default:
        return <Wallet size={20} className="text-slate-500" />;
    }
  };

  const getNomeTipo = (t: TipoConta) => {
    switch (t) {
      case 'banco':
        return 'Conta Bancária';
      case 'carteira_movel':
        return 'Carteira Móvel (Unitel Money / M-Pesa)';
      case 'dinheiro_fisico':
        return 'Dinheiro Físico';
      case 'poupanca':
        return 'Conta Poupança / Reserva';
      default:
        return t;
    }
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="flex items-center gap-2">
          <Wallet className="text-primary" size={24} />
          <h2>Gestão de Contas & Carteiras</h2>
        </div>
        <button onClick={carregarContas} className="btn-secondary" title="Atualizar">
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
            <Plus size={18} className="text-primary" /> Nova Conta
          </h3>
          <form onSubmit={handleCriarConta} className="despesa-form">
            <label>
              Nome da Conta / Banco
              <input
                type="text"
                placeholder="Ex: BAI Ordem, Unitel Money, Carteira..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </label>

            <label>
              Tipo de Conta
              <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoConta)}>
                <option value="banco">🏦 Conta Bancária</option>
                <option value="carteira_movel">📱 Carteira Móvel</option>
                <option value="dinheiro_fisico">💵 Dinheiro Físico (Espécie)</option>
                <option value="poupanca">🐷 Poupança / Reserva</option>
              </select>
            </label>

            <label>
              Moeda
              <select value={moeda} onChange={(e) => setMoeda(e.target.value as MoedaConta)}>
                <option value="AOA">Kwanza (AOA)</option>
                <option value="USD">Dólar Americano (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </label>

            <button type="submit" className="btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Adicionar Conta'}
            </button>
          </form>
        </section>

        {/* Listagem de Contas */}
        <section className="card list-card">
          <h3>Suas Contas Ativas ({contas.length})</h3>

          {carregando ? (
            <div className="empty-state">Carregando contas...</div>
          ) : contas.length === 0 ? (
            <div className="empty-state">Nenhuma conta cadastrada. Crie a sua primeira conta ao lado!</div>
          ) : (
            <div className="contas-grid">
              {contas.map((c) => (
                <div key={c.id} className="conta-item-card">
                  <div className="conta-header">
                    <div className="conta-icone-badge">{getIconeTipo(c.tipo)}</div>
                    <div>
                      <h4 className="conta-nome">{c.nome}</h4>
                      <span className="conta-tipo-label">{getNomeTipo(c.tipo)}</span>
                    </div>
                  </div>

                  <div className="conta-saldo-box">
                    <span className="saldo-label">Saldo Atual</span>
                    <span className="saldo-valor">
                      {Number(c.saldoAtual || 0).toLocaleString('pt-AO', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      <small>{c.moeda}</small>
                    </span>
                  </div>

                  <button
                    onClick={() => handleRemover(c.id)}
                    className="btn-danger-ghost"
                    title="Remover conta"
                  >
                    <Trash2 size={16} /> Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
