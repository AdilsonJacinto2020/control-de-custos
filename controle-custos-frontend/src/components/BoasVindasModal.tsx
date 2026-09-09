import React from 'react';
import { CheckCircle2, X, ArrowRight, Shield } from 'lucide-react';
import { FinControlLogo } from './FinControlLogo';
import './BoasVindasModal.css';

interface BoasVindasModalProps {
  isOpen: boolean;
  userName: string;
  userEmail?: string;
  userPicture?: string;
  onClose: () => void;
}

export const BoasVindasModal: React.FC<BoasVindasModalProps> = ({
  isOpen,
  userName,
  userEmail,
  userPicture,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="boas-vindas-overlay">
      <div className="boas-vindas-backdrop" onClick={onClose} />
      <div className="boas-vindas-card">
        <button onClick={onClose} className="boas-vindas-close" aria-label="Fechar">
          <X size={18} />
        </button>

        <div className="boas-vindas-header">
          <div className="boas-vindas-logo">
            <FinControlLogo height={34} showSubtitle={false} />
          </div>
          <div className="boas-vindas-icon-badge">
            <CheckCircle2 size={24} className="text-emerald-500" />
          </div>
          <h3>Sessão Iniciada com Sucesso</h3>
          <p className="boas-vindas-subtitle">
            Bem-vindo ao FinControl AO, o seu sistema de controlo financeiro.
          </p>
        </div>

        <div className="boas-vindas-user-box">
          {userPicture ? (
            <img src={userPicture} alt={userName} className="boas-vindas-avatar" />
          ) : (
            <div className="boas-vindas-avatar-placeholder">{userName.charAt(0)}</div>
          )}
          <div className="boas-vindas-user-details">
            <span className="boas-vindas-name">{userName}</span>
            {userEmail && <span className="boas-vindas-email">{userEmail}</span>}
          </div>
        </div>

        <div className="boas-vindas-tips-box">
          <div className="boas-vindas-tip">
            <Shield size={16} className="text-brand flex-shrink-0" />
            <span>Dados financeiros isolados e protegidos com criptografia.</span>
          </div>
        </div>

        <div className="boas-vindas-footer">
          <button onClick={onClose} className="btn-primary w-full flex items-center justify-center gap-2">
            <span>Aceder ao Painel</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
