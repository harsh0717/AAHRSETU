'use client';
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';

interface ModificationPanelProps {
  order: any;
  vendorOrder: any;
  mode: 'coordinator' | 'vendor';
  onResolve?: (resolution: 'accept' | 'reject') => void;
  onSubmitMod?: (payload: { reason: string; type: string; requestedAt: string }) => void;
}

export default function ModificationPanel({ vendorOrder, mode, onResolve, onSubmitMod }: ModificationPanelProps) {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  const [type, setType] = useState('minor');
  const [submitting, setSubmitting] = useState(false);

  if (mode === 'vendor') {
    return (
      <div style={{ padding: '16px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '12px', marginTop: '12px' }}>
        <div style={{ fontWeight: 800, color: '#C2410C', marginBottom: '12px', fontSize: '0.9rem' }}>
          🔄 {t('vendor.request_modification')}
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '4px' }}>
            {t('vendor.modification_reason')} *
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Snacks are out of stock today. Can replace with Samosa?"
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #FED7AA', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box', background: 'var(--surface-0)' }}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>
            Modification Type
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            {[['minor', t('mod.minor')], ['major', t('mod.major')]].map(([val, label]) => (
              <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                <input type="radio" name="mod-type" value={val} checked={type === val} onChange={() => setType(val)} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <button
          onClick={() => {
            if (!reason.trim() || !onSubmitMod) return;
            setSubmitting(true);
            onSubmitMod({ reason: reason.trim(), type, requestedAt: new Date().toISOString() });
            setReason('');
            setSubmitting(false);
          }}
          disabled={!reason.trim() || submitting}
          className="btn btn-primary btn-sm"
          style={{
            background: reason.trim() ? '#C2410C' : 'var(--gray-300)',
            borderColor: reason.trim() ? '#C2410C' : 'var(--gray-300)',
            color: 'white',
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
      <div style={{ padding: '16px', background: '#FFF9F2', border: '1px solid #FFE4C4', borderRadius: '12px', marginTop: '12px' }}>
        <div style={{ fontWeight: 800, color: '#C2410C', marginBottom: '10px', fontSize: '0.9rem' }}>
          🔄 {t('mod.title')} — {vendorOrder.vendor_name}
        </div>
        <div style={{ padding: '10px 14px', background: 'var(--surface-0)', borderRadius: '8px', marginBottom: '12px', fontSize: '0.82rem', border: '1px solid #FFE4C4', color: 'var(--gray-700)', lineHeight: 1.4 }}>
          <strong>{t('mod.vendor_reason')}:</strong> {mod.reason}
        </div>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', fontSize: '0.72rem', color: 'var(--gray-500)' }}>
          <span>Type: <strong style={{ textTransform: 'capitalize' }}>{mod.type}</strong></span>
          <span>·</span>
          <span>Requested: {new Date(mod.requested_at).toLocaleString('en-IN')}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onResolve && onResolve('accept')}
            className="btn btn-primary btn-sm"
            style={{ background: '#10B981', borderColor: '#10B981', color: 'white' }}
          >
            ✅ {t('mod.accept')}
          </button>
          <button
            onClick={() => onResolve && onResolve('reject')}
            className="btn btn-ghost btn-sm"
            style={{ color: '#EF4444' }}
          >
            ❌ {t('mod.reject_mod')}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
