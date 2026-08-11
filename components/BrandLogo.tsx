'use client';

export default function BrandLogo({
  size = 48,
  className,
  style
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', ...style }} className={className}>
      {/* Official AharSetu Graphic Logo Image */}
      <img
        src="/images/aharsetu_official_logo.png"
        alt="AharSetu Campus Canteen Platform"
        style={{
          height: `${size}px`,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))'
        }}
      />
    </div>
  );
}
