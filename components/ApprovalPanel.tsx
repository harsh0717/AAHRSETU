'use client';
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import UiverseButton from '@/components/ui/UiverseButton';

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
    <div style={{ padding: '18px', background: 'var(--surface-0)', borderRadius: '16px', border: '1px solid var(--gray-200)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
      <div style={{ fontWeight: 800, marginBottom: '12px', fontSize: '0.92rem', color: 'var(--gray-900)' }}>
        {title}
      </div>
      <div style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600)', display: 'block', marginBottom: '4px' }}>
          {t('approval.optional_remarks')}
        </label>
        <textarea
          rows={2}
          value={remarks}
          onChange={e => setRemarks(e.target.value)}
          placeholder={t('approval.optional_ph')}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--gray-300)', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>

      {!showReject ? (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <UiverseButton
            onClick={handleApprove}
            variant="success"
            size="sm"
            leftIcon={<span>✅</span>}
          >
            {t('approval.approve_btn')}
          </UiverseButton>
          <UiverseButton
            onClick={() => setShowReject(true)}
            variant="glass"
            size="sm"
            style={{ color: '#EF4444' }}
            leftIcon={<span>❌</span>}
          >
            {t('approval.reject_btn')}
          </UiverseButton>
        </div>
      ) : (
        <div style={{ background: '#FEF2F2', padding: '16px', borderRadius: '14px', border: '1px solid #FEE2E2' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#991B1B', display: 'block', marginBottom: '6px' }}>
            {t('approval.reject_reason')} *
          </label>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder={t('approval.reject_ph')}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #FCA5A5', fontSize: '0.85rem', resize: 'vertical', marginBottom: '10px', boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: '0.74rem', color: '#991B1B', marginBottom: '12px' }}>{t('approval.reject_note')}</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <UiverseButton
              onClick={handleReject}
              disabled={!rejectReason.trim()}
              variant="danger"
              size="sm"
            >
              {t('approval.confirm_reject')}
            </UiverseButton>
            <UiverseButton
              onClick={() => setShowReject(false)}
              variant="glass"
              size="sm"
            >
              {t('common.cancel')}
            </UiverseButton>
          </div>
        </div>
      )}
    </div>
  );
}
