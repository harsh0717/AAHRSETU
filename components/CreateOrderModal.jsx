'use client';
import { useState } from 'react';
import { DEFAULT_MENU_ITEMS } from '@/lib/constants';
import { getMenu } from '@/lib/store';

const STEP_DETAILS = 1;
const STEP_ITEMS   = 2;
const STEP_REVIEW  = 3;

export default function CreateOrderModal({ onClose, onSubmit, roleAccent }) {
  const [step, setStep]       = useState(STEP_DETAILS);
  const [title, setTitle]     = useState('');
  const [purpose, setPurpose] = useState('');
  const [selectedItems, setSelectedItems] = useState({}); // { itemName: quantity }
  const [customItem, setCustomItem] = useState('');

  const menuItems = typeof window !== 'undefined' ? getMenu() : DEFAULT_MENU_ITEMS;

  function toggleItem(name) {
    setSelectedItems(prev => {
      const next = { ...prev };
      if (next[name]) delete next[name];
      else next[name] = 1;
      return next;
    });
  }

  function setQty(name, qty) {
    const val = Math.max(1, parseInt(qty) || 1);
    setSelectedItems(prev => ({ ...prev, [name]: val }));
  }

  function addCustom() {
    if (!customItem.trim()) return;
    setSelectedItems(prev => ({ ...prev, [customItem.trim()]: 1 }));
    setCustomItem('');
  }

  function buildItems() {
    return Object.entries(selectedItems).map(([name, quantity]) => ({ name, quantity, price: 0 }));
  }

  function handleSubmit() {
    onSubmit({ title, purpose, items: buildItems() });
  }

  const canNext1 = title.trim().length > 2 && purpose.trim().length > 2;
  const canNext2 = Object.keys(selectedItems).length > 0;

  const accentStyle = { '--role-accent': roleAccent || '#2563EB' };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg" style={accentStyle}>
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0 }}>🛒 Create New Order</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem' }}>Step {step} of 3</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: '1.2rem' }}>✕</button>
        </div>

        {/* Step indicator */}
        <div style={{ padding: '16px 28px 0', display: 'flex', gap: '8px' }}>
          {['Order Details', 'Select Items', 'Review & Submit'].map((s, i) => (
            <div key={i} style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: i < step ? 'var(--role-accent)' : 'var(--gray-200)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        <div className="modal-body">
          {/* Step 1: Details */}
          {step === STEP_DETAILS && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                padding: '16px',
                background: 'color-mix(in srgb, var(--role-accent) 8%, transparent)',
                borderRadius: '10px',
                border: '1px solid color-mix(in srgb, var(--role-accent) 15%, transparent)',
                marginBottom: '4px',
              }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--role-accent)', marginBottom: '4px' }}>Step 1: Order Details</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>Provide the order title and purpose</div>
              </div>

              <div className="form-group">
                <label className="form-label">Order Title *</label>
                <input
                  className="form-input"
                  placeholder="e.g. Tea for Morning Meeting"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Purpose / Occasion *</label>
                <textarea
                  className="form-textarea"
                  placeholder="e.g. Weekly staff coordination meeting with department heads"
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 2: Items */}
          {step === STEP_ITEMS && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                padding: '16px',
                background: 'color-mix(in srgb, var(--role-accent) 8%, transparent)',
                borderRadius: '10px',
                border: '1px solid color-mix(in srgb, var(--role-accent) 15%, transparent)',
              }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--role-accent)', marginBottom: '4px' }}>Step 2: Select Items & Quantities</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>Check items and set quantities. Prices will be added by the vendor.</div>
              </div>

              <div style={{ display: 'grid', gap: '8px' }}>
                {menuItems.map(item => {
                  const selected = selectedItems[item.name] !== undefined;
                  return (
                    <div key={item.name} onClick={() => toggleItem(item.name)} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: `1.5px solid ${selected ? 'var(--role-accent)' : 'var(--gray-200)'}`,
                      background: selected ? 'color-mix(in srgb, var(--role-accent) 6%, transparent)' : 'var(--surface-0)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      userSelect: 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '20px', height: '20px',
                          borderRadius: '5px',
                          border: `1.5px solid ${selected ? 'var(--role-accent)' : 'var(--gray-300)'}`,
                          background: selected ? 'var(--role-accent)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: '0.7rem', fontWeight: 700,
                          flexShrink: 0,
                        }}>
                          {selected && '✓'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{item.unit} · Price TBD by vendor</div>
                        </div>
                      </div>
                      {selected && (
                        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--gray-600)', fontWeight: 600 }}>Qty:</label>
                          <input
                            type="number"
                            className="qty-input"
                            value={selectedItems[item.name] || 1}
                            onChange={e => setQty(item.name, e.target.value)}
                            min={1}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Custom item */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  className="form-input"
                  placeholder="Add custom item..."
                  value={customItem}
                  onChange={e => setCustomItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustom()}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-outline btn-sm" onClick={addCustom}>+ Add</button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === STEP_REVIEW && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                padding: '16px',
                background: '#F0FDF4',
                borderRadius: '10px',
                border: '1px solid #BBF7D0',
              }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>Step 3: Review & Submit</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>Please review your order before submitting for approval.</div>
              </div>

              <div className="card" style={{ background: 'var(--surface-1)' }}>
                <h4 style={{ marginBottom: '4px' }}>{title}</h4>
                <p style={{ fontSize: '0.875rem', marginBottom: '16px' }}>{purpose}</p>
                <div className="divider" />
                <table className="table" style={{ border: 'none' }}>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th style={{ textAlign: 'right' }}>Quantity</th>
                      <th style={{ textAlign: 'right' }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(selectedItems).map(([name, qty]) => (
                      <tr key={name}>
                        <td style={{ fontWeight: 500 }}>{name}</td>
                        <td style={{ textAlign: 'right' }}>{qty}</td>
                        <td style={{ textAlign: 'right', color: 'var(--gray-400)', fontSize: '0.8125rem' }}>To be set by vendor</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="divider" />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--gray-500)' }}>Total items:</span>
                  <span style={{ fontWeight: 700 }}>{Object.keys(selectedItems).length} items</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '20px' }}>
          {step > 1 && (
            <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>← Back</button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          {step < STEP_REVIEW ? (
            <button
              className="btn btn-primary"
              onClick={() => setStep(s => s + 1)}
              disabled={step === STEP_DETAILS ? !canNext1 : !canNext2}
            >
              Continue →
            </button>
          ) : (
            <button className="btn btn-success" onClick={handleSubmit}>
              🚀 Submit Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
