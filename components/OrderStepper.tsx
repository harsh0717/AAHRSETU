'use client';
import { PIPELINE_STAGES, STATUS_TO_STAGE } from '@/lib/constants';

interface OrderStepperProps {
  status: string;
}

export default function OrderStepper({ status }: OrderStepperProps) {
  const currentStage = STATUS_TO_STAGE[status] ?? 0;
  const rejected = status?.includes('Rejected');

  return (
    <div style={{ overflowX: 'auto', padding: '10px 0 8px' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', minWidth: 'max-content',
        gap: 0, padding: '0 8px',
      }}>
        {PIPELINE_STAGES.map((stage, i) => {
          const done    = i < currentStage;
          const active  = i === currentStage;
          const isLast  = i === PIPELINE_STAGES.length - 1;
          const failed  = active && rejected;

          const circleColor = failed ? '#EF4444'
            : done   ? '#10B981'
            : active ? 'var(--role-accent, #3B82F6)'
            : '#E4E4E7';

          const lineColor = done ? '#10B981' : '#E4E4E7';

          return (
            <div key={stage.key} style={{ display: 'flex', alignItems: 'flex-start' }}>
              {/* Step */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: (done || active) ? circleColor : 'white',
                  border: `2px solid ${circleColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: done ? '0.85rem' : '0.95rem',
                  color: (done || active) ? 'white' : '#A1A1AA',
                  transition: 'all 0.3s',
                  boxShadow: active ? `0 0 0 4px ${circleColor}22` : 'none',
                }}>
                  {done ? '✓' : stage.icon}
                </div>
                <div style={{
                  fontSize: '0.625rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? circleColor : done ? '#10B981' : '#A1A1AA',
                  textAlign: 'center',
                  marginTop: '6px',
                  lineHeight: 1.3,
                  width: '74px',
                }}>
                  {stage.label}
                </div>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div style={{
                  width: '50px', height: '2px',
                  background: lineColor,
                  marginTop: '15px',
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
