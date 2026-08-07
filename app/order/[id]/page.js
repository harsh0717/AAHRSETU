'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import OrderStepper from '@/components/OrderStepper';
import { getOrderById, getSession, initSeedData } from '@/lib/store';
import { ROLE_COLORS, ROLE_LABELS } from '@/lib/constants';

const ROLE_ICONS_MAP = {
  coordinator: '👤', principal: '🎓', dcr: '📋', vendor: '🍽️', admin: '⚙️', system: '🤖',
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id;

  const [order, setOrder] = useState(null);
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initSeedData();
    const s = getSession();
    setSession(s);
    if (orderId) {
      const o = getOrderById(orderId);
      setOrder(o);
    }
    setLoading(false);
  }, [orderId]);

  const role = session?.role || 'coordinator';
  const colors = ROLE_COLORS[role] || ROLE_COLORS.coordinator;

  function goBack() {
    const roleRoutes = { coordinator: '/coordinator', principal: '/principal', dcr: '/dcr', vendor: '/vendor', admin: '/admin' };
    router.push(roleRoutes[role] || '/');
  }

  if (loading) return (
    <AppShell role={role}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', fontSize: '1.5rem' }}>
        ⏳ Loading...
      </div>
    </AppShell>
  );

  if (!order) return (
    <AppShell role={role}>
      <div className="empty-state">
        <div className="empty-state-icon">❓</div>
        <h3>Order not found</h3>
        <p>Order #{orderId} doesn't exist.</p>
        <button className="btn btn-primary" onClick={goBack} style={{ '--role-accent': colors.accent, marginTop: '16px' }}>← Go Back</button>
      </div>
    </AppShell>
  );

  const billTotal = order.billAmount || order.items?.reduce((s, i) => s + (i.price * i.quantity), 0) || 0;

  return (
    <AppShell role={role} currentPath={`/order/${orderId}`}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <button className="btn btn-ghost btn-sm" onClick={goBack} style={{ marginBottom: '16px' }}>
          ← Back to Dashboard
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h2 style={{ margin: 0 }}>{order.title}</h2>
              <StatusBadge status={order.status} />
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>{order.purpose}</p>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '0.8125rem', color: 'var(--gray-500)', flexWrap: 'wrap' }}>
              <span>📋 {order.id}</span>
              <span>👤 {order.createdBy?.name}</span>
              <span>📅 Created: {new Date(order.createdAt).toLocaleString('en-IN')}</span>
              <span>🔄 Updated: {new Date(order.updatedAt).toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {order.status === 'Completed' && (
              <button className="btn btn-success btn-sm" onClick={() => router.push(`/bill/${order.id}`)}>
                🧾 View Bill
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Stepper */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="section-title" style={{ marginBottom: '0' }}>Order Pipeline</div>
        <OrderStepper status={order.status} />
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ '--role-accent': colors.accent }}>
        <button className={`tab ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>📝 Details</button>
        <button className={`tab ${activeTab === 'approvals' ? 'active' : ''}`} onClick={() => setActiveTab('approvals')}>✅ Approvals</button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>📜 History ({order.history?.length || 0})</button>
        {order.billAmount > 0 && (
          <button className={`tab ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>💰 Billing</button>
        )}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Items */}
          <div className="card">
            <div className="section-title" style={{ marginBottom: '16px' }}>🛒 Order Items</div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th style={{ textAlign: 'center' }}>Quantity</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item, idx) => (
                    <tr key={item.name}>
                      <td style={{ color: 'var(--gray-400)' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>
                        {item.price > 0 ? `₹${item.price}` : <span style={{ color: 'var(--gray-400)', fontSize: '0.8125rem' }}>TBD</span>}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: item.price > 0 ? 700 : 400 }}>
                        {item.price > 0 ? `₹${item.price * item.quantity}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {billTotal > 0 && (
                  <tfoot>
                    <tr style={{ background: 'var(--gray-50)' }}>
                      <td colSpan={4} style={{ fontWeight: 700, textAlign: 'right' }}>Total</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: '#047857' }}>₹{billTotal}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Order Info */}
          <div className="card">
            <div className="section-title" style={{ marginBottom: '16px' }}>📋 Order Information</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Order ID', value: order.id, mono: true },
                { label: 'Title', value: order.title },
                { label: 'Purpose', value: order.purpose },
                { label: 'Created By', value: `${order.createdBy?.name} (${ROLE_LABELS[order.createdBy?.role] || order.createdBy?.role})` },
                { label: 'Created At', value: new Date(order.createdAt).toLocaleString('en-IN') },
                { label: 'Last Updated', value: new Date(order.updatedAt).toLocaleString('en-IN') },
                { label: 'Current Status', value: <StatusBadge status={order.status} size="sm" /> },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', fontWeight: 500, flexShrink: 0 }}>{row.label}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, textAlign: 'right', fontFamily: row.mono ? 'var(--font-mono)' : 'inherit' }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Approvals Tab */}
      {activeTab === 'approvals' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Principal */}
          <div className="card" style={{ borderLeft: '4px solid #7C3AED' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.5rem' }}>🎓</div>
              <div>
                <div style={{ fontWeight: 700, color: '#7C3AED' }}>Principal Review</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>Dr. A. Mehta</div>
              </div>
            </div>
            {order.principalApproval?.status ? (
              <div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '4px 12px', borderRadius: '20px',
                  background: order.principalApproval.status === 'approved' ? '#DCFCE7' : '#FEF2F2',
                  color: order.principalApproval.status === 'approved' ? '#166534' : '#DC2626',
                  fontWeight: 700, fontSize: '0.875rem', marginBottom: '12px',
                }}>
                  {order.principalApproval.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                </div>
                {order.principalApproval.remarks && (
                  <div style={{ padding: '10px 14px', background: 'var(--gray-50)', borderRadius: '8px', fontSize: '0.8125rem', color: 'var(--gray-700)', fontStyle: 'italic' }}>
                    "{order.principalApproval.remarks}"
                  </div>
                )}
                {order.principalApproval.reviewedAt && (
                  <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                    {new Date(order.principalApproval.reviewedAt).toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>⏳ Pending review</div>
            )}
          </div>

          {/* DCR */}
          <div className="card" style={{ borderLeft: '4px solid #D97706' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.5rem' }}>📋</div>
              <div>
                <div style={{ fontWeight: 700, color: '#D97706' }}>DCR Review</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>S. Patil</div>
              </div>
            </div>
            {order.dcrApproval?.status ? (
              <div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '4px 12px', borderRadius: '20px',
                  background: order.dcrApproval.status === 'approved' ? '#DCFCE7' : '#FEF2F2',
                  color: order.dcrApproval.status === 'approved' ? '#166534' : '#DC2626',
                  fontWeight: 700, fontSize: '0.875rem', marginBottom: '12px',
                }}>
                  {order.dcrApproval.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                </div>
                {order.dcrApproval.remarks && (
                  <div style={{ padding: '10px 14px', background: 'var(--gray-50)', borderRadius: '8px', fontSize: '0.8125rem', color: 'var(--gray-700)', fontStyle: 'italic' }}>
                    "{order.dcrApproval.remarks}"
                  </div>
                )}
                {order.dcrApproval.reviewedAt && (
                  <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                    {new Date(order.dcrApproval.reviewedAt).toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>⏳ Pending review</div>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="section-title" style={{ marginBottom: '20px' }}>📜 Audit Trail</div>
          {!order.history?.length ? (
            <div className="empty-state"><div className="empty-state-icon">📭</div><h3>No history</h3></div>
          ) : (
            <div className="timeline">
              {[...order.history].reverse().map((entry, idx) => (
                <div key={idx} className="timeline-item">
                  <div className="timeline-dot">
                    {ROLE_ICONS_MAP[entry.role] || '📌'}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-action">{entry.action}</div>
                    <div className="timeline-meta">
                      {ROLE_LABELS[entry.role] || entry.role} · {entry.user} · {new Date(entry.timestamp).toLocaleString('en-IN')}
                    </div>
                    {entry.remarks && (
                      <div className="timeline-remarks">{entry.remarks}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && order.billAmount > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div className="section-title">💰 Billing Summary</div>
            <button className="btn btn-primary btn-sm" onClick={() => router.push(`/bill/${order.id}`)} style={{ '--role-accent': '#059669' }}>
              🧾 View Full Bill
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div className="stat-card">
              <div className="stat-label">Total Bill Amount</div>
              <div className="stat-value" style={{ color: '#047857' }}>₹{order.billAmount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Bill Generated</div>
              <div style={{ fontWeight: 600, marginTop: '8px' }}>
                {order.billGeneratedAt ? new Date(order.billGeneratedAt).toLocaleString('en-IN') : '—'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Notifications Sent</div>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {['coordinator', 'principal', 'dcr'].map(r => (
                  <div key={r} style={{ fontSize: '0.8125rem', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span>{order.notified?.[r] ? '✅' : '⏳'}</span>
                    <span style={{ textTransform: 'capitalize' }}>{ROLE_LABELS[r]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
