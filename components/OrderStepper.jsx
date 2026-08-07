'use client';
import { PIPELINE_STAGES, STATUS_TO_STAGE } from '@/lib/constants';

export default function OrderStepper({ status }) {
  const currentStage = STATUS_TO_STAGE[status] ?? 0;
  const rejected = status?.includes('Rejected');

  return (
    <div style={{ overflowX: 'auto', padding: '20px 0 8px' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', minWidth: 'max-content',
        gap: 0, padding: '0 8px',
      }}>
        {PIPELINE_STAGES.map((stage, i) => {
          const done    = i < currentStage;
          const active  = i === currentStage;
          const isLast  = i === PIPELINE_STAGES.length - 1;
          const failed  = active && rejected;

          const circleColor = failed ? '#DC2626'
            : done   ? '#059669'
            : active ? 'var(--role-accent, #2563EB)'
            : '#D1D5DB';

          const lineColor = done ? '#059669' : '#E5E7EB';

          return (
            <div key={stage.key} style={{ display: 'flex', alignItems: 'flex-start' }}>
              {/* Step */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '72px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: (done || active) ? circleColor : 'white',
                  border: `2.5px solid ${circleColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: done ? '1rem' : '1.1rem',
                  transition: 'all 0.3s',
                  boxShadow: active ? `0 0 0 4px ${circleColor}22` : 'none',
                }}>
                  {done ? '✓' : stage.icon}
                </div>
                <div style={{
                  fontSize: '0.65rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? circleColor : done ? '#059669' : '#9CA3AF',
                  textAlign: 'center',
                  marginTop: '6px',
                  lineHeight: 1.3,
                  width: '68px',
                }}>
                  {stage.label}
                </div>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div style={{
                  width: '40px', height: '2.5px',
                  background: lineColor,
                  marginTop: '16px',
                  flexShrink: 0,
                  transition: 'background 0.3s',
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
