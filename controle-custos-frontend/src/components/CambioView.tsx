import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, RefreshCw, AlertCircle, Sliders, Globe, Check, Save } from 'lucide-react';
import { cambioApi } from '../api/financas';
import type { TaxaCambioItem } from '../types';
import './CambioView.css';

export const CambioView: React.FC = () => {
  const [taxas, setTaxas] = useState<TaxaCambioItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvoSucesso, setSalvoSucesso] = useState<string | null>(null);

  // Conversor rápido
  const [valorConverter, setValorConverter] = useState('100');
  const [deMoeda, setDeMoeda] = useState('USD');
  const [paraMoeda, setParaMoeda] = useState('AOA');
  const [resultadoConversao, setResultadoConversao] = useState<{
    valorConvertido: number;
    taxaUsada: number;
    tipoTaxa: 'oficial' | 'personalizada';
  } | null>(null);

  // Edição de Taxa Personalizada
  const [taxasCustom, setTaxasCustom] = useState<Record<string, string>>({});
  const [usarCustom, setUsarCustom] = useState<Record<string, boolean>>({});

  useEffect(() => {
    carregarTaxas();
  }, []);

  async function carregarTaxas() {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await cambioApi.obterTaxas();
      setTaxas(dados);

      const customMap: Record<string, string> = {};
      const activeMap: Record<string, boolean> = {};
      dados.forEach((t) => {
        customMap[t.par] = t.taxaPersonalizada ? String(t.taxaPersonalizada) : '';
        activeMap[t.par] = t.usarPersonalizada;
      });
      setTaxasCustom(customMap);
      setUsarCustom(activeMap);

      await handleConverter();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar taxas de câmbio');
    } finally {
      setCarregando(false);
    }
  }

  async function handleSalvarTaxa(t: TaxaCambioItem) {
    const val = Number(taxasCustom[t.par]);
    if (!val || val <= 0) return;

    try {
      await cambioApi.definirTaxaPersonalizada({
        moedaOrigem: t.origem,
        moedaDestino: t.destino,
        taxa: val,
        usarPersonalizada: usarCustom[t.par] ?? true,
      });
      setSalvoSucesso(t.par);
      setTimeout(() => setSalvoSucesso(null), 3000);
      await carregarTaxas();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar taxa personalizada');
    }
  }

  async function handleAlternarUsoCustom(t: TaxaCambioItem, ativo: boolean) {
    const val = Number(taxasCustom[t.par]) || t.taxaOficial;
    try {
      setUsarCustom((prev) => ({ ...prev, [t.par]: ativo }));
      await cambioApi.definirTaxaPersonalizada({
        moedaOrigem: t.origem,
        moedaDestino: t.destino,
        taxa: val,
        usarPersonalizada: ativo,
      });
      await carregarTaxas();
    } catch {
      // Erro silencioso
    }
  }

  async function handleConverter() {
    const val = Number(valorConverter);
    if (!val || val <= 0) return;

    try {
      const res = await cambioApi.converter(val, deMoeda, paraMoeda);
      setResultadoConversao(res);
    } catch {
      // Erro silencioso
    }
  }

  function handleInverterMoedas() {
    const temp = deMoeda;
    setDeMoeda(paraMoeda);
    setParaMoeda(temp);
  }

  useEffect(() => {
    handleConverter();
  }, [valorConverter, deMoeda, paraMoeda]);

  return (
    <div className="cambio-container">
      {/* Header Banner */}
      <div className="cambio-header-banner">
        <div className="cambio-header-title">
          <Globe className="text-primary" size={26} />
          <div>
            <h2>Câmbio Multi-Moeda (AOA / USD / EUR)</h2>
            <p>Conversões financeiras automáticas e cotações de mercado</p>
          </div>
        </div>
        <button onClick={carregarTaxas} className="btn-secondary" title="Atualizar cotações">
          <RefreshCw size={14} className={carregando ? 'spin' : ''} /> Atualizar
        </button>
      </div>

      {erro && (
        <div className="alert-box error">
          <AlertCircle size={18} />
          <span>{erro}</span>
        </div>
      )}

      {/* Bloco 1: Conversor Instantâneo */}
      <section className="card">
        <h2>
          <ArrowLeftRight size={18} className="text-primary" /> Conversor Instantâneo de Moedas
        </h2>

        <div className="conversor-grid">
          <div className="conversor-form-box">
            <div className="despesa-form">
              <label>
                Valor para Conversão
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={valorConverter}
                  onChange={(e) => setValorConverter(e.target.value)}
                  placeholder="Ex: 100"
                  required
                />
              </label>

              <div className="moedas-selectors-row">
                <div className="moeda-select-field">
                  <label>De (Origem)</label>
                  <select
                    value={deMoeda}
                    onChange={(e) => setDeMoeda(e.target.value)}
                  >
                    <option value="USD">USD - Dólar ($)</option>
                    <option value="EUR">EUR - Euro (€)</option>
                    <option value="AOA">AOA - Kwanza (Kz)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleInverterMoedas}
                  className="btn-swap-moedas"
                  title="Inverter Moedas"
                >
                  <ArrowLeftRight size={16} />
                </button>

                <div className="moeda-select-field">
                  <label>Para (Destino)</label>
                  <select
                    value={paraMoeda}
                    onChange={(e) => setParaMoeda(e.target.value)}
                  >
                    <option value="AOA">AOA - Kwanza (Kz)</option>
                    <option value="USD">USD - Dólar ($)</option>
                    <option value="EUR">EUR - Euro (€)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="resultado-conversao-card">
            <span className="resultado-label">Resultado Convertido</span>
            {resultadoConversao ? (
              <>
                <div className="resultado-valor-destaque">
                  {resultadoConversao.valorConvertido.toLocaleString('pt-AO', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  <span className="resultado-moeda-badge">{paraMoeda}</span>
                </div>
                <div className="resultado-meta-info">
                  <span className="badge">
                    Taxa {resultadoConversao.tipoTaxa}: {resultadoConversao.taxaUsada}
                  </span>
                  <span className="text-xs text-muted">
                    1 {deMoeda} = {resultadoConversao.taxaUsada} {paraMoeda}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-sm font-mono text-muted">Insira um valor válido...</span>
            )}
          </div>
        </div>
      </section>

      {/* Bloco 2: Gestão de Cotações (Oficiais vs Personalizadas do Mercado de Rua) */}
      <section className="card">
        <h2>
          <Sliders size={18} className="text-primary" /> Taxas de Referência & Mercado Próprio
        </h2>

        {carregando ? (
          <div className="empty-state">Carregando cotações...</div>
        ) : (
          <div className="cotacoes-cards-grid">
            {taxas.map((t) => {
              const isCustomActive = usarCustom[t.par];
              const isSaved = salvoSucesso === t.par;

              return (
                <div
                  key={t.par}
                  className={`cotacao-card-item ${isCustomActive ? 'custom-active' : ''}`}
                >
                  <div className="cotacao-card-top">
                    <div>
                      <div className="cotacao-par-title">{t.par}</div>
                      <div className="cotacao-oficial-info">
                        Taxa de Referência:{' '}
                        <strong className="cotacao-oficial-valor">
                          {t.taxaOficial.toLocaleString('pt-AO')}
                        </strong>
                      </div>
                      <div className="text-[10px] text-muted mt-0.5">
                        {t.fonteTaxaOficial || 'Mercado (open.er-api.com) — não é taxa BNA'}
                      </div>
                    </div>
                    <span className={`badge ${isCustomActive ? 'text-brand' : ''}`}>
                      {isCustomActive ? 'Mercado / Própria' : 'Referência'}
                    </span>
                  </div>

                  <div className="cotacao-card-inputs">
                    <label className="text-xs font-mono text-secondary">
                      Sua Cotação (Kinguila / Banco):
                    </label>
                    <div className="cotacao-custom-row">
                      <input
                        type="number"
                        step="any"
                        className="cotacao-input-styled"
                        placeholder={String(t.taxaOficial)}
                        value={taxasCustom[t.par] || ''}
                        onChange={(e) =>
                          setTaxasCustom((prev) => ({ ...prev, [t.par]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => handleSalvarTaxa(t)}
                        className="btn-secondary"
                        title="Gravar Cotação"
                      >
                        {isSaved ? <Check size={14} className="text-green-500" /> : <Save size={14} />}
                        <span>{isSaved ? 'Salvo' : 'Salvar'}</span>
                      </button>
                    </div>

                    <label className="toggle-switch-label">
                      <input
                        type="checkbox"
                        checked={isCustomActive || false}
                        onChange={(e) => handleAlternarUsoCustom(t, e.target.checked)}
                      />
                      <span>Aplicar esta taxa em todos os cálculos</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
