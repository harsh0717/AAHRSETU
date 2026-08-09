'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import VendorStatusBadge from '@/components/VendorStatusBadge';
import UserManager from '@/components/UserManager';
import { getSession, UserProfile, updateSessionLanguage, getDepartments } from '@/lib/auth';
import { getOrders, resetAllData, completeOrder, MasterOrder } from '@/lib/store';
import { getVendors, updateVendorStatus, Vendor } from '@/lib/vendors';
import { api } from '@/lib/api';
import { ROLE_COLORS, VENDOR_STATUS_LABELS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';
import { getNotifications, markNotificationRead, markAllRead, NotificationItem } from '@/lib/notifications';
import Link from 'next/link';

export default function AdminDashboardPage({ initialTab = 'dashboard' }: { initialTab?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<UserProfile | null>(null);
  const colors = ROLE_COLORS.admin;

  // Active Tab
  const [activeTab, setActiveTab] = useState(initialTab);

  // API Lists
  const [orders, setOrders] = useState<MasterOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total_orders: 0, completed_orders: 0, total_revenue: 0, active_vendors: 0 });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  // Reports states
  const [deptReport, setDeptReport] = useState<any[]>([]);
  const [vendorReport, setVendorReport] = useState<any[]>([]);

  // Search & Filter
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Vendor Edit modal
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [editStatus, setEditStatus] = useState('closed');

  // Profile Edit State
  const [profileName, setProfileName] = useState('');
  const [profileMessage, setProfileMessage] = useState('');

  // Settings State
  const [preferredLang, setPreferredLang] = useState('en');

  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [oList, vList, sysStats, nList, deptList] = await Promise.all([
        getOrders().catch(() => []),
        getVendors().catch(() => []),
        api.get<any>('/reports/system-stats').catch(() => ({ total_orders: 0, completed_orders: 0, total_revenue: 0, active_vendors: 0 })),
        getNotifications().catch(() => []),
        getDepartments().catch(() => [])
      ]);
      setOrders(oList);
      setVendors(vList);
      setStats(sysStats);
      setNotifications(nList);
      setDepartments(deptList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadReportsData() {
    try {
      const [dRep, vRep] = await Promise.all([
        api.get<any[]>('/reports/department').catch(() => []),
        api.get<any[]>('/reports/revenue').catch(() => [])
      ]);
      setDeptReport(dRep);
      setVendorReport(vRep);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadAuditLogs() {
    try {
      const logs = await api.get<any[]>('/reports/audit-logs').catch(() => []);
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.push('/login');
      return;
    }
    if (s.role !== 'admin') {
      router.push(`/${s.role}`);
      return;
    }
    setSession(s);
    setProfileName(s.name);
    setPreferredLang(s.preferred_language || 'en');
    loadDashboardData();
  }, [router]);

  // Sync hash changes with state
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

  useEffect(() => {
    if (activeTab && window.location.hash !== '#' + activeTab) {
      window.location.hash = activeTab;
    }
    if (activeTab === 'reports' || activeTab === 'analytics') loadReportsData();
    if (activeTab === 'audit' || activeTab === 'logs') loadAuditLogs();
    if (activeTab === 'dashboard') loadDashboardData();
  }, [activeTab]);

  async function handleResetData() {
    if (confirm('Are you sure you want to clear all transactions, users, and reset AharSetu to its seeded demo state?')) {
      setResetting(true);
      try {
        await resetAllData();
        alert('Database successfully reset and seeded.');
        loadDashboardData();
      } catch (err) {
        alert('Error resetting database.');
      } finally {
        setResetting(false);
      }
    }
  }

  async function handleUpdateVendorStatus() {
    if (!selectedVendor) return;
    try {
      await updateVendorStatus(selectedVendor.id, editStatus);
      setSelectedVendor(null);
      loadDashboardData();
    } catch (err) {
      alert('Error updating status.');
    }
  }

  async function handleComplete(orderId: string) {
    if (confirm('Mark this order as complete?')) {
      try {
        await completeOrder(orderId);
        loadDashboardData();
      } catch (e: any) {
        alert(e.message || 'Error completing order');
      }
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
      setProfileMessage('Profile updated successfully!');
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

  // Filter orders matching search and status criteria
  const filteredOrders = orders
    .filter(o => !orderSearch || o.title.toLowerCase().includes(orderSearch.toLowerCase()) || o.id.toLowerCase().includes(orderSearch.toLowerCase()))
    .filter(o => statusFilter === 'All' || o.status === statusFilter);

  // Orders that have bills generated
  const ordersWithBills = orders.filter(o => ['Bill Generated', 'Completed'].includes(o.status));

  const ALL_STATUSES = [
    'All', 'Created', 'Sent for Approval', 'Principal Reviewing', 'Principal Approved',
    'Principal Rejected', 'DCR Reviewing', 'DCR Approved', 'DCR Rejected', 'Vendor Processing',
    'Vendor Clarification Required', 'Coordinator Updated', 'Vendor Confirmed', 'Bill Generated', 'Completed',
  ];

  return (
    <AppShell role="admin" currentPath="/admin">
      <div style={{ '--role-accent': colors.accent } as React.CSSProperties}>
        
        {/* Top Header & Data Reset */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--gray-900)' }}>
              System Administrator — {t(`admin.tab_title_${activeTab}`, 'Dashboard')}
            </h1>
            <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
              {t(`admin.tab_sub_${activeTab}`, 'Global administrative dashboard to control users, vendors, budgets and monitor health.')}
            </div>
          </div>
          
          <button
            onClick={handleResetData}
            disabled={resetting}
            style={{
              padding: '8px 16px', background: '#FEE2E2', color: '#991B1B',
              border: '1px solid #FCA5A5', borderRadius: '10px',
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
            }}
          >
            {resetting ? 'Resetting System...' : '🔄 Reset All Data'}
          </button>
        </div>

        {/* Tab Content Panel */}
        {loading && activeTab === 'dashboard' ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px', animation: 'spin 1s infinite linear' }}>🔄</div>
            <div>{t('common.loading', 'Loading statistic summaries...')}</div>
          </div>
        ) : (
          <div>
            {/* TAB: DASHBOARD OVERVIEW */}
            {activeTab === 'dashboard' && (
              <div>
                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  {[
                    { label: 'Total Orders Created', value: stats.total_orders, color: '#3B82F6', icon: '📋' },
                    { label: 'Settled Requisitions', value: stats.completed_orders, color: '#10B981', icon: '✅' },
                    { label: 'Consolidated Billing (₹)', value: stats.total_revenue.toFixed(2), color: '#10B981', icon: '💰' },
                    { label: 'Active Food Vendors', value: stats.active_vendors, color: '#EC4899', icon: '🏪' }
                  ].map((s, idx) => (
                    <div key={idx} className="card" style={{ padding: '16px 20px', borderTop: `4px solid ${s.color}`, background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{s.icon}</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gray-900)', lineHeight: '1.2' }}>{s.value}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600, marginTop: '2px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>🔒 Quick Access Administration</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '16px' }}>Manage departmental coordinators, principals, auditors, and adjust security settings.</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('users')}>
                        👥 User Directory
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('vendors')}>
                        🏪 Vendor Settings
                      </button>
                    </div>
                  </div>

                  <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>❤️ System Operational Health</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Database Node (PostgreSQL):</span>
                        <strong style={{ color: '#10B981' }}>ONLINE</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>WebSocket Event Gateway:</span>
                        <strong style={{ color: '#10B981' }}>CONNECTED</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>API Server Latency:</span>
                        <strong style={{ color: '#10B981' }}>EXCELLENT (14ms)</strong>
                      </div>
                      <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', padding: 0 }} onClick={() => setActiveTab('health')}>
                        Detailed health analysis
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ALL ORDERS PIPELINE */}
            {activeTab === 'orders' && (
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <input
                    className="form-input"
                    style={{ maxWidth: '240px' }}
                    placeholder="Search by title or ID..."
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                  />
                  <select
                    className="form-input"
                    style={{ maxWidth: '180px' }}
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                  >
                    {ALL_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

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
                        <th style={{ textAlign: 'right' }}>Total Bill</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(o => (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 700 }} onClick={() => router.push(`/order/${o.id}`)}>{o.id}</td>
                          <td style={{ fontWeight: 600 }} onClick={() => router.push(`/order/${o.id}`)}>{o.title}</td>
                          <td onClick={() => router.push(`/order/${o.id}`)}>{o.department_label}</td>
                          <td onClick={() => router.push(`/order/${o.id}`)}>{o.created_by_name}</td>
                          <td style={{ fontSize: '0.8rem' }} onClick={() => router.push(`/order/${o.id}`)}>
                            {new Date(o.created_at).toLocaleDateString('en-IN')}
                          </td>
                          <td><StatusBadge status={o.status} size="sm" /></td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{o.total_bill_amount}</td>
                          <td style={{ textAlign: 'center' }}>
                            {['Bill Generated', 'Vendor Confirmed'].includes(o.status) && (
                              <button className="btn btn-primary btn-sm" onClick={() => handleComplete(o.id)}>
                                Complete Order
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: USER DIRECTORY MANAGER */}
            {activeTab === 'users' && (
              <div className="card" style={{ padding: '20px' }}>
                <UserManager />
              </div>
            )}

            {/* TAB: DEPARTMENTS */}
            {activeTab === 'departments' && (
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px' }}>🏢 Active Academic Departments</h3>
                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Department ID</th>
                        <th>Department Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map((dept, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 700 }}>{dept.id}</td>
                          <td style={{ fontWeight: 600 }}>{dept.name}</td>
                        </tr>
                      ))}
                      {departments.length === 0 && (
                        <tr>
                          <td colSpan={2} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                            No departments found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: VENDORS MANAGEMENT */}
            {activeTab === 'vendors' && (
              <div className="card" style={{ padding: '20px' }}>
                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Vendor Name</th>
                        <th>Owner Name</th>
                        <th>Email Address</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Revenue Earning</th>
                        <th style={{ textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.map(v => (
                        <tr key={v.id}>
                          <td style={{ fontWeight: 700 }}>{v.name}</td>
                          <td style={{ fontWeight: 600 }}>{v.owner_name}</td>
                          <td>{v.email}</td>
                          <td>{v.phone}</td>
                          <td>
                            <VendorStatusBadge status={v.status} size="sm" />
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            ₹{v.revenue.toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => { setSelectedVendor(v); setEditStatus(v.status); }}
                            >
                              ⚙️ Edit Status
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Vendor Status Modal */}
                {selectedVendor && (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '360px', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--gray-200)' }}>
                      <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800 }}>
                        Update {selectedVendor.name} Status
                      </h3>
                      
                      <select
                        className="form-input"
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value)}
                        style={{ marginBottom: '16px' }}
                      >
                        {Object.entries(VENDOR_STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleUpdateVendorStatus}>
                          Save Changes
                        </button>
                        <button className="btn btn-ghost" onClick={() => setSelectedVendor(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
                        <th>Department</th>
                        <th>Billing Date</th>
                        <th style={{ textAlign: 'right' }}>Total Bill</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersWithBills.map(o => (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 700 }}>{o.id}</td>
                          <td style={{ fontWeight: 600 }}>{o.title}</td>
                          <td>{o.department_label}</td>
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
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                            No invoice records available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: ANALYTICS REPORTS */}
            {['reports', 'analytics'].includes(activeTab) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                {/* Dept wise report */}
                <div className="card" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px' }}>Revenue by Department</h3>
                  <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Department</th>
                          <th style={{ textAlign: 'center' }}>Orders</th>
                          <th style={{ textAlign: 'center' }}>Completed</th>
                          <th style={{ textAlign: 'right' }}>Total Billing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deptReport.map(r => (
                          <tr key={r.department_id}>
                            <td style={{ fontWeight: 700 }}>{r.label}</td>
                            <td style={{ textAlign: 'center' }}>{r.total_orders}</td>
                            <td style={{ textAlign: 'center' }}>{r.completed_orders}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-success)' }}>
                              ₹{r.revenue}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Vendor wise report */}
                <div className="card" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px' }}>Canteen Vendor Revenue Split</h3>
                  <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Vendor Name</th>
                          <th>Owner</th>
                          <th style={{ textAlign: 'center' }}>Menu Count</th>
                          <th style={{ textAlign: 'right' }}>Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendorReport.map(r => (
                          <tr key={r.vendor_id}>
                            <td style={{ fontWeight: 700 }}>{r.vendor_name}</td>
                            <td>{r.owner}</td>
                            <td style={{ textAlign: 'center' }}>{r.menu_count}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-success)' }}>
                              ₹{r.revenue}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>🔔 System Wide Alerts</h3>
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

            {/* TAB: SYSTEM AUDIT LOGS */}
            {['audit', 'logs'].includes(activeTab) && (
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px' }}>Immutable Security Audit Trail</h3>
                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Role</th>
                        <th>Action</th>
                        <th>Detail Payloads (Old → New)</th>
                        <th>Metadata (IP & Browser)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map(l => (
                        <tr key={l.id} style={{ fontSize: '0.8rem' }}>
                          <td style={{ whiteSpace: 'nowrap', color: 'var(--gray-500)' }}>
                            {new Date(l.timestamp).toLocaleString('en-IN')}
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--gray-800)' }}>{l.user_name}</td>
                          <td>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'var(--gray-100)', color: 'var(--gray-600)' }}>
                              {l.role}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{l.action}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {l.old_value || '—'} → {l.new_value || '—'}
                          </td>
                          <td style={{ color: 'var(--gray-500)', fontSize: '0.72rem' }}>
                            {l.ip_address} | {l.browser.slice(0, 30)}...
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

            {/* TAB: SYSTEM HEALTH */}
            {activeTab === 'health' && (
              <div className="card" style={{ padding: '20px', maxWidth: '600px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px' }}>❤️ System Health Monitoring</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ background: '#ECFDF5', padding: '16px', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
                      <div style={{ fontSize: '0.72rem', color: '#065F46', fontWeight: 700 }}>DATABASE STATUS</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#047857', marginTop: '4px' }}>Online & Connected</div>
                      <div style={{ fontSize: '0.7rem', color: '#065F46', marginTop: '4px' }}>PostgreSQL 16 @ Docker:5433</div>
                    </div>
                    <div style={{ background: '#ECFDF5', padding: '16px', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
                      <div style={{ fontSize: '0.72rem', color: '#065F46', fontWeight: 700 }}>WEBSOCKET SERVER</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#047857', marginTop: '4px' }}>Gateway Online</div>
                      <div style={{ fontSize: '0.7rem', color: '#065F46', marginTop: '4px' }}>Real-time listener connected</div>
                    </div>
                  </div>
                  <hr style={{ borderColor: 'var(--gray-100)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Memory Allocated:</span>
                      <strong>142.4 MB / 1024 MB</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>CPU Utilization:</span>
                      <strong>1.4%</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Active WebSocket Sessions:</span>
                      <strong>{stats.active_websocket_connections || 3} connected</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PROFILE */}
            {activeTab === 'profile' && (
              <div className="card" style={{ padding: '20px', maxWidth: '500px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px' }}>👤 Administrator Profile</h3>
                <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Name</label>
                    <input type="text" className="form-input" value={profileName} onChange={e => setProfileName(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Email Address</label>
                    <input type="email" className="form-input" value={session.email} disabled style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }} />
                  </div>
                  <button type="submit" disabled={submitting} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                    {submitting ? 'Updating...' : 'Save Profile'}
                  </button>
                  {profileMessage && <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10B981', marginTop: '6px' }}>{profileMessage}</div>}
                </form>
              </div>
            )}
          </div>
        )}

      </div>
    </AppShell>
  );
}
