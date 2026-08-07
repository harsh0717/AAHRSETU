'use client';
import { PIPELINE_STAGES, STATUS_TO_STAGE, ROLE_COLORS } from '@/lib/constants';

export default function OrderStepper({ status }) {
  const currentStage = STATUS_TO_STAGE[status] ?? 0;
  const isRejected = status?.includes('Rejected');

  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        position: 'relative',
      }}>
        {/* Connecting line */}
        <div style={{
          position: 'absolute',
          top: '22px',
          left: '32px',
          right: '32px',
          height: '2px',
          background: 'var(--gray-200)',
          zIndex: 0,
        }} />
        {/* Progress line */}
        <div style={{
          position: 'absolute',
          top: '22px',
          left: '32px',
          height: '2px',
          background: isRejected ? '#EF4444' : 'var(--role-accent, #2563EB)',
          width: `${Math.min(currentStage / (PIPELINE_STAGES.length - 1) * 100, 100)}%`,
          zIndex: 1,
          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />

        {PIPELINE_STAGES.map((stage, idx) => {
          const isDone    = idx < currentStage;
          const isCurrent = idx === currentStage;
          const roleColor = ROLE_COLORS[stage.role] || ROLE_COLORS.coordinator;

          let dotBg    = 'var(--gray-200)';
          let dotColor = 'var(--gray-400)';
          let dotBorder = '2px solid var(--gray-300)';

          if (isDone) {
            dotBg = roleColor.accent;
            dotColor = '#fff';
            dotBorder = `2px solid ${roleColor.accent}`;
          } else if (isCurrent) {
            if (isRejected) {
              dotBg = '#FEF2F2';
              dotColor = '#DC2626';
              dotBorder = '2px solid #FCA5A5';
            } else {
              dotBg = '#fff';
              dotColor = roleColor.accent;
              dotBorder = `2px solid ${roleColor.accent}`;
            }
          }

          return (
            <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1, zIndex: 2 }}>
              {/* Circle */}
              <div style={{
                width: '44px', height: '44px',
                borderRadius: '50%',
                background: dotBg,
                border: dotBorder,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                transition: 'all 0.3s ease',
                boxShadow: isCurrent ? `0 0 0 4px ${isRejected ? 'rgba(220,38,38,0.15)' : `${roleColor.accent}25`}` : 'none',
              }}>
                {isDone ? '✓' : isCurrent && isRejected ? '✕' : stage.icon}
              </div>

              {/* Label */}
              <div style={{ textAlign: 'center', maxWidth: '80px' }}>
                <div style={{
                  fontSize: '0.6875rem',
                  fontWeight: isCurrent ? 700 : isDone ? 600 : 400,
                  color: isCurrent ? (isRejected ? '#DC2626' : roleColor.accent) : isDone ? 'var(--gray-700)' : 'var(--gray-400)',
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '80px',
                }}>
                  {stage.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isRejected && (
        <div style={{
          marginTop: '16px',
          padding: '10px 16px',
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '8px',
          fontSize: '0.8125rem',
          color: '#B91C1C',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          ⚠️ This order was rejected. Coordinator can edit and resubmit.
        </div>
      )}
    </div>
  );
}
