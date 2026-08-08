'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import { getSession, UserProfile } from '@/lib/auth';
import { getOrders, setVendorPrices, requestVendorModification, MasterOrder, VendorOrder, OrderItem } from '@/lib/store';
import { getVendorMenu, upsertVendorMenuItem, deleteVendorMenuItem, MenuItem } from '@/lib/vendors';
import { ROLE_COLORS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';
import Link from 'next/link';

export default function VendorDashboardPage() {
  const { t } = useI18n();
  const [session, setSession] = useState<UserProfile | null>(null);
  const colors = ROLE_COLORS.vendor;

  // Active Tab: orders | menu | revenue
  const [activeTab, setActiveTab] = useState('orders');

  // Lists
  const [orders, setOrders] = useState<MasterOrder[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Menu Edit form states
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({ name: '', price: '', unit: 'per plate', available: true });

  // Order pricing input states (selected order for active pricing)
  const [pricingOrderId, setPricingOrderId] = useState<string | null>(null);
  const [pricesInput, setPricesInput] = useState<Record<string, string>>({}); // item_name -> price_string

  // Vendor modification state
  const [showModModal, setShowModModal] = useState<string | null>(null); // vendor_order_id
  const [modReason, setModReason] = useState('');
  const [modType, setModType] = useState<'minor' | 'major'>('minor');

  const [saving, setSaving] = useState(false);

  async function loadData(vendorId: string) {
    setLoading(true);
    try {
      const [oList, mList] = await Promise.all([
        getOrders(),
        getVendorMenu(vendorId)
      ]);
      setOrders(oList);
      setMenu(mList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== 'vendor' || !s.vendor_id) {
      window.location.href = '/login';
      return;
    }
    setSession(s);
    loadData(s.vendor_id);

    if (window.location.hash === '#orders') {
      setActiveTab('orders');
    } else if (window.location.hash === '#menu') {
      setActiveTab('menu');
    } else if (window.location.hash === '#revenue') {
      setActiveTab('revenue');
    }
  }, []);

  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  if (!session || !session.vendor_id) return null;

  const vendorId = session.vendor_id;

  // Filter orders matching this vendor
  const vendorOrdersList = orders.filter(o => 
    o.vendor_orders && o.vendor_orders.some(vo => vo.vendor_id === vendorId)
  );

  // Active / History split
  const activeOrders = vendorOrdersList.filter(o => !['Created', 'Sent for Approval', 'Principal Reviewing', 'Principal Approved', 'Completed'].includes(o.status));
  const completedOrders = vendorOrdersList.filter(o => o.status === 'Completed');

  // Compute stats
  const pendingPricing = activeOrders.filter(o => {
    const myVO = o.vendor_orders.find(vo => vo.vendor_id === vendorId);
    return myVO && myVO.status === 'Pending';
  }).length;

  const totalEarnings = completedOrders.reduce((sum, o) => {
    const myVO = o.vendor_orders.find(vo => vo.vendor_id === vendorId);
    return sum + (myVO ? myVO.bill_amount : 0);
  }, 0);

  // Menu Handlers
  function openAddMenuItem() {
    setMenuForm({ name: '', price: '', unit: 'per plate', available: true });
    setEditItem(null);
    setShowMenuModal(true);
  }

  function openEditMenuItem(item: MenuItem) {
    setMenuForm({
      name: item.name,
      price: String(item.price),
      unit: item.unit,
      available: item.available
    });
    setEditItem(item);
    setShowMenuModal(true);
  }

  async function handleSaveMenuItem() {
    if (!menuForm.name.trim() || !menuForm.price.trim()) return;
    setSaving(true);
    try {
      await upsertVendorMenuItem(vendorId, {
        id: editItem?.id,
        name: menuForm.name.trim(),
        price: menuForm.price,
        unit: menuForm.unit,
        available: menuForm.available
      });
      setShowMenuModal(false);
      const mList = await getVendorMenu(vendorId);
      setMenu(mList);
    } catch (err: any) {
      alert(err.message || 'Error saving menu item.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMenuItem(itemId: string) {
    if (confirm('Delete this menu item?')) {
      setLoading(true);
      try {
        await deleteVendorMenuItem(vendorId, itemId);
        const mList = await getVendorMenu(vendorId);
        setMenu(mList);
      } catch (err: any) {
        alert(err.message || 'Error deleting item');
      } finally {
        setLoading(false);
      }
    }
  }

  // Pricing Submissions
  function initPricingInput(order: MasterOrder) {
    const myVO = order.vendor_orders.find(vo => vo.vendor_id === vendorId);
    if (!myVO) return;
    const inputs: Record<string, string> = {};
    myVO.items.forEach(i => {
      inputs[i.name] = String(i.price || '');
    });
    setPricesInput(inputs);
    setPricingOrderId(order.id);
  }

  async function handleSubmitPricing(vendorOrderId: string) {
    // Validate all items have pricing entered
    const pricingPayload: Record<string, number> = {};
    let valid = true;
    
    Object.entries(pricesInput).forEach(([name, pr]) => {
      const val = parseFloat(pr);
      if (isNaN(val) || val <= 0) {
        valid = false;
      } else {
        pricingPayload[name] = val;
      }
    });

    if (!valid) {
      alert('Please enter valid prices for all items.');
      return;
    }

    setSaving(true);
    try {
      await setVendorPrices(vendorOrderId, pricingPayload);
      alert('Prices submitted successfully.');
      setPricingOrderId(null);
      await loadData(vendorId);
    } catch (e: any) {
      alert(e.message || 'Error saving prices.');
    } finally {
      setSaving(false);
    }
  }

  // Modification Requests
  async function handleSendModRequest(vendorOrderId: string) {
    if (!modReason.trim()) return;
    setSaving(true);
    try {
      await requestVendorModification(vendorOrderId, modReason.trim(), modType);
      alert('Modification request sent to Coordinator.');
      setShowModModal(null);
      setModReason('');
      await loadData(vendorId);
    } catch (e: any) {
      alert(e.message || 'Failed to submit modification request.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell role="vendor" currentPath="/vendor">
      <div style={{ '--role-accent': colors.accent } as React.CSSProperties}>
        
        {/* Title */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px' }}>
            Canteen Vendor Dashboard
          </h1>
          <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
            Confirm pricing on approved institutional orders, submit modifications, and manage your active canteen menu.
          </div>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid var(--gray-200)' }}>
          {[
            { key: 'orders', label: `Orders Queue (${pendingPricing})`, icon: '📋' },
            { key: 'menu', label: 'Canteen Menu', icon: '🍽️' },
            { key: 'revenue', label: 'Earning Analytics', icon: '💰' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.85rem',
                color: activeTab === tab.key ? colors.accent : 'var(--gray-500)',
                borderBottom: activeTab === tab.key ? `3px solid ${colors.accent}` : '3px solid transparent',
                marginBottom: '-2px', transition: 'all 0.15s'
              }}
            >
              <span style={{ marginRight: '6px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px', animation: 'spin 1s infinite linear' }}>🔄</div>
            <div>Loading vendor database...</div>
          </div>
        ) : (
          <div>
            {/* 1. Orders Queue */}
            {activeTab === 'orders' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {activeOrders.map(o => {
                  const myVO = o.vendor_orders.find(vo => vo.vendor_id === vendorId) as VendorOrder;
                  if (!myVO) return null;
                  
                  const isPricing = pricingOrderId === o.id;

                  return (
                    <div key={o.id} className="card" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--gray-200)', paddingBottom: '10px', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem' }}>{o.title}</strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginLeft: '10px' }}>Ref ID: {o.id}</span>
                        </div>
                        <StatusBadge status={myVO.status === 'Pending' ? 'Vendor Processing' : 'Vendor Clarification Required'} size="sm" />
                      </div>

                      {/* Item quantities requested */}
                      {!isPricing ? (
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600)', marginBottom: '8px' }}>Quantities Requested:</div>
                          <ul style={{ paddingLeft: '20px', fontSize: '0.8rem', color: 'var(--gray-700)', margin: '0 0 16px' }}>
                            {myVO.items.map((i, idx) => {
                              const nameKey = `menu.${i.name}`;
                              const translatedName = t(nameKey) !== nameKey ? t(nameKey) : i.name;
                              const formattedUnit = i.unit ? i.unit.toLowerCase().replace(' ', '_') : '';
                              const unitKey = `unit.${formattedUnit}`;
                              const translatedUnit = i.unit ? (t(unitKey) !== unitKey ? t(unitKey) : i.unit) : '';

                              return (
                                <li key={idx}>
                                  <strong>{translatedName}</strong> — Qty: {i.quantity} {translatedUnit ? `(${translatedUnit})` : ''}
                                </li>
                              );
                            })}
                          </ul>
                          
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {myVO.status === 'Pending' && (
                              <button className="btn btn-primary btn-sm" onClick={() => initPricingInput(o)}>
                                🏷️ Enter pricing & Confirm
                              </button>
                            )}
                            {myVO.status === 'Pending' && (
                              <button className="btn btn-ghost btn-sm" onClick={() => setShowModModal(myVO.id)}>
                                🔄 Request Change / Modification
                              </button>
                            )}
                            {myVO.status === 'Clarification Requested' && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--color-warning)', fontWeight: 600 }}>
                                ⏳ Modification review request sent. Awaiting Coordinator resolution.
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        // pricing sheet input form
                        <div>
                          <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: '10px' }}>Pricing Sheet</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                            {myVO.items.map((i, idx) => {
                              const nameKey = `menu.${i.name}`;
                              const translatedName = t(nameKey) !== nameKey ? t(nameKey) : i.name;
                              const formattedUnit = i.unit ? i.unit.toLowerCase().replace(' ', '_') : '';
                              const unitKey = `unit.${formattedUnit}`;
                              const translatedUnit = i.unit ? (t(unitKey) !== unitKey ? t(unitKey) : i.unit) : '';

                              return (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                                  <span>{translatedName} (Qty: {i.quantity} {translatedUnit ? `/ ${translatedUnit}` : ''})</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>₹</span>
                                    <input
                                      type="number"
                                      className="form-input"
                                      style={{ width: '90px', height: '32px', textAlign: 'right' }}
                                      value={pricesInput[i.name] || ''}
                                      onChange={e => setPricesInput(prev => ({ ...prev, [i.name]: e.target.value }))}
                                  />
                                </div>
                              </div>
                              );
                            })}
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => handleSubmitPricing(myVO.id)} disabled={saving}>
                              {saving ? 'Saving Prices...' : 'Confirm Pricing & Generate Invoice'}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setPricingOrderId(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {activeOrders.length === 0 && (
                  <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-400)' }}>
                    No active institutional orders pending in your queue.
                  </div>
                )}
              </div>
            )}

            {/* 2. Manage Menu */}
            {activeTab === 'menu' && (
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>Active Canteen Menu Items</h3>
                  <button className="btn btn-primary btn-sm" onClick={openAddMenuItem}>
                    ➕ Add Menu Item
                  </button>
                </div>

                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Price (INR)</th>
                        <th>Serving Unit</th>
                        <th style={{ textAlign: 'center' }}>Availability</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menu.map(item => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 700 }}>{item.name}</td>
                          <td style={{ fontWeight: 700 }}>₹{item.price.toFixed(2)}</td>
                          <td style={{ color: 'var(--gray-500)' }}>{item.unit}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                              background: item.available ? '#D1FAE5' : '#FEE2E2', color: item.available ? '#065F46' : '#991B1B'
                            }}>
                              {item.available ? 'Available' : 'Out of Stock'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => openEditMenuItem(item)}>Edit</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteMenuItem(item.id)} style={{ color: '#EF4444' }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add/Edit Menu Modal */}
                {showMenuModal && (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '380px', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--gray-200)' }}>
                      <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800 }}>
                        {editItem ? 'Edit Canteen Item' : 'Add New Canteen Item'}
                      </h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Item Name</label>
                          <input type="text" className="form-input" value={menuForm.name} onChange={e => setMenuForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Price (INR)</label>
                          <input type="number" step="0.01" className="form-input" value={menuForm.price} onChange={e => setMenuForm(f => ({ ...f, price: e.target.value }))} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Serving Unit</label>
                          <input type="text" className="form-input" placeholder="e.g. per plate, per cup" value={menuForm.unit} onChange={e => setMenuForm(f => ({ ...f, unit: e.target.value }))} />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                          <input type="checkbox" checked={menuForm.available} onChange={e => setMenuForm(f => ({ ...f, available: e.target.checked }))} />
                          Item is available in canteen
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveMenuItem} disabled={saving}>
                          {saving ? 'Saving...' : 'Save Item'}
                        </button>
                        <button className="btn btn-ghost" onClick={() => setShowMenuModal(false)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Earning Analytics */}
            {activeTab === 'revenue' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'start' }}>
                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💰</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-success)' }}>
                    ₹{totalEarnings.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', fontWeight: 600 }}>CONSOLIDATED CANTEEN EARNINGS</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: '8px' }}>Revenue generated from completed institutional orders.</div>
                </div>

                <div className="card" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>Order Settlement History</h3>
                  <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Title</th>
                          <th>Department</th>
                          <th>Settle Date</th>
                          <th style={{ textAlign: 'right' }}>Earning Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completedOrders.map(o => {
                          const myVO = o.vendor_orders.find(vo => vo.vendor_id === vendorId);
                          return (
                            <tr key={o.id}>
                              <td style={{ fontWeight: 700 }}>{o.id}</td>
                              <td style={{ fontWeight: 600 }}>{o.title}</td>
                              <td>{o.department_label}</td>
                              <td style={{ fontSize: '0.8rem' }}>{new Date(o.updated_at).toLocaleDateString('en-IN')}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-success)' }}>
                                ₹{myVO ? myVO.bill_amount.toFixed(2) : '0.00'}
                              </td>
                            </tr>
                          );
                        })}
                        {completedOrders.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                              No orders settled yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vendor Modification Request Modal */}
        {showModModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '380px', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--gray-200)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800 }}>
                Request Order Modification
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>
                    Type of Modification
                  </label>
                  <select
                    className="form-input"
                    value={modType}
                    onChange={e => setModType(e.target.value as any)}
                  >
                    <option value="minor">Minor Substitution (e.g. out-of-stock swap)</option>
                    <option value="major">Major Change (requires re-approval)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>
                    Reason & Substitution Details
                  </label>
                  <textarea
                    className="form-input"
                    style={{ height: '80px', resize: 'none' }}
                    placeholder="e.g. Samosas out of stock. Can replace with Samosa-Kachori split?"
                    value={modReason}
                    onChange={e => setModReason(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleSendModRequest(showModModal)} disabled={saving}>
                  {saving ? 'Submitting...' : 'Send Request'}
                </button>
                <button className="btn btn-ghost" onClick={() => setShowModModal(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
