'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

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

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => setIsMobile(window.innerWidth <= 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  const actualSize = isMobile ? Math.min(size, 46) : size;

  if (variant === 'icon') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          width: actualSize,
          height: actualSize,
          overflow: 'hidden',
          flexShrink: 0,
          ...style,
        }}
        className={className}
      >
        <Image
          src="/images/logo.png"
          alt="AaharSetu Logo"
          width={actualSize * 3}
          height={actualSize}
          style={{
            width: actualSize * 3,
            height: actualSize,
            objectFit: 'cover',
            objectPosition: 'left center',
          }}
          priority
        />
      </div>
    );
  }

  const logoHeight = actualSize;
  const logoWidth = Math.round(logoHeight * 3.0);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 1,
        minWidth: 0,
        ...style,
      }}
      className={className}
    >
      <Image
        src="/images/logo.png"
        alt="AaharSetu — AAHAR सेतु"
        width={logoWidth}
        height={logoHeight}
        style={{
          width: logoWidth,
          height: logoHeight,
          objectFit: 'contain',
        }}
        priority
      />
    </div>
  );
}
