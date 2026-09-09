import React, { useState, useEffect } from 'react';
import { MessageSquare, Copy, Check, Clock, AlertCircle, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { usuariosApi } from '../api/financas';
import './VincularWhatsappModal.css';

interface VincularWhatsappModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VincularWhatsappModal: React.FC<VincularWhatsappModalProps> = ({ isOpen, onClose }) => {
  const [codigo, setCodigo] = useState<string | null>(null);
  const [expiraEm, setExpiraEm] = useState<Date | null>(null);
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      handleGerarCodigo();
    } else {
      setCodigo(null);
      setExpiraEm(null);
      setSegundosRestantes(0);
      setErro(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!expiraEm) return;

    const timer = setInterval(() => {
      const diff = Math.max(0, Math.floor((expiraEm.getTime() - Date.now()) / 1000));
      setSegundosRestantes(diff);
      if (diff <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiraEm]);

  async function handleGerarCodigo() {
    setCarregando(true);
    setErro(null);
    setCopiado(false);
    try {
      const res = await usuariosApi.gerarCodigoWhatsapp();
      setCodigo(res.codigo);
      const dataExp = new Date(res.expiraEm);
      setExpiraEm(dataExp);
      setSegundosRestantes(Math.max(0, Math.floor((dataExp.getTime() - Date.now()) / 1000)));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível gerar o código. Verifique o login.');
    } finally {
      setCarregando(false);
    }
  }

  function handleCopiarComando() {
    if (!codigo) return;
    const comando = `vincular ${codigo}`;
    navigator.clipboard.writeText(comando);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  }

  if (!isOpen) return null;

  const minutos = Math.floor(segundosRestantes / 60);
  const segundos = segundosRestantes % 60;
  const tempoFormatado = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  const expirado = segundosRestantes <= 0;

  return (
    <div className="whatsapp-modal-overlay">
      <div className="whatsapp-modal-backdrop" onClick={onClose} />
      <div className="whatsapp-modal-card">
        <button onClick={onClose} className="whatsapp-modal-close" aria-label="Fechar">
          <X size={20} />
        </button>

        <div className="whatsapp-modal-header">
          <div className="whatsapp-modal-icon-badge">
            <MessageSquare size={24} />
          </div>
          <h3>Vincular Conta ao WhatsApp</h3>
          <p>
            Ligue o seu número de WhatsApp ao FinControl para registar despesas e consultar saldos em tempo real pelo chat.
          </p>
        </div>

        {erro ? (
          <div className="alert-box error my-4">
            <AlertCircle size={18} />
            <span>{erro}</span>
          </div>
        ) : carregando ? (
          <div className="whatsapp-modal-loading">
            <RefreshCw size={24} className="spin text-emerald-500" />
            <span>A gerar código de verificação...</span>
          </div>
        ) : (
          <div className="whatsapp-modal-body">
            {expirado ? (
              <div className="whatsapp-expired-box">
                <Clock size={32} className="text-amber-500 mb-2" />
                <p className="font-semibold">O código anterior expirou</p>
                <p className="text-xs text-muted mb-3">Gere um novo código para concluir a vinculação com segurança.</p>
                <button onClick={handleGerarCodigo} className="btn-primary">
                  <RefreshCw size={16} /> Gerar Novo Código
                </button>
              </div>
            ) : (
              <>
                <div className="whatsapp-code-display">
                  <span className="whatsapp-code-digits">{codigo}</span>
                  <div className="whatsapp-timer-row">
                    <Clock size={14} className="text-muted" />
                    <span>Expira em: <strong>{tempoFormatado}</strong></span>
                  </div>
                </div>

                <div className="whatsapp-steps-box">
                  <h4>Instruções:</h4>
                  <ol>
                    <li>
                      Abra a conversa com o nosso <strong>Bot FinControl no WhatsApp</strong>.
                    </li>
                    <li>
                      Envie a mensagem exatamente como mostrado abaixo:
                    </li>
                  </ol>

                  <div className="whatsapp-command-box">
                    <code>vincular {codigo}</code>
                    <button
                      onClick={handleCopiarComando}
                      className="btn-copy-command"
                      title="Copiar comando"
                    >
                      {copiado ? (
                        <>
                          <Check size={14} className="text-emerald-500" />
                          <span className="text-emerald-500">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="whatsapp-security-hint">
                  <ShieldCheck size={16} className="text-emerald-500 flex-shrink-0" />
                  <span>
                    Após enviar o comando, o bot confirmará a ligação e todas as mensagens enviadas serão associadas à sua conta.
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <div className="whatsapp-modal-footer">
          <button onClick={onClose} className="btn-secondary w-full">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
