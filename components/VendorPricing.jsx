'use client';
import { useState, useEffect } from 'react';
import { getMenu } from '@/lib/store';

export default function VendorPricing({ order, onPricesSet }) {
  const [prices, setPrices] = useState({});
  const menu = typeof window !== 'undefined' ? getMenu() : [];

  useEffect(() => {
    // Pre-fill prices from menu if available
    const initial = {};
    order.items.forEach(item => {
      const menuItem = menu.find(m => m.name.toLowerCase() === item.name.toLowerCase());
      initial[item.name] = item.price > 0 ? item.price : (menuItem ? menuItem.price : 0);
    });
    setPrices(initial);
  }, [order.id]);

  function setPrice(name, val) {
    setPrices(prev => ({ ...prev, [name]: parseFloat(val) || 0 }));
  }

  const total = order.items.reduce((sum, item) => sum + (item.quantity * (prices[item.name] || 0)), 0);
  const allSet = order.items.every(item => (prices[item.name] || 0) > 0);

  return (
    <div style={{
      background: '#ECFDF5',
      border: '1px solid #A7F3D0',
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
          background: '#059669',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', color: '#fff',
        }}>
          ₹
        </div>
        <div>
          <div style={{ fontWeight: 700, color: '#047857' }}>Set Item Prices</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
            Prices are pre-filled from your menu. You can edit them.
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th style={{ textAlign: 'center' }}>Quantity</th>
              <th style={{ textAlign: 'right' }}>Price per Unit (₹)</th>
              <th style={{ textAlign: 'right' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map(item => (
              <tr key={item.name}>
                <td style={{ fontWeight: 600 }}>{item.name}</td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>
                  <input
                    type="number"
                    value={prices[item.name] || ''}
                    onChange={e => setPrice(item.name, e.target.value)}
                    placeholder="0"
                    min={0}
                    style={{
                      width: '90px',
                      padding: '6px 10px',
                      border: '1.5px solid var(--gray-200)',
                      borderRadius: '6px',
                      textAlign: 'right',
                      fontSize: '0.875rem',
                    }}
                  />
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                  ₹{((prices[item.name] || 0) * item.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#D1FAE5' }}>
              <td colSpan={3} style={{ fontWeight: 700, color: '#047857', textAlign: 'right' }}>Total Amount</td>
              <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.125rem', color: '#047857' }}>
                ₹{total.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!allSet && (
        <div style={{ fontSize: '0.8125rem', color: '#D97706', fontWeight: 500 }}>
          ⚠️ Please set prices for all items before confirming.
        </div>
      )}

      <button
        className="btn btn-success"
        disabled={!allSet}
        onClick={() => onPricesSet(prices, total)}
        style={{ alignSelf: 'flex-end' }}
      >
        ✅ Confirm Order & Generate Bill
      </button>
    </div>
  );
}
