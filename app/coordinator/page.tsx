'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import { getSession, UserProfile, updateSessionLanguage } from '@/lib/auth';
import { getOrders, createMasterOrder, MasterOrder } from '@/lib/store';
import { getAvailableMenuByVendor, MenuItem } from '@/lib/vendors';
import { ROLE_COLORS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';
import { getNotifications, markNotificationRead, markAllRead, NotificationItem } from '@/lib/notifications';
import { api } from '@/lib/api';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';

export default function CoordinatorDashboardPage({ initialTab = 'dashboard' }: { initialTab?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<UserProfile | null>(null);
  const colors = ROLE_COLORS.coordinator;

  // Active Tab
  const [activeTab, setActiveTab] = useState(initialTab);

  // API Data
  const [orders, setOrders] = useState<MasterOrder[]>([]);
  const [menuByVendor, setMenuByVendor] = useState<{ id: string; name: string; menu: MenuItem[] }[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Create Order States
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({}); // menu_item_id -> quantity

  // Profile Edit State
  const [profileName, setProfileName] = useState('');
  const [profileMessage, setProfileMessage] = useState('');

  // Settings State
  const [preferredLang, setPreferredLang] = useState('en');

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const oList = await getOrders().catch((err) => {
        console.error('Error fetching orders:', err);
        return [];
      });
      const mList = await getAvailableMenuByVendor().catch((err) => {
        console.error('Error fetching menus:', err);
        return [];
      });
      const nList = await getNotifications().catch((err) => {
        console.error('Error fetching notifications:', err);
        return [];
      });
      setOrders(oList);
      setMenuByVendor(mList);
      setNotifications(nList);
    } catch (err) {
      console.error('Error in coordinator loadData:', err);
    } finally {
      setLoading(false);
    }
  }

  // Load session & initial data
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
    setPreferredLang(s.preferred_language || 'en');
    loadData();

    const handleStatusChange = () => {
      getAvailableMenuByVendor().then(mList => setMenuByVendor(mList)).catch(() => {});
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('aharsetu_vendor_status_changed', handleStatusChange);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('aharsetu_vendor_status_changed', handleStatusChange);
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
      alert(t('coord.order_drafted', 'Order drafted successfully!'));
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
    setSubmitting(true);
    setProfileMessage('');
    try {
      const updatedUser = await api.put<UserProfile>(`/users/${session.id}`, { name: profileName.trim() });
      const newSession = { ...session, name: updatedUser.name };
      setSession(newSession);
      localStorage.setItem('aharsetu_session', JSON.stringify(newSession));
      setProfileMessage(t('profile.updated_success', 'Profile updated successfully!'));
      setTimeout(() => setProfileMessage(''), 3000);
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

  // Filter orders created by this coordinator
  const myOrders = orders.filter(o => o.created_by_id === session.id);

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
  const ordersWithBills = myOrders.filter(o => ['Bill Generated', 'Completed'].includes(o.status));

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
      <div style={{ '--role-accent': colors.accent } as React.CSSProperties}>
        
        {/* Header Section with Official Brand Logo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', background: 'white', padding: '20px 24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--gray-900)' }}>
              {t(`coord.tab_title_${activeTab}`, t('coord.dashboard_title', 'Coordinator Dashboard'))}
            </h1>
            <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
              {t(`coord.tab_sub_${activeTab}`, t('coord.dashboard_sub', 'Institutional order requisition, approvals tracking and billing pipeline.'))}
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
              <div>
                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px', marginBottom: '24px', width: '100%' }}>
                  {[
                    { label: t('coord.stats_total', 'Total Drafts'), value: totalMyOrders, color: '#0284C7', icon: '📦' },
                    { label: t('coord.stats_pending', 'Pending Approvals'), value: totalPending, color: '#EAB308', icon: '⏳' },
                    { label: t('coord.stats_completed', 'Completed Orders'), value: totalCompleted, color: '#10B981', icon: '✅' },
                    { label: t('coord.stats_rejected', 'Rejected Requests'), value: totalRejected, color: '#EF4444', icon: '❌' },
                  ].map((stat, idx) => (
                    <div key={idx} className="card" style={{ padding: '16px 20px', borderTop: `4px solid ${stat.color}`, background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{stat.icon}</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gray-900)', lineHeight: '1.2' }}>{stat.value}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600, marginTop: '2px' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Quick actions & recent items */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                  <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>🚀 Quick Requisitions</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '16px' }}>Need catering for an official event or guest meeting? Open a new requisition instantly.</p>
                    <button className="btn btn-primary" onClick={() => setActiveTab('create')}>
                      ➕ Draft New Requisition
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
              <form onSubmit={handleCreateOrder} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start' }}>
                {/* Menu items list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {menuByVendor.map(v => (
                    <div key={v.id} className="card" style={{ padding: '20px' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px', color: 'var(--gray-800)', borderBottom: '1px solid var(--gray-100)', paddingBottom: '6px' }}>
                        🏪 {v.name}
                      </h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {v.menu.map(item => {
                          const nameKey = `menu.${item.name}`;
                          const translatedName = t(nameKey) !== nameKey ? t(nameKey) : item.name;
                          const formattedUnit = item.unit.toLowerCase().replace(' ', '_');
                          const unitKey = `unit.${formattedUnit}`;
                          const translatedUnit = t(unitKey) !== unitKey ? t(unitKey) : item.unit;
                          
                          return (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                              <div>
                                <strong style={{ color: 'var(--gray-800)' }}>{translatedName}</strong>
                                <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>₹{item.price} / {translatedUnit}</div>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  style={{ width: '28px', height: '28px', padding: 0 }}
                                  onClick={() => handleQtyChange(item.id, (selectedItems[item.id] || 0) - 1)}
                                >
                                  -
                                </button>
                                <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 700 }}>
                                  {selectedItems[item.id] || 0}
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  style={{ width: '28px', height: '28px', padding: 0 }}
                                  onClick={() => handleQtyChange(item.id, (selectedItems[item.id] || 0) + 1)}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {menuByVendor.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)', background: 'white', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
                      {t('coord.no_vendors', 'No vendors are currently open with available menu items.')}
                    </div>
                  )}
                </div>

                {/* Form parameters */}
                <div className="card" style={{ padding: '20px', position: 'sticky', top: '80px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '14px' }}>{t('coord.draft_specs', 'Draft Specifications')}</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>
                        {t('coord.event_title', 'Event Title')}
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={t('coord.event_title_ph', 'e.g. Faculty Senate Meeting')}
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>
                        {t('coord.meeting_purpose', 'Purpose of Meeting')}
                      </label>
                      <textarea
                        className="form-input"
                        style={{ height: '80px', resize: 'none' }}
                        placeholder={t('coord.meeting_ph', 'Brief description of official event')}
                        value={purpose}
                        onChange={e => setPurpose(e.target.value)}
                      />
                    </div>

                    <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '10px', marginTop: '10px' }}>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="btn btn-primary"
                        style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '6px' }}
                      >
                        {submitting ? t('coord.drafting_btn', 'Drafting...') : `🚀 ${t('coord.draft_btn', 'Draft Requisition')}`}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
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
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(o => (
                        <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>
                          <td style={{ fontWeight: 700 }}>{o.id}</td>
                          <td style={{ fontWeight: 600 }}>{o.title}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>{o.purpose}</td>
                          <td style={{ fontSize: '0.8rem' }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                          <td><StatusBadge status={o.status} size="sm" /></td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{o.total_bill_amount}</td>
                        </tr>
                      ))}
                      {filteredOrders.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
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
              <div className="card" style={{ padding: '24px', maxWidth: '560px', background: 'white', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #E2E8F0' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.6rem',
                    fontWeight: 800,
                    overflow: 'hidden'
                  }}>
                    {typeof window !== 'undefined' && localStorage.getItem(`aharsetu_avatar_${session.id}`) ? (
                      <img src={localStorage.getItem(`aharsetu_avatar_${session.id}`)!} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      session.name[0]
                    )}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      {session.name}
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: 700, marginTop: '2px' }}>
                      🟢 Verified Campus Coordinator
                    </div>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Profile Photo</label>
                    <label style={{ cursor: 'pointer', background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, display: 'inline-block' }}>
                      📷 Change Photo
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
                              if (res && typeof window !== 'undefined') {
                                localStorage.setItem(`aharsetu_avatar_${session.id}`, res);
                                alert('Profile photo updated successfully!');
                                window.location.reload();
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Full Name</label>
                    <input type="text" className="form-input" value={profileName} onChange={e => setProfileName(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Email Address</label>
                    <input type="email" className="form-input" value={session.email} disabled style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Assigned Department</label>
                    <input type="text" className="form-input" value={session.department_id || 'Diploma Department'} disabled style={{ background: 'var(--gray-100)', color: 'var(--gray-500)', textTransform: 'capitalize' }} />
                  </div>
                  <button type="submit" disabled={submitting} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                    {submitting ? 'Updating...' : 'Save Profile'}
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

      </div>
    </AppShell>
  );
}
