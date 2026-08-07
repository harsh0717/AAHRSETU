'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import { getOrders, getSession, initSeedData } from '@/lib/store';
import { ROLE_COLORS, STATUS } from '@/lib/constants';

const STATUS_OPTIONS = ['All', 'Created', 'Sent for Approval', 'Principal Reviewing', 'Principal Approved',
  'Principal Rejected', 'DCR Reviewing', 'DCR Approved', 'DCR Rejected', 'Vendor Processing',
  'Order Done/Confirmed', 'Bill Generated', 'Completed'];

export default function AdminPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    initSeedData();
    const s = getSession();
    if (!s) { router.push('/'); return; }
    setSession(s);
    setOrders(getOrders());
  }, []);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const colors = ROLE_COLORS.admin;

  const stats = {
    total:          orders.length,
    completed:      orders.filter(o => o.status === 'Completed').length,
    inProgress:     orders.filter(o => !['Completed', 'Principal Rejected', 'DCR Rejected', 'Created'].includes(o.status)).length,
    rejected:       orders.filter(o => o.status.includes('Rejected')).length,
    totalBilled:    orders.filter(o => o.billAmount > 0).reduce((s, o) => s + (o.billAmount || 0), 0),
    avgBill:        (() => {
      const billed = orders.filter(o => o.billAmount > 0);
      return billed.length ? Math.round(billed.reduce((s, o) => s + o.billAmount, 0) / billed.length) : 0;
    })(),
    principalApprovalRate: (() => {
      const reviewed = orders.filter(o => o.principalApproval?.status);
      const approved = reviewed.filter(o => o.principalApproval?.status === 'approved');
      return reviewed.length ? Math.round(approved.length / reviewed.length * 100) : 0;
    })(),
    dcrApprovalRate: (() => {
      const reviewed = orders.filter(o => o.dcrApproval?.status);
      const approved = reviewed.filter(o => o.dcrApproval?.status === 'approved');
      return reviewed.length ? Math.round(approved.length / reviewed.length * 100) : 0;
    })(),
  };

  const filteredOrders = orders.filter(o => {
    if (filterStatus !== 'All' && o.status !== filterStatus) return false;
    if (filterDate && !o.createdAt.startsWith(filterDate)) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      if (!o.title.toLowerCase().includes(q) && !o.id.toLowerCase().includes(q) && !o.createdBy?.name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <AppShell role="admin" currentPath="/admin">
      <div className="tabs" style={{ '--role-accent': colors.accent, marginBottom: '24px' }}>
        {['dashboard', 'reports', 'orders'].map(t => (
          <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)} style={{ textTransform: 'capitalize' }}>
            {t === 'dashboard' ? '🏠 Dashboard' : t === 'reports' ? '📊 Reports' : '📦 All Orders'}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <>
          <div className="stat-grid" style={{ marginBottom: '28px' }}>
            {[
              { label: 'Total Orders',       value: stats.total,          icon: '📦', color: 'var(--gray-700)' },
              { label: 'In Progress',         value: stats.inProgress,    icon: '⚙️', color: '#D97706' },
              { label: 'Completed',           value: stats.completed,     icon: '✅', color: '#059669' },
              { label: 'Rejected',            value: stats.rejected,      icon: '❌', color: '#DC2626' },
              { label: 'Total Amount Billed', value: `₹${stats.totalBilled}`, icon: '💰', color: '#047857' },
              { label: 'Average Bill',        value: `₹${stats.avgBill}`,     icon: '📈', color: '#0D9488' },
              { label: 'Principal Approval%', value: `${stats.principalApprovalRate}%`, icon: '🎓', color: '#7C3AED' },
              { label: 'DCR Approval%',       value: `${stats.dcrApprovalRate}%`,       icon: '📋', color: '#D97706' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value" style={{ color: s.color, fontSize: String(s.value).length > 5 ? '1.5rem' : '2rem' }}>{s.value}</div>
                  </div>
                  <div style={{ fontSize: '1.75rem' }}>{s.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent activity */}
          <div className="card">
            <div className="section-title" style={{ marginBottom: '16px' }}>🕐 Recent Activity</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {orders.slice(0, 8).map(o => (
                <div key={o.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: '10px', background: 'var(--surface-1)',
                  border: '1px solid var(--gray-200)', gap: '12px', flexWrap: 'wrap',
                  cursor: 'pointer',
                }} onClick={() => router.push(`/order/${o.id}`)}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{o.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                      {o.createdBy?.name} · {new Date(o.updatedAt).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {o.billAmount > 0 && <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#059669' }}>₹{o.billAmount}</span>}
                    <StatusBadge status={o.status} size="sm" />
                    {o.status === 'Completed' && (
                      <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); router.push(`/bill/${o.id}`); }}>🧾 Bill</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Status breakdown */}
          <div className="card">
            <div className="section-title" style={{ marginBottom: '16px' }}>📊 Orders by Status</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {STATUS_OPTIONS.slice(1).map(s => {
                const count = orders.filter(o => o.status === s).length;
                if (count === 0) return null;
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--surface-1)', borderRadius: '10px', border: '1px solid var(--gray-200)' }}>
                    <StatusBadge status={s} size="sm" />
                    <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--gray-800)' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top coordinators */}
          <div className="card">
            <div className="section-title" style={{ marginBottom: '16px' }}>👤 Orders by Coordinator</div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Coordinator</th><th style={{ textAlign: 'center' }}>Total Orders</th><th style={{ textAlign: 'center' }}>Completed</th><th style={{ textAlign: 'right' }}>Total Billed</th></tr>
                </thead>
                <tbody>
                  {Object.entries(orders.reduce((acc, o) => {
                    const name = o.createdBy?.name || 'Unknown';
                    if (!acc[name]) acc[name] = { total: 0, completed: 0, billed: 0 };
                    acc[name].total++;
                    if (o.status === 'Completed') acc[name].completed++;
                    acc[name].billed += o.billAmount || 0;
                    return acc;
                  }, {})).map(([name, data]) => (
                    <tr key={name}>
                      <td style={{ fontWeight: 600 }}>{name}</td>
                      <td style={{ textAlign: 'center' }}>{data.total}</td>
                      <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>{data.completed}</td>
                      <td style={{ textAlign: 'right', color: '#047857', fontWeight: 700 }}>₹{data.billed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* All Orders Tab */}
      {activeTab === 'orders' && (
        <div className="card">
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <input
              className="form-input"
              style={{ flex: '2', minWidth: '200px', '--role-accent': colors.accent }}
              placeholder="🔍 Search by title, ID, coordinator..."
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
            />
            <select
              className="form-select"
              style={{ flex: '1', minWidth: '180px', '--role-accent': colors.accent }}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
            <input
              type="date"
              className="form-input"
              style={{ flex: '1', minWidth: '160px', '--role-accent': colors.accent }}
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
            />
            {(filterStatus !== 'All' || filterDate || filterSearch) && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setFilterStatus('All'); setFilterDate(''); setFilterSearch(''); }}>
                ✕ Clear
              </button>
            )}
          </div>

          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '12px' }}>
            Showing {filteredOrders.length} of {orders.length} orders
          </div>

          {filteredOrders.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🔍</div><h3>No orders found</h3><p>Try adjusting your filters.</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Title</th>
                    <th>Coordinator</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(o => (
                    <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--gray-500)', fontWeight: 600 }}>{o.id}</td>
                      <td style={{ fontWeight: 600, maxWidth: '200px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.purpose}</div>
                      </td>
                      <td>{o.createdBy?.name}</td>
                      <td onClick={e => e.stopPropagation()}><StatusBadge status={o.status} size="sm" /></td>
                      <td style={{ textAlign: 'center' }}>{o.items?.length}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: o.billAmount > 0 ? '#047857' : 'var(--gray-400)' }}>
                        {o.billAmount > 0 ? `₹${o.billAmount}` : '—'}
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/order/${o.id}`)}>View</button>
                          {o.status === 'Completed' && (
                            <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/bill/${o.id}`)}>🧾</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </AppShell>
  );
}
