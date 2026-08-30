'use client';

import React, { useState } from 'react';
import { DepartmentBudget, updateDepartmentBudgetCap } from '@/lib/budget';

interface EditBudgetModalProps {
  budget: DepartmentBudget;
  onClose: () => void;
  onSaved: (updated: DepartmentBudget) => void;
}

export default function EditBudgetModal({ budget, onClose, onSaved }: EditBudgetModalProps) {
  const [annualCap, setAnnualCap] = useState<number>(budget.annual_budget);
  const [warningThreshold, setWarningThreshold] = useState<number>(
    Math.round((budget.warning_threshold || 0.80) * 100)
  );
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (annualCap < 1000) {
      setError('Annual budget must be at least ₹1,000.');
      return;
    }
    if (warningThreshold < 10 || warningThreshold > 100) {
      setError('Warning threshold must be between 10% and 100%.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = await updateDepartmentBudgetCap(
        budget.department_id,
        annualCap,
        warningThreshold / 100
      );
      onSaved(updated);
      onClose();
    } catch {
      setError('Failed to update department budget. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const projectedRemaining = Math.max(0, annualCap - budget.used_amount);
  const projectedUtil = annualCap > 0 ? ((budget.used_amount / annualCap) * 100).toFixed(2) : '0';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'var(--surface-0, #FFFFFF)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--gray-200, #E2E8F0)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'var(--gray-900, #0F172A)' }}>
              ✏️ Adjust Department Budget Cap
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--gray-500, #64748B)' }}>
              {budget.department_name} · FY {budget.budget_year}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.2rem',
              color: 'var(--gray-400)',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '8px'
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FECACA',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: '16px'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Current Spent Info */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'var(--surface-1, #F8FAFC)',
              border: '1px solid var(--gray-200, #E2E8F0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span style={{ fontSize: '0.78rem', color: 'var(--gray-600, #475569)', fontWeight: 600 }}>
              Current Fiscal Year Spend:
            </span>
            <strong style={{ fontSize: '0.92rem', color: '#2563EB' }}>
              ₹{budget.used_amount.toLocaleString('en-IN')}
            </strong>
          </div>

          {/* Annual Budget Input */}
          <div>
            <label
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--gray-700, #334155)',
                display: 'block',
                marginBottom: '6px'
              }}
            >
              Annual Budget Allocation (₹) <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="number"
              className="form-input"
              value={annualCap}
              min={1000}
              step={1000}
              onChange={(e) => setAnnualCap(parseFloat(e.target.value) || 0)}
              required
              style={{ fontSize: '1rem', fontWeight: 800 }}
            />
            <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--gray-400)' }}>
              Projected balance: ₹{projectedRemaining.toLocaleString('en-IN')} ({projectedUtil}% used)
            </p>
          </div>

          {/* Warning Threshold Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>
                Warning Threshold Alert
              </label>
              <strong style={{ fontSize: '0.86rem', color: '#D97706' }}>
                {warningThreshold}%
              </strong>
            </div>
            <input
              type="range"
              min={50}
              max={95}
              step={5}
              value={warningThreshold}
              onChange={(e) => setWarningThreshold(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: '#D97706', cursor: 'pointer' }}
            />
            <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--gray-400)' }}>
              Coordinators and Principals receive warning flags when spend crosses this mark.
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ flex: 1, padding: '10px', fontSize: '0.88rem', fontWeight: 800 }}
            >
              {saving ? 'Saving Changes…' : '✓ Save Budget Cap'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                background: 'var(--gray-100, #F1F5F9)',
                color: 'var(--gray-700, #334155)',
                border: '1px solid var(--gray-300, #CBD5E1)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
