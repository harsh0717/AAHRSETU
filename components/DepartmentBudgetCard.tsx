'use client';

import React, { useEffect, useState } from 'react';
import { DepartmentBudget, getDepartmentBudget, calculateProjectedImpact, ProjectedBudgetImpact } from '@/lib/budget';

interface DepartmentBudgetCardProps {
  deptId: string;
  projectedAmount?: number;
  compact?: boolean;
  onEditCap?: (budget: DepartmentBudget) => void;
  showAdminEdit?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function DepartmentBudgetCard({
  deptId,
  projectedAmount = 0,
  compact = false,
  onEditCap,
  showAdminEdit = false,
  className = '',
  style = {}
}: DepartmentBudgetCardProps) {
  const [budget, setBudget] = useState<DepartmentBudget | null>(null);
  const [impact, setImpact] = useState<ProjectedBudgetImpact | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function loadBudget() {
    if (!deptId) return;
    try {
      const b = await getDepartmentBudget(deptId);
      setBudget(b);
      if (projectedAmount > 0) {
        const imp = await calculateProjectedImpact(deptId, projectedAmount);
        setImpact(imp);
      } else {
        setImpact(null);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBudget();

    const handleBudgetUpdate = () => {
      loadBudget();
    };

    window.addEventListener('aharsetu_budget_updated', handleBudgetUpdate);
    return () => {
      window.removeEventListener('aharsetu_budget_updated', handleBudgetUpdate);
    };
  }, [deptId, projectedAmount]);

  if (loading || !budget) {
    return (
      <div
        className={`card ${className}`}
        style={{
          padding: compact ? '12px 16px' : '20px',
          borderRadius: '14px',
          background: 'var(--surface-0, #FFFFFF)',
          border: '1px solid var(--gray-200, #E2E8F0)',
          ...style
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-400)' }}>
          <span style={{ animation: 'spin 1s infinite linear' }}>🔄</span>
          <span style={{ fontSize: '0.82rem' }}>Loading department budget...</span>
        </div>
      </div>
    );
  }

  const effectiveUtil = impact ? impact.projected_utilization_pct : budget.utilization_pct;
  const thresholdPct = Math.round((budget.warning_threshold || 0.80) * 100);
  const isExceeded = impact ? impact.will_exceed : budget.status === 'EXCEEDED';
  const isWarning = impact ? impact.will_warn : budget.has_warning;

  // Status Badge Configuration
  let statusBg = 'rgba(22, 163, 74, 0.1)';
  let statusColor = '#16A34A';
  let statusBorder = 'rgba(22, 163, 74, 0.25)';
  let statusLabel = '🟢 OPTIMAL';

  if (isExceeded) {
    statusBg = 'rgba(220, 38, 38, 0.12)';
    statusColor = '#DC2626';
    statusBorder = 'rgba(220, 38, 38, 0.35)';
    statusLabel = '🔴 EXCEEDED';
  } else if (isWarning) {
    statusBg = 'rgba(217, 119, 6, 0.12)';
    statusColor = '#D97706';
    statusBorder = 'rgba(217, 119, 6, 0.35)';
    statusLabel = `🟡 ${effectiveUtil}% WARNING`;
  }

  // Progress Bar Gradient
  let barGradient = 'linear-gradient(90deg, #10B981 0%, #059669 100%)';
  if (effectiveUtil >= 100) {
    barGradient = 'linear-gradient(90deg, #DC2626 0%, #991B1B 100%)';
  } else if (effectiveUtil >= thresholdPct) {
    barGradient = 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)';
  }

  if (compact) {
    return (
      <div
        className={className}
        style={{
          padding: '14px 16px',
          borderRadius: '14px',
          background: isExceeded
            ? 'rgba(220, 38, 38, 0.04)'
            : isWarning
            ? 'rgba(217, 119, 6, 0.04)'
            : 'var(--surface-0, #FFFFFF)',
          border: `1px solid ${isExceeded ? '#FCA5A5' : isWarning ? '#FDE68A' : 'var(--gray-200, #E2E8F0)'}`,
          ...style
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)' }}>
              🏛️ {budget.department_name}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--gray-500, #64748B)', marginLeft: '6px' }}>
              ({budget.budget_year})
            </span>
          </div>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '20px',
              fontSize: '0.7rem',
              fontWeight: 800,
              background: statusBg,
              color: statusColor,
              border: `1px solid ${statusBorder}`
            }}
          >
            {statusLabel}
          </span>
        </div>

        {/* Progress Bar Container */}
        <div
          style={{
            position: 'relative',
            height: '10px',
            background: 'var(--gray-100, #F1F5F9)',
            borderRadius: '999px',
            overflow: 'hidden',
            margin: '8px 0 6px'
          }}
        >
          {/* Threshold Marker */}
          <div
            style={{
              position: 'absolute',
              left: `${thresholdPct}%`,
              top: 0,
              bottom: 0,
              width: '2px',
              background: '#D97706',
              zIndex: 2,
              opacity: 0.85
            }}
            title={`${thresholdPct}% Warning Threshold`}
          />
          {/* Fill */}
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, effectiveUtil)}%`,
              background: barGradient,
              borderRadius: '999px',
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--gray-500, #64748B)' }}>
          <span>
            Used: <strong style={{ color: 'var(--gray-900, #0F172A)' }}>₹{(impact ? impact.projected_used : budget.used_amount).toLocaleString('en-IN')}</strong>
            {impact && (
              <span style={{ color: '#2563EB', marginLeft: '4px', fontWeight: 700 }}>
                (+₹{impact.additional_amount.toLocaleString('en-IN')})
              </span>
            )}
          </span>
          <span>
            Bal: <strong style={{ color: isExceeded ? '#DC2626' : '#16A34A' }}>₹{(impact ? impact.projected_remaining : budget.remaining_amount).toLocaleString('en-IN')}</strong> / ₹{budget.annual_budget.toLocaleString('en-IN')}
          </span>
        </div>

        {impact?.warning_message && (
          <div
            style={{
              marginTop: '8px',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '0.72rem',
              fontWeight: 600,
              background: isExceeded ? 'rgba(220, 38, 38, 0.1)' : 'rgba(217, 119, 6, 0.1)',
              color: isExceeded ? '#DC2626' : '#B45309',
              border: `1px solid ${isExceeded ? 'rgba(220, 38, 38, 0.25)' : 'rgba(217, 119, 6, 0.25)'}`
            }}
          >
            {impact.warning_message}
          </div>
        )}
      </div>
    );
  }

  // Full Widget Mode
  return (
    <div
      className={`card ${className}`}
      style={{
        padding: '20px',
        borderRadius: '16px',
        background: 'var(--surface-0, #FFFFFF)',
        border: `1px solid ${isExceeded ? '#FCA5A5' : isWarning ? '#FDE68A' : 'var(--gray-200, #E2E8F0)'}`,
        boxShadow: isExceeded
          ? '0 4px 20px rgba(220, 38, 38, 0.08)'
          : isWarning
          ? '0 4px 20px rgba(217, 119, 6, 0.06)'
          : 'var(--shadow-sm)',
        ...style
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#2563EB', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>
              FY {budget.budget_year}
            </span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.72rem',
                fontWeight: 800,
                background: statusBg,
                color: statusColor,
                border: `1px solid ${statusBorder}`
              }}
            >
              {statusLabel}
            </span>
          </div>
          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--gray-900, #0F172A)' }}>
            🏛️ {budget.department_name} Budget
          </h4>
        </div>

        {showAdminEdit && onEditCap && (
          <button
            type="button"
            onClick={() => onEditCap(budget)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'var(--gray-100, #F1F5F9)',
              color: 'var(--gray-700, #334155)',
              border: '1px solid var(--gray-300, #CBD5E1)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            ✏️ Edit Cap
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          background: 'var(--surface-1, #F8FAFC)',
          padding: '12px',
          borderRadius: '12px',
          marginBottom: '14px'
        }}
      >
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--gray-500, #64748B)', textTransform: 'uppercase' }}>Annual Cap</div>
          <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--gray-900, #0F172A)', marginTop: '2px' }}>
            ₹{budget.annual_budget.toLocaleString('en-IN')}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--gray-500, #64748B)', textTransform: 'uppercase' }}>
            {impact ? 'Projected Spend' : 'Used Spend'}
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 900, color: isExceeded ? '#DC2626' : '#2563EB', marginTop: '2px' }}>
            ₹{(impact ? impact.projected_used : budget.used_amount).toLocaleString('en-IN')}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--gray-500, #64748B)', textTransform: 'uppercase' }}>
            {impact ? 'Projected Bal' : 'Remaining Bal'}
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 900, color: isExceeded ? '#DC2626' : '#16A34A', marginTop: '2px' }}>
            ₹{(impact ? impact.projected_remaining : budget.remaining_amount).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Progress Bar with Indicator */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.78rem' }}>
          <span style={{ fontWeight: 700, color: 'var(--gray-700, #334155)' }}>
            Budget Utilization
          </span>
          <span style={{ fontWeight: 900, color: isExceeded ? '#DC2626' : isWarning ? '#D97706' : '#10B981' }}>
            {effectiveUtil}% <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>/ 100%</span>
          </span>
        </div>

        <div
          style={{
            position: 'relative',
            height: '14px',
            background: 'var(--gray-200, #E2E8F0)',
            borderRadius: '999px',
            overflow: 'hidden'
          }}
        >
          {/* Threshold Marker at 80% */}
          <div
            style={{
              position: 'absolute',
              left: `${thresholdPct}%`,
              top: 0,
              bottom: 0,
              width: '2px',
              background: '#D97706',
              zIndex: 3,
              boxShadow: '0 0 4px rgba(217, 119, 6, 0.6)'
            }}
            title={`${thresholdPct}% Warning Threshold`}
          />
          {/* Actual Fill */}
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, effectiveUtil)}%`,
              background: barGradient,
              borderRadius: '999px',
              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--gray-400, #94A3B8)', marginTop: '4px' }}>
          <span>0%</span>
          <span style={{ color: '#D97706', fontWeight: 700 }}>▲ {thresholdPct}% Threshold</span>
          <span>100% (₹{budget.annual_budget.toLocaleString('en-IN')})</span>
        </div>
      </div>

      {/* Projected Order Summary Alert */}
      {impact && impact.additional_amount > 0 && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: isExceeded
              ? 'rgba(220, 38, 38, 0.08)'
              : isWarning
              ? 'rgba(217, 119, 6, 0.08)'
              : 'rgba(37, 99, 235, 0.06)',
            border: `1px solid ${
              isExceeded
                ? 'rgba(220, 38, 38, 0.3)'
                : isWarning
                ? 'rgba(217, 119, 6, 0.3)'
                : 'rgba(37, 99, 235, 0.2)'
            }`,
            fontSize: '0.78rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: 'var(--gray-800, #1E293B)' }}>
              📦 Current Order Cost Impact:
            </span>
            <span style={{ fontWeight: 800, color: '#2563EB' }}>
              +₹{impact.additional_amount.toLocaleString('en-IN')} (+{(impact.projected_utilization_pct - impact.current_utilization_pct).toFixed(2)}%)
            </span>
          </div>
          {impact.warning_message && (
            <div style={{ marginTop: '4px', fontWeight: 600, color: isExceeded ? '#DC2626' : '#B45309' }}>
              {impact.warning_message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
