'use client';
import { useState, useEffect } from 'react';

interface AvatarImageProps {
  userId?: number | string | null;
  name?: string | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function AvatarImage({
  userId,
  name,
  size = 32,
  className,
  style
}: AvatarImageProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;

    const loadAvatar = () => {
      const stored = localStorage.getItem(`aharsetu_avatar_${userId}`);
      if (stored) {
        setAvatarUrl(stored);
      } else {
        setAvatarUrl(null);
      }
    };

    loadAvatar();

    // Listen for avatar updates
    const handleAvatarUpdate = () => loadAvatar();
    window.addEventListener('aharsetu_avatar_changed', handleAvatarUpdate);
    return () => {
      window.removeEventListener('aharsetu_avatar_changed', handleAvatarUpdate);
    };
  }, [userId]);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'User Avatar'}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          ...style
        }}
        className={className}
      />
    );
  }

  const initial = name?.[0]?.toUpperCase() || '?';

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 800,
        fontSize: `${Math.max(12, size * 0.45)}px`,
        flexShrink: 0,
        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
        boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
        userSelect: 'none',
        ...style
      }}
      className={className}
    >
      {initial}
    </div>
  );
}
