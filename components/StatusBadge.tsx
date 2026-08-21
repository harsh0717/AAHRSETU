'use client';
import { STATUS_COLORS } from '@/lib/constants';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  if (!status) return null;
  const colors = STATUS_COLORS[status] || { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' };
  const pad = size === 'sm' ? '3px 10px' : '5px 14px';
  const fontSize = size === 'sm' ? '0.72rem' : '0.82rem';

  const isLive =
    status.includes('Pending') ||
    status.includes('Preparing') ||
    status.includes('Active') ||
    status.includes('Ready');

  return (
    <span
      className="uiverse-status-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: pad,
        borderRadius: '24px',
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        boxShadow: isLive ? `0 2px 10px -2px ${colors.text}25` : 'none',
        fontSize,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
        position: 'relative',
      }}
    >
      <span
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '8px',
          height: '8px',
          flexShrink: 0,
        }}
      >
        {isLive && (
          <span
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: colors.text,
              opacity: 0.75,
              animation: 'uiverseRadarPing 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
            }}
          />
        )}
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: colors.text,
            position: 'relative',
          }}
        />
      </span>
      {status}

      <style>{`
        @keyframes uiverseRadarPing {
          75%, 100% {
            transform: scale(2.6);
            opacity: 0;
          }
        }
      `}</style>
    </span>
  );
}
