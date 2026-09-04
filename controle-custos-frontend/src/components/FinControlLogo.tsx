import React from 'react';

interface FinControlLogoProps {
  className?: string;
  height?: number;
}

export const FinControlLogo: React.FC<FinControlLogoProps> = ({ className, height = 36 }) => {
  return (
    <div className={`flex items-center gap-2.5 ${className || ''}`}>
      {/* Símbolo do Balão com Gráfico Ascendente */}
      <svg
        height={height}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <polygon points="18,138 18,160 48,138" fill="var(--text-primary)" />
        <rect x="0" y="18" width="120" height="120" rx="26" fill="var(--text-primary)" />
        <rect x="28" y="96" width="14" height="32" rx="3" fill="var(--bg-card)" />
        <rect x="52" y="76" width="14" height="52" rx="3" fill="var(--bg-card)" />
        <rect x="76" y="50" width="14" height="78" rx="3" fill="var(--bg-card)" />
        <circle cx="111" cy="32" r="15" fill="var(--accent-brand)" />
      </svg>

      {/* Tipografia da Marca com Badge AO */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: `${Math.round(height * 0.46)}px`,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              lineHeight: 1,
            }}
          >
            FinControl
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: `${Math.max(9, Math.round(height * 0.28))}px`,
              fontWeight: 700,
              backgroundColor: 'var(--accent-brand)',
              color: '#ffffff',
              padding: '1px 6px',
              borderRadius: '10px',
              lineHeight: 1.2,
            }}
          >
            AO
          </span>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: `${Math.max(8, Math.round(height * 0.23))}px`,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginTop: '2px',
          }}
        >
          Controlo Financeiro
        </span>
      </div>
    </div>
  );
};
