'use client';
import { useState } from 'react';

export default function ApprovalPanel({ order, role, onApprove, onReject }) {
  const [remarks, setRemarks] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const ROLE_COLORS = {
    principal: { accent: '#7C3AED', light: '#F5F3FF', border: '#DDD6FE' },
    dcr:       { accent: '#D97706', light: '#FFFBEB', border: '#FDE68A' },
  };
  const colors = ROLE_COLORS[role] || ROLE_COLORS.principal;

  async function handleApprove() {
    setLoading(true);
    await onApprove(remarks);
    setLoading(false);
  }

  async function handleReject() {
    if (!remarks.trim()) return;
    setLoading(true);
    await onReject(remarks);
    setLoading(false);
  }

  return (
    <div style={{
      background: colors.light,
      border: `1px solid ${colors.border}`,
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '40px', height: '40px',
          borderRadius: '10px',
          background: colors.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem',
          color: '#fff',
        }}>
          {role === 'principal' ? '🎓' : '📋'}
        </div>
        <div>
          <div style={{ fontWeight: 700, color: colors.accent }}>
            {role === 'principal' ? 'Principal Review' : 'DCR Review'}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
            Review order details and approve or reject
          </div>
        </div>
      </div>

      {/* Optional remarks for approval */}
      {!showRejectForm && (
        <div className="form-group">
          <label className="form-label">Remarks (optional)</label>
          <textarea
            className="form-textarea"
            placeholder="Add any notes or conditions for approval..."
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            rows={2}
            style={{ '--role-accent': colors.accent }}
          />
        </div>
      )}

      {/* Reject form */}
      {showRejectForm && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '10px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#DC2626' }}>
            ❌ Rejection Reason
          </div>
          <textarea
            className="form-textarea"
            placeholder="Please provide a reason for rejection (required)..."
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            rows={3}
            autoFocus
            style={{ '--role-accent': '#DC2626' }}
          />
          <div style={{ fontSize: '0.75rem', color: '#B91C1C' }}>
            * The coordinator will see this reason and can resubmit after making changes.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {!showRejectForm ? (
          <>
            <button
              className="btn btn-success"
              onClick={handleApprove}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? '⏳' : '✅'} Approve Order
            </button>
            <button
              className="btn btn-danger"
              onClick={() => { setShowRejectForm(true); setRemarks(''); }}
              disabled={loading}
            >
              ❌ Reject
            </button>
          </>
        ) : (
          <>
            <button
              className="btn btn-danger"
              onClick={handleReject}
              disabled={loading || !remarks.trim()}
              style={{ flex: 1 }}
            >
              {loading ? '⏳' : '❌'} Confirm Rejection
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => { setShowRejectForm(false); setRemarks(''); }}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
