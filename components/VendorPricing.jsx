'use client';
import { useState, useEffect } from 'react';
import { getVendorMenu } from '@/lib/vendors';
import { useI18n } from '@/lib/i18n';

export default function VendorPricing({ vendorOrder, onPricesSet }) {
  const { t } = useI18n();
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendorOrder?.items) return;
    // Pre-fill from vendor's menu
    const menu = getVendorMenu(vendorOrder.vendorId);
    const initial = {};
    vendorOrder.items.forEach(item => {
      const menuItem = menu.find(m => m.name === item.name);
      initial[item.name] = item.price > 0 ? item.price : (menuItem?.price || 0);
    });
    setPrices(initial);
    setLoading(false);
  }, [vendorOrder]);

  if (loading) return <div style={{ padding: '16px', color: 'var(--gray-500)' }}>{t('common.loading')}</div>;

  const items = vendorOrder?.items || [];
  const total = items.reduce((s, item) => s + (parseFloat(prices[item.name]) || 0) * item.quantity, 0);
  const allSet = items.every(item => parseFloat(prices[item.name]) > 0);

  return (
    <div>
      <div style={{ fontSize: '0.8rem', color: '#059669', padding: '8px 12px', background: '#ECFDF5', borderRadius: '8px', marginBottom: '12px' }}>
        💡 {t('vendor.prices_prefilled')}
      </div>
      <div className="table-wrapper" style={{ marginBottom: '14px' }}>
        <table className="table">
          <thead>
            <tr>
              <th>{t('vendor.item_name')}</th>
              <th style={{ textAlign: 'center' }}>{t('common.quantity')}</th>
              <th style={{ textAlign: 'right' }}>{t('vendor.item_price')} (₹)</th>
              <th style={{ textAlign: 'right' }}>{t('common.subtotal')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const p = parseFloat(prices[item.name]) || 0;
              return (
                <tr key={item.name}>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>
                    <input
                      type="number"
                      min={0}
                      value={prices[item.name] || ''}
                      onChange={e => setPrices(prev => ({ ...prev, [item.name]: e.target.value }))}
                      style={{
                        width: '80px', padding: '4px 8px', border: '1px solid var(--gray-300)',
                        borderRadius: '6px', textAlign: 'right', fontSize: '0.875rem',
                        background: p > 0 ? 'white' : '#FEF2F2',
                      }}
                      placeholder="0"
                    />
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: p > 0 ? '#047857' : 'var(--gray-400)' }}>
                    {p > 0 ? `₹${(p * item.quantity).toFixed(0)}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--gray-50)' }}>
              <td colSpan={3} style={{ fontWeight: 700, textAlign: 'right' }}>{t('common.total')}</td>
              <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: '#047857' }}>₹{total}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!allSet && (
        <div style={{ fontSize: '0.8125rem', color: '#C2410C', marginBottom: '10px' }}>
          ⚠️ {t('vendor.all_prices_required')}
        </div>
      )}

      <button
        onClick={() => allSet && onPricesSet(prices, total)}
        disabled={!allSet}
        style={{
          padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: allSet ? 'pointer' : 'not-allowed',
          background: allSet ? '#059669' : 'var(--gray-300)',
          color: 'white', fontWeight: 700, fontSize: '0.9rem',
        }}
      >
        ✅ {t('vendor.confirm_order')} — ₹{total}
      </button>
    </div>
  );
}
