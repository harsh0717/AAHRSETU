'use client';

// AharSetu brand logo — inline SVG, works at any size, no image file dependency
// Design: plate/orbit + fork = food + connection + campus identity

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
  const primaryColor = '#2563EB';
  const accentColor = '#1D4ED8';

  const icon = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Glassmorphism background circle */}
      <circle cx="24" cy="24" r="23" fill="url(#glassGrad)" stroke="url(#borderGrad)" strokeWidth="1.2" />
      {/* Inner plate orbit ring */}
      <ellipse cx="24" cy="28" rx="13" ry="4.5" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      {/* Plate arc */}
      <path d="M11 24 A13 10 0 0 1 37 24" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M13 26 A11 8 0 0 1 35 26" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
      {/* Fork */}
      <line x1="26.5" y1="11" x2="26.5" y2="22" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" />
      <line x1="24.5" y1="11" x2="24.5" y2="16" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28.5" y1="11" x2="28.5" y2="16" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round" />
      {/* Connection arc — "Setu" bridge concept */}
      <path d="M15 22 Q24 15 33 22" stroke={primaryColor} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
      <defs>
        <linearGradient id="glassGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EFF6FF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#DBEAFE" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="borderGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#BFDBFE" />
          <stop offset="100%" stopColor="#93C5FD" />
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

  const wordmarkSize = Math.round(size * 0.48);

  return (
    <div
      style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.22) + 'px', ...style }}
      className={className}
    >
      {icon}
      <span
        style={{
          fontSize: `${wordmarkSize}px`,
          fontWeight: 800,
          color: textColor,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          fontFamily: "'Outfit', 'Inter', sans-serif",
          userSelect: 'none',
        }}
      >
        Ahar<span style={{ color: primaryColor }}>Setu</span>
      </span>
    </div>
  );
}
