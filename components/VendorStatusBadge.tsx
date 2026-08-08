'use client';
import { VENDOR_STATUS_COLORS, VENDOR_STATUS_LABELS } from '@/lib/constants';

interface VendorStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export default function VendorStatusBadge({ status, size = 'md' }: VendorStatusBadgeProps) {
  const colors = VENDOR_STATUS_COLORS[status] || VENDOR_STATUS_COLORS.closed;
  const label  = VENDOR_STATUS_LABELS[status] || status;
  const pad    = size === 'sm' ? '2px 8px' : '4px 12px';
  const fs     = size === 'sm' ? '0.7rem' : '0.8rem';

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: pad, borderRadius: '20px',
      background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
      fontSize: fs, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: colors.dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}
