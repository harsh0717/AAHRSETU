'use client';
import { STATUS_COLORS } from '@/lib/constants';

export default function StatusBadge({ status, size = 'md' }) {
  if (!status) return null;
  const colors = STATUS_COLORS[status] || { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' };
  const pad = size === 'sm' ? '2px 8px' : '4px 12px';
  const fontSize = size === 'sm' ? '0.7rem' : '0.8rem';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: pad,
      borderRadius: '20px',
      background: colors.bg,
      color: colors.text,
      border: `1px solid ${colors.border}`,
      fontSize,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      letterSpacing: '0.01em',
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: colors.text, flexShrink: 0,
      }} />
      {status}
    </span>
  );
}
