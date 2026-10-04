'use client';
import { useState, useEffect } from 'react';
import { MasterOrder, updateMasterOrder } from '@/lib/store';
import { getAvailableMenuByVendor, getCachedAvailableMenuByVendor, getMenuItem, getMenuItemName, MenuItem } from '@/lib/vendors';
import { showToast } from '@/components/Toast';
import { useI18n } from '@/lib/i18n';

interface EditOrderModalProps {
  order: MasterOrder;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedOrder: MasterOrder) => void;
}

export default function EditOrderModal({ order, isOpen, onClose, onSaved }: EditOrderModalProps) {
  const { t, lang } = useI18n();
  const [title, setTitle] = useState(order.title || '');
  const [purpose, setPurpose] = useState(order.purpose || '');
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [menuByVendor, setMenuByVendor] = useState<Array<{ id: string; name: string; status: string; menu: MenuItem[] }>>(() => {
    if (typeof window !== 'undefined') {
      return getCachedAvailableMenuByVendor();
    }
    return [];
  });
  const [activeVendorTab, setActiveVendorTab] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setTitle(order.title || '');
    setPurpose(order.purpose || '');

    // Extract current items from vendor_orders
    const initialMap: Record<string, number> = {};
    (order.vendor_orders || []).forEach(vo => {
      (vo.items || []).forEach(it => {
        const key = it.menu_item_id || String(it.id);
        initialMap[key] = (initialMap[key] || 0) + it.quantity;
      });
    });
    setSelectedItems(initialMap);

    // Load available menus
    getAvailableMenuByVendor().then(available => {
      setMenuByVendor(available);
      if (available.length > 0) {
        setActiveVendorTab(available[0].id);
      }
    }).catch(err => {
      console.warn('Failed to load vendor menu:', err);
    });
  }, [isOpen, order]);

  if (!isOpen) return null;

  function handleQtyChange(menuItemId: string, nextQty: number) {
    setSelectedItems(prev => {
      const copy = { ...prev };
      if (nextQty <= 0) {
        delete copy[menuItemId];
      } else {
        copy[menuItemId] = nextQty;
      }
      return copy;
    });
  }

  // Calculate totals
  const totalItemCount = Object.values(selectedItems).reduce((sum, q) => sum + q, 0);
  let estimatedTotal = 0;
  Object.entries(selectedItems).forEach(([itemId, qty]) => {
    const itemObj = getMenuItem(itemId);
    const price = itemObj?.price || 15.0;
    estimatedTotal += price * qty;
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please enter an event or requisition title', 'warning');
      return;
    }
    if (totalItemCount === 0) {
      showToast('Please select at least one item for the requisition', 'warning');
      return;
    }

    setSaving(true);
    try {
      const itemsPayload = Object.entries(selectedItems).map(([menu_item_id, quantity]) => ({
        menu_item_id,
        quantity
      }));

      const updated = await updateMasterOrder(order.id, {
        title: title.trim(),
        purpose: purpose.trim(),
        items: itemsPayload,
        department_id: order.department_id || undefined
      });

      showToast(`Requisition ${order.id} updated successfully!`, 'success');
      onSaved(updated);
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update order', 'error');
    } finally {
      setSaving(false);
    }
  }

  const currentVendor = menuByVendor.find(v => v.id === activeVendorTab) || menuByVendor[0];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        background: 'var(--surface-0)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '840px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--gray-200, #E2E8F0)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--surface-1)'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✏️</span> Edit Requisition: {order.id}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500, #64748B)', margin: '4px 0 0' }}>
              Update item quantities, add/remove items, or revise details before DCR final approval.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Title & Purpose Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-700, #334155)', marginBottom: '6px' }}>
                  Requisition Title *
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Department Seminar Refreshments"
                  required
                  style={{ width: '100%', borderRadius: '10px', padding: '10px 12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-700, #334155)', marginBottom: '6px' }}>
                  Purpose / Notes
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  placeholder="e.g. Guest hospitality & faculty snacks"
                  style={{ width: '100%', borderRadius: '10px', padding: '10px 12px' }}
                />
              </div>
            </div>

            {/* Current Selected Items Summary Pill Box */}
            <div style={{ background: 'var(--surface-2)', borderRadius: '14px', padding: '14px 18px', border: '1px solid var(--gray-200, #E2E8F0)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gray-800, #1E293B)' }}>
                  🛒 Selected Items ({totalItemCount} items)
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2563EB' }}>
                  Total: ₹{estimatedTotal.toFixed(0)}
                </span>
              </div>

              {Object.keys(selectedItems).length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: '#94A3B8', textAlign: 'center', padding: '12px 0' }}>
                  No items selected. Choose items below to add to this order.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {Object.entries(selectedItems).map(([id, qty]) => {
                    const itemObj = getMenuItem(id);
                    const name = itemObj?.name || getMenuItemName(id);
                    const price = itemObj?.price || 15.0;
                    return (
                      <div key={id} style={{
                        background: 'var(--surface-0)',
                        border: '1px solid var(--gray-300, #CBD5E1)',
                        borderRadius: '10px',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.82rem'
                      }}>
                        <span style={{ fontWeight: 700, color: 'var(--gray-900, #0F172A)' }}>{name}</span>
                        <span style={{ color: 'var(--gray-500, #64748B)' }}>₹{price} × {qty}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(id, qty - 1)}
                            style={{ width: '22px', height: '22px', borderRadius: '6px', border: '1px solid var(--gray-300, #CBD5E1)', background: 'var(--surface-1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}
                          >
                            −
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(id, qty + 1)}
                            style={{ width: '22px', height: '22px', borderRadius: '6px', border: 'none', background: '#2563EB', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(id, 0)}
                            style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '0 2px', fontSize: '0.9rem' }}
                            title="Remove"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Menu Selection Section */}
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gray-700, #334155)', marginBottom: '10px' }}>
                Add More Items from Canteen Menus:
              </div>

              {/* Vendor Tabs */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--gray-200, #E2E8F0)', paddingBottom: '8px', marginBottom: '14px', overflowX: 'auto' }}>
                {menuByVendor.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setActiveVendorTab(v.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '10px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: activeVendorTab === v.id ? '#2563EB' : '#F1F5F9',
                      color: activeVendorTab === v.id ? 'white' : '#475569',
                      transition: 'all 0.15s'
                    }}
                  >
                    {v.name}
                  </button>
                ))}
              </div>

              {/* Vendor Items Grid */}
              {currentVendor && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                  {currentVendor.menu.map(item => {
                    const qty = selectedItems[item.id] || 0;
                    return (
                      <div
                        key={item.id}
                        style={{
                          border: qty > 0 ? '1.5px solid #2563EB' : '1px solid var(--gray-200, #E2E8F0)',
                          background: qty > 0 ? 'rgba(37, 99, 235, 0.12)' : 'var(--surface-0)',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-900, #0F172A)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#2563EB', fontWeight: 800 }}>
                            ₹{item.price} <span style={{ color: '#94A3B8', fontWeight: 500, fontSize: '0.7rem' }}>/{item.unit || 'serving'}</span>
                          </div>
                        </div>

                        {qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => handleQtyChange(item.id, 1)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '8px',
                              border: '1px solid #2563EB',
                              background: 'var(--surface-0)',
                              color: '#2563EB',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            + Add
                          </button>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.id, qty - 1)}
                              style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid var(--gray-300, #CBD5E1)', background: 'var(--surface-0)', cursor: 'pointer', fontWeight: 800, color: '#2563EB' }}
                            >
                              −
                            </button>
                            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--gray-900, #0F172A)', minWidth: '14px', textAlign: 'center' }}>
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.id, qty + 1)}
                              style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: '#2563EB', color: 'white', cursor: 'pointer', fontWeight: 800 }}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Modal Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--gray-200, #E2E8F0)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            background: 'var(--surface-1)'
          }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              disabled={saving}
              style={{ borderRadius: '10px', padding: '10px 18px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || totalItemCount === 0}
              style={{ borderRadius: '10px', padding: '10px 22px', fontWeight: 800 }}
            >
              {saving ? 'Saving Changes...' : '💾 Save Requisition Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
