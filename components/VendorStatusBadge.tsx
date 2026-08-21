'use client';
import { VENDOR_STATUS_COLORS, VENDOR_STATUS_LABELS } from '@/lib/constants';

interface VendorStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export default function VendorStatusBadge({ status, size = 'md' }: VendorStatusBadgeProps) {
  const colors = VENDOR_STATUS_COLORS[status] || VENDOR_STATUS_COLORS.closed;
  const label  = VENDOR_STATUS_LABELS[status] || status;
  const pad    = size === 'sm' ? '3px 10px' : '5px 14px';
  const fs     = size === 'sm' ? '0.72rem' : '0.82rem';
  const isOpen = status === 'open';
  const isBusy = status === 'busy';

  return (
    <span
      className="uiverse-vendor-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: pad,
        borderRadius: '24px',
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        boxShadow: isOpen ? '0 2px 10px -2px rgba(16, 185, 129, 0.3)' : 'none',
        fontSize: fs,
        fontWeight: 700,
        whiteSpace: 'nowrap',
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
        {(isOpen || isBusy) && (
          <span
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: colors.dot,
              opacity: 0.75,
              animation: 'uiverseVendorPing 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
            }}
          />
        )}
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: colors.dot,
            position: 'relative',
          }}
        />
      </span>
      {label}

      <style>{`
        @keyframes uiverseVendorPing {
          75%, 100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
      `}</style>
    </span>
  );
}
