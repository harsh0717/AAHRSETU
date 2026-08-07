'use client';
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';

export default function ApprovalPanel({ order, role, onApprove, onReject }) {
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
    <div style={{ padding: '16px', background: 'var(--surface-1)', borderRadius: '10px', border: '1px solid var(--gray-200)' }}>
      <div style={{ fontWeight: 700, marginBottom: '12px', fontSize: '0.9rem' }}>
        {title}
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--gray-700)', display: 'block', marginBottom: '4px' }}>
          {t('approval.optional_remarks')}
        </label>
        <textarea
          rows={2}
          value={remarks}
          onChange={e => setRemarks(e.target.value)}
          placeholder={t('approval.optional_ph')}
          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-300)', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>

      {!showReject ? (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleApprove}
            style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#059669', color: 'white', fontWeight: 700 }}>
            ✅ {t('approval.approve_btn')}
          </button>
          <button onClick={() => setShowReject(true)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #EF4444', cursor: 'pointer', background: 'white', color: '#EF4444', fontWeight: 600 }}>
            ❌ {t('approval.reject_btn')}
          </button>
        </div>
      ) : (
        <div style={{ background: '#FEF2F2', padding: '14px', borderRadius: '8px', border: '1px solid #FECACA' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#B91C1C', display: 'block', marginBottom: '6px' }}>
            {t('approval.reject_reason')} *
          </label>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder={t('approval.reject_ph')}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #FECACA', fontSize: '0.875rem', resize: 'vertical', marginBottom: '8px', boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: '0.75rem', color: '#B91C1C', marginBottom: '10px' }}>{t('approval.reject_note')}</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleReject} disabled={!rejectReason.trim()}
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: rejectReason.trim() ? 'pointer' : 'not-allowed', background: rejectReason.trim() ? '#DC2626' : 'var(--gray-300)', color: 'white', fontWeight: 700 }}>
              {t('approval.confirm_reject')}
            </button>
            <button onClick={() => setShowReject(false)}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--gray-300)', cursor: 'pointer', background: 'white', fontWeight: 600 }}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
