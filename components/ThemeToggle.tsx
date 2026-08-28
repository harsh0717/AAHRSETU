'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';

interface ThemeToggleProps {
  variant?: 'icon' | 'pill' | 'menu';
  className?: string;
  style?: React.CSSProperties;
}

export default function ThemeToggle({ variant = 'icon', className = '', style }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  if (variant === 'menu') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: '12px',
          background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
          border: isDark ? '1px solid #334155' : '1px solid var(--gray-200, #E2E8F0)',
          ...style
        }}
        className={className}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.1rem' }}>{isDark ? '🌙' : '☀️'}</span>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#F8FAFC' : '#1E293B' }}>
              Dark Mode
            </div>
            <div style={{ fontSize: '0.7rem', color: isDark ? '#94A3B8' : '#64748B' }}>
              {theme === 'system' ? 'System Default' : (isDark ? 'Enabled' : 'Disabled')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', background: isDark ? '#0F172A' : '#E2E8F0', borderRadius: '20px', padding: '3px', gap: '2px' }}>
          <button
            type="button"
            onClick={() => setTheme('light')}
            aria-label="Light mode"
            style={{
              border: 'none',
              background: theme === 'light' ? (isDark ? '#334155' : '#FFFFFF') : 'transparent',
              color: theme === 'light' ? '#2563EB' : (isDark ? '#94A3B8' : '#64748B'),
              padding: '4px 8px',
              borderRadius: '16px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            ☀️ Light
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            aria-label="Dark mode"
            style={{
              border: 'none',
              background: theme === 'dark' ? '#2563EB' : 'transparent',
              color: theme === 'dark' ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B'),
              padding: '4px 8px',
              borderRadius: '16px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: theme === 'dark' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            🌙 Dark
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          minHeight: '40px',
          borderRadius: '20px',
          border: isDark ? '1px solid #334155' : '1px solid var(--gray-300, #CBD5E1)',
          background: isDark ? '#1E293B' : '#FFFFFF',
          color: isDark ? '#F8FAFC' : '#334155',
          fontSize: '0.82rem',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          ...style
        }}
        className={className}
      >
        <span style={{ fontSize: '1rem', lineHeight: 1 }}>{isDark ? '🌙' : '☀️'}</span>
        <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
      </button>
    );
  }

  // Default: Compact Icon button for headers
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '38px',
        height: '38px',
        minWidth: '38px',
        minHeight: '38px',
        borderRadius: '10px',
        border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid var(--gray-200, #E2E8F0)',
        background: isDark ? 'rgba(30, 41, 59, 0.85)' : '#FFFFFF',
        color: isDark ? '#F8FAFC' : '#475569',
        fontSize: '1.05rem',
        cursor: 'pointer',
        boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.04)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        ...style
      }}
      className={className}
    >
      <span style={{ transform: isDark ? 'rotate(0deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
        {isDark ? '🌙' : '☀️'}
      </span>
    </button>
  );
}
