'use client';
import { STATUS_COLORS } from '@/lib/constants';

export default function StatusBadge({ status, size = 'default' }) {
  const colors = STATUS_COLORS[status] || { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' };
  
  const STATUS_ICONS = {
    'Created':              '📝',
    'Sent for Approval':    '📤',
    'Principal Reviewing':  '🔍',
    'Principal Approved':   '✅',
    'Principal Rejected':   '❌',
    'DCR Reviewing':        '🔍',
    'DCR Approved':         '✅',
    'DCR Rejected':         '❌',
    'Vendor Processing':    '⚙️',
    'Order Done/Confirmed': '🎯',
    'Bill Generated':       '🧾',
    'Completed':            '🏁',
  };

  const icon = STATUS_ICONS[status] || '•';
  
  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: size === 'sm' ? '2px 8px' : '4px 12px',
    borderRadius: '999px',
    fontSize: size === 'sm' ? '0.7rem' : '0.75rem',
    fontWeight: 600,
    background: colors.bg,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    whiteSpace: 'nowrap',
  };

  return (
    <span style={style}>
      <span style={{ fontSize: size === 'sm' ? '0.7rem' : '0.75rem' }}>{icon}</span>
      {status}
    </span>
  );
}
