'use client';
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';

export default function ModificationPanel({ vendorOrder, masterOrderId, session, onSubmitMod, onAcceptMod, onRejectMod, mode }) {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  const [type, setType] = useState('minor');
  const [submitting, setSubmitting] = useState(false);

  // mode = 'vendor' → vendor requests modification
  // mode = 'coordinator' → coordinator sees and responds

  if (mode === 'vendor') {
    return (
      <div style={{ padding: '16px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '10px', marginTop: '12px' }}>
        <div style={{ fontWeight: 700, color: '#C2410C', marginBottom: '12px', fontSize: '0.9rem' }}>
          🔄 {t('vendor.request_modification')}
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--gray-700)', display: 'block', marginBottom: '4px' }}>
            {t('vendor.modification_reason')} *
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Snacks are out of stock today. Can replace with Samosa?"
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #FED7AA', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box', background: 'white' }}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>
            Modification Type
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[['minor', t('mod.minor')], ['major', t('mod.major')]].map(([val, label]) => (
              <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8125rem' }}>
                <input type="radio" name="mod-type" value={val} checked={type === val} onChange={() => setType(val)} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <button
          onClick={() => {
            if (!reason.trim()) return;
            setSubmitting(true);
            onSubmitMod({ reason: reason.trim(), type, requestedAt: new Date().toISOString() });
            setReason('');
            setSubmitting(false);
          }}
          disabled={!reason.trim() || submitting}
          style={{
            padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: reason.trim() ? '#C2410C' : 'var(--gray-300)',
            color: 'white', fontSize: '0.875rem', fontWeight: 600,
          }}
        >
          {submitting ? '...' : '🔄 ' + t('vendor.request_modification')}
        </button>
      </div>
    );
  }

  // Coordinator view
  if (mode === 'coordinator' && vendorOrder?.modification) {
    const mod = vendorOrder.modification;
    return (
      <div style={{ padding: '16px', background: '#FFF7ED', border: '2px solid #FED7AA', borderRadius: '10px', marginTop: '12px' }}>
        <div style={{ fontWeight: 700, color: '#C2410C', marginBottom: '10px', fontSize: '0.9rem' }}>
          🔄 {t('mod.title')} — {vendorOrder.vendorName}
        </div>
        <div style={{ padding: '10px 14px', background: 'white', borderRadius: '8px', marginBottom: '12px', fontSize: '0.875rem', border: '1px solid #FED7AA' }}>
          <strong>{t('mod.vendor_reason')}:</strong> {mod.reason}
        </div>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
          <span>Type: <strong style={{ textTransform: 'capitalize' }}>{mod.type}</strong></span>
          <span>·</span>
          <span>Requested: {new Date(mod.requestedAt).toLocaleString('en-IN')}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onAcceptMod(vendorOrder, mod.type)}
            style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#059669', color: 'white', fontWeight: 600, fontSize: '0.875rem' }}
          >
            ✅ {t('mod.accept')}
          </button>
          <button
            onClick={() => onRejectMod(vendorOrder)}
            style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #EF4444', cursor: 'pointer', background: 'white', color: '#EF4444', fontWeight: 600, fontSize: '0.875rem' }}
          >
            ❌ {t('mod.reject_mod')}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
