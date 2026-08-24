'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import { getSession, UserProfile, updateSessionLanguage, updateUserProfile, uploadAvatar } from '@/lib/auth';
import { getOrders, setVendorPrices, requestVendorModification, rejectVendorOrder, MasterOrder, VendorOrder, OrderItem } from '@/lib/store';
import { getVendorMenu, upsertVendorMenuItem, deleteVendorMenuItem, updateVendorStatus, getVendorById, saveCustomFoodImage, MenuItem, Vendor, getVendorMonthlySettlements, VendorMonthlySettlement, getMenuItemName } from '@/lib/vendors';
import { ROLE_COLORS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';
import { getNotifications, markNotificationRead, markAllRead, NotificationItem, localizeNotificationMessage } from '@/lib/notifications';
import BrandLogo from '@/components/BrandLogo';
import ImageCropperModal from '@/components/ImageCropperModal';
import UiverseToggle from '@/components/ui/UiverseToggle';
import UiverseButton from '@/components/ui/UiverseButton';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VendorDashboardPage({ initialTab = 'dashboard' }: { initialTab?: string }) {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [session, setSession] = useState<UserProfile | null>(null);
  const colors = ROLE_COLORS.vendor;

  // Active Tab
  const [activeTab, setActiveTab] = useState(initialTab);

  // Lists
  const [orders, setOrders] = useState<MasterOrder[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [vendorDetails, setVendorDetails] = useState<Vendor | null>(null);
  const [settlements, setSettlements] = useState<VendorMonthlySettlement[]>([]);
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

  // Menu Manager Zomato Search & Category Filters
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('All');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');

  // Order pricing input states
  const [pricingOrderId, setPricingOrderId] = useState<string | null>(null);
  const [pricesInput, setPricesInput] = useState<Record<string, string>>({}); // item_name -> price_string

  // Vendor modification state
  const [showModModal, setShowModModal] = useState<string | null>(null); // vendor_order_id
  const [modReason, setModReason] = useState('');
  const [modType, setModType] = useState<'minor' | 'major'>('minor');

  // Profile Edit State
  const [profileName, setProfileName] = useState('');
  const [profileMobile, setProfileMobile] = useState('');
  const [profileMobileError, setProfileMobileError] = useState('');
  const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState('');
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  // Settings State
  const [preferredLang, setPreferredLang] = useState('en');

  const [saving, setSaving] = useState(false);

  const loadDataRef = useRef<((vendorId: string, silent?: boolean) => Promise<void>) | null>(null);

  const loadData = useCallback(async (vendorId: string, silent = false) => {
    if (!silent) setLoading(true);
    const safetyTimer = !silent ? setTimeout(() => setLoading(false), 2500) : null;
    try {
      const [oList, mList, nList, vDetails, sList] = await Promise.all([
        getOrders().catch(() => []),
        getVendorMenu(vendorId).catch(() => []),
        getNotifications().catch(() => []),
        getVendorById(vendorId).catch(() => null),
        getVendorMonthlySettlements(vendorId).catch(() => [])
      ]);
      setOrders(oList);
      setMenu(mList);
      setNotifications(nList);
      setVendorDetails(vDetails);
      setSettlements(sList);
    } catch (err) {
      console.warn('Error loading vendor data:', err);
    } finally {
      if (safetyTimer) clearTimeout(safetyTimer);
      if (!silent) setLoading(false);
    }
  }, []);

  // Keep a stable ref so the interval always calls the latest version
  useEffect(() => { loadDataRef.current = loadData; }, [loadData]);

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
    setProfileMobile(s.mobile_number || '');
    setPreferredLang(s.preferred_language || 'en');
    loadData(s.vendor_id);

    const vendorId = s.vendor_id;

    // WebSocket-driven sync
    const handleOrderChanged = () => { if (vendorId) loadData(vendorId, true); };

    // Cross-tab real-time sync (same browser)
    const handleStorageChange = (e: StorageEvent) => {
      if (vendorId && (e.key === 'aharsetu_orders_v3' || e.key === 'aharsetu_notifications_v3.7')) {
        loadData(vendorId, true);
      }
    };

    // Cross-device sync: poll every 10 seconds silently
    const syncInterval = setInterval(() => {
      loadDataRef.current?.(vendorId, true);
    }, 10000);

    window.addEventListener('aharsetu_order_changed', handleOrderChanged);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('aharsetu_order_changed', handleOrderChanged);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Listen to hash changes for sidebar navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleHash = () => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        setActiveTab(hash);
      } else {
        setActiveTab(initialTab || 'dashboard');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [initialTab]);

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
      if (i.menu_item_id) {
        inputs[i.menu_item_id] = String(i.price || '');
      }
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
    const reason = prompt('Please enter the reason for declining this order (e.g. out of ingredients, beyond capacity):', 'Vendor unable to fulfill kitchen order due to capacity/stock.');
    if (reason === null) return; // User cancelled prompt
    setSaving(true);
    try {
      await rejectVendorOrder(vendorOrderId, reason.trim() || 'Vendor unable to fulfill kitchen order.');
      alert('Canteen sub-order declined.');
      await loadData(vendorId);
    } catch (e: any) {
      alert(e.message || 'Error rejecting order.');
    } finally {
      setSaving(false);
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
    if (profileMobile) {
      const digits = profileMobile.replace(/\D/g, '');
      if (digits.length !== 10) {
        setProfileMobileError('Mobile number must be exactly 10 digits');
        return;
      }
      setProfileMobileError('');
    }
    setSaving(true);
    setProfileMessage('');
    try {
      if (profileAvatarFile) {
        await uploadAvatar(profileAvatarFile);
        setProfileAvatarFile(null);
      }
      const mobileDigits = profileMobile.replace(/\D/g, '') || null;
      const updated = await updateUserProfile({ name: profileName.trim(), mobile_number: mobileDigits });
      setSession(updated);
      setProfileMessage('Profile updated successfully!');
      setTimeout(() => setProfileMessage(''), 4000);
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
        
        {/* Header Section with Official Brand Logo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', background: 'white', padding: '20px 24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--gray-900)' }}>
              {vendorDetails?.name || 'Canteen Vendor Portal'} — {t(`vendor.tab_title_${activeTab}`, 'Dashboard')}
            </h1>
            <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
              {t(`vendor.tab_sub_${activeTab}`, 'Manage canteen menu availability, incoming orders, and revenue settlement.')}
            </div>
          </div>
          <BrandLogo size={52} />
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
                
                {/* FRIENDLY CANTEEN STATUS BANNER */}
                <div className="card" style={{
                  padding: '24px',
                  borderRadius: '16px',
                  background: vendorDetails?.status === 'open' 
                    ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)' 
                    : 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
                  border: `1px solid ${vendorDetails?.status === 'open' ? '#A7F3D0' : '#FECACA'}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.8rem' }}>{vendorDetails?.status === 'open' ? '🟢' : '🔴'}</span>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                          {vendorDetails?.name || 'Canteen'} is {vendorDetails?.status === 'open' ? 'OPEN for Orders' : 'CLOSED'}
                        </h2>
                      </div>
                      <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: '#475569' }}>
                        {vendorDetails?.status === 'open'
                          ? 'Coordinators can place canteen orders. New orders will appear on your screen instantly.'
                          : 'Canteen is currently closed. Open canteen to start receiving orders.'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggleStatus(vendorDetails?.status === 'open' ? 'closed' : 'open')}
                      style={{
                        background: vendorDetails?.status === 'open' ? '#DC2626' : '#16A34A',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '10px 20px',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                      }}
                    >
                      {vendorDetails?.status === 'open' ? '🔒 Close Canteen' : '🔓 Open Canteen'}
                    </button>
                  </div>
                </div>

                {/* FRIENDLY STATS CARDS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  {[
                    { label: 'New Orders Waiting', value: pendingPricingCount, color: '#F59E0B', icon: '📥', action: () => setActiveTab('incoming') },
                    { label: 'Kitchen In-Progress', value: activeOrdersCount, color: '#2563EB', icon: '👨‍🍳', action: () => setActiveTab('incoming') },
                    { label: 'Orders Completed Today', value: completedOrdersCount, color: '#10B981', icon: '✅', action: () => setActiveTab('incoming') },
                    { label: 'Today\'s Earnings', value: `₹${totalEarnings.toFixed(0)}`, color: '#059669', icon: '💰', action: () => {} }
                  ].map((s, idx) => (
                    <div key={idx} onClick={s.action} style={{
                      background: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '16px',
                      padding: '20px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                      cursor: 'pointer',
                      borderTop: `4px solid ${s.color}`
                    }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{s.icon}</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A' }}>{s.value}</div>
                      <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>{s.label}</div>
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
                    <div key={o.id} style={{
                      background: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '16px',
                      padding: '20px',
                      marginBottom: '16px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                            🍕 Order #{o.order_reference || o.id}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                            🏢 Department: <strong>{o.department_label}</strong> • Requested by {o.created_by_name}
                          </div>
                        </div>
                        <StatusBadge status={myVO.status} size="sm" />
                      </div>

                      {/* Food Items List */}
                      <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                          Items Requested:
                        </div>
                        
                        {isPricingThis ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {myVO.items.map((item, idx) => {
                              const displayName = getMenuItemName(item.menu_item_id, item.name);
                              return (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>
                                  • {displayName} <span style={{ fontWeight: 500, color: '#64748B' }}>(x{item.quantity} {item.unit || 'qty'})</span>
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '0.8rem', color: '#64748B' }}>₹</span>
                                  <input
                                    type="number"
                                    min="1"
                                    step="0.5"
                                    value={pricesInput[item.name] || (item.menu_item_id ? pricesInput[item.menu_item_id] : '') || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPricesInput(prev => ({
                                        ...prev,
                                        [item.name]: val,
                                        ...(item.menu_item_id ? { [item.menu_item_id]: val } : {})
                                      }));
                                    }}
                                    style={{
                                      width: '80px',
                                      height: '32px',
                                      padding: '0 8px',
                                      border: '1px solid #CBD5E1',
                                      borderRadius: '6px',
                                      fontSize: '0.85rem',
                                      textAlign: 'right'
                                    }}
                                    required
                                  />
                                </div>
                              </div>
                            );})}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {myVO.items.map((item, idx) => {
                              const displayName = getMenuItemName(item.menu_item_id, item.name);
                              return (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                                <span style={{ fontWeight: 700, color: '#0F172A' }}>
                                  • {displayName}
                                </span>
                                <span style={{ fontWeight: 800, color: '#2563EB', background: '#EFF6FF', padding: '2px 10px', borderRadius: '999px' }}>
                                  × {item.quantity} {item.unit || 'qty'}
                                </span>
                              </div>
                            );})}
                          </div>
                        )}
                        
                        <div style={{ borderTop: '1px dashed #CBD5E1', marginTop: '12px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                            {isPricingThis ? 'Calculated Total Amount:' : 'Total Estimated Amount:'}
                          </span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#059669' }}>
                            ₹{isPricingThis 
                              ? myVO.items.reduce((acc, i) => acc + ((parseFloat(pricesInput[i.name]) || 0) * i.quantity), 0).toFixed(2)
                              : (myVO.bill_amount > 0 ? myVO.bill_amount.toFixed(2) : (myVO.items.reduce((acc, i) => acc + (i.price * i.quantity), 0) || 150).toFixed(2))}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {isPricingThis ? (
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <UiverseButton
                            variant="primary"
                            isLoading={saving}
                            onClick={() => handleSubmitPricing(myVO.id)}
                            style={{ flex: 1 }}
                          >
                            ✓ Submit Custom Prices
                          </UiverseButton>
                          <UiverseButton
                            variant="secondary"
                            disabled={saving}
                            onClick={() => setPricingOrderId(null)}
                          >
                            Cancel
                          </UiverseButton>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <UiverseButton
                            variant="success"
                            isLoading={saving}
                            onClick={() => handleQuickApprove(myVO.id)}
                            style={{ flex: 1, minWidth: '180px' }}
                          >
                            ✓ Accept & Start Cooking
                          </UiverseButton>
                          <UiverseButton
                            variant="secondary"
                            disabled={saving}
                            onClick={() => initPricingInput(o)}
                          >
                            ⚙️ Custom Pricing
                          </UiverseButton>
                          <UiverseButton
                            variant="outline"
                            disabled={saving}
                            onClick={() => initModRequest(myVO.id)}
                          >
                            ✏️ Request Mod
                          </UiverseButton>
                          <UiverseButton
                            variant="danger"
                            disabled={saving}
                            onClick={() => handleQuickReject(myVO.id)}
                          >
                            🚫 Decline
                          </UiverseButton>
                        </div>
                      )}
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
                        <strong style={{ fontSize: '0.9rem', color: colors.accent }}>
                          ₹{((myVO.bill_amount > 0 ? myVO.bill_amount : myVO.items.reduce((acc, i) => acc + (i.price * i.quantity), 0)) || 0).toFixed(2)}
                        </strong>
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

            {/* TAB: MENU MANAGEMENT (ZOMATO & HOTEL STYLE DISH MANAGER) */}
            {activeTab === 'menu' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Header & Main Add Action */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'white', padding: '20px 24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      🍽️ Restaurant Menu Manager
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '4px 0 0 0' }}>
                      Manage your canteen dishes, upload food photos, and toggle instant stock availability.
                    </p>
                  </div>
                  <button
                    onClick={openAddMenuItem}
                    style={{
                      background: '#2563EB',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px 20px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                    }}
                  >
                    ➕ Add New Dish
                  </button>
                </div>

                {/* Zomato-Style Search & Category Chips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'white', padding: '16px 20px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                  <input
                    type="text"
                    placeholder="🔍 Search dish by name..."
                    value={menuSearchQuery}
                    onChange={e => setMenuSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingTop: '4px' }}>
                    {['All', 'Beverages', 'Snacks', 'Meals', 'Breakfast', 'Desserts'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setMenuCategoryFilter(cat)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '999px',
                          border: menuCategoryFilter === cat ? 'none' : '1px solid #E2E8F0',
                          background: menuCategoryFilter === cat ? '#2563EB' : '#F8FAFC',
                          color: menuCategoryFilter === cat ? 'white' : '#475569',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Zomato Dish Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {menu
                    .filter(item => {
                      const matchesCat = menuCategoryFilter === 'All' || item.category?.toLowerCase() === menuCategoryFilter.toLowerCase();
                      const matchesSearch = item.name.toLowerCase().includes(menuSearchQuery.toLowerCase());
                      return matchesCat && matchesSearch;
                    })
                    .map(item => {
                      const customImg = typeof window !== 'undefined' ? (localStorage.getItem('aharsetu_custom_food_images_v1') ? JSON.parse(localStorage.getItem('aharsetu_custom_food_images_v1') || '{}')[item.id] : null) : null;
                      const defaultEmoji = item.name.toLowerCase().includes('tea') || item.name.toLowerCase().includes('coffee')
                        ? '☕' : item.name.toLowerCase().includes('lunch') || item.name.toLowerCase().includes('thali')
                        ? '🍱' : item.name.toLowerCase().includes('sandwich') || item.name.toLowerCase().includes('burger')
                        ? '🥪' : item.name.toLowerCase().includes('samosa') || item.name.toLowerCase().includes('snack')
                        ? '🥟' : '🍽️';

                      return (
                        <div key={item.id} style={{
                          background: 'white',
                          border: '1px solid #E2E8F0',
                          borderRadius: '16px',
                          overflow: 'hidden',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative'
                        }}>
                          {/* Dish Image Header */}
                          <div style={{
                            height: '140px',
                            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            fontSize: '3.5rem'
                          }}>
                            {customImg ? (
                              <img src={customImg} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span>{defaultEmoji}</span>
                            )}
                            
                            {/* Photo Upload Overlay Button */}
                            <label style={{
                              position: 'absolute',
                              top: '10px',
                              right: '10px',
                              background: 'rgba(15, 23, 42, 0.75)',
                              color: 'white',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              backdropFilter: 'blur(4px)'
                            }}>
                              📷 Photo
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (evt) => {
                                      const res = evt.target?.result as string;
                                      if (res) {
                                        saveCustomFoodImage(item.id, res);
                                        alert(`Food photo updated for ${item.name}!`);
                                        window.location.reload();
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>

                            {/* Category Tag */}
                            <span style={{
                              position: 'absolute',
                              bottom: '10px',
                              left: '10px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              padding: '3px 10px',
                              borderRadius: '6px',
                              background: 'rgba(37, 99, 235, 0.9)',
                              color: 'white',
                              backdropFilter: 'blur(4px)'
                            }}>
                              {item.category || 'General'}
                            </span>
                          </div>

                          {/* Dish Details */}
                          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                {item.name}
                              </h3>
                              <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#2563EB' }}>
                                ₹{item.price}
                              </span>
                            </div>

                            <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 14px 0', flex: 1, lineHeight: 1.4 }}>
                              {item.description || `Fresh ${item.name.toLowerCase()} prepared in canteen.`}
                            </p>

                            {/* Instant Stock Toggle Switch */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
                              <button
                                onClick={async () => {
                                  try {
                                    await upsertVendorMenuItem(vendorId, { ...item, available: !item.available });
                                    const updated = await getVendorMenu(vendorId);
                                    setMenu(updated);
                                  } catch (e: any) {
                                    alert('Error updating stock status');
                                  }
                                }}
                                style={{
                                  background: item.available ? '#ECFDF5' : '#FEF2F2',
                                  color: item.available ? '#059669' : '#DC2626',
                                  border: `1px solid ${item.available ? '#A7F3D0' : '#FECACA'}`,
                                  borderRadius: '999px',
                                  padding: '4px 12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                {item.available ? '🟢 In Stock' : '🔴 Out of Stock'}
                              </button>

                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  onClick={() => openEditMenuItem(item)}
                                  style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '0.8rem', cursor: 'pointer' }}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteMenuItem(item.id)}
                                  style={{ background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '0.8rem', cursor: 'pointer' }}
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* TAB: AVAILABILITY */}
            {activeTab === 'availability' && (
              <div className="card" style={{ padding: '24px', maxWidth: '520px', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px', color: 'var(--gray-900)' }}>
                  ⚡ Operational Availability Settings
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{
                    padding: '16px',
                    borderRadius: '14px',
                    background: vendorDetails?.status === 'open' ? 'rgba(16, 185, 129, 0.08)' : '#F8FAFC',
                    border: `1px solid ${vendorDetails?.status === 'open' ? 'rgba(16, 185, 129, 0.25)' : '#E2E8F0'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0F172A' }}>
                        Kitchen Instant Availability
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                        {vendorDetails?.status === 'open'
                          ? '🟢 Currently OPEN and accepting new requisitions'
                          : '🔴 Currently CLOSED to new department orders'}
                      </div>
                    </div>
                    <UiverseToggle
                      checked={vendorDetails?.status === 'open'}
                      onChange={(checked) => handleToggleStatus(checked ? 'open' : 'closed')}
                      activeColor="#10B981"
                      size="md"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>
                      Detailed Operational Mode
                    </label>
                    <select className="form-input" value={vendorDetails?.status} onChange={e => handleToggleStatus(e.target.value)}>
                      <option value="open">Open (Available for new orders)</option>
                      <option value="closed">Closed (Unavailable for new orders)</option>
                      <option value="temporarily_unavailable">Temporarily Unavailable (Busy kitchen)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: REVENUE */}
            {activeTab === 'revenue' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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

                <div className="card" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '16px' }}>🧾 Monthly Settlements & Accounts Ledger</h3>
                  <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '12px', overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Settlement Period</th>
                          <th style={{ textAlign: 'right' }}>Total Billed Amount</th>
                          <th style={{ textAlign: 'right' }}>Paid Amount</th>
                          <th style={{ textAlign: 'right' }}>Dues Outstanding</th>
                          <th style={{ textAlign: 'center' }}>Status</th>
                          <th>Last Updated Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {settlements.map(s => {
                          const due = s.due_amount;
                          return (
                            <tr key={s.id}>
                              <td style={{ fontWeight: 700 }}>{s.month}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{s.total_amount.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: '#10B981' }}>₹{s.paid_amount.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 800, color: due > 0 ? '#EF4444' : '#10B981' }}>₹{due.toFixed(2)}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '4px 10px',
                                  borderRadius: '9999px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  background: s.status === 'Settled' ? '#ECFDF5' : (s.status === 'Partially Settled' ? '#EFF6FF' : '#FEF2F2'),
                                  color: s.status === 'Settled' ? '#047857' : (s.status === 'Partially Settled' ? '#2563EB' : '#B91C1C')
                                }}>
                                  {s.status}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.78rem', color: '#64748B' }}>{new Date(s.updated_at).toLocaleString('en-IN')}</td>
                            </tr>
                          );
                        })}
                        {settlements.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                              No monthly settlements recorded yet.
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
                  {notifications.map(n => {
                    const loc = localizeNotificationMessage(n, lang);
                    return (
                    <div key={n.id} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: n.read ? '#FAFAFA' : 'var(--sidebar-bg)', border: '1px solid var(--sidebar-border)', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.2rem' }}>🔔</span>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: n.read ? 500 : 700, color: 'var(--gray-800)' }}>{loc.message}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: '2px' }}>{new Date(n.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      {!n.read && (
                        <button className="btn btn-ghost btn-sm" style={{ color: colors.accent }} onClick={() => handleMarkNotification(n.id)}>
                          Check Read
                        </button>
                      )}
                    </div>
                  );})}
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
              <div style={{ maxWidth: '560px' }}>
                <div className="card" style={{ padding: '28px', background: 'white', borderRadius: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #E2E8F0' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', border: '3px solid white', outline: '2px solid #BFDBFE', boxShadow: '0 4px 12px rgba(37,99,235,0.15)' }}>
                      {profileAvatarPreview ? (
                        <img src={profileAvatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : session.avatar_url ? (
                        <img src={`${session.avatar_url}?v=${session.avatar_version || 1}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: 'white', fontSize: '1.8rem', fontWeight: 800 }}>{session.name[0]}</div>
                      )}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{session.name}</h3>
                      <div style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: 700, marginTop: '2px' }}>🟢 Canteen Vendor Manager</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '1px' }}>{session.email}</div>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '8px' }}>Profile Photo</label>
                      <label style={{ cursor: 'pointer', background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', padding: '7px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        📷 {profileAvatarFile ? '✓ Photo Selected — Change' : 'Upload New Photo'}
                        <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) { setProfileMessage('Image must be less than 5MB.'); return; }
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              if (evt.target?.result) {
                                setCropSrc(evt.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                            setProfileMessage('');
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '5px' }}>JPEG, PNG or WEBP • Max 5MB</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Full Name</label>
                      <input type="text" className="form-input" value={profileName} onChange={e => setProfileName(e.target.value)} required placeholder="Your full name" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Mobile Number <span style={{ color: '#94A3B8', fontWeight: 500 }}>(optional)</span></label>
                      <input type="tel" className="form-input" value={profileMobile} onChange={e => { setProfileMobile(e.target.value); setProfileMobileError(''); }} placeholder="10-digit mobile number" maxLength={14} style={{ borderColor: profileMobileError ? '#EF4444' : undefined }} />
                      {profileMobileError && <p style={{ fontSize: '0.76rem', color: '#EF4444', marginTop: '4px' }}>{profileMobileError}</p>}
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Email Address</label>
                      <input type="email" className="form-input" value={session.email} disabled style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Canteen Name</label>
                      <input type="text" className="form-input" value={vendorDetails?.name || 'Main Campus Canteen'} disabled style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }} />
                    </div>
                    <button type="submit" disabled={saving} className="btn btn-primary" style={{ alignSelf: 'flex-start', minWidth: '140px' }}>
                      {saving ? '⏳ Saving...' : '✓ Save Profile'}
                    </button>
                    {profileMessage && <div style={{ fontSize: '0.82rem', fontWeight: 600, color: profileMessage.includes('success') ? '#10B981' : '#EF4444' }}>{profileMessage}</div>}
                  </form>
                  {cropSrc && (
                    <ImageCropperModal
                      imageSrc={cropSrc}
                      onCrop={(croppedFile) => {
                        setProfileAvatarFile(croppedFile);
                        setProfileAvatarPreview(URL.createObjectURL(croppedFile));
                        setCropSrc(null);
                      }}
                      onCancel={() => setCropSrc(null)}
                    />
                  )}
                </div>
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
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '420px', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--gray-200)' }}>
              {/* Modal Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                  ✏️ Request Modification
                </h3>
                <button
                  onClick={() => setShowModModal(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--gray-400)', lineHeight: 1 }}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                {/* Type Selector */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>
                    Type
                  </label>
                  <select
                    className="form-input"
                    value={modType}
                    onChange={e => setModType(e.target.value as any)}
                  >
                    <option value="minor">Minor — Small substitution (e.g. out-of-stock swap, no re-approval needed)</option>
                    <option value="major">Major — Significant change (requires institution re-approval)</option>
                  </select>
                </div>

                {/* Reason Textarea */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '4px' }}>
                    Reason <span style={{ color: '#DC2626' }}>*</span>
                    <span style={{ fontWeight: 400, color: 'var(--gray-500)', marginLeft: '6px' }}>(required)</span>
                  </label>
                  <textarea
                    className="form-input"
                    style={{ height: '90px', resize: 'vertical' }}
                    placeholder="e.g. Samosas out of stock — proposing Samosa-Kachori split instead."
                    value={modReason}
                    onChange={e => setModReason(e.target.value)}
                  />
                  {!modReason.trim() && (
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                      Please describe why you need to modify this order.
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => handleSendModRequest(showModModal)}
                  disabled={saving || !modReason.trim()}
                >
                  {saving ? 'Submitting…' : '📨 Send Request'}
                </button>
                <button
                  onClick={() => setShowModModal(null)}
                  disabled={saving}
                  style={{
                    background: '#F9FAFB',
                    color: 'var(--gray-700)',
                    border: '1px solid var(--gray-300)',
                    borderRadius: '10px',
                    padding: '10px 18px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
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
