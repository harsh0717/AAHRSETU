'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import CreateOrderModal from '@/components/CreateOrderModal';
import { getOrders, getSession, createOrder, updateOrderStatus, addHistoryEntry, initSeedData } from '@/lib/store';
import { ROLE_COLORS } from '@/lib/constants';

function CoordinatorDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'dashboard';

  const [orders, setOrders] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [session, setSession] = useState(null);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    initSeedData();
    const s = getSession();
    if (!s) { router.push('/'); return; }
    setSession(s);
    loadOrders();
    if (tab === 'create') setShowCreate(true);
  }, []);

  function loadOrders() {
    const all = getOrders();
    setOrders(all.filter(o => o.createdBy?.role === 'coordinator'));
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function handleCreateOrder(data) {
    const order = createOrder({ ...data, createdBy: { name: session?.name || 'Coordinator', role: 'coordinator' } });
    loadOrders();
    setShowCreate(false);
    showToast(`Order "${order.title}" created!`);
  }

  function handleSubmit(order) {
    updateOrderStatus(order.id, 'Sent for Approval');
    addHistoryEntry(order.id, {
      action: 'Submitted for Approval',
      role: 'coordinator',
      user: session?.name || 'Coordinator',
      remarks: '',
    });
    loadOrders();
    showToast(`Order submitted for approval!`);
  }

  const colors = ROLE_COLORS.coordinator;
  const myOrders = orders;

  const filtered = filter === 'all' ? myOrders : myOrders.filter(o => {
    if (filter === 'pending')   return !['Completed', 'Principal Rejected', 'DCR Rejected'].includes(o.status);
    if (filter === 'rejected')  return o.status.includes('Rejected');
    if (filter === 'completed') return o.status === 'Completed';
    return true;
  });

  const stats = {
    total:     myOrders.length,
    pending:   myOrders.filter(o => !['Completed', 'Principal Rejected', 'DCR Rejected'].includes(o.status)).length,
    rejected:  myOrders.filter(o => o.status.includes('Rejected')).length,
    completed: myOrders.filter(o => o.status === 'Completed').length,
  };

  return (
    <AppShell role="coordinator" currentPath="/coordinator">
      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '28px' }}>
        {[
          { label: 'Total Orders',    value: stats.total,     icon: '📦', color: colors.accent },
          { label: 'Pending',         value: stats.pending,   icon: '⏳', color: '#D97706' },
          { label: 'Rejected',        value: stats.rejected,  icon: '❌', color: '#DC2626' },
          { label: 'Completed',       value: stats.completed, icon: '✅', color: '#059669' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
              <div style={{ fontSize: '1.75rem' }}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Orders Section */}
      <div className="card">
        <div className="section-header">
          <div className="section-title">📦 My Orders</div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Filter */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {['all', 'pending', 'rejected', 'completed'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="btn btn-sm"
                  style={{
                    background: filter === f ? colors.accent : 'var(--gray-100)',
                    color: filter === f ? '#fff' : 'var(--gray-600)',
                    border: 'none',
                    textTransform: 'capitalize',
                  }}>
                  {f}
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)} style={{ '--role-accent': colors.accent }}>
              ➕ Create Order
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>No orders yet</h3>
            <p>Create your first order to get started.</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ '--role-accent': colors.accent, marginTop: '16px' }}>
              ➕ Create Order
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(order => {
              const isRejected = order.status.includes('Rejected');
              const canSubmit = order.status === 'Created';
              const rejectionReason = isRejected
                ? (order.principalApproval?.remarks || order.dcrApproval?.remarks)
                : null;

              return (
                <div key={order.id} style={{
                  padding: '16px 20px',
                  border: `1.5px solid ${isRejected ? '#FECACA' : 'var(--gray-200)'}`,
                  borderRadius: '12px',
                  background: isRejected ? '#FEF2F2' : 'var(--surface-0)',
                  transition: 'all 0.2s ease',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '0.9375rem' }}>{order.title}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontFamily: 'var(--font-mono)' }}>#{order.id}</span>
                        <StatusBadge status={order.status} size="sm" />
                      </div>
                      <p style={{ fontSize: '0.8125rem', margin: '0 0 8px', lineHeight: 1.4 }}>{order.purpose}</p>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: 'var(--gray-500)', flexWrap: 'wrap' }}>
                        <span>🛒 {order.items?.length} items</span>
                        <span>📅 {new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
                        {order.billAmount > 0 && <span style={{ color: '#059669', fontWeight: 600 }}>💰 ₹{order.billAmount}</span>}
                      </div>

                      {/* Rejection reason */}
                      {isRejected && rejectionReason && (
                        <div style={{
                          marginTop: '10px',
                          padding: '10px 14px',
                          background: '#fff',
                          border: '1px solid #FECACA',
                          borderLeft: '4px solid #DC2626',
                          borderRadius: '6px',
                          fontSize: '0.8125rem',
                          color: '#B91C1C',
                        }}>
                          <strong>Rejection reason:</strong> {rejectionReason}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                      {canSubmit && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleSubmit(order)} style={{ '--role-accent': colors.accent }}>
                          📤 Submit
                        </button>
                      )}
                      {isRejected && (
                        <button className="btn btn-outline btn-sm" onClick={() => setShowCreate(true)} style={{ '--role-accent': '#DC2626' }}>
                          🔄 Resubmit
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/order/${order.id}`)}>
                        View →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      {showCreate && (
        <CreateOrderModal
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreateOrder}
          roleAccent={colors.accent}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✅' : '❌'} {toast.msg}</div>
        </div>
      )}
    </AppShell>
  );
}

export default function CoordinatorPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>Loading...</div>}>
      <CoordinatorDashboard />
    </Suspense>
  );
}
