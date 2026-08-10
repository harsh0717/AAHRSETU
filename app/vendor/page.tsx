'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import { getSession, UserProfile, updateSessionLanguage } from '@/lib/auth';
import { getOrders, setVendorPrices, requestVendorModification, rejectVendorOrder, MasterOrder, VendorOrder, OrderItem } from '@/lib/store';
import { getVendorMenu, upsertVendorMenuItem, deleteVendorMenuItem, updateVendorStatus, getVendorById, MenuItem, Vendor } from '@/lib/vendors';
import { ROLE_COLORS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';
import { getNotifications, markNotificationRead, markAllRead, NotificationItem } from '@/lib/notifications';
import { api } from '@/lib/api';
import Link from 'next/link';

import { useRouter } from 'next/navigation';

export default function VendorDashboardPage({ initialTab = 'dashboard' }: { initialTab?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<UserProfile | null>(null);
  const colors = ROLE_COLORS.vendor;

  // Active Tab
  const [activeTab, setActiveTab] = useState(initialTab);

  // Lists
  const [orders, setOrders] = useState<MasterOrder[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [vendorDetails, setVendorDetails] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  // Menu Edit form states
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    price: '',
    unit: 'per plate',
    description: '',
    category: 'General',
    available: true,
    active: true
  });

  // Order pricing input states
  const [pricingOrderId, setPricingOrderId] = useState<string | null>(null);
  const [pricesInput, setPricesInput] = useState<Record<string, string>>({}); // item_name -> price_string

  // Vendor modification state
  const [showModModal, setShowModModal] = useState<string | null>(null); // vendor_order_id
  const [modReason, setModReason] = useState('');
  const [modType, setModType] = useState<'minor' | 'major'>('minor');

  // Profile Edit State
  const [profileName, setProfileName] = useState('');
  const [profileMessage, setProfileMessage] = useState('');

  // Settings State
  const [preferredLang, setPreferredLang] = useState('en');

  const [saving, setSaving] = useState(false);

  async function loadData(vendorId: string) {
    setLoading(true);
    try {
      const [oList, mList, nList, vDetails] = await Promise.all([
        getOrders(),
        getVendorMenu(vendorId),
        getNotifications(),
        getVendorById(vendorId)
      ]);
      setOrders(oList);
      setMenu(mList);
      setNotifications(nList);
      setVendorDetails(vDetails);
    } catch (err) {
      console.error('Error loading vendor data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const s = getSession();
    if (!s) {
      window.location.href = '/login';
      return;
    }
    if (s.role !== 'vendor') {
      window.location.href = `/${s.role}`;
      return;
    }
    if (!s.vendor_id) {
      window.location.href = '/login';
      return;
    }
    setSession(s);
    setProfileName(s.name);
    setPreferredLang(s.preferred_language || 'en');
    loadData(s.vendor_id);
  }, []);

  // Listen to hash changes for sidebar navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleHash = () => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        setActiveTab(hash);
      } else {
        setActiveTab('dashboard');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Sync state changes back to hash
  useEffect(() => {
    if (activeTab && window.location.hash !== '#' + activeTab) {
      window.location.hash = activeTab;
    }
  }, [activeTab]);

  if (!session || !session.vendor_id) return null;
  const vendorId = session.vendor_id;

  // Filter orders matching this vendor
  const vendorOrdersList = orders.filter(o => 
    o.vendor_orders && o.vendor_orders.some(vo => vo.vendor_id === vendorId)
  );

  // Splits for orders tabs
  const incomingOrders = vendorOrdersList.filter(o => {
    const myVO = o.vendor_orders.find(vo => vo.vendor_id === vendorId);
    return (o.status === 'Vendor Processing' || o.status === 'DCR Approved') && myVO && myVO.status === 'Pending';
  });

  const activeOrders = vendorOrdersList.filter(o => {
    const myVO = o.vendor_orders.find(vo => vo.vendor_id === vendorId);
    return ['Vendor Processing', 'Vendor Clarification Required', 'Coordinator Updated'].includes(o.status) && myVO && myVO.status === 'Pending';
  });

  const completedOrders = vendorOrdersList.filter(o => {
    const myVO = o.vendor_orders.find(vo => vo.vendor_id === vendorId);
    return ['Vendor Confirmed', 'Bill Generated', 'Completed'].includes(o.status) || (myVO && myVO.status === 'Vendor Confirmed');
  });

  const modificationRequests = vendorOrdersList.filter(o => {
    const myVO = o.vendor_orders.find(vo => vo.vendor_id === vendorId);
    return myVO && myVO.modification !== null;
  });

  const ordersWithBills = vendorOrdersList.filter(o => ['Bill Generated', 'Completed'].includes(o.status));

  // Compute stats
  const totalEarnings = completedOrders.reduce((sum, o) => {
    const myVO = o.vendor_orders.find(vo => vo.vendor_id === vendorId);
    return sum + (myVO ? myVO.bill_amount : 0);
  }, 0);

  const pendingPricingCount = incomingOrders.length;
  const activeOrdersCount = activeOrders.length;
  const completedOrdersCount = completedOrders.length;

  const totalMenuItemsCount = menu.length;
  const activeItemsCount = menu.filter(m => m.active).length;
  const availableItemsCount = menu.filter(m => m.active && m.available).length;
  const outOfStockItemsCount = menu.filter(m => m.active && !m.available).length;

  // Menu Handlers
  function openAddMenuItem() {
    setMenuForm({ name: '', price: '', unit: 'per plate', description: '', category: 'General', available: true, active: true });
    setEditItem(null);
    setShowMenuModal(true);
  }

  function openEditMenuItem(item: MenuItem) {
    setMenuForm({
      name: item.name,
      price: String(item.price),
      unit: item.unit,
      description: item.description || '',
      category: item.category || 'General',
      available: item.available,
      active: item.active
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
        description: menuForm.description.trim(),
        category: menuForm.category.trim(),
        available: menuForm.available,
        active: menuForm.active
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

  async function handleToggleStatus(statusStr: string) {
    setLoading(true);
    try {
      await updateVendorStatus(vendorId, statusStr);
      await loadData(vendorId);
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    } finally {
      setLoading(false);
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

  async function handleQuickApprove(vendorOrderId: string) {
    setSaving(true);
    try {
      const myVO = orders.flatMap(o => o.vendor_orders).find(v => v.id === vendorOrderId);
      const pricingPayload: Record<string, number> = {};
      if (myVO) {
        myVO.items.forEach(it => {
          pricingPayload[it.name] = it.price > 0 ? it.price : 15.0;
        });
      }
      await setVendorPrices(vendorOrderId, pricingPayload);
      alert('Order approved & bill generated in 1-Click!');
      await loadData(vendorId);
    } catch (e: any) {
      alert(e.message || 'Error approving order.');
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickReject(vendorOrderId: string) {
    if (confirm('Reject this canteen order?')) {
      setSaving(true);
      try {
        await rejectVendorOrder(vendorOrderId, 'Vendor unable to fulfill kitchen order.');
        alert('Canteen sub-order rejected successfully.');
        await loadData(vendorId);
      } catch (e: any) {
        alert(e.message || 'Error rejecting order.');
      } finally {
        setSaving(false);
      }
    }
  }

  // Modifications
  function initModRequest(vendorOrderId: string) {
    setShowModModal(vendorOrderId);
    setModReason('');
    setModType('minor');
  }

  async function handleSendModRequest(vendorOrderId: string) {
    if (!modReason.trim()) return;
    setSaving(true);
    try {
      await requestVendorModification(vendorOrderId, modReason.trim(), modType);
      alert('Modification request sent successfully.');
      setShowModModal(null);
      await loadData(vendorId);
    } catch (e: any) {
      alert(e.message || 'Error requesting modification');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileName.trim() || !session) return;
    setSaving(true);
    setProfileMessage('');
    try {
      const updatedUser = await api.put<UserProfile>(`/users/${session.id}`, { name: profileName.trim() });
      const newSession = { ...session, name: updatedUser.name };
      setSession(newSession);
      localStorage.setItem('aharsetu_session', JSON.stringify(newSession));
      setProfileMessage(t('profile.updated_success'));
      setTimeout(() => setProfileMessage(''), 3000);
    } catch (err: any) {
      setProfileMessage(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLanguageChange(lang: string) {
    setPreferredLang(lang);
    if (session) {
      await updateSessionLanguage(lang);
      window.location.reload();
    }
  }

  async function handleMarkNotification(id: string) {
    await markNotificationRead(id);
    const nList = await getNotifications();
    setNotifications(nList);
  }

  async function handleMarkAllNotifications() {
    await markAllRead();
    const nList = await getNotifications();
    setNotifications(nList);
  }

  return (
    <AppShell role="vendor" currentPath="/vendor">
      <div style={{ '--role-accent': colors.accent } as React.CSSProperties}>
        
        {/* Header Section */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--gray-900)' }}>
            {vendorDetails?.name || 'Canteen Vendor Portal'} — {t(`vendor.tab_title_${activeTab}`, 'Dashboard')}
          </h1>
          <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
            {t(`vendor.tab_sub_${activeTab}`, 'Manage canteen menu availability, incoming orders, and revenue settlement.')}
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px', animation: 'spin 1s infinite linear' }}>🔄</div>
            <div>{t('common.loading', 'Loading details...')}</div>
          </div>
        ) : (
          <div>
            {/* TAB: DASHBOARD OVERVIEW */}
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* SETUP VALIDATION COMPONENT */}
                <div className="card" style={{ padding: '20px', borderLeft: `6px solid ${vendorDetails?.status === 'open' ? '#10B981' : '#EF4444'}`, background: '#FFFFFF' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '8px' }}>⚙️ Canteen Operational Status</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--gray-800)' }}>
                        Canteen State: <span style={{ color: vendorDetails?.status === 'open' ? '#10B981' : '#EF4444', textTransform: 'capitalize' }}>{vendorDetails?.status}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: '4px' }}>
                        {vendorDetails?.status === 'open' 
                          ? 'Your canteen is open. Coordinators can order menu items.' 
                          : 'Your canteen is closed. Coordinators cannot select your menu for new orders.'}
                      </div>
                    </div>
                    {vendorDetails?.status === 'closed' && (
                      <button className="btn btn-primary" onClick={() => handleToggleStatus('open')}>
                        🔓 Open Canteen
                      </button>
                    )}
                    {vendorDetails?.status === 'open' && (
                      <button className="btn btn-ghost" style={{ border: '1px solid #EF4444', color: '#EF4444' }} onClick={() => handleToggleStatus('closed')}>
                        🔒 Close Canteen
                      </button>
                    )}
                  </div>

                  <hr style={{ margin: '16px 0', borderColor: 'var(--gray-100)' }} />

                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '8px' }}>🍽️ Menu Requisite Status</h3>
                  {totalMenuItemsCount === 0 ? (
                    <div style={{ background: '#FEF2F2', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: '#DC2626', fontWeight: 600 }}>⚠️ No menu items found. Please define at least one menu item.</span>
                      <button className="btn btn-primary btn-sm" onClick={() => { setActiveTab('menu'); openAddMenuItem(); }}>
                        🍽️ Create Menu Item
                      </button>
                    </div>
                  ) : activeItemsCount > 0 && availableItemsCount === 0 ? (
                    <div style={{ background: '#FFFBEB', padding: '12px', borderRadius: '8px', color: '#D97706', fontSize: '0.8rem', fontWeight: 600 }}>
                      ⚠️ All menu items are currently marked Out-of-Stock. Please update availability.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                      <div style={{ background: 'var(--gray-50)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{totalMenuItemsCount}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>Total Seeded Items</div>
                      </div>
                      <div style={{ background: '#ECFDF5', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669' }}>{activeItemsCount}</div>
                        <div style={{ fontSize: '0.7rem', color: '#059669' }}>Active Items</div>
                      </div>
                      <div style={{ background: '#EFF6FF', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563EB' }}>{availableItemsCount}</div>
                        <div style={{ fontSize: '0.7rem', color: '#2563EB' }}>Available / In Stock</div>
                      </div>
                      <div style={{ background: '#FEF2F2', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#DC2626' }}>{outOfStockItemsCount}</div>
                        <div style={{ fontSize: '0.7rem', color: '#DC2626' }}>Out of Stock</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                  {[
                    { label: 'Incoming Orders (Pending Price)', value: pendingPricingCount, color: '#D97706', icon: '📥' },
                    { label: 'Active Processing Orders', value: activeOrdersCount, color: '#3B82F6', icon: '📋' },
                    { label: 'Settled Completed Orders', value: completedOrdersCount, color: '#10B981', icon: '✅' },
                    { label: 'Consolidated Earnings', value: `₹${totalEarnings.toFixed(2)}`, color: '#10B981', icon: '💰' }
                  ].map((s, idx) => (
                    <div key={idx} className="card" style={{ padding: '16px 20px', borderTop: `4px solid ${s.color}`, background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{s.icon}</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gray-900)' }}>{s.value}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: INCOMING ORDERS (SET PRICING) */}
            {activeTab === 'incoming' && (
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px' }}>📥 Price Finalization Requests</h3>
                {incomingOrders.map(o => {
                  const myVO = o.vendor_orders.find(vo => vo.vendor_id === vendorId);
                  if (!myVO) return null;
                  
                  const isPricingThis = pricingOrderId === o.id;

                  return (
                    <div key={o.id} style={{ border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--gray-800)' }}>{o.title}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Order ID: {o.id} | Department: {o.department_label}</div>
                        </div>
                        <StatusBadge status={myVO.status} size="sm" />
                      </div>

                      <div style={{ background: 'var(--gray-50)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-500)', textAlign: 'left' }}>
                              <th style={{ paddingBottom: '6px' }}>Item Name</th>
                              <th style={{ paddingBottom: '6px', textAlign: 'center' }}>Quantity</th>
                              <th style={{ paddingBottom: '6px', textAlign: 'right' }}>Unit price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myVO.items.map((item, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                                <td style={{ padding: '6px 0', fontWeight: 600 }}>{item.name}</td>
                                <td style={{ padding: '6px 0', textAlign: 'center' }}>{item.quantity} {item.unit ? `(${item.unit})` : ''}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right' }}>
                                  {isPricingThis ? (
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="form-input"
                                      style={{ width: '80px', textAlign: 'right', display: 'inline-block', padding: '4px' }}
                                      value={pricesInput[item.name] || ''}
                                      onChange={e => setPricesInput({ ...pricesInput, [item.name]: e.target.value })}
                                    />
                                  ) : (
                                    <span>₹{item.price || 'Pending'}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleQuickApprove(myVO.id)} disabled={saving}>
                          ✅ Approve Order (1-Click)
                        </button>
                        <button className="btn btn-ghost btn-sm" style={{ color: '#DC2626', border: '1px solid #FECACA', background: '#FEF2F2' }} onClick={() => handleQuickReject(myVO.id)} disabled={saving}>
                          ❌ Reject Order
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => initModRequest(myVO.id)} disabled={saving}>
                          🔄 Request Modification
                        </button>
                      </div>
                    </div>
                  );
                })}
                {incomingOrders.length === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-400)' }}>
                    No pricing requests awaiting action.
                  </div>
                )}
              </div>
            )}

            {/* TAB: ACTIVE ORDERS (IN PROCESSING) */}
            {activeTab === 'active' && (
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px' }}>📋 Active Processing Pipeline</h3>
                {activeOrders.map(o => {
                  const myVO = o.vendor_orders.find(vo => vo.vendor_id === vendorId);
                  if (!myVO) return null;

                  return (
                    <div key={o.id} style={{ border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '16px', marginBottom: '16px', cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--gray-800)' }}>{o.title}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Order ID: {o.id} | Coordinator: {o.created_by_name}</div>
                        </div>
                        <StatusBadge status={o.status} size="sm" />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>Items: {myVO.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}</span>
                        <strong style={{ fontSize: '0.9rem', color: colors.accent }}>₹{myVO.bill_amount.toFixed(2)}</strong>
                      </div>
                    </div>
                  );
                })}
                {activeOrders.length === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-400)' }}>
                    No active processing orders.
                  </div>
                )}
              </div>
            )}

            {/* TAB: COMPLETED ORDERS */}
            {activeTab === 'completed' && (
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px' }}>✅ Settled Orders History</h3>
                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Title</th>
                        <th>Department</th>
                        <th>Completed Date</th>
                        <th style={{ textAlign: 'right' }}>Total Bill</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedOrders.map(o => {
                        const myVO = o.vendor_orders.find(vo => vo.vendor_id === vendorId);
                        return (
                          <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>
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
                            No settled orders found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: MODIFICATION REQUESTS */}
            {activeTab === 'modifications' && (
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px' }}>🔄 Modification Requests Log</h3>
                {modificationRequests.map(o => {
                  const myVO = o.vendor_orders.find(vo => vo.vendor_id === vendorId);
                  if (!myVO || !myVO.modification) return null;

                  return (
                    <div key={o.id} style={{ border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <strong>{o.title} (ID: {o.id})</strong>
                        <StatusBadge status={myVO.modification.status} size="sm" />
                      </div>
                      <div style={{ fontSize: '0.8rem', background: '#F8FAFC', padding: '10px', borderRadius: '8px', color: 'var(--gray-700)', marginBottom: '8px' }}>
                        <strong>Reason:</strong> {myVO.modification.reason}
                        <br />
                        <strong>Type:</strong> <span style={{ textTransform: 'capitalize' }}>{myVO.modification.type} Modification</span>
                      </div>
                      <button className="btn btn-ghost btn-sm" style={{ color: colors.accent }} onClick={() => router.push(`/order/${o.id}`)}>
                        Go to order details page
                      </button>
                    </div>
                  );
                })}
                {modificationRequests.length === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-400)' }}>
                    No modifications request active.
                  </div>
                )}
              </div>
            )}

            {/* TAB: MENU MANAGEMENT */}
            {activeTab === 'menu' && (
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>🍽️ Canteen Menu Sheet</h3>
                  <button className="btn btn-primary btn-sm" onClick={openAddMenuItem}>
                    ➕ Create Menu Item
                  </button>
                </div>

                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Item Name</th>
                        <th>Description</th>
                        <th>Price</th>
                        <th>Unit</th>
                        <th>Stock status</th>
                        <th>Active status</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menu.map(item => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{item.category}</td>
                          <td style={{ fontWeight: 700 }}>{item.name}</td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--gray-500)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description || 'No description'}</td>
                          <td style={{ fontWeight: 700 }}>₹{item.price}</td>
                          <td>{item.unit}</td>
                          <td>
                            <span style={{ 
                              padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                              background: item.available ? '#DCFCE7' : '#FEF2F2',
                              color: item.available ? '#15803D' : '#991B1B'
                            }}>
                              {item.available ? 'In Stock' : 'Out of Stock'}
                            </span>
                          </td>
                          <td>
                            <span style={{ 
                              padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                              background: item.active ? '#EFF6FF' : '#F4F4F5',
                              color: item.active ? '#1E40AF' : '#52525B'
                            }}>
                              {item.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }} onClick={() => openEditMenuItem(item)}>
                                ✏️
                              </button>
                              <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', color: '#EF4444' }} onClick={() => handleDeleteMenuItem(item.id)}>
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: AVAILABILITY */}
            {activeTab === 'availability' && (
              <div className="card" style={{ padding: '20px', maxWidth: '500px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px' }}>⚡ Operational Availability Settings</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Status</label>
                    <select className="form-input" value={vendorDetails?.status} onChange={e => handleToggleStatus(e.target.value)}>
                      <option value="open">Open (Available for new orders)</option>
                      <option value="closed">Closed (Unavailable for new orders)</option>
                      <option value="temporarily_unavailable">Temporarily Unavailable</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: REVENUE */}
            {activeTab === 'revenue' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'start' }}>
                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💰</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10B981' }}>
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

            {/* TAB: BILLS / INVOICES */}
            {activeTab === 'bills' && (
              <div className="card" style={{ padding: '20px' }}>
                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Title Description</th>
                        <th>Billing Date</th>
                        <th style={{ textAlign: 'right' }}>Your Subtotal</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersWithBills.map(o => {
                        const myVO = o.vendor_orders.find(vo => vo.vendor_id === vendorId);
                        return (
                          <tr key={o.id}>
                            <td style={{ fontWeight: 700 }}>{o.id}</td>
                            <td style={{ fontWeight: 600 }}>{o.title}</td>
                            <td style={{ fontSize: '0.8rem' }}>{o.bill_generated_at ? new Date(o.bill_generated_at).toLocaleDateString('en-IN') : new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{myVO ? myVO.bill_amount.toFixed(2) : '0.00'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <Link href={`/bill/${o.id}`} className="btn btn-ghost btn-sm" style={{ color: colors.accent, fontWeight: 700 }}>
                                🧾 Print Bill
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                      {ordersWithBills.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                            No bills or invoices finalized.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>🔔 Received Alerts</h3>
                  {notifications.filter(n => !n.read).length > 0 && (
                    <button className="btn btn-ghost btn-sm text-primary" onClick={handleMarkAllNotifications}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {notifications.map(n => (
                    <div key={n.id} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: n.read ? '#FAFAFA' : 'var(--sidebar-bg)', border: '1px solid var(--sidebar-border)', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.2rem' }}>🔔</span>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: n.read ? 500 : 700, color: 'var(--gray-800)' }}>{n.message}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: '2px' }}>{new Date(n.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      {!n.read && (
                        <button className="btn btn-ghost btn-sm" style={{ color: colors.accent }} onClick={() => handleMarkNotification(n.id)}>
                          Check Read
                        </button>
                      )}
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-400)' }}>
                      No alerts or notifications recorded.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: PROFILE */}
            {activeTab === 'profile' && (
              <div className="card" style={{ padding: '20px', maxWidth: '500px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px' }}>👤 Canteen Manager Profile</h3>
                <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Name</label>
                    <input type="text" className="form-input" value={profileName} onChange={e => setProfileName(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Email Address</label>
                    <input type="email" className="form-input" value={session.email} disabled style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }} />
                  </div>
                  <button type="submit" disabled={saving} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                    {saving ? 'Updating...' : 'Save Profile'}
                  </button>
                  {profileMessage && <div style={{ fontSize: '0.8rem', fontWeight: 600, color: profileMessage.includes('successfully') ? '#10B981' : '#EF4444', marginTop: '6px' }}>{profileMessage}</div>}
                </form>
              </div>
            )}

            {/* TAB: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="card" style={{ padding: '20px', maxWidth: '500px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px' }}>⚙️ Dashboard Settings</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Preferred Language / भाषा पसंद</label>
                    <select className="form-input" value={preferredLang} onChange={e => handleLanguageChange(e.target.value)}>
                      <option value="en">English (English)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="gu">ગુજરાતી (Gujarati)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Menu Item Add/Edit Modal */}
        {showMenuModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '420px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--gray-200)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800 }}>
                {editItem ? '✏️ Edit Menu Item' : '➕ Add Menu Item'}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>
                    Category
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Snacks, Beverages, Breakfast, Meals"
                    value={menuForm.category}
                    onChange={e => setMenuForm({ ...menuForm, category: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>
                    Item Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Masala Tea"
                    value={menuForm.name}
                    onChange={e => setMenuForm({ ...menuForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>
                    Description
                  </label>
                  <textarea
                    className="form-input"
                    style={{ height: '60px', resize: 'none' }}
                    placeholder="e.g. Rich cardamom and ginger infused milk tea"
                    value={menuForm.description}
                    onChange={e => setMenuForm({ ...menuForm, description: e.target.value })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="e.g. 15.00"
                      value={menuForm.price}
                      onChange={e => setMenuForm({ ...menuForm, price: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>
                      Unit
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. per cup, per piece, per plate"
                      value={menuForm.unit}
                      onChange={e => setMenuForm({ ...menuForm, unit: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={menuForm.available}
                      onChange={e => setMenuForm({ ...menuForm, available: e.target.checked })}
                    />
                    Available / In Stock
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={menuForm.active}
                      onChange={e => setMenuForm({ ...menuForm, active: e.target.checked })}
                    />
                    Active / In Use
                  </label>
                </div>
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
