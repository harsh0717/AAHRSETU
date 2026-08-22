import Image from 'next/image';

// AaharSetu official brand logo — uses transparent /images/logo.png with optional glassmorphism

export default function BrandLogo({
  size = 48,
  variant = 'full',
  className,
  style,
  dark = false,
  glass = false,
  language,
}: {
  size?: number;
  variant?: 'full' | 'icon';
  className?: string;
  style?: React.CSSProperties;
  dark?: boolean;
  glass?: boolean;
  language?: string;
}) {
  void dark; void language;

  const glassStyle: React.CSSProperties = glass
    ? {
        background: 'rgba(255, 255, 255, 0.22)',
        backdropFilter: 'blur(24px) saturate(200%)',
        WebkitBackdropFilter: 'blur(24px) saturate(200%)',
        borderRadius: '16px',
        padding: '6px 14px',
        border: '1px solid rgba(255, 255, 255, 0.45)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.16), 0 2px 4px rgba(0, 0, 0, 0.06), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
      }
    : {};

  if (variant === 'icon') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          maxWidth: '100%',
          overflow: 'hidden',
          flexShrink: 0,
          ...glassStyle,
          ...style,
        }}
        className={className}
      >
        <Image
          src="/icon.png"
          alt="AaharSetu Icon"
          width={size}
          height={size}
          sizes={`${size}px`}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            objectFit: 'contain',
          }}
          priority
        />
      </div>
    );
  }

  const logoHeight = size;
  const logoWidth = Math.round(logoHeight * 2.72);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 1,
        minWidth: 0,
        maxWidth: '100%',
        ...glassStyle,
        ...style,
      }}
      className={className}
    >
      <Image
        src="/images/logo.png"
        alt="AaharSetu — AAHAR सेतु"
        width={logoWidth}
        height={logoHeight}
        sizes={`(max-width: 768px) ${Math.min(logoWidth, 160)}px, ${logoWidth}px`}
        style={{
          width: 'auto',
          height: `${logoHeight}px`,
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
        priority
      />
    </div>
  );
}
