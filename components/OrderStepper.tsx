'use client';
import { PIPELINE_STAGES, STATUS_TO_STAGE } from '@/lib/constants';
import AppIcon from './ui/AppIcon';

interface OrderStepperProps {
  status: string;
}

const STAGE_ICON_MAP: Record<string, string> = {
  coordinator: 'file_edit',
  sent: 'send',
  principal: 'principal',
  dcr: 'dcr',
  vendor: 'chef',
  confirmed: 'check',
  bill: 'bills',
  completed: 'completed',
};

export default function OrderStepper({ status }: OrderStepperProps) {
  const currentStage = STATUS_TO_STAGE[status] ?? 0;
  const rejected = status?.includes('Rejected');
  const isCancelled = status === 'Cancelled';

  return (
    <div style={{ overflowX: 'auto', padding: '12px 4px 10px' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', minWidth: 'max-content',
        gap: 0, padding: '0 8px',
      }}>
        {PIPELINE_STAGES.map((stage, i) => {
          const done    = i < currentStage;
          const active  = i === currentStage;
          const isLast  = i === PIPELINE_STAGES.length - 1;
          const failed  = (active && rejected) || isCancelled;

          const circleColor = failed ? '#EF4444'
            : done   ? '#10B981'
            : active ? 'var(--role-accent, #2563EB)'
            : '#E2E8F0';

          const bgFill = failed ? 'linear-gradient(135deg, #EF4444, #DC2626)'
            : done ? 'linear-gradient(135deg, #10B981, #059669)'
            : active ? 'linear-gradient(135deg, #2563EB, #1D4ED8)'
            : '#FFFFFF';

          return (
            <div key={stage.key} style={{ display: 'flex', alignItems: 'flex-start' }}>
              {/* Step */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '84px' }}>
                <div
                  className="uiverse-step-node"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: (done || active) ? bgFill : '#FFFFFF',
                    border: (done || active) ? 'none' : `2px solid #CBD5E1`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: done ? '0.9rem' : '1rem',
                    color: (done || active) ? '#FFFFFF' : '#94A3B8',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative',
                    boxShadow: active
                      ? `0 0 0 4px ${circleColor}25, 0 4px 14px -2px ${circleColor}55`
                      : done
                      ? '0 2px 8px -2px rgba(16, 185, 129, 0.3)'
                      : '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  {active && !failed && (
                    <span
                      style={{
                        position: 'absolute',
                        inset: '-4px',
                        borderRadius: '50%',
                        border: `2px solid ${circleColor}`,
                        opacity: 0.8,
                        animation: 'uiverseStepPulse 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  {done ? (
                    <AppIcon name="check" size={16} color="#FFFFFF" strokeWidth={3} />
                  ) : (
                    <AppIcon
                      name={STAGE_ICON_MAP[stage.key] || 'orders'}
                      size={16}
                      color={active ? '#FFFFFF' : '#64748B'}
                    />
                  )}
                </div>
                <div style={{
                  fontSize: '0.66rem',
                  fontWeight: active ? 800 : done ? 700 : 500,
                  color: active ? circleColor : done ? '#059669' : '#64748B',
                  textAlign: 'center',
                  marginTop: '8px',
                  lineHeight: 1.3,
                  width: '80px',
                  letterSpacing: '-0.01em',
                }}>
                  {stage.label}
                </div>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div style={{
                  width: '46px',
                  height: '3px',
                  borderRadius: '2px',
                  background: done
                    ? 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
                    : '#E2E8F0',
                  marginTop: '16px',
                  flexShrink: 0,
                  transition: 'all 0.4s ease-in-out',
                }} />
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes uiverseStepPulse {
          70%, 100% {
            transform: scale(1.35);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
