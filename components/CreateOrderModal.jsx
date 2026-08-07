'use client';
import { useState, useEffect } from 'react';
import { getAvailableMenuByVendor } from '@/lib/vendors';
import { createMasterOrder } from '@/lib/store';
import { DEPARTMENTS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';

export default function CreateOrderModal({ session, onCreated, onClose }) {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [quantities, setQuantities] = useState({}); // { itemId: qty }
  const [vendors, setVendors] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const dept = session?.department;
  const deptInfo = DEPARTMENTS.find(d => d.id === dept);

  useEffect(() => {
    const openVendors = getAvailableMenuByVendor();
    setVendors(openVendors);
  }, []);

  function setQty(item, val) {
    const q = Math.max(0, parseInt(val) || 0);
    setQuantities(prev => ({ ...prev, [item.id]: q }));
  }

  function getSelectedItems() {
    const all = vendors.flatMap(v => v.menu.map(m => ({ ...m })));
    return all.filter(item => (quantities[item.id] || 0) > 0)
              .map(item => ({ ...item, quantity: quantities[item.id] }));
  }

  const selectedItems = getSelectedItems();
  const totalItems = selectedItems.reduce((s, i) => s + i.quantity, 0);

  function handleSubmit() {
    if (!title.trim() || !purpose.trim()) { setError(t('err.required')); return; }
    if (selectedItems.length === 0) { setError('Please select at least one item.'); return; }
    setSubmitting(true);
    const order = createMasterOrder({
      title: title.trim(),
      purpose: purpose.trim(),
      department: dept,
      departmentLabel: deptInfo?.label || dept,
      items: selectedItems,
      createdBy: {
        id: session.id,
        name: session.name,
        role: session.role,
        department: dept,
        departmentLabel: deptInfo?.label,
      },
    });
    setSubmitting(false);
    onCreated(order);
    onClose();
  }

  const colors = { accent: '#2563EB' };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'white', borderRadius: '16px', width: '100%', maxWidth: '680px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>➕ {t('orders.create')}</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '2px' }}>
              {deptInfo?.label || dept}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--gray-400)', lineHeight: 1 }}>✕</button>
        </div>

        {/* Step indicators */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--gray-100)', display: 'flex', gap: '8px' }}>
          {[
            [1, t('orders.step1')],
            [2, t('orders.step2')],
            [3, t('orders.step3')],
          ].map(([num, label]) => (
            <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: step < num ? 0.4 : 1 }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: step >= num ? colors.accent : 'var(--gray-200)',
                color: step >= num ? 'white' : 'var(--gray-500)',
                fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
              }}>{num}</div>
              <span style={{ fontSize: '0.8rem', fontWeight: step === num ? 700 : 500, color: step === num ? colors.accent : 'var(--gray-500)', whiteSpace: 'nowrap' }}>{label}</span>
              {num < 3 && <span style={{ color: 'var(--gray-300)', margin: '0 4px' }}>›</span>}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>

          {/* Step 1: Details */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  {t('orders.title_label')} *
                </label>
                <input className="form-input" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder={t('orders.title_placeholder')} style={{ '--role-accent': colors.accent }} />
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  {t('orders.purpose_label')} *
                </label>
                <textarea rows={3} className="form-input" value={purpose} onChange={e => setPurpose(e.target.value)}
                  placeholder={t('orders.purpose_placeholder')}
                  style={{ '--role-accent': colors.accent, resize: 'vertical' }} />
              </div>
              {error && <div style={{ color: '#DC2626', fontSize: '0.875rem' }}>⚠️ {error}</div>}
            </div>
          )}

          {/* Step 2: Item Selection */}
          {step === 2 && (
            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', marginBottom: '16px' }}>
                {t('orders.select_vendor')}
              </div>
              {vendors.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px 0' }}>
                  <div className="empty-state-icon">🏪</div>
                  <h3>{t('orders.no_open_vendors')}</h3>
                </div>
              ) : (
                vendors.map(vendor => (
                  <div key={vendor.id} style={{ marginBottom: '16px', border: '1.5px solid var(--gray-200)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 16px', background: '#F8FAFC', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.1rem' }}>🍽️</span>
                      <strong style={{ fontSize: '0.9rem' }}>{vendor.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#059669', background: '#DCFCE7', padding: '1px 8px', borderRadius: '10px', fontWeight: 700 }}>Open</span>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                      {vendor.menu.map(item => {
                        const qty = quantities[item.id] || 0;
                        return (
                          <div key={item.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 16px',
                            background: qty > 0 ? '#EFF6FF' : 'transparent',
                            transition: 'background 0.15s',
                          }}>
                            <div>
                              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.name}</span>
                              <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.8125rem', marginLeft: '10px' }}>₹{item.price}</span>
                              <span style={{ color: 'var(--gray-400)', fontSize: '0.75rem', marginLeft: '4px' }}>{item.unit}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button onClick={() => setQty(item, qty - 1)} disabled={qty === 0}
                                style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--gray-300)', background: qty > 0 ? colors.accent : 'var(--gray-100)', color: qty > 0 ? 'white' : 'var(--gray-400)', cursor: qty > 0 ? 'pointer' : 'not-allowed', fontSize: '1rem', lineHeight: 1 }}>
                                −
                              </button>
                              <input type="number" min={0} value={qty} onChange={e => setQty(item, e.target.value)}
                                style={{ width: '44px', textAlign: 'center', border: '1px solid var(--gray-200)', borderRadius: '6px', padding: '3px', fontSize: '0.875rem', fontWeight: 700 }} />
                              <button onClick={() => setQty(item, qty + 1)}
                                style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
              {selectedItems.length > 0 && (
                <div style={{ padding: '10px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', fontSize: '0.875rem', color: '#1D4ED8', fontWeight: 600 }}>
                  ✅ {selectedItems.length} item type(s) · {totalItems} {t('orders.total_items')} selected
                </div>
              )}
              {error && <div style={{ color: '#DC2626', fontSize: '0.875rem', marginTop: '8px' }}>⚠️ {error}</div>}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div>
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'var(--surface-1)', borderRadius: '10px', border: '1px solid var(--gray-200)' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>{title}</div>
                <div style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>{purpose}</div>
              </div>

              {/* Items grouped by vendor */}
              {vendors.filter(v => selectedItems.some(i => i.vendorId === v.id)).map(vendor => {
                const vendorItems = selectedItems.filter(i => i.vendorId === vendor.id);
                return (
                  <div key={vendor.id} style={{ marginBottom: '12px', border: '1px solid var(--gray-200)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ padding: '8px 14px', background: '#F8FAFC', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--gray-700)' }}>
                      🍽️ {vendor.name}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--gray-50)' }}>
                          <th style={{ padding: '6px 14px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>Item</th>
                          <th style={{ padding: '6px 14px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>Qty</th>
                          <th style={{ padding: '6px 14px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendorItems.map(item => (
                          <tr key={item.id}>
                            <td style={{ padding: '6px 14px', fontSize: '0.875rem', fontWeight: 600 }}>{item.name}</td>
                            <td style={{ padding: '6px 14px', textAlign: 'center', fontSize: '0.875rem' }}>{item.quantity}</td>
                            <td style={{ padding: '6px 14px', textAlign: 'right', fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
                              ₹{item.price} × {item.quantity} = ₹{item.price * item.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}

              <div style={{ padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '0.8125rem', color: '#92400E' }}>
                ⚠️ Prices shown are estimates. Vendor will confirm final prices.
              </div>
              {error && <div style={{ color: '#DC2626', fontSize: '0.875rem', marginTop: '8px' }}>⚠️ {error}</div>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <button onClick={step === 1 ? onClose : () => { setError(''); setStep(s => s - 1); }}
            style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--gray-300)', background: 'white', cursor: 'pointer', fontWeight: 600 }}>
            {step === 1 ? t('common.cancel') : `← ${t('common.back')}`}
          </button>
          <button
            onClick={() => {
              setError('');
              if (step === 1) {
                if (!title.trim() || !purpose.trim()) { setError(t('err.required')); return; }
                setStep(2);
              } else if (step === 2) {
                if (selectedItems.length === 0) { setError('Please select at least one item.'); return; }
                setStep(3);
              } else {
                handleSubmit();
              }
            }}
            disabled={submitting}
            style={{
              padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: colors.accent, color: 'white', fontWeight: 700, fontSize: '0.9rem',
            }}
          >
            {step < 3 ? `${t('common.submit')} →` : (submitting ? '...' : `✅ ${t('orders.submit_approval')}`)}
          </button>
        </div>
      </div>
    </div>
  );
}
