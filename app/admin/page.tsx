'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import VendorStatusBadge from '@/components/VendorStatusBadge';
import UserManager from '@/components/UserManager';
import { getSession, UserProfile } from '@/lib/auth';
import { getOrders, resetAllData, completeOrder, MasterOrder } from '@/lib/store';
import { getVendors, updateVendorStatus, Vendor } from '@/lib/vendors';
import { api } from '@/lib/api';
import { ROLE_COLORS, VENDOR_STATUS_LABELS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<UserProfile | null>(null);
  const colors = ROLE_COLORS.admin;

  // Active Tab
  const [activeTab, setActiveTab] = useState('dashboard');

  // API Lists
  const [orders, setOrders] = useState<MasterOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stats, setStats] = useState<any>({ total_orders: 0, completed_orders: 0, total_revenue: 0, active_vendors: 0 });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  // Reports states
  const [deptReport, setDeptReport] = useState<any[]>([]);
  const [vendorReport, setVendorReport] = useState<any[]>([]);

  // Search & Filter
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Vendor Edit modal
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [editStatus, setEditStatus] = useState('closed');

  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [oList, vList, sysStats] = await Promise.all([
        getOrders(),
        getVendors(),
        api.get<any>('/reports/system-stats')
      ]);
      setOrders(oList);
      setVendors(vList);
      setStats(sysStats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadReportsData() {
    try {
      const [dRep, vRep] = await Promise.all([
        api.get<any[]>('/reports/department'),
        api.get<any[]>('/reports/revenue')
      ]);
      setDeptReport(dRep);
      setVendorReport(vRep);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadAuditLogs() {
    try {
      const logs = await api.get<any[]>('/reports/audit-logs');
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== 'admin') {
      router.push('/login');
      return;
    }
    setSession(s);
    loadDashboardData();
  }, [router]);

  useEffect(() => {
    if (activeTab === 'reports') loadReportsData();
    if (activeTab === 'logs') loadAuditLogs();
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

  if (!session) return null;

  const filteredOrders = orders
    .filter(o => !orderSearch || o.title.toLowerCase().includes(orderSearch.toLowerCase()) || o.id.toLowerCase().includes(orderSearch.toLowerCase()))
    .filter(o => statusFilter === 'All' || o.status === statusFilter);

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
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px' }}>
              System Administrator Dashboard
            </h1>
            <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
              Manage users, vendors, audit logs, and view consolidated institutional analytics.
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

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid var(--gray-200)', overflowX: 'auto' }}>
          {[
            { key: 'dashboard', label: 'Dashboard', icon: '📊' },
            { key: 'orders', label: 'All Orders', icon: '📦' },
            { key: 'users', label: 'User Directory', icon: '👥' },
            { key: 'vendors', label: 'Vendors', icon: '🏪' },
            { key: 'reports', label: 'Analytics Reports', icon: '📈' },
            { key: 'logs', label: 'System Logs', icon: '📜' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap',
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

        {/* Tab Content Panel */}
        {loading && activeTab === 'dashboard' ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px', animation: 'spin 1s infinite linear' }}>🔄</div>
            <div>Loading statistics...</div>
          </div>
        ) : (
          <div>
            {/* 1. Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div>
                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  {[
                    { label: 'Total Orders Created', value: stats.total_orders, color: '#3B82F6', icon: '📋' },
                    { label: 'Completed Orders', value: stats.completed_orders, color: '#10B981', icon: '✅' },
                    { label: 'Consolidated Revenue', value: `₹${stats.total_revenue}`, color: '#6366F1', icon: '💰' },
                    { label: 'Open Canteens', value: stats.active_vendors, color: '#0EA5E9', icon: '🏪' },
                  ].map((s, idx) => (
                    <div key={idx} className="card" style={{ padding: '16px 20px', borderTop: `3px solid ${s.color}` }}>
                      <div style={{ fontSize: '1.3rem', marginBottom: '6px' }}>{s.icon}</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gray-900)' }}>{s.value}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Recent Orders */}
                <div className="card" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px' }}>Recent Submissions</h3>
                  <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Order Description</th>
                          <th>Department</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 5).map(o => (
                          <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>
                            <td style={{ fontWeight: 700 }}>{o.id}</td>
                            <td style={{ fontWeight: 600 }}>{o.title}</td>
                            <td>{o.department_label}</td>
                            <td><StatusBadge status={o.status} size="sm" /></td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{o.total_bill_amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 2. All Orders Tab */}
            {activeTab === 'orders' && (
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <input
                    className="form-input"
                    style={{ maxWidth: '240px' }}
                    placeholder="Search ID, title..."
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                  />
                  <select
                    className="form-input"
                    style={{ maxWidth: '180px' }}
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                  >
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Title</th>
                        <th>Department</th>
                        <th>Created Date</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(o => (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 700 }}>{o.id}</td>
                          <td style={{ fontWeight: 600 }}>
                            <Link href={`/order/${o.id}`} style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                              {o.title}
                            </Link>
                          </td>
                          <td>{o.department_label}</td>
                          <td style={{ fontSize: '0.8rem' }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                          <td><StatusBadge status={o.status} size="sm" /></td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{o.total_bill_amount}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              {o.status === 'Bill Generated' && (
                                <button className="btn btn-primary btn-sm" onClick={() => handleComplete(o.id)}>
                                  Complete
                                </button>
                              )}
                              {o.status === 'Completed' && (
                                <Link href={`/bill/${o.id}`} className="btn btn-ghost btn-sm">
                                  View Bill
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. Users Tab */}
            {activeTab === 'users' && (
              <div className="card" style={{ padding: '20px' }}>
                <UserManager accentColor={colors.accent} />
              </div>
            )}

            {/* 4. Vendors Tab */}
            {activeTab === 'vendors' && (
              <div className="card" style={{ padding: '20px' }}>
                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Canteen Name</th>
                        <th>Owner</th>
                        <th>Email</th>
                        <th>Contact</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Revenue</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.map(v => (
                        <tr key={v.id}>
                          <td style={{ fontWeight: 700 }}>{v.id}</td>
                          <td style={{ fontWeight: 700 }}>{v.name}</td>
                          <td>{v.owner_name}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{v.email}</td>
                          <td style={{ fontSize: '0.8rem' }}>{v.phone}</td>
                          <td><VendorStatusBadge status={v.status} /></td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{v.revenue}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                setSelectedVendor(v);
                                setEditStatus(v.status);
                              }}
                            >
                              Edit Status
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

            {/* 5. Reports Tab */}
            {activeTab === 'reports' && (
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

            {/* 6. System Logs (Audit logs) */}
            {activeTab === 'logs' && (
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
          </div>
        )}

      </div>
    </AppShell>
  );
}
