'use client';
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';

interface ApprovalPanelProps {
  order: any;
  role: string;
  onApprove: (remarks: string) => void;
  onReject: (reason: string) => void;
}

export default function ApprovalPanel({ order, role, onApprove, onReject }: ApprovalPanelProps) {
  const { t } = useI18n();
  const [remarks, setRemarks] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const title = role === 'principal' ? t('approval.title_principal') : t('approval.title_dcr');

  function handleApprove() {
    onApprove(remarks);
    setRemarks('');
  }

  function handleReject() {
    if (!rejectReason.trim()) return;
    onReject(rejectReason);
    setRejectReason('');
    setShowReject(false);
  }

  return (
    <div style={{ padding: '16px', background: 'var(--surface-0)', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
      <div style={{ fontWeight: 800, marginBottom: '12px', fontSize: '0.9rem', color: 'var(--gray-900)' }}>
        {title}
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600)', display: 'block', marginBottom: '4px' }}>
          {t('approval.optional_remarks')}
        </label>
        <textarea
          rows={2}
          value={remarks}
          onChange={e => setRemarks(e.target.value)}
          placeholder={t('approval.optional_ph')}
          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-300)', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>

      {!showReject ? (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleApprove}
            className="btn btn-primary btn-sm"
            style={{ background: '#10B981', borderColor: '#10B981', color: 'white' }}>
            ✅ {t('approval.approve_btn')}
          </button>
          <button onClick={() => setShowReject(true)}
            className="btn btn-ghost btn-sm"
            style={{ color: '#EF4444' }}>
            ❌ {t('approval.reject_btn')}
          </button>
        </div>
      ) : (
        <div style={{ background: '#FEF2F2', padding: '14px', borderRadius: '10px', border: '1px solid #FEE2E2' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#991B1B', display: 'block', marginBottom: '6px' }}>
            {t('approval.reject_reason')} *
          </label>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder={t('approval.reject_ph')}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #FCA5A5', fontSize: '0.85rem', resize: 'vertical', marginBottom: '8px', boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: '0.72rem', color: '#991B1B', marginBottom: '10px' }}>{t('approval.reject_note')}</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleReject} disabled={!rejectReason.trim()}
              className="btn btn-primary btn-sm"
              style={{ background: '#EF4444', borderColor: '#EF4444', color: 'white', opacity: rejectReason.trim() ? 1 : 0.5, cursor: rejectReason.trim() ? 'pointer' : 'not-allowed' }}>
              {t('approval.confirm_reject')}
            </button>
            <button onClick={() => setShowReject(false)}
              className="btn btn-ghost btn-sm">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
