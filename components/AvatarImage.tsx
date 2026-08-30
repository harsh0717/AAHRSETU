'use client';
import { useState, useEffect } from 'react';
import { getSession, getSavedUsers } from '@/lib/auth';

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
      let targetUser = null;

      if (!userId || (activeUser && String(activeUser.id) === String(userId))) {
        targetUser = activeUser;
      } else if (userId) {
        const allUsers = getSavedUsers();
        targetUser = allUsers.find(u => String(u.id) === String(userId)) || null;
      }

      const resolvedName = targetUser?.name || name || activeUser?.name || null;
      setDisplayName(resolvedName);

      if (targetUser?.avatar_url) {
        const version = targetUser.avatar_version || 1;
        let rawUrl = targetUser.avatar_url;
        
        // Resolve full URL if relative path and NEXT_PUBLIC_API_URL is configured
        if (rawUrl.startsWith('/') && process.env.NEXT_PUBLIC_API_URL) {
          rawUrl = `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}${rawUrl}`;
        }
        
        const url = rawUrl.includes('?') ? `${rawUrl}&v=${version}` : `${rawUrl}?v=${version}`;
        setAvatarUrl(url);
      } else {
        setAvatarUrl(null);
      }
    };

    loadAvatar();

    const handleProfileChange = () => loadAvatar();
    window.addEventListener('aharsetu_profile_changed', handleProfileChange);
    window.addEventListener('aharsetu_user_changed', handleProfileChange);
    window.addEventListener('focus', handleProfileChange);

    return () => {
      window.removeEventListener('aharsetu_profile_changed', handleProfileChange);
      window.removeEventListener('aharsetu_user_changed', handleProfileChange);
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
