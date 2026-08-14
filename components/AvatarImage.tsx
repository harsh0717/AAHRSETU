'use client';
import { useState, useEffect } from 'react';
import { getSession } from '@/lib/auth';

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
  const [displayName, setDisplayName] = useState<string | null>(name ?? null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadAvatar = () => {
      const activeUser = getSession();
      // Only show avatar if this component is for the currently logged-in user
      const isCurrentUser = !userId || userId === activeUser?.id;
      if (!isCurrentUser || !activeUser) {
        setAvatarUrl(null);
        return;
      }

      setDisplayName(activeUser.name || name || null);

      if (activeUser.avatar_url) {
        const version = activeUser.avatar_version || 1;
        // Cache-bust with version number so browser fetches updated photo
        const url = activeUser.avatar_url.startsWith('http')
          ? `${activeUser.avatar_url}?v=${version}`
          : `${activeUser.avatar_url}?v=${version}`;
        setAvatarUrl(url);
      } else {
        setAvatarUrl(null);
      }
    };

    loadAvatar();

    // Listen for profile updates dispatched by auth.ts and useWebSocket.ts
    const handleProfileChange = () => loadAvatar();
    window.addEventListener('aharsetu_profile_changed', handleProfileChange);
    window.addEventListener('focus', handleProfileChange);

    return () => {
      window.removeEventListener('aharsetu_profile_changed', handleProfileChange);
      window.removeEventListener('focus', handleProfileChange);
    };
  }, [userId, name]);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName || 'User Avatar'}
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
        onError={() => setAvatarUrl(null)}
      />
    );
  }

  const initial = (displayName || name)?.[0]?.toUpperCase() || '?';

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
