'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import VendorStatusBadge from '@/components/VendorStatusBadge';
import { getSession, logout } from '@/lib/auth';
import { getOrders, upsertOrder, resetAllData, addHistoryEntry, initSeedData } from '@/lib/store';
import { getUsers, createUser, upsertUser, deleteUser } from '@/lib/auth';
import { getVendors, upsertVendor } from '@/lib/vendors';
import { ROLE_COLORS, DEPARTMENTS, ROLES, VENDOR_STATUS, VENDOR_STATUS_LABELS, STATUS } from '@/lib/constants';

const ALL_STATUSES = [
  'All', 'Created', 'Sent for Approval', 'Principal Reviewing', 'Principal Approved',
  'Principal Rejected', 'DCR Reviewing', 'DCR Approved', 'DCR Rejected', 'Vendor Processing',
  'Vendor Clarification Required', 'Coordinator Updated', 'Vendor Confirmed', 'Bill Generated', 'Completed',
];

const ROLE_OPTIONS = [
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'principal',   label: 'Principal' },
  { value: 'dcr',         label: 'DCR' },
  { value: 'vendor',      label: 'Vendor' },
  { value: 'admin',       label: 'Admin' },
];

const EMPTY_USER_FORM = {
  name: '', email: '', password: '', role: 'coordinator',
  department: '', principalDepts: [], vendorId: '',
};

