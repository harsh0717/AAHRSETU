'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import ApprovalPanel from '@/components/ApprovalPanel';
import { getOrders, getSession, updateOrderStatus, addHistoryEntry, upsertOrder, initSeedData } from '@/lib/store';
import { ROLE_COLORS } from '@/lib/constants';

export default function PrincipalPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    initSeedData();
    const s = getSession();
    if (!s) { router.push('/'); return; }
    setSession(s);
    loadOrders();
  }, []);

  function loadOrders() { setOrders(getOrders()); }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const pendingOrders = orders.filter(o =>
    ['Sent for Approval', 'Principal Reviewing'].includes(o.status)
  );
  const historyOrders = orders.filter(o =>
    ['Principal Approved', 'Principal Rejected', 'DCR Reviewing', 'DCR Approved', 'DCR Rejected',
     'Vendor Processing', 'Order Done/Confirmed', 'Bill Generated', 'Completed'].includes(o.status)
  );

  function handleOpen(order) {
    if (order.status === 'Sent for Approval') {
      const updated = { ...order, status: 'Principal Reviewing' };
      upsertOrder(updated);
      addHistoryEntry(order.id, { action: 'Principal Started Review', role: 'principal', user: session?.name || 'Principal', remarks: '' });
      loadOrders();
    }
    setExpandedOrder(order.id === expandedOrder ? null : order.id);
  }

  function handleApprove(order, remarks) {
    const updated = {
      ...order,
      status: 'Principal Approved',
      principalApproval: { status: 'approved', remarks, reviewedAt: new Date().toISOString() },
    };
    upsertOrder(updated);
    addHistoryEntry(order.id, { action: 'Principal Approved', role: 'principal', user: session?.name || 'Principal', remarks });
    setExpandedOrder(null);
    loadOrders();
    showToast('Order approved and sent to DCR!');
  }

  function handleReject(order, remarks) {
    const updated = {
      ...order,
      status: 'Principal Rejected',
      principalApproval: { status: 'rejected', remarks, reviewedAt: new Date().toISOString() },
    };
    upsertOrder(updated);
    addHistoryEntry(order.id, { action: 'Principal Rejected', role: 'principal', user: session?.name || 'Principal', remarks });
    setExpandedOrder(null);
    loadOrders();
    showToast('Order rejected. Coordinator has been notified.', 'error');
  }

  const colors = ROLE_COLORS.principal;

  const stats = {
    pending:   pendingOrders.length,
    approved:  orders.filter(o => ['Principal Approved', 'DCR Reviewing', 'DCR Approved', 'Vendor Processing', 'Order Done/Confirmed', 'Bill Generated', 'Completed'].includes(o.status)).length,
    rejected:  orders.filter(o => o.status === 'Principal Rejected').length,
    total:     orders.length,
  };

  const displayOrders = activeTab === 'pending' ? pendingOrders : historyOrders;

  return (
    <AppShell role="principal" currentPath="/principal">
      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '28px' }}>
        {[
          { label: 'Pending Review', value: stats.pending,   icon: '⏳', color: colors.accent },
          { label: 'Approved',       value: stats.approved,  icon: '✅', color: '#059669' },
          { label: 'Rejected',       value: stats.rejected,  icon: '❌', color: '#DC2626' },
          { label: 'Total Seen',     value: stats.total,     icon: '📋', color: 'var(--gray-600)' },
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

      <div className="card">
        <div className="tabs" style={{ '--role-accent': colors.accent }}>
          <button className={`tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
            ⏳ Pending Review ({pendingOrders.length})
          </button>
          <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
            📜 History ({historyOrders.length})
          </button>
        </div>

        {displayOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{activeTab === 'pending' ? '🎉' : '📭'}</div>
            <h3>{activeTab === 'pending' ? 'All clear!' : 'No history yet'}</h3>
            <p>{activeTab === 'pending' ? 'No orders pending your review.' : 'Approved/rejected orders will appear here.'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {displayOrders.map(order => {
              const isExpanded = expandedOrder === order.id;
              const isPending = activeTab === 'pending';
              return (
                <div key={order.id} style={{
                  border: `1.5px solid ${isExpanded ? colors.accent : 'var(--gray-200)'}`,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}>
                  {/* Order header */}
                  <div style={{
                    padding: '16px 20px',
                    background: isExpanded ? `color-mix(in srgb, ${colors.accent} 5%, transparent)` : 'var(--surface-0)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
                  }} onClick={() => handleOpen(order)}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700 }}>{order.title}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontFamily: 'var(--font-mono)' }}>#{order.id}</span>
                        <StatusBadge status={order.status} size="sm" />
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>{order.purpose}</div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '6px', flexWrap: 'wrap' }}>
                        <span>👤 {order.createdBy?.name}</span>
                        <span>🛒 {order.items?.length} items</span>
                        <span>📅 {new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {isPending && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: colors.accent }}>
                          {order.status === 'Sent for Approval' ? 'Click to Review' : 'Reviewing...'}
                        </span>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); router.push(`/order/${order.id}`); }}>
                        Detail →
                      </button>
                      <span style={{ color: 'var(--gray-400)', fontSize: '1.1rem' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div style={{ padding: '20px', borderTop: '1px solid var(--gray-200)', background: 'var(--surface-0)' }}>
                      {/* Items table */}
                      <div className="table-wrapper" style={{ marginBottom: '16px' }}>
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th style={{ textAlign: 'center' }}>Quantity</th>
                              <th style={{ textAlign: 'right' }}>Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items?.map(item => (
                              <tr key={item.name}>
                                <td style={{ fontWeight: 600 }}>{item.name}</td>
                                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                <td style={{ textAlign: 'right', color: 'var(--gray-500)', fontSize: '0.8125rem' }}>
                                  {item.price > 0 ? `₹${item.price}` : 'TBD by vendor'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {isPending && (
                        <ApprovalPanel
                          order={order}
                          role="principal"
                          onApprove={remarks => handleApprove(order, remarks)}
                          onReject={remarks => handleReject(order, remarks)}
                        />
                      )}

                      {!isPending && order.principalApproval?.remarks && (
                        <div style={{ padding: '12px 16px', background: 'var(--gray-50)', borderRadius: '8px', fontSize: '0.875rem' }}>
                          <strong>Your remarks:</strong> {order.principalApproval.remarks}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✅' : '❌'} {toast.msg}</div>
        </div>
      )}
    </AppShell>
  );
}
