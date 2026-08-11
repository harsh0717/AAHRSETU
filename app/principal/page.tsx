'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import { getSession, UserProfile, updateSessionLanguage } from '@/lib/auth';
import { getOrders, MasterOrder } from '@/lib/store';
import { ROLE_COLORS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';
import { getNotifications, markNotificationRead, markAllRead, NotificationItem } from '@/lib/notifications';
import { api } from '@/lib/api';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';

export default function PrincipalDashboardPage({ initialTab = 'dashboard' }: { initialTab?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<UserProfile | null>(null);
  const colors = ROLE_COLORS.principal;

  // Active Tab
  const [activeTab, setActiveTab] = useState(initialTab);

  // Lists
  const [orders, setOrders] = useState<MasterOrder[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Profile Edit State
  const [profileName, setProfileName] = useState('');
  const [profileMessage, setProfileMessage] = useState('');

  // Settings State
  const [preferredLang, setPreferredLang] = useState('en');

  async function loadData() {
    setLoading(true);
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
      setLoading(false);
    }
  }

  // Load session & data
  useEffect(() => {
    const s = getSession();
    if (!s) {
      window.location.href = '/login';
      return;
    }
    if (s.role !== 'principal') {
      window.location.href = `/${s.role}`;
      return;
    }
    setSession(s);
    setProfileName(s.name);
    setPreferredLang(s.preferred_language || 'en');
    loadData();
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

  // Filter orders matching principal's managed departments
  const managedDepts = session.principal_depts || [];
  const deptOrders = orders.filter(o => !session.department_id || !o.department_id || session.department_id === o.department_id || managedDepts.includes(o.department_id));

  // Orders created by this Principal
  const myOrders = orders.filter(o => o.created_by_id === session.id || o.order_source === 'PRINCIPAL');

  // Approval queue (Excludes Principal self-created orders to prevent self-approval)
  const pendingQueue = deptOrders.filter(o => o.created_by_id !== session.id && ['Sent for Approval', 'Principal Reviewing'].includes(o.status));
  const approvedOrders = deptOrders.filter(o => o.history.some(h => h.role === 'principal' && h.action === 'Principal Approved'));
  const rejectedOrders = deptOrders.filter(o => o.history.some(h => h.role === 'principal' && h.action === 'Principal Rejected'));
  const historyOrders = deptOrders.filter(o => !['Created', 'Sent for Approval', 'Principal Reviewing'].includes(o.status));
  const ordersWithBills = deptOrders.filter(o => ['Bill Generated', 'Completed'].includes(o.status));

  // Compute Stats
  const totalPending = pendingQueue.length;
  const totalMyOrders = myOrders.length;
  const totalApproved = approvedOrders.length;

  return (
    <AppShell role="principal" currentPath="/principal">
      <div style={{ '--role-accent': colors.accent } as React.CSSProperties}>
        
        {/* Title Section with Official Brand Logo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', background: 'white', padding: '20px 24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--gray-900)' }}>
              {t(`principal.tab_title_${activeTab}`, 'Principal Dashboard')}
            </h1>
            <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
              {t(`principal.tab_sub_${activeTab}`, 'Institutional order approvals, Principal requisitions and budget oversight.')}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <BrandLogo size={52} />
            <Link href="/coordinator/orders/create" className="btn btn-primary">
              ➕ Create Requisition
            </Link>
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
                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px', marginBottom: '24px', width: '100%' }}>
                  {[
                    { label: t('principal.stats_pending', 'Pending Approvals'), value: totalPending, color: '#818CF8', icon: '⏳' },
                    { label: t('principal.stats_my_orders', 'My Requisitions'), value: totalMyOrders, color: '#3B82F6', icon: '📝' },
                    { label: t('principal.stats_approved', 'Approved Orders'), value: totalApproved, color: '#10B981', icon: '✅' },
                  ].map((s, idx) => (
                    <div key={idx} className="card" style={{ padding: '16px 20px', borderTop: `4px solid ${s.color}`, background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{s.icon}</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gray-900)' }}>{s.value}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Quick actions & recent notifications */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px', alignItems: 'start' }}>
                  <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>⏳ Requisition Review Queue</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '16px' }}>There are currently {totalPending} order requests waiting for your signature approval.</p>
                    <button className="btn btn-primary" onClick={() => setActiveTab('queue')}>
                      📋 Open Approval Queue
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

            {/* TAB: APPROVAL QUEUE */}
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
                        <th>Submitted Date</th>
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
                          <td style={{ fontSize: '0.8rem' }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                          <td><StatusBadge status={o.status} size="sm" /></td>
                        </tr>
                      ))}
                      {pendingQueue.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                            No orders currently awaiting approval.
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
                            No approved orders.
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
                            No rejected orders.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: ORDER HISTORY */}
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
                            No previous reviews logged.
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
                            No invoice sheets generated for your managed departments.
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
                      🟢 Verified Principal / Academic Head
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
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Managed Academic Departments</label>
                    <input type="text" className="form-input" value={managedDepts.join(', ').toUpperCase()} disabled style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }} />
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