export default function AdminPage() {
  const router = useRouter();
  const colors = ROLE_COLORS.admin;

  const [session, setSession]           = useState(null);
  const [activeTab, setActiveTab]       = useState('dashboard');
  const [orders, setOrders]             = useState([]);
  const [users, setUsers]               = useState([]);
  const [vendors, setVendors]           = useState([]);
  const [toast, setToast]               = useState(null);

  // All-orders tab filters
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDate, setFilterDate]     = useState('');
  const [sortDir, setSortDir]           = useState('desc');

  // User modal
  const [showUserModal, setShowUserModal]   = useState(false);
  const [editingUser, setEditingUser]       = useState(null);
  const [userForm, setUserForm]             = useState(EMPTY_USER_FORM);
  const [userFormError, setUserFormError]   = useState('');

  // Vendor modal
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendor, setEditingVendor]     = useState(null);
  const [vendorStatusEdit, setVendorStatusEdit] = useState('open');

  // Confirm reset dialog
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    initSeedData();
    const s = getSession();
    if (!s || s.role !== 'admin') { router.push('/login'); return; }
    setSession(s);
    loadAll();
  }, []);

  function loadAll() {
    setOrders(getOrders());
    setUsers(getUsers());
    setVendors(getVendors());
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalBillAmount || 0), 0);
  const activeVendors = vendors.filter(v => v.status === 'open').length;
  const completedOrders = orders.filter(o => o.status === 'Completed').length;

  // ── Filtered orders ───────────────────────────────────────────────────────────
  const filteredOrders = orders
    .filter(o => {
      if (filterStatus !== 'All' && o.status !== filterStatus) return false;
      if (filterDate && !o.createdAt?.startsWith(filterDate)) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        return (
          o.title?.toLowerCase().includes(q) ||
          o.id?.toLowerCase().includes(q) ||
          o.createdBy?.name?.toLowerCase().includes(q) ||
          o.departmentLabel?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const da = new Date(a.createdAt), db = new Date(b.createdAt);
      return sortDir === 'desc' ? db - da : da - db;
    });

  // ── Bill generation ───────────────────────────────────────────────────────────
  function handleGenerateBill(order) {
    const total = (order.vendorOrders || []).reduce((s, vo) => s + (vo.billAmount || 0), 0);
    const updated = {
      ...order,
      status: 'Bill Generated',
      totalBillAmount: total,
      billGeneratedAt: new Date().toISOString(),
    };
    upsertOrder(updated);
    addHistoryEntry(order.id, {
      action: 'Bill Generated',
      role: 'admin',
      user: session?.name || 'Admin',
      remarks: `Total bill: ₹${total}`,
    });
    showToast(`Bill generated — ₹${total}`);
    loadAll();
  }

  function handleMarkComplete(order) {
    const updated = { ...order, status: 'Completed' };
    upsertOrder(updated);
    addHistoryEntry(order.id, {
      action: 'Order Completed',
      role: 'admin',
      user: session?.name || 'Admin',
      remarks: 'Marked complete by admin',
    });
    showToast('Order marked as Completed');
    loadAll();
  }

  // ── User CRUD ─────────────────────────────────────────────────────────────────
  function openAddUser() {
    setEditingUser(null);
    setUserForm(EMPTY_USER_FORM);
    setUserFormError('');
    setShowUserModal(true);
  }

  function openEditUser(user) {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      department: user.department || '',
      principalDepts: user.principalDepts || [],
      vendorId: user.vendorId || '',
    });
    setUserFormError('');
    setShowUserModal(true);
  }

  function handleSaveUser() {
    setUserFormError('');
    if (!userForm.name.trim()) { setUserFormError('Name is required.'); return; }
    if (!userForm.email.trim()) { setUserFormError('Email is required.'); return; }
    if (!editingUser && !userForm.password.trim()) { setUserFormError('Password is required for new users.'); return; }

    if (editingUser) {
      const updated = {
        ...editingUser,
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        role: userForm.role,
        department: userForm.role === 'coordinator' ? userForm.department : null,
        principalDepts: userForm.role === 'principal' ? userForm.principalDepts : [],
        vendorId: userForm.role === 'vendor' ? userForm.vendorId : null,
      };
      if (userForm.password.trim()) updated.password = userForm.password.trim();
      upsertUser(updated);
      showToast(`User "${updated.name}" updated`);
    } else {
      createUser({
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        password: userForm.password.trim(),
        role: userForm.role,
        department: userForm.role === 'coordinator' ? userForm.department : null,
        principalDepts: userForm.role === 'principal' ? userForm.principalDepts : [],
        vendorId: userForm.role === 'vendor' ? userForm.vendorId : null,
      });
      showToast(`User "${userForm.name.trim()}" created`);
    }
    setShowUserModal(false);
    loadAll();
  }

  function handleDeleteUser(user) {
    if (user.role === 'admin') { showToast('Cannot delete admin accounts.', 'error'); return; }
    if (!window.confirm(`Delete user "${user.name}"? This cannot be undone.`)) return;
    deleteUser(user.id);
    showToast(`User "${user.name}" deleted`);
    loadAll();
  }

  // ── Vendor edit ───────────────────────────────────────────────────────────────
  function openEditVendor(vendor) {
    setEditingVendor(vendor);
    setVendorStatusEdit(vendor.status);
    setShowVendorModal(true);
  }

  function handleSaveVendor() {
    if (!editingVendor) return;
    upsertVendor({ ...editingVendor, status: vendorStatusEdit });
    showToast(`Vendor "${editingVendor.name}" updated`);
    setShowVendorModal(false);
    loadAll();
  }

  // ── Reset ─────────────────────────────────────────────────────────────────────
  function handleReset() {
    resetAllData();
    setShowResetConfirm(false);
    showToast('All data reset. Reloading…', 'info');
    setTimeout(() => window.location.reload(), 1500);
  }

  // ── Reports computed ──────────────────────────────────────────────────────────
  const ordersByDept = DEPARTMENTS.map(d => {
    const dOrders = orders.filter(o => o.department === d.id);
    return {
      name: d.label,
      total: dOrders.length,
      completed: dOrders.filter(o => o.status === 'Completed').length,
      revenue: dOrders.reduce((s, o) => s + (o.totalBillAmount || 0), 0),
    };
  }).filter(d => d.total > 0);

  const vendorRevenue = vendors.map(v => {
    const vOrders = orders.flatMap(o => o.vendorOrders || []).filter(vo => vo.vendorId === v.id);
    return {
      name: v.name,
      revenue: v.revenue || 0,
      orders: vOrders.length,
      menuItems: (v.menu || []).length,
    };
  });

  const TABS = [
    { key: 'dashboard', label: '🏠 Dashboard' },
    { key: 'orders',    label: '📦 All Orders' },
    { key: 'users',     label: '👥 Users' },
    { key: 'vendors',   label: '🏪 Vendors' },
    { key: 'reports',   label: '📊 Reports' },
  ];

  return (
    <AppShell role="admin" currentPath="/admin">
      <div style={{ '--role-accent': colors.accent }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ margin: 0 }}>⚙️ Admin Control Panel</h2>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setShowResetConfirm(true)}
          >
            🗑️ Reset All Data
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ '--role-accent': colors.accent, marginBottom: '28px' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Stat cards */}
            <div className="stat-grid">
              {[
                { label: 'Total Orders',    value: orders.length,   icon: '📦', color: colors.text },
                { label: 'Completed',       value: completedOrders, icon: '✅', color: '#059669' },
                { label: 'Total Revenue',   value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: '💰', color: '#047857' },
                { label: 'Active Vendors',  value: activeVendors,   icon: '🏪', color: '#D97706' },
              ].map(stat => (
                <div key={stat.label} className="stat-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="stat-label">{stat.label}</div>
                      <div className="stat-value" style={{ color: stat.color, fontSize: String(stat.value).length > 6 ? '1.4rem' : '2rem' }}>
                        {stat.value}
                      </div>
                    </div>
                    <div style={{ fontSize: '1.75rem' }}>{stat.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent orders */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: '16px' }}>🕐 Recent Orders</div>
              {orders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>
                  <h3>No orders yet</h3>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Title</th>
                        <th>Department</th>
                        <th>Coordinator</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 10).map(o => (
                        <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--gray-500)' }}>{o.id}</td>
                          <td style={{ fontWeight: 600, maxWidth: '180px' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</div>
                          </td>
                          <td style={{ fontSize: '0.8125rem' }}>{o.departmentLabel || o.department}</td>
                          <td style={{ fontSize: '0.8125rem' }}>{o.createdBy?.name}</td>
                          <td onClick={e => e.stopPropagation()}><StatusBadge status={o.status} size="sm" /></td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: (o.totalBillAmount || 0) > 0 ? '#047857' : 'var(--gray-400)' }}>
                            {(o.totalBillAmount || 0) > 0 ? `₹${o.totalBillAmount}` : '—'}
                          </td>
                          <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                          <td onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {o.status === 'Vendor Confirmed' && (
                                <button className="btn btn-sm" style={{ background: '#0D9488', color: 'white', border: 'none' }}
                                  onClick={() => handleGenerateBill(o)}>🧾 Generate Bill</button>
                              )}
                              {o.status === 'Bill Generated' && (
                                <>
                                  <button className="btn btn-sm btn-success" onClick={() => handleMarkComplete(o)}>✅ Complete</button>
                                  <button className="btn btn-sm btn-ghost" onClick={() => router.push(`/bill/${o.id}`)}>🧾 View</button>
                                </>
                              )}
                              {o.status === 'Completed' && (
                                <button className="btn btn-sm btn-ghost" onClick={() => router.push(`/bill/${o.id}`)}>🧾 Bill</button>
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
          </div>
        )}

        {/* ── ALL ORDERS TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'orders' && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div className="section-title">📦 All Orders</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
                {filteredOrders.length} of {orders.length} orders
              </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <input
                className="form-input"
                style={{ flex: '2', minWidth: '200px' }}
                placeholder="🔍 Search by title, ID, coordinator, department…"
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
              />
              <select
                className="form-select"
                style={{ flex: '1', minWidth: '180px' }}
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <input
                type="date"
                className="form-input"
                style={{ flex: '1', minWidth: '160px' }}
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
              />
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                title="Toggle sort direction"
              >
                {sortDir === 'desc' ? '↓ Newest' : '↑ Oldest'}
              </button>
              {(filterStatus !== 'All' || filterDate || filterSearch) && (
                <button className="btn btn-ghost btn-sm" onClick={() => { setFilterStatus('All'); setFilterDate(''); setFilterSearch(''); }}>
                  ✕ Clear
                </button>
              )}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>No orders match</h3>
                <p>Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Title</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Coordinator</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(o => (
                      <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600 }}>{o.id}</td>
                        <td style={{ maxWidth: '200px' }}>
                          <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</div>
                          {o.purpose && <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.purpose}</div>}
                        </td>
                        <td style={{ fontSize: '0.8125rem' }}>{o.departmentLabel || o.department}</td>
                        <td onClick={e => e.stopPropagation()}><StatusBadge status={o.status} size="sm" /></td>
                        <td style={{ fontSize: '0.8125rem' }}>{o.createdBy?.name}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: (o.totalBillAmount || 0) > 0 ? '#047857' : 'var(--gray-400)' }}>
                          {(o.totalBillAmount || 0) > 0 ? `₹${o.totalBillAmount}` : '—'}
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/order/${o.id}`)}>View</button>
                            {o.status === 'Vendor Confirmed' && (
                              <button className="btn btn-sm" style={{ background: '#0D9488', color: 'white', border: 'none', borderRadius: '8px', padding: '5px 10px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => handleGenerateBill(o)}>🧾 Bill</button>
                            )}
                            {o.status === 'Bill Generated' && (
                              <>
                                <button className="btn btn-sm btn-success" onClick={() => handleMarkComplete(o)}>✅</button>
                                <button className="btn btn-sm btn-ghost" onClick={() => router.push(`/bill/${o.id}`)}>🧾</button>
                              </>
                            )}
                            {o.status === 'Completed' && (
                              <button className="btn btn-sm btn-ghost" onClick={() => router.push(`/bill/${o.id}`)}>🧾</button>
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

        {/* ── USERS TAB ───────────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div className="section-title">👥 User Management</div>
              <button className="btn btn-primary btn-sm" style={{ '--role-accent': colors.accent }} onClick={openAddUser}>
                ➕ Add User
              </button>
            </div>

            {users.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👤</div>
                <h3>No users found</h3>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Department / Info</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td style={{ fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                              background: ROLE_COLORS[user.role]?.accent || '#6B7280',
                              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.75rem', fontWeight: 700,
                            }}>{user.name?.[0]?.toUpperCase()}</div>
                            {user.name}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>{user.email}</td>
                        <td>
                          <span style={{
                            padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                            background: ROLE_COLORS[user.role]?.light || '#F3F4F6',
                            color: ROLE_COLORS[user.role]?.text || '#6B7280',
                          }}>
                            {user.role}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
                          {user.role === 'coordinator' && (DEPARTMENTS.find(d => d.id === user.department)?.label || user.department || '—')}
                          {user.role === 'principal' && (user.principalDepts || []).map(d => DEPARTMENTS.find(x => x.id === d)?.name || d).join(', ')}
                          {user.role === 'vendor' && (user.vendorId ? `Vendor: ${user.vendorId}` : '—')}
                          {(user.role === 'admin' || user.role === 'dcr') && '—'}
                        </td>
                        <td>
                          <span style={{
                            padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                            background: user.active !== false ? '#DCFCE7' : '#FEF2F2',
                            color: user.active !== false ? '#166534' : '#DC2626',
                          }}>
                            {user.active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEditUser(user)}>✏️ Edit</button>
                            {user.role !== 'admin' && (
                              <button className="btn btn-sm" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '8px', padding: '5px 10px', fontSize: '0.8rem', cursor: 'pointer' }}
                                onClick={() => handleDeleteUser(user)}>🗑️ Delete</button>
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

        {/* ── VENDORS TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'vendors' && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div className="section-title">🏪 Vendor Management</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{vendors.length} vendors registered</div>
            </div>

            {vendors.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏪</div>
                <h3>No vendors found</h3>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Vendor Name</th>
                      <th>Owner</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Revenue</th>
                      <th style={{ textAlign: 'center' }}>Menu Items</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map(vendor => (
                      <tr key={vendor.id}>
                        <td style={{ fontWeight: 700 }}>{vendor.name}</td>
                        <td style={{ fontSize: '0.8125rem' }}>{vendor.ownerName}</td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{vendor.email}</td>
                        <td><VendorStatusBadge status={vendor.status} size="sm" /></td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: (vendor.revenue || 0) > 0 ? '#047857' : 'var(--gray-400)' }}>
                          {(vendor.revenue || 0) > 0 ? `₹${vendor.revenue.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>{(vendor.menu || []).length}</td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEditVendor(vendor)}>✏️ Edit Status</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── REPORTS TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Summary stat cards */}
            <div className="stat-grid">
              {[
                { label: 'Total Orders',    value: orders.length,                                              icon: '📦', color: colors.text },
                { label: 'Completed',       value: completedOrders,                                            icon: '✅', color: '#059669' },
                { label: 'Total Revenue',   value: `₹${totalRevenue.toLocaleString('en-IN')}`,                icon: '💰', color: '#047857' },
                { label: 'Rejected Orders', value: orders.filter(o => o.status?.includes('Rejected')).length, icon: '❌', color: '#DC2626' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="stat-label">{s.label}</div>
                      <div className="stat-value" style={{ color: s.color, fontSize: String(s.value).length > 6 ? '1.5rem' : '2rem' }}>{s.value}</div>
                    </div>
                    <div style={{ fontSize: '1.75rem' }}>{s.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Orders by Department */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: '16px' }}>🏫 Orders by Department</div>
              {ordersByDept.length === 0 ? (
                <div style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>No department data available.</div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th style={{ textAlign: 'center' }}>Total Orders</th>
                        <th style={{ textAlign: 'center' }}>Completed</th>
                        <th style={{ textAlign: 'center' }}>Completion %</th>
                        <th style={{ textAlign: 'right' }}>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersByDept.sort((a, b) => b.total - a.total).map(dept => (
                        <tr key={dept.name}>
                          <td style={{ fontWeight: 600 }}>{dept.name}</td>
                          <td style={{ textAlign: 'center' }}>{dept.total}</td>
                          <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>{dept.completed}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <div style={{ width: '60px', height: '6px', background: 'var(--gray-200)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${dept.total > 0 ? Math.round(dept.completed / dept.total * 100) : 0}%`, height: '100%', background: '#059669', borderRadius: '3px' }} />
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                                {dept.total > 0 ? Math.round(dept.completed / dept.total * 100) : 0}%
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: dept.revenue > 0 ? '#047857' : 'var(--gray-400)' }}>
                            {dept.revenue > 0 ? `₹${dept.revenue.toLocaleString('en-IN')}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Vendor Revenue */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: '16px' }}>🏪 Vendor Revenue</div>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th style={{ textAlign: 'center' }}>Vendor Orders</th>
                      <th style={{ textAlign: 'center' }}>Menu Items</th>
                      <th style={{ textAlign: 'right' }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorRevenue.sort((a, b) => b.revenue - a.revenue).map(v => (
                      <tr key={v.name}>
                        <td style={{ fontWeight: 600 }}>{v.name}</td>
                        <td style={{ textAlign: 'center' }}>{v.orders}</td>
                        <td style={{ textAlign: 'center' }}>{v.menuItems}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: v.revenue > 0 ? '#047857' : 'var(--gray-400)' }}>
                          {v.revenue > 0 ? `₹${v.revenue.toLocaleString('en-IN')}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Orders by Status */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: '16px' }}>📊 Orders by Status</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                {ALL_STATUSES.slice(1).map(s => {
                  const count = orders.filter(o => o.status === s).length;
                  if (count === 0) return null;
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-1)', borderRadius: '10px', border: '1px solid var(--gray-200)' }}>
                      <StatusBadge status={s} size="sm" />
                      <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--gray-800)' }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── USER MODAL ──────────────────────────────────────────────────────────── */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>{editingUser ? '✏️ Edit User' : '➕ Add New User'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowUserModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {userFormError && (
                <div style={{ padding: '10px 14px', background: '#FEF2F2', color: '#DC2626', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem', fontWeight: 600 }}>
                  ⚠️ {userFormError}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Priya Sharma" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="user@aharsetu.edu.in" />
                </div>
                <div className="form-group">
                  <label className="form-label">Password {editingUser ? '(leave blank to keep)' : '*'}</label>
                  <input className="form-input" type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder={editingUser ? 'Leave blank to keep current' : 'Enter password'} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select className="form-select" value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value, department: '', principalDepts: [], vendorId: '' }))}>
                    {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                {userForm.role === 'coordinator' && (
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select className="form-select" value={userForm.department} onChange={e => setUserForm(f => ({ ...f, department: e.target.value }))}>
                      <option value="">— Select Department —</option>
                      {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                    </select>
                  </div>
                )}

                {userForm.role === 'vendor' && (
                  <div className="form-group">
                    <label className="form-label">Assign Vendor</label>
                    <select className="form-select" value={userForm.vendorId} onChange={e => setUserForm(f => ({ ...f, vendorId: e.target.value }))}>
                      <option value="">— Select Vendor —</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {userForm.role === 'principal' && (
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label className="form-label">Departments to Oversee (multi-select)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '12px', background: 'var(--surface-1)', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                    {DEPARTMENTS.map(d => (
                      <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.875rem' }}>
                        <input
                          type="checkbox"
                          checked={userForm.principalDepts.includes(d.id)}
                          onChange={e => {
                            const depts = userForm.principalDepts;
                            setUserForm(f => ({
                              ...f,
                              principalDepts: e.target.checked ? [...depts, d.id] : depts.filter(x => x !== d.id),
                            }));
                          }}
                        />
                        {d.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowUserModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ '--role-accent': colors.accent }} onClick={handleSaveUser}>
                {editingUser ? '💾 Save Changes' : '➕ Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VENDOR MODAL ─────────────────────────────────────────────────────────── */}
      {showVendorModal && editingVendor && (
        <div className="modal-overlay" onClick={() => setShowVendorModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>✏️ Edit Vendor — {editingVendor.name}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowVendorModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'var(--surface-1)', borderRadius: '10px', border: '1px solid var(--gray-200)' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '4px' }}>Current Status</div>
                <VendorStatusBadge status={editingVendor.status} />
              </div>
              <div className="form-group">
                <label className="form-label">New Status</label>
                <select className="form-select" value={vendorStatusEdit} onChange={e => setVendorStatusEdit(e.target.value)}>
                  {Object.entries(VENDOR_STATUS_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowVendorModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ '--role-accent': colors.accent }} onClick={handleSaveVendor}>
                💾 Save Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET CONFIRM DIALOG ─────────────────────────────────────────────────── */}
      {showResetConfirm && (
        <div className="modal-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="modal" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, color: '#DC2626' }}>⚠️ Reset All Data</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowResetConfirm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ padding: '16px', background: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA', marginBottom: '16px' }}>
                <p style={{ margin: 0, color: '#B91C1C', fontWeight: 600, fontSize: '0.875rem' }}>
                  This will permanently delete ALL orders, users, vendors, and session data. The app will reload with fresh seed data. This action cannot be undone.
                </p>
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                Are you sure you want to continue?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowResetConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReset}>🗑️ Yes, Reset Everything</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </AppShell>
  );
}
