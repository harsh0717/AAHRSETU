import Image from 'next/image';

// AaharSetu official brand logo — uses /images/logo.png

export default function BrandLogo({
  size = 48,
  variant = 'full',
  className,
  style,
  dark = false,
  language,
}: {
  size?: number;
  variant?: 'full' | 'icon';
  className?: string;
  style?: React.CSSProperties;
  dark?: boolean;
  language?: string;
}) {
  void dark; void language;

  if (variant === 'icon') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          width: size,
          height: size,
          maxWidth: '100%',
          overflow: 'hidden',
          flexShrink: 0,
          ...style,
        }}
        className={className}
      >
        <Image
          src="/images/logo.png"
          alt="AaharSetu Logo"
          width={size * 3}
          height={size}
          sizes={`${size * 3}px`}
          style={{
            width: size * 3,
            height: size,
            objectFit: 'cover',
            objectPosition: 'left center',
          }}
          priority
        />
      </div>
    );
  }

  const logoHeight = size;
  const logoWidth = Math.round(logoHeight * 3.0);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 1,
        minWidth: 0,
        maxWidth: '100%',
        ...style,
      }}
      className={className}
    >
      <Image
        src="/images/logo.png"
        alt="AaharSetu — AAHAR सेतु"
        width={logoWidth}
        height={logoHeight}
        sizes={`(max-width: 768px) ${Math.min(logoWidth, 140)}px, ${logoWidth}px`}
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
