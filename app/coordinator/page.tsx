'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import AvatarImage from '@/components/AvatarImage';
import { getSession, initializeApplication, UserProfile, updateSessionLanguage, updateUserProfile, uploadAvatar } from '@/lib/auth';
import { getOrders, createMasterOrder, MasterOrder } from '@/lib/store';
import { getAvailableMenuByVendor, MenuItem } from '@/lib/vendors';
import { ROLE_COLORS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';
import { getNotifications, markNotificationRead, markAllRead, NotificationItem, localizeNotificationMessage } from '@/lib/notifications';
import BrandLogo from '@/components/BrandLogo';
import ImageCropperModal from '@/components/ImageCropperModal';
import EditOrderModal from '@/components/EditOrderModal';
import CancelOrderModal from '@/components/CancelOrderModal';

export default function CoordinatorDashboardPage({ initialTab = 'dashboard' }: { initialTab?: string }) {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [session, setSession] = useState<UserProfile | null>(null);
  const colors = ROLE_COLORS.coordinator;

  // Active Tab
  const [activeTab, setActiveTab] = useState(initialTab);

  // Edit and Cancel Modal States
  const [editingOrder, setEditingOrder] = useState<MasterOrder | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<MasterOrder | null>(null);

  // API Data
  const [orders, setOrders] = useState<MasterOrder[]>([]);
  const [menuByVendor, setMenuByVendor] = useState<{ id: string; name: string; image_url?: string | null; status?: string; menu: MenuItem[] }[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Create Order States
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({}); // menu_item_id -> quantity
  const [createOrderStep, setCreateOrderStep] = useState(1);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

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

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadDataRef = useRef<((silent?: boolean) => Promise<void>) | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    // Safety fallback timer to prevent infinite loading state
    const safetyTimer = !silent ? setTimeout(() => setLoading(false), 2500) : null;
    try {
      const [oList, mList, nList] = await Promise.all([
        getOrders().catch((err) => {
          console.warn('Error fetching orders:', err);
          return [];
        }),
        getAvailableMenuByVendor().catch((err) => {
          console.warn('Error fetching menus:', err);
          return [];
        }),
        getNotifications().catch((err) => {
          console.warn('Error fetching notifications:', err);
          return [];
        })
      ]);
      setOrders(oList);
      setMenuByVendor(mList);
      setNotifications(nList);
    } catch (err) {
      console.warn('Error in coordinator loadData:', err);
    } finally {
      if (safetyTimer) clearTimeout(safetyTimer);
      if (!silent) setLoading(false);
    }
  }, []);

  // Keep a stable ref so the interval always calls the latest version
  useEffect(() => { loadDataRef.current = loadData; }, [loadData]);

  // Load session & initial data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => setIsMobileDevice(window.innerWidth <= 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      window.location.href = '/login';
      return;
    }
    if (s.role !== 'coordinator' && s.role !== 'principal' && s.role !== 'admin') {
      window.location.href = `/${s.role}`;
      return;
    }
    setSession(s);
    setProfileName(s.name);
    setProfileMobile(s.mobile_number || '');
    setPreferredLang(s.preferred_language || 'en');

    // Fetch fresh user profile from DB
    initializeApplication().then((fresh) => {
      if (fresh) {
        setSession(fresh);
        setProfileName(fresh.name);
        setProfileMobile(fresh.mobile_number || '');
        setPreferredLang(fresh.preferred_language || 'en');
      }
    }).catch(() => {});

    loadData();

    const handleStatusChange = () => {
      getAvailableMenuByVendor().then(mList => setMenuByVendor(mList)).catch(() => {});
    };

    const handleProfileChanged = (e?: any) => {
      const fresh = (e?.detail && typeof e.detail === 'object' && e.detail.name) ? e.detail : getSession();
      if (fresh) {
        setSession(fresh);
        setProfileName(fresh.name);
        setProfileMobile(fresh.mobile_number || '');
      }
    };

    // Cross-tab real-time sync (same browser)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'aharsetu_orders_v3' || e.key === 'aharsetu_notifications_v3.7') {
        loadData(true);
      }
    };

    // WebSocket-driven sync
    const handleOrderChanged = () => { loadData(true); };

    // Cross-device sync: poll every 10 seconds silently
    const syncInterval = setInterval(() => {
      loadDataRef.current?.(true);
    }, 10000);

    if (typeof window !== 'undefined') {
      window.addEventListener('aharsetu_vendor_status_changed', handleStatusChange);
      window.addEventListener('aharsetu_vendor_updated', handleStatusChange);
      window.addEventListener('aharsetu_vendors_changed', handleStatusChange);
      window.addEventListener('aharsetu_menu_updated', handleStatusChange);
      window.addEventListener('aharsetu_profile_changed', handleProfileChanged);
      window.addEventListener('aharsetu_session_changed', handleProfileChanged);
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('aharsetu_order_changed', handleOrderChanged);
    }
    return () => {
      clearInterval(syncInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('aharsetu_vendor_status_changed', handleStatusChange);
        window.removeEventListener('aharsetu_vendor_updated', handleStatusChange);
        window.removeEventListener('aharsetu_vendors_changed', handleStatusChange);
        window.removeEventListener('aharsetu_menu_updated', handleStatusChange);
        window.removeEventListener('aharsetu_profile_changed', handleProfileChanged);
        window.removeEventListener('aharsetu_session_changed', handleProfileChanged);
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('aharsetu_order_changed', handleOrderChanged);
      }
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

  function handleQtyChange(itemId: string, qty: number) {
    setSelectedItems(prev => {
      const next = { ...prev };
      if (qty <= 0) delete next[itemId];
      else next[itemId] = qty;
      return next;
    });
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !purpose.trim()) {
      alert(t('coord.required_fields', 'Please fill out title and purpose.'));
      return;
    }

    const itemsPayload = Object.entries(selectedItems).map(([id, qty]) => ({
      menu_item_id: id,
      quantity: qty
    }));

    if (itemsPayload.length === 0) {
      alert(t('coord.select_item_err', 'Please select at least one menu item.'));
      return;
    }

    setSubmitting(true);
    try {
      await createMasterOrder({
        title: title.trim(),
        purpose: purpose.trim(),
        items: itemsPayload
      });
      alert(t('coord.order_drafted', 'Order submitted successfully!'));
      setTitle('');
      setPurpose('');
      setSelectedItems({});
      setActiveTab('orders');
      router.push('/coordinator/orders');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create order.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileName.trim() || !session) return;

    // Validate mobile
    if (profileMobile) {
      const digits = profileMobile.replace(/\D/g, '');
      if (digits.length !== 10) {
        setProfileMobileError('Mobile number must be exactly 10 digits');
        return;
      }
      setProfileMobileError('');
    }

    setSubmitting(true);
    setProfileMessage('');
    try {
      // Upload avatar first if selected
      if (profileAvatarFile) {
        await uploadAvatar(profileAvatarFile);
        setProfileAvatarFile(null);
      }

      // Update name and mobile
      const mobileDigits = profileMobile.replace(/\D/g, '') || null;
      const updated = await updateUserProfile({
        name: profileName.trim(),
        mobile_number: mobileDigits,
      });
      setSession(updated);
      setProfileMessage('Profile updated successfully!');
      setTimeout(() => setProfileMessage(''), 4000);
    } catch (err: any) {
      setProfileMessage(err.message || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLanguageChange(lang: string) {
    setPreferredLang(lang);
    if (session) {
      await updateSessionLanguage(lang);
      // Force page reload to re-instantiate translations instantly
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

  if (!session) return null;

  // Filter orders created by this coordinator (store already pre-filters by role)
  const myOrders = orders.filter(o =>
    o.created_by_id === session.id ||
    o.created_by_name === session.name ||
    (session.department_id && o.department_id === session.department_id)
  );

  // Apply tab filters
  let displayedOrders = myOrders;
  if (activeTab === 'pending') {
    displayedOrders = myOrders.filter(o => !['Completed', 'Principal Rejected', 'DCR Rejected'].includes(o.status));
  } else if (activeTab === 'completed') {
    displayedOrders = myOrders.filter(o => o.status === 'Completed');
  } else if (activeTab === 'rejected') {
    displayedOrders = myOrders.filter(o => ['Principal Rejected', 'DCR Rejected'].includes(o.status));
  }

  // Apply search/status filters for orders table
  const filteredOrders = displayedOrders
    .filter(o => !search || o.title.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase()))
    .filter(o => {
      if (statusFilter === 'All') return true;
      if (statusFilter === 'Draft' || statusFilter === 'Created') return o.status === 'Created' || o.status === 'Draft';
      return o.status === statusFilter;
    });

  // Filter master orders that have invoices generated
  const ordersWithBills = myOrders.filter(o => ['Bill Generated', 'Completed'].includes(o.status) || (o.total_bill_amount > 0 && o.vendor_orders.some(vo => vo.status === 'Vendor Confirmed')));

  // Compute Stats for Dashboard tab
  const totalMyOrders = myOrders.length;
  const totalPending = myOrders.filter(o => !['Completed', 'Principal Rejected', 'DCR Rejected'].includes(o.status)).length;
  const totalCompleted = myOrders.filter(o => o.status === 'Completed').length;
  const totalRejected = myOrders.filter(o => ['Principal Rejected', 'DCR Rejected'].includes(o.status)).length;

  const ALL_STATUSES = [
    'All', 'Draft', 'Created', 'Sent for Approval', 'Principal Reviewing', 'Principal Approved',
    'Principal Rejected', 'DCR Reviewing', 'DCR Approved', 'DCR Rejected', 'Vendor Processing',
    'Vendor Clarification Required', 'Coordinator Updated', 'Vendor Confirmed', 'Bill Generated', 'Completed',
  ];

  return (
    <AppShell role="coordinator" currentPath="/coordinator">
      <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '48px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        
        {/* Enterprise Institutional Top Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: '20px',
          padding: '24px 28px',
          marginBottom: '20px',
          color: 'white',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#0D9488', color: 'white', padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px' }}>
                DEPARTMENT REQUISITIONS
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                {session?.department_id ? `Department: ${session.department_id}` : 'Academic Department'} · FY 2026-27
              </span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, margin: '2px 0 6px', letterSpacing: '-0.5px', color: '#F8FAFC' }}>
              🍽️ Department Coordinator Orders Hub
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94A3B8', maxWidth: '650px' }}>
              Draft official canteen food requisitions, monitor Principal approval milestones, and track invoice statuses.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('create')}
              style={{
                padding: '9px 16px',
                borderRadius: '10px',
                background: '#0D9488',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '0.84rem',
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ➕ Create Requisition
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              style={{
                padding: '9px 16px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#E2E8F0',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              📋 My Orders ({totalMyOrders})
            </button>
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
              <div>
                {/* Executive 3-Tile KPI Summary Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                  gap: '16px',
                  marginBottom: '24px',
                  width: '100%'
                }}>
                  {/* Tile 1: Pending Approvals */}
                  <div style={{
                    background: 'var(--surface-0)',
                    borderRadius: '16px',
                    border: '1.5px solid var(--gray-200, #E2E8F0)',
                    padding: '20px 24px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#D97706', letterSpacing: '0.05em' }}>
                        PENDING APPROVALS
                      </span>
                      <span style={{ background: '#FEF3C7', color: '#92400E', borderRadius: '8px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 800 }}>
                        IN REVIEW PIPELINE
                      </span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: totalPending > 0 ? '#D97706' : '#059669', letterSpacing: '-0.5px' }}>
                      {totalPending}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500, #64748B)', marginTop: '4px' }}>
                      Requisitions awaiting Principal or Admin sign-off
                    </div>
                  </div>

                  {/* Tile 2: Completed Orders */}
                  <div style={{
                    background: 'var(--surface-0)',
                    borderRadius: '16px',
                    border: '1.5px solid #10B981',
                    padding: '20px 24px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803D', letterSpacing: '0.05em' }}>
                        COMPLETED REQUISITIONS
                      </span>
                      <span style={{ background: '#DCFCE7', color: '#15803D', borderRadius: '8px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 800 }}>
                        FULFILLED & SERVED
                      </span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: '#059669', letterSpacing: '-0.5px' }}>
                      {totalCompleted}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500, #64748B)', marginTop: '4px' }}>
                      Successfully delivered campus orders
                    </div>
                  </div>

                  {/* Tile 3: Total Department Volume */}
                  <div style={{
                    background: 'var(--surface-0)',
                    borderRadius: '16px',
                    border: '1.5px solid var(--gray-200, #E2E8F0)',
                    padding: '20px 24px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--gray-600, #475569)', letterSpacing: '0.05em' }}>
                        TOTAL DEPARTMENT ORDERS
                      </span>
                      <span style={{ background: '#CCFBF1', color: '#0F766E', borderRadius: '8px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 800 }}>
                        {totalRejected} REJECTED
                      </span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--gray-900, #0F172A)', letterSpacing: '-0.5px' }}>
                      {totalMyOrders}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500, #64748B)', marginTop: '4px' }}>
                      Lifetime orders recorded for this department
                    </div>
                  </div>
                </div>

                {/* Quick actions & recent items */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                  <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>🚀 Quick Requisitions</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '16px' }}>Need catering for an official event or guest meeting? Open a new requisition instantly.</p>
                    <button className="btn btn-primary" onClick={() => setActiveTab('create')}>
                      ➕ Create New Requisition
                    </button>
                  </div>

                  <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>🔔 Recent Notifications</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {notifications.slice(0, 3).map(n => (
                        <div key={n.id} style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', borderBottom: '1px solid var(--gray-100)', paddingBottom: '6px' }}>
                          <span>🔔</span>
                          <span style={{ color: n.read ? 'var(--gray-600)' : 'var(--gray-900)', fontWeight: n.read ? 500 : 700 }}>{n.message}</span>
                        </div>
                      ))}
                      {notifications.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>No notifications.</div>}
                      <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', padding: 0 }} onClick={() => setActiveTab('notifications')}>
                        View all notifications
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CREATE REQUISITION */}
            {activeTab === 'create' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '20px' }}>
                {isMobileDevice ? (
                  /* Guided Flow on Mobile */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '80px' }}>
                    {/* Visual Progress Steps Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-0)', padding: '16px', borderRadius: '16px', border: '1px solid var(--gray-200, #E2E8F0)', boxShadow: 'var(--shadow-sm)' }}>
                      {[
                        { step: 1, label: 'Details' },
                        { step: 2, label: 'Menu' },
                        { step: 3, label: 'Review' }
                      ].map((s) => (
                        <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            background: createOrderStep === s.step
                              ? 'linear-gradient(135deg, #2563EB, #1D4ED8)'
                              : createOrderStep > s.step ? '#10B981' : '#E2E8F0',
                            color: createOrderStep >= s.step ? 'white' : '#64748B',
                            boxShadow: createOrderStep === s.step ? '0 4px 10px rgba(37,99,235,0.25)' : 'none'
                          }}>
                            {createOrderStep > s.step ? '✓' : s.step}
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: createOrderStep === s.step ? 800 : 600, color: createOrderStep === s.step ? '#1E3A6F' : '#64748B' }}>
                            {s.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Step Content */}
                    {createOrderStep === 1 && (
                      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--surface-0)' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1E3A6F', margin: 0 }}>Step 1: Requisition Details</h3>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '6px' }}>Event / Meeting Title</label>
                          <input type="text" className="form-input" placeholder="e.g. Board of Trustees Lunch" value={title} onChange={e => setTitle(e.target.value)} required />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '6px' }}>Purpose of Request</label>
                          <textarea className="form-input" style={{ height: '90px', resize: 'none' }} placeholder="Provide brief official purpose for approval..." value={purpose} onChange={e => setPurpose(e.target.value)} required />
                        </div>
                        <button
                          type="button"
                          disabled={!title.trim() || !purpose.trim()}
                          className="btn btn-primary"
                          onClick={() => setCreateOrderStep(2)}
                          style={{ minHeight: '44px', width: '100%', marginTop: '8px', justifyContent: 'center' }}
                        >
                          Next: Select Menu Items →
                        </button>
                      </div>
                    )}

                    {createOrderStep === 2 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1E3A6F', margin: 0 }}>Step 2: Add Food Items</h3>
                        {menuByVendor.map(v => (
                          <div key={v.id} style={{ background: 'var(--surface-0)', padding: '16px', borderRadius: '20px', border: '1px solid var(--gray-200, #E2E8F0)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--gray-200, #E2E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {v.image_url ? (
                                  <img src={v.image_url} alt={v.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '100%', height: '100%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800 }}>{v.name[0]}</div>
                                )}
                              </div>
                              <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)' }}>{v.name}</div>
                                <div style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 700 }}>🟢 Open · {v.menu.length} items</div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {v.menu.map(item => {
                                const qty = selectedItems[item.id] || 0;
                                const nameKey = `menu.${item.name}`;
                                const translatedName = t(nameKey) !== nameKey ? t(nameKey) : item.name;
                                const categoryEmoji: Record<string, string> = {
                                  'Beverages': '☕', 'Snacks': '🥪', 'Meals': '🍱', 'Breakfast': '🥞', 'General': '🍽️'
                                };
                                const emoji = categoryEmoji[item.category || 'General'] || '🍽️';

                                return (
                                  <div
                                    key={item.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '12px',
                                      background: qty > 0 ? '#EFF6FF' : '#F8FAFC',
                                      border: qty > 0 ? '1.5px solid #BFDBFE' : '1px solid #F1F5F9',
                                      borderRadius: '14px',
                                      padding: '10px',
                                      transition: 'all 0.15s'
                                    }}
                                  >
                                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'var(--surface-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', border: '1px solid var(--gray-200, #E2E8F0)', overflow: 'hidden' }}>
                                      {item.image_url ? (
                                        <img src={item.image_url} alt={translatedName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      ) : emoji}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{translatedName}</div>
                                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>₹{item.price}</div>
                                    </div>

                                    {/* Qty controls */}
                                    <div>
                                      {qty === 0 ? (
                                        <button
                                          type="button"
                                          className="btn btn-primary btn-sm"
                                          onClick={() => handleQtyChange(item.id, 1)}
                                          style={{ padding: '6px 14px', borderRadius: '8px', minHeight: '36px' }}
                                        >
                                          + Add
                                        </button>
                                      ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <button
                                            type="button"
                                            onClick={() => handleQtyChange(item.id, qty - 1)}
                                            style={{ width: '32px', height: '32px', background: 'var(--surface-0)', border: '1px solid var(--gray-300, #CBD5E1)', borderRadius: '8px', fontSize: '1rem', fontWeight: 800, color: '#2563EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                          >
                                            −
                                          </button>
                                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--gray-900, #0F172A)', minWidth: '16px', textAlign: 'center' }}>{qty}</span>
                                          <button
                                            type="button"
                                            onClick={() => handleQtyChange(item.id, qty + 1)}
                                            style={{ width: '32px', height: '32px', background: '#2563EB', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 800, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                          >
                                            +
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        {/* Sticky order summary footer */}
                        {Object.values(selectedItems).some(q => q > 0) && (
                          <div
                            style={{
                              position: 'fixed',
                              bottom: '64px',
                              left: 0,
                              right: 0,
                              background: 'rgba(255,255,255,0.96)',
                              backdropFilter: 'blur(12px)',
                              borderTop: '1px solid var(--gray-200, #E2E8F0)',
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
                              zIndex: 900
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--gray-500, #64748B)', fontWeight: 700 }}>
                                {Object.values(selectedItems).filter(q => q > 0).length} Items · {new Set(menuByVendor.filter(v => v.menu.some(i => selectedItems[i.id] > 0)).map(v => v.id)).size} Canteens
                              </div>
                              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--gray-900, #0F172A)' }}>
                                Total: <span style={{ color: '#2563EB' }}>₹{menuByVendor.reduce((total, v) => total + v.menu.filter(i => selectedItems[i.id] > 0).reduce((s, i) => s + selectedItems[i.id] * i.price, 0), 0).toFixed(0)}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => setCreateOrderStep(3)}
                              style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800 }}
                            >
                              Review Order →
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setCreateOrderStep(1)}
                          style={{ minHeight: '44px', width: '100%', justifyContent: 'center', color: 'var(--gray-500, #64748B)', fontWeight: 700 }}
                        >
                          ← Back to Details
                        </button>
                      </div>
                    )}

                    {createOrderStep === 3 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1E3A6F', margin: 0 }}>Step 3: Review & Submit</h3>
                        
                        {/* Event specifications */}
                        <div className="card" style={{ background: 'var(--surface-0)' }}>
                          <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500, #64748B)', marginBottom: '12px' }}>Event Requisition Details</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div>
                              <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700 }}>TITLE</div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)' }}>{title}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700 }}>PURPOSE</div>
                              <div style={{ fontSize: '0.88rem', color: 'var(--gray-700, #334155)', lineHeight: 1.4 }}>{purpose}</div>
                            </div>
                          </div>
                        </div>

                        {/* Selected items card */}
                        <div className="card" style={{ background: 'var(--surface-0)' }}>
                          <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500, #64748B)', marginBottom: '12px' }}>Items Summary</h4>
                          {menuByVendor.map(v => {
                            const vendorItems = v.menu.filter(item => (selectedItems[item.id] || 0) > 0);
                            if (vendorItems.length === 0) return null;
                            const vendorTotal = vendorItems.reduce((sum, item) => sum + (selectedItems[item.id] || 0) * item.price, 0);
                            return (
                              <div key={v.id} style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #EFF6FF' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', marginBottom: '6px' }}>{v.name}</div>
                                {vendorItems.map(item => (
                                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--gray-700, #334155)', marginBottom: '4px' }}>
                                    <span>{selectedItems[item.id]} × {item.name}</span>
                                    <span style={{ fontWeight: 700 }}>₹{(selectedItems[item.id] * item.price).toFixed(0)}</span>
                                  </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--gray-500, #64748B)', marginTop: '6px' }}>
                                  <span>Subtotal</span>
                                  <span style={{ fontWeight: 700 }}>₹{vendorTotal.toFixed(0)}</span>
                                </div>
                              </div>
                            );
                          })}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 900, color: 'var(--gray-900, #0F172A)', marginTop: '10px' }}>
                            <span>Grand Total</span>
                            <span style={{ color: '#2563EB' }}>₹{menuByVendor.reduce((total, v) => total + v.menu.filter(i => selectedItems[i.id] > 0).reduce((s, i) => s + selectedItems[i.id] * i.price, 0), 0).toFixed(0)}</span>
                          </div>
                        </div>

                        {/* Submit CTA */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleCreateOrder}
                            disabled={submitting}
                            style={{ minHeight: '44px', justifyContent: 'center', width: '100%', fontSize: '0.9rem', fontWeight: 800 }}
                          >
                            {submitting ? 'Drafting...' : '🚀 Submit Requisition Request'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setCreateOrderStep(2)}
                            style={{ minHeight: '44px', justifyContent: 'center', width: '100%', color: 'var(--gray-500, #64748B)', fontWeight: 700 }}
                          >
                            ← Back to Select Food
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Standard Two-Column Layout on Desktop */
                  <form onSubmit={handleCreateOrder} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(260px,1fr)', gap: '20px', alignItems: 'start' }}>
                    {/* LEFT: Food menu grouped by vendor */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {menuByVendor.map(v => (
                        <div key={v.id}>
                          {/* Vendor header */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--gray-200, #E2E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {v.image_url ? (
                                <img src={v.image_url} alt={v.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800 }}>{v.name[0]}</div>
                              )}
                            </div>
                            <div>
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)' }}>{v.name}</div>
                              <div style={{ fontSize: '0.72rem', color: '#16A34A', fontWeight: 700 }}>🟢 Open · {v.menu.length} items available</div>
                            </div>
                          </div>

                          {/* Food card grid */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
                            gap: '12px',
                          }}>
                            {v.menu.map(item => {
                              const qty = selectedItems[item.id] || 0;
                              const nameKey = `menu.${item.name}`;
                              const translatedName = t(nameKey) !== nameKey ? t(nameKey) : item.name;
                              const unitKey = `unit.${item.unit.toLowerCase().replace(/ /g,'_')}`;
                              const translatedUnit = t(unitKey) !== unitKey ? t(unitKey) : item.unit;
                              const categoryEmoji: Record<string, string> = {
                                'Beverages': '☕', 'Snacks': '🥪', 'Meals': '🍱', 'Breakfast': '🥞',
                                'General': '🍽️', 'Sweets': '🍮', 'Desserts': '🍮', 'Lunch': '🍱',
                              };
                              const emoji = categoryEmoji[item.category || 'General'] || '🍽️';

                              return (
                                <div
                                  key={item.id}
                                  style={{
                                    background: qty > 0
                                      ? 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)'
                                      : 'white',
                                    border: qty > 0 ? '2px solid #93C5FD' : '1px solid var(--gray-200, #E2E8F0)',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
                                    boxShadow: qty > 0
                                      ? '0 4px 16px rgba(37,99,235,0.14)'
                                      : '0 1px 4px rgba(0,0,0,0.06)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                  }}
                                >
                                  {/* Image / Placeholder */}
                                  <div style={{
                                    height: '100px',
                                    background: qty > 0
                                      ? 'linear-gradient(135deg, #BFDBFE 0%, #93C5FD 100%)'
                                      : 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    position: 'relative',
                                  }}>
                                    {item.image_url ? (
                                      <img
                                        src={item.image_url}
                                        alt={translatedName}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                      />
                                    ) : (
                                      <span style={{ fontSize: '2.8rem', opacity: 0.7 }}>{emoji}</span>
                                    )}
                                    {qty > 0 && (
                                      <div style={{
                                        position: 'absolute', top: '8px', right: '8px',
                                        background: '#2563EB', color: 'white',
                                        borderRadius: '999px', padding: '2px 8px',
                                        fontSize: '0.72rem', fontWeight: 800,
                                      }}>
                                        {qty} added
                                      </div>
                                    )}
                                  </div>

                                  {/* Card body */}
                                  <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)', lineHeight: 1.3 }}>{translatedName}</div>
                                    <div style={{ fontSize: '0.95rem', color: '#2563EB', fontWeight: 800 }}>₹{item.price}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{translatedUnit}</div>
                                  </div>

                                  {/* Quantity controls */}
                                  <div style={{ padding: '8px 12px 12px' }}>
                                    {qty === 0 ? (
                                      <button
                                        type="button"
                                        onClick={() => handleQtyChange(item.id, 1)}
                                        style={{
                                          width: '100%',
                                          padding: '7px',
                                          background: '#2563EB',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '10px',
                                          fontSize: '0.82rem',
                                          fontWeight: 800,
                                          cursor: 'pointer',
                                          transition: 'background 0.15s',
                                        }}
                                        aria-label={`Add ${translatedName}`}
                                      >
                                        + Add
                                      </button>
                                    ) : (
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                        <button
                                          type="button"
                                          onClick={() => handleQtyChange(item.id, qty - 1)}
                                          style={{
                                            width: '34px', height: '34px',
                                            background: 'var(--surface-0)',
                                            border: '1.5px solid #93C5FD',
                                            borderRadius: '10px',
                                            fontSize: '1.1rem',
                                            fontWeight: 800,
                                            color: '#2563EB',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          }}
                                          aria-label="Decrease quantity"
                                        >
                                          −
                                        </button>
                                        <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--gray-900, #0F172A)', minWidth: '20px', textAlign: 'center' }}>{qty}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleQtyChange(item.id, qty + 1)}
                                          style={{
                                            width: '34px', height: '34px',
                                            background: '#2563EB',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '1.1rem',
                                            fontWeight: 800,
                                            color: 'white',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          }}
                                          aria-label="Increase quantity"
                                        >
                                          +
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {menuByVendor.length === 0 && (
                        <div style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--surface-0)', borderRadius: '20px', border: '1px dashed #CBD5E1' }}>
                          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏪</div>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gray-600, #475569)', marginBottom: '6px' }}>No canteen open right now</div>
                          <div style={{ fontSize: '0.82rem', color: '#94A3B8' }}>Vendors will appear here once they set their status to Open.</div>
                        </div>
                      )}
                    </div>

                    {/* RIGHT: Order details + smart summary */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '80px' }}>
                      {/* Event details card */}
                      <div className="card" style={{ padding: '18px', borderRadius: '16px', background: 'var(--surface-0)' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '14px', color: 'var(--gray-900, #0F172A)' }}>{t('coord.draft_specs', 'Requisition Details')}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '5px' }}>{t('coord.event_title', 'Event Title')}</label>
                            <input type="text" className="form-input" placeholder={t('coord.event_title_ph', 'e.g. Faculty Senate Meeting')} value={title} onChange={e => setTitle(e.target.value)} required />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '5px' }}>{t('coord.meeting_purpose', 'Purpose')}</label>
                            <textarea className="form-input" style={{ height: '72px', resize: 'none' }} placeholder={t('coord.meeting_ph', 'Brief description of official event')} value={purpose} onChange={e => setPurpose(e.target.value)} required />
                          </div>
                        </div>
                      </div>

                      {/* Order summary card */}
                      {Object.keys(selectedItems).some(k => selectedItems[k] > 0) && (
                        <div className="card" style={{ padding: '18px', borderRadius: '16px', background: 'var(--surface-0)' }}>
                          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '14px', color: 'var(--gray-900, #0F172A)' }}>🛒 Order Summary</h3>
                          {menuByVendor.map(v => {
                            const vendorItems = v.menu.filter(item => (selectedItems[item.id] || 0) > 0);
                            if (vendorItems.length === 0) return null;
                            const vendorTotal = vendorItems.reduce((sum, item) => sum + (selectedItems[item.id] || 0) * item.price, 0);
                            return (
                              <div key={v.id} style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', paddingBottom: '4px', borderBottom: '1px solid #EFF6FF' }}>{v.name}</div>
                                {vendorItems.map(item => (
                                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.81rem', color: 'var(--gray-700, #334155)', marginBottom: '3px' }}>
                                    <span>{selectedItems[item.id]}× {item.name}</span>
                                    <span style={{ fontWeight: 700 }}>₹{(selectedItems[item.id] * item.price).toFixed(0)}</span>
                                  </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--gray-500, #64748B)', marginTop: '4px' }}>
                                  <span>Subtotal</span>
                                  <span style={{ fontWeight: 700 }}>₹{vendorTotal.toFixed(0)}</span>
                                </div>
                              </div>
                            );
                          })}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)', borderTop: '2px solid #EFF6FF', paddingTop: '10px' }}>
                            <span>Grand Total</span>
                            <span style={{ color: '#2563EB' }}>₹{menuByVendor.reduce((total, v) => total + v.menu.filter(i => selectedItems[i.id] > 0).reduce((s, i) => s + selectedItems[i.id] * i.price, 0), 0).toFixed(0)}</span>
                          </div>
                        </div>
                      )}

                      {/* Submit button */}
                      <button
                        type="submit"
                        disabled={submitting || Object.values(selectedItems).every(q => q === 0)}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '13px', fontSize: '0.9rem', fontWeight: 800, borderRadius: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                      >
                        {submitting ? t('coord.drafting_btn', 'Submitting...') : `🚀 ${t('coord.draft_btn', 'Submit Requisition')}`}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB: LIST REQUISITIONS (My Orders, Pending, Completed, Rejected) */}
            {['orders', 'pending', 'completed', 'rejected'].includes(activeTab) && (
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <input
                    className="form-input"
                    style={{ maxWidth: '240px' }}
                    placeholder={t('coord.search_ph', 'Search by title or ID...')}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  <select
                    className="form-input"
                    style={{ maxWidth: '180px' }}
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                  >
                    {ALL_STATUSES.map(s => (
                      <option key={s} value={s}>
                        {s === 'All' ? t('common.all', 'All Statuses') : (t(`status.${s}`) !== `status.${s}` ? t(`status.${s}`) : s)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t('coord.order_id', 'Order ID')}</th>
                        <th>{t('coord.title_desc', 'Title & Description')}</th>
                        <th>{t('common.purpose', 'Purpose')}</th>
                        <th>{t('coord.created_date', 'Created Date')}</th>
                        <th>{t('common.status', 'Status')}</th>
                        <th style={{ textAlign: 'right' }}>{t('coord.total_bill', 'Estimated Bill')}</th>
                        <th style={{ textAlign: 'center', width: '130px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(o => {
                        const canEdit = ['Draft', 'Created', 'Sent for Approval', 'Principal Rejected'].includes(o.status);
                        const canCancel = ['Draft', 'Created', 'Sent for Approval', 'Principal Reviewing', 'Principal Rejected', 'Principal Approved'].includes(o.status);
                        return (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 700, cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>{o.id}</td>
                          <td style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>{o.title}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)', cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>{o.purpose}</td>
                          <td style={{ fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                          <td style={{ cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}><StatusBadge status={o.status} size="sm" /></td>
                          <td style={{ textAlign: 'right', fontWeight: 700, cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>₹{o.total_bill_amount}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                              {canEdit && (
                                <button
                                  type="button"
                                  title="Edit Requisition"
                                  onClick={(e) => { e.stopPropagation(); setEditingOrder(o); }}
                                  style={{
                                    border: '1px solid #BFDBFE',
                                    background: '#EFF6FF',
                                    color: '#1D4ED8',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  ✏️ Edit
                                </button>
                              )}
                              {canCancel && (
                                <button
                                  type="button"
                                  title="Cancel Requisition"
                                  onClick={(e) => { e.stopPropagation(); setCancellingOrder(o); }}
                                  style={{
                                    border: '1px solid #FECACA',
                                    background: '#FEF2F2',
                                    color: '#DC2626',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  🚫 Cancel
                                </button>
                              )}
                              {!canEdit && !canCancel && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); router.push(`/order/${o.id}`); }}
                                  style={{
                                    border: '1px solid var(--gray-200, #E2E8F0)',
                                    background: 'var(--surface-1)',
                                    color: 'var(--gray-600, #475569)',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  View
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );})}
                      {filteredOrders.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                            {t('coord.no_orders', 'No requisition records found.')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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
                        <th>{t('coord.order_id', 'Order ID')}</th>
                        <th>{t('coord.title_desc', 'Title')}</th>
                        <th>{t('coord.created_date', 'Billing Date')}</th>
                        <th style={{ textAlign: 'right' }}>{t('coord.total_bill', 'Bill Amount')}</th>
                        <th style={{ textAlign: 'center' }}>{t('common.actions', 'Actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersWithBills.map(o => (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 700 }}>{o.id}</td>
                          <td style={{ fontWeight: 600 }}>{o.title}</td>
                          <td style={{ fontSize: '0.8rem' }}>{o.bill_generated_at ? new Date(o.bill_generated_at).toLocaleDateString('en-IN') : new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{o.total_bill_amount}</td>
                          <td style={{ textAlign: 'center' }}>
                            <Link href={`/bill/${o.id}`} className="btn btn-ghost btn-sm" style={{ color: colors.accent, fontWeight: 700 }}>
                              🧾 Print Bill
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {ordersWithBills.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                            No invoice sheets have been generated yet. Invoices are generated once vendors finalize pricing.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: NOTIFICATIONS CENTER */}
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

            {activeTab === 'profile' && (
              <div style={{ maxWidth: '560px' }}>
                <div className="card" style={{ padding: '28px', background: 'var(--surface-0)', borderRadius: '20px' }}>
                  {/* Profile Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--gray-200, #E2E8F0)' }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden',
                        border: '3px solid white', outline: '2px solid #BFDBFE', boxShadow: '0 4px 12px rgba(37,99,235,0.15)'
                      }}>
                        {profileAvatarPreview ? (
                          <img src={profileAvatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <AvatarImage userId={session.id} name={session.name} size={72} />
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)', margin: 0 }}>{session.name}</h3>
                      <div style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: 700, marginTop: '2px' }}>🟢 Campus Coordinator</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500, #64748B)', marginTop: '1px' }}>{session.email}</div>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Avatar Upload */}
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '8px' }}>Profile Photo</label>
                      <label style={{ cursor: 'pointer', background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', padding: '7px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        📷 {profileAvatarFile ? '✓ Photo Selected — Change' : 'Upload New Photo'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          style={{ display: 'none' }}
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

                    {/* Full Name */}
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Full Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={profileName}
                        onChange={e => setProfileName(e.target.value)}
                        required
                        placeholder="Your full name"
                      />
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>
                        Mobile Number <span style={{ color: '#94A3B8', fontWeight: 500 }}>(optional)</span>
                      </label>
                      <input
                        type="tel"
                        className="form-input"
                        value={profileMobile}
                        onChange={e => { setProfileMobile(e.target.value); setProfileMobileError(''); }}
                        placeholder="10-digit mobile number"
                        maxLength={14}
                        style={{ borderColor: profileMobileError ? '#EF4444' : undefined }}
                      />
                      {profileMobileError && <p style={{ fontSize: '0.76rem', color: '#EF4444', marginTop: '4px' }}>{profileMobileError}</p>}
                    </div>

                    {/* Email — read only */}
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Email Address</label>
                      <input type="email" className="form-input" value={session.email} disabled style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }} />
                    </div>

                    {/* Department — read only */}
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Assigned Department</label>
                      <input type="text" className="form-input" value={session.department_id || 'N/A'} disabled style={{ background: 'var(--gray-100)', color: 'var(--gray-500)', textTransform: 'capitalize' }} />
                    </div>

                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ alignSelf: 'flex-start', minWidth: '140px' }}>
                      {submitting ? '⏳ Saving...' : '✓ Save Profile'}
                    </button>
                    {profileMessage && (
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: profileMessage.includes('success') ? '#10B981' : '#EF4444' }}>
                        {profileMessage}
                      </div>
                    )}
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

        {/* Edit and Cancel Requisition Modals */}
        {editingOrder && (
          <EditOrderModal
            order={editingOrder}
            isOpen={!!editingOrder}
            onClose={() => setEditingOrder(null)}
            onSaved={(updated) => {
              setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
              setEditingOrder(null);
            }}
          />
        )}
        {cancellingOrder && (
          <CancelOrderModal
            order={cancellingOrder}
            isOpen={!!cancellingOrder}
            onClose={() => setCancellingOrder(null)}
            onCancelled={(updated) => {
              setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
              setCancellingOrder(null);
            }}
          />
        )}

      </div>
    </AppShell>
  );
}
