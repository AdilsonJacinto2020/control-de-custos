import React from 'react';

interface FinControlLogoProps {
  className?: string;
  height?: number;
  showSubtitle?: boolean;
}

export const FinControlLogo: React.FC<FinControlLogoProps> = ({
  className,
  height = 36,
  showSubtitle = false,
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className || ''}`}>
      {/* Ícone quadrado com cantos discretos e cauda de chat */}
      <svg
        height={height}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <polygon points="20,120 20,140 44,120" fill="var(--accent-brand, #FF4D2E)" />
        <rect x="0" y="0" width="120" height="120" rx="8" fill="var(--accent-brand, #FF4D2E)" />
        <rect x="28" y="78" width="12" height="32" fill="#FFFFFF" rx="1" />
        <rect x="52" y="58" width="12" height="52" fill="#FFFFFF" rx="1" />
        <rect x="76" y="32" width="12" height="78" fill="#FFFFFF" rx="1" />
      </svg>

      {/* Tipografia Industrial / Slate: FinControl + Badge AO */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <span
            style={{
              fontFamily: 'var(--font-display, "Space Grotesk", sans-serif)',
              fontSize: `${Math.round(height * 0.52)}px`,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary, #0f172a)',
              lineHeight: 1,
            }}
          >
            FinControl
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: `${Math.max(9, Math.round(height * 0.28))}px`,
              fontWeight: 600,
              border: '1.5px solid var(--accent-brand, #FF4D2E)',
              color: 'var(--accent-brand, #FF4D2E)',
              backgroundColor: 'transparent',
              padding: '1px 5px',
              borderRadius: '4px',
              lineHeight: 1.1,
            }}
          >
            AO
          </span>
        </div>
        {showSubtitle && (
          <span
            style={{
              fontFamily: 'var(--font-sans, "Inter", sans-serif)',
              fontSize: `${Math.max(8, Math.round(height * 0.23))}px`,
              color: 'var(--text-muted, #64748b)',
              letterSpacing: '0.01em',
              marginTop: '2px',
              lineHeight: 1,
            }}
          >
            Controlo financeiro para Angola
          </span>
        )}
      </div>
    </div>
  );
};
