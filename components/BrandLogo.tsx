'use client';

// Aaharसेतु brand logo with IKS (Indian Knowledge System) inspired visual motifs
// Motifs: Concentric mandala geometry, 8-petal lotus (Aahar), Torana archways (Setu bridge)

export default function BrandLogo({
  size = 48,
  variant = 'full', // 'full' = icon + wordmark, 'icon' = icon only
  className,
  style,
  dark = false,
}: {
  size?: number;
  variant?: 'full' | 'icon';
  className?: string;
  style?: React.CSSProperties;
  dark?: boolean;
}) {
  const iconSize = size;
  const textColor = dark ? '#FFFFFF' : '#1E3A6F';
  
  const icon = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {/* Outer concentric geometric rings (IKS style dash-geometry) */}
      <circle cx="24" cy="24" r="22" stroke="url(#iksGoldGrad)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />
      <circle cx="24" cy="24" r="19" stroke="url(#iksBlueGrad)" strokeWidth="1" opacity="0.5" />
      
      {/* Torana/Setu Archways (Traditional Indian Arch Bridge Motif) */}
      <path d="M8 28 C 16 14, 32 14, 40 28" stroke="url(#iksGoldGrad)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M12 28 C 18 18, 30 18, 36 28" stroke="url(#iksBlueGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
      
      {/* Lotus Mandala Geometry (Purity, Nourishment, Traditional Knowledge Bindu) */}
      <circle cx="24" cy="24" r="2.5" fill="#D97706" />
      
      {/* 8 Lotus petals */}
      <path d="M24 24 Q21 16 24 12 Q27 16 24 24" fill="url(#iksGoldGrad)" opacity="0.9" />
      <path d="M24 24 Q21 32 24 36 Q27 32 24 24" fill="url(#iksGoldGrad)" opacity="0.9" />
      <path d="M24 24 Q16 21 12 24 Q16 27 24 24" fill="url(#iksGoldGrad)" opacity="0.9" />
      <path d="M24 24 Q32 21 36 24 Q32 27 24 24" fill="url(#iksGoldGrad)" opacity="0.9" />
      
      <path d="M24 24 Q17.5 17.5 15.5 15.5 Q22.5 17.5 24 24" fill="url(#iksGoldGrad)" opacity="0.75" />
      <path d="M24 24 Q30.5 30.5 32.5 32.5 Q25.5 30.5 24 24" fill="url(#iksGoldGrad)" opacity="0.75" />
      <path d="M24 24 Q17.5 30.5 15.5 32.5 Q22.5 30.5 24 24" fill="url(#iksGoldGrad)" opacity="0.75" />
      <path d="M24 24 Q30.5 17.5 32.5 15.5 Q25.5 17.5 24 24" fill="url(#iksGoldGrad)" opacity="0.75" />
      
      <defs>
        <linearGradient id="iksGoldGrad" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="iksBlueGrad" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', ...style }} className={className}>
        {icon}
      </div>
    );
  }

  const wordmarkSize = Math.round(size * 0.46);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.round(size * 0.18) + 'px',
        padding: '6px 14px',
        background: dark ? 'rgba(30, 41, 59, 0.45)' : 'rgba(255, 255, 255, 0.45)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: dark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.4)',
        borderRadius: '14px',
        boxShadow: dark ? '0 8px 32px 0 rgba(0, 0, 0, 0.2)' : '0 8px 32px 0 rgba(31, 38, 135, 0.05)',
        ...style
      }}
      className={className}
    >
      {icon}
      <span
        style={{
          fontSize: `${wordmarkSize}px`,
          fontWeight: 800,
          color: textColor,
          letterSpacing: '-0.01em',
          lineHeight: 1,
          fontFamily: "'Outfit', 'Inter', sans-serif",
          userSelect: 'none',
          display: 'inline-flex',
          alignItems: 'baseline',
        }}
      >
        Aahar
        <span
          style={{
            color: '#D97706',
            fontFamily: "'Noto Serif Devanagari', 'Noto Sans Devanagari', 'Mukta', 'Inter', sans-serif",
            fontWeight: 900,
            marginLeft: '2px',
          }}
        >
          सेतु
        </span>
      </span>
    </div>
  );
}
