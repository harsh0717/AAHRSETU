'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import { getSession, UserProfile, updateSessionLanguage, updateUserProfile, uploadAvatar } from '@/lib/auth';
import { getOrders, MasterOrder } from '@/lib/store';
import { ROLE_COLORS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';
import { getNotifications, markNotificationRead, markAllRead, NotificationItem } from '@/lib/notifications';
import BrandLogo from '@/components/BrandLogo';
import ImageCropperModal from '@/components/ImageCropperModal';

export default function DCRDashboardPage({ initialTab = 'dashboard' }: { initialTab?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<UserProfile | null>(null);
  const colors = ROLE_COLORS.dcr;

  // Active Tab
  const [activeTab, setActiveTab] = useState(initialTab);

  // Lists
  const [orders, setOrders] = useState<MasterOrder[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  const loadDataRef = useRef<((silent?: boolean) => Promise<void>) | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const oList = await getOrders().catch((err) => {
        console.error('Error fetching orders:', err);
        return [];
      });
      const nList = await getNotifications().catch((err) => {
        console.error('Error fetching notifications:', err);
        return [];
      });
      setOrders(oList);
      setNotifications(nList);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Keep a stable ref so the interval always calls the latest version
  useEffect(() => { loadDataRef.current = loadData; }, [loadData]);

  // Load session & data
  useEffect(() => {
    const s = getSession();
    if (!s) {
      window.location.href = '/login';
      return;
    }
    if (s.role !== 'dcr') {
      window.location.href = `/${s.role}`;
      return;
    }
    setSession(s);
    setProfileName(s.name);
    setProfileMobile(s.mobile_number || '');
    setPreferredLang(s.preferred_language || 'en');
    loadData();

    // WebSocket-driven sync
    const handleOrderChanged = () => { loadData(true); };

    // Cross-tab real-time sync (same browser)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'aharsetu_orders_v3' || e.key === 'aharsetu_notifications_v3.7') {
        loadData(true);
      }
    };

    // Cross-device sync: poll every 10 seconds silently
    const syncInterval = setInterval(() => {
      loadDataRef.current?.(true);
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
    setSubmitting(true);
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
      setSubmitting(false);
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

  if (!session) return null;

  // DCR pending orders (Principal Approved / DCR Reviewing)
  const pendingQueue = orders.filter(o => ['Principal Approved', 'DCR Reviewing'].includes(o.status));
  const approvedOrders = orders.filter(o => o.history.some(h => h.role === 'dcr' && h.action === 'DCR Approved & Forwarded'));
  const rejectedOrders = orders.filter(o => o.history.some(h => h.role === 'dcr' && h.action === 'DCR Rejected'));
  const historyOrders = orders.filter(o => !['Created', 'Sent for Approval', 'Principal Reviewing', 'Principal Approved', 'DCR Reviewing'].includes(o.status));
  const ordersWithBills = orders.filter(o => ['Bill Generated', 'Completed'].includes(o.status));

  // Compute Stats
  const totalPending = pendingQueue.length;
  const totalApproved = approvedOrders.length;
  const totalRejected = rejectedOrders.length;

  // Department-wise audit reports data
  const deptAuditSummary: Record<string, { count: number; total: number; label: string }> = {};
  orders.forEach(o => {
    if (o.history.some(h => h.role === 'dcr')) {
      const dept = o.department_label || o.department_id || 'Unknown';
      if (!deptAuditSummary[dept]) {
        deptAuditSummary[dept] = { count: 0, total: 0, label: dept };
      }
      deptAuditSummary[dept].count += 1;
      deptAuditSummary[dept].total += o.total_bill_amount;
    }
  });
  const deptAuditRows = Object.values(deptAuditSummary);

  return (
    <AppShell role="dcr" currentPath="/dcr">
      <div style={{ '--role-accent': colors.accent } as React.CSSProperties}>
        
        {/* Title Section with Official Brand Logo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', background: 'white', padding: '20px 24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--gray-900)' }}>
              {t(`dcr.tab_title_${activeTab}`, 'DCR Auditor Dashboard')}
            </h1>
            <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
              {t(`dcr.tab_sub_${activeTab}`, 'Financial budget audits, expenditure reports, and requisition clearing.')}
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
                    { label: t('dcr.stats_pending', 'Pending Audits'), value: totalPending, color: '#D97706', icon: '⏳' },
                    { label: t('dcr.stats_approved', 'Audited & Cleared'), value: totalApproved, color: '#10B981', icon: '✅' },
                    { label: t('dcr.stats_rejected', 'Rejected Budgets'), value: totalRejected, color: '#EF4444', icon: '❌' },
                    { label: 'Total Audited Expenditure (₹)', value: `₹${orders.reduce((sum, o) => sum + (o.total_bill_amount || 0), 0).toFixed(2)}`, color: '#3B82F6', icon: '💰' }
                  ].map((s, idx) => (
                    <div key={idx} className="card" style={{ padding: '16px 20px', borderTop: `4px solid ${s.color}`, background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{s.icon}</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gray-900)' }}>{s.value}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Quick actions & recent items */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px', alignItems: 'start' }}>
                  <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>⏳ Financial Review Queue</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '16px' }}>There are currently {totalPending} order requests awaiting budget verification and clearance.</p>
                    <button className="btn btn-primary" onClick={() => setActiveTab('queue')}>
                      📋 Open Audit Queue
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

            {/* TAB: APPROVAL QUEUE (PENDING AUDITS) */}
            {activeTab === 'queue' && (
              <div className="card" style={{ padding: '20px' }}>
                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Title Description</th>
                        <th>Department</th>
                        <th>Prepared By</th>
                        <th>Estimated Bill</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingQueue.map(o => (
                        <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>
                          <td style={{ fontWeight: 700 }}>{o.id}</td>
                          <td style={{ fontWeight: 600 }}>{o.title}</td>
                          <td>{o.department_label}</td>
                          <td>{o.created_by_name}</td>
                          <td style={{ fontWeight: 700 }}>₹{o.total_bill_amount}</td>
                          <td><StatusBadge status={o.status} size="sm" /></td>
                        </tr>
                      ))}
                      {pendingQueue.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                            No orders currently awaiting audit.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: APPROVED ORDERS */}
            {activeTab === 'approved' && (
              <div className="card" style={{ padding: '20px' }}>
                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Title Description</th>
                        <th>Department</th>
                        <th>Prepared By</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedOrders.map(o => (
                        <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>
                          <td style={{ fontWeight: 700 }}>{o.id}</td>
                          <td style={{ fontWeight: 600 }}>{o.title}</td>
                          <td>{o.department_label}</td>
                          <td>{o.created_by_name}</td>
                          <td><StatusBadge status={o.status} size="sm" /></td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{o.total_bill_amount}</td>
                        </tr>
                      ))}
                      {approvedOrders.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                            No audited and cleared orders.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: REJECTED ORDERS */}
            {activeTab === 'rejected' && (
              <div className="card" style={{ padding: '20px' }}>
                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Title Description</th>
                        <th>Department</th>
                        <th>Prepared By</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rejectedOrders.map(o => (
                        <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>
                          <td style={{ fontWeight: 700 }}>{o.id}</td>
                          <td style={{ fontWeight: 600 }}>{o.title}</td>
                          <td>{o.department_label}</td>
                          <td>{o.created_by_name}</td>
                          <td><StatusBadge status={o.status} size="sm" /></td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{o.total_bill_amount}</td>
                        </tr>
                      ))}
                      {rejectedOrders.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                            No rejected budgets.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: AUDIT HISTORY */}
            {activeTab === 'history' && (
              <div className="card" style={{ padding: '20px' }}>
                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Title Description</th>
                        <th>Department</th>
                        <th>Prepared By</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyOrders.map(o => (
                        <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>
                          <td style={{ fontWeight: 700 }}>{o.id}</td>
                          <td style={{ fontWeight: 600 }}>{o.title}</td>
                          <td>{o.department_label}</td>
                          <td>{o.created_by_name}</td>
                          <td><StatusBadge status={o.status} size="sm" /></td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{o.total_bill_amount}</td>
                        </tr>
                      ))}
                      {historyOrders.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                            No previous audit trails logged.
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
                        <th>Order ID</th>
                        <th>Title Description</th>
                        <th>Billing Date</th>
                        <th style={{ textAlign: 'right' }}>Bill Amount</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
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
                            No invoice sheets found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: REPORTS */}
            {activeTab === 'reports' && (
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px' }}>📊 Department Audit Summary</h3>
                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Department Label</th>
                        <th>Audited Requisitions Count</th>
                        <th style={{ textAlign: 'right' }}>Total Audited Expenditure</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deptAuditRows.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{row.label}</td>
                          <td>{row.count}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{row.total}</td>
                        </tr>
                      ))}
                      {deptAuditRows.length === 0 && (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                            No departmental audit reports available.
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
                      <div style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: 700, marginTop: '2px' }}>🟢 DCR Officer</div>
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

      </div>
    </AppShell>
  );
}
