'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import CreateOrderModal from '@/components/CreateOrderModal';
import { getSession } from '@/lib/auth';
import { getOrders, upsertOrder, addHistoryEntry, initSeedData } from '@/lib/store';
import { ROLE_COLORS, DEPARTMENTS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';

export default function CoordinatorPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState(null);
  const [orders, setOrders] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');
  const [filter, setFilter] = useState('all');
  const colors = ROLE_COLORS.coordinator;

  useEffect(() => {
    initSeedData();
    const s = getSession();
    if (!s || s.role !== 'coordinator') { router.push('/login'); return; }
    setSession(s);
    loadOrders(s);

    if (typeof window !== 'undefined' && window.location.hash === '#create') setShowCreate(true);
  }, []);

  function loadOrders(s) {
    const sess = s || session;
    if (!sess) return;
    const all = getOrders().filter(o => o.department === sess.department || o.createdBy?.id === sess.id);
    setOrders(all);
  }

  const refresh = () => loadOrders(session);

  const deptInfo = DEPARTMENTS.find(d => d.id === session?.department);

  // Stats
  const total    = orders.length;
  const pending  = orders.filter(o => ['Created','Sent for Approval','Principal Reviewing','DCR Reviewing','Principal Approved','Vendor Processing','Coordinator Updated'].includes(o.status)).length;
  const approved = orders.filter(o => ['DCR Approved','Vendor Processing','Vendor Confirmed','Bill Generated','Completed'].includes(o.status)).length;
  const rejected = orders.filter(o => o.status?.includes('Rejected')).length;
  const completed = orders.filter(o => o.status === 'Completed').length;
  const totalBilled = orders.filter(o => o.totalBillAmount > 0).reduce((s, o) => s + (o.totalBillAmount || 0), 0);

  const STATUS_FILTERS = [
    { key: 'all',      label: 'All Orders' },
    { key: 'active',   label: 'Active' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'completed',label: 'Completed' },
  ];

  function filterOrders(list) {
    if (filter === 'all')      return list;
    if (filter === 'active')   return list.filter(o => !['Completed','Principal Rejected','DCR Rejected'].includes(o.status));
    if (filter === 'approved') return list.filter(o => ['DCR Approved','Vendor Processing','Vendor Confirmed','Bill Generated','Completed'].includes(o.status));
    if (filter === 'rejected') return list.filter(o => o.status?.includes('Rejected'));
    if (filter === 'completed')return list.filter(o => o.status === 'Completed');
    return list;
  }

  function handleSubmitForApproval(order) {
    const updated = {
      ...order,
      status: 'Sent for Approval',
      history: [...(order.history||[]), { action: 'Submitted for Approval', role: session.role, user: session.name, timestamp: new Date().toISOString(), remarks: '' }],
    };
    upsertOrder(updated);
    refresh();
  }

  function handleResubmit(order) {
    const updated = {
      ...order,
      status: 'Sent for Approval',
      principalApproval: { status: null, remarks: '', reviewedAt: '', reviewedBy: '' },
      dcrApproval: { status: null, remarks: '', reviewedAt: '', reviewedBy: '' },
      history: [...(order.history||[]), { action: 'Resubmitted for Approval', role: session.role, user: session.name, timestamp: new Date().toISOString(), remarks: 'Resubmitted after revision' }],
    };
    upsertOrder(updated);
    refresh();
  }

  const displayOrders = filterOrders(orders).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  if (!session) return null;

  return (
    <AppShell role="coordinator" currentPath="/coordinator">
      <div style={{ '--role-accent': colors.accent }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px' }}>
            {t('dashboard.welcome')} {session.name} 👋
          </h1>
          <div style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
            {deptInfo?.label} · {t('role.coordinator')}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: t('dashboard.total_orders'), value: total,     color: colors.accent, icon: '📦' },
            { label: t('dashboard.in_progress'),  value: pending,   color: '#D97706',     icon: '⏳' },
            { label: t('dashboard.approved'),      value: approved,  color: '#059669',     icon: '✅' },
            { label: t('dashboard.rejected'),      value: rejected,  color: '#EF4444',     icon: '❌' },
            { label: t('dashboard.completed'),     value: completed, color: '#0D9488',     icon: '🏆' },
            { label: t('dashboard.total_billed'),  value: `₹${totalBilled.toLocaleString('en-IN')}`, color: '#7C3AED', icon: '💰' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '14px 16px', borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: '1.3rem', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                  background: filter === f.key ? colors.accent : 'var(--surface-1)',
                  color: filter === f.key ? 'white' : 'var(--gray-600)',
                  boxShadow: filter === f.key ? `0 2px 8px ${colors.accent}44` : 'none',
                }}>{f.label}</button>
            ))}
          </div>
          <button id="create-order-btn" onClick={() => setShowCreate(true)}
            className="btn btn-primary"
            style={{ '--role-accent': colors.accent }}>
            ➕ {t('orders.create')}
          </button>
        </div>

        {/* Orders */}
        <div id="orders" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {displayOrders.length === 0 ? (
            <div className="card empty-state" style={{ padding: '48px 24px' }}>
              <div className="empty-state-icon">📦</div>
              <h3>{t('dashboard.no_orders')}</h3>
              <p>{t('dashboard.no_orders_sub')}</p>
              <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ '--role-accent': colors.accent }}>
                ➕ {t('orders.create')}
              </button>
            </div>
          ) : displayOrders.map(order => (
            <OrderCard key={order.id} order={order} session={session} colors={colors} t={t}
              onSubmit={() => handleSubmitForApproval(order)}
              onResubmit={() => handleResubmit(order)} />
          ))}
        </div>

        {/* Create modal */}
        {showCreate && (
          <CreateOrderModal
            session={session}
            onCreated={() => { refresh(); setShowCreate(false); }}
            onClose={() => setShowCreate(false)}
          />
        )}
      </div>
    </AppShell>
  );
}

function OrderCard({ order, session, colors, t, onSubmit, onResubmit }) {
  const [expanded, setExpanded] = useState(false);

  const isRejected  = order.status?.includes('Rejected');
  const isCreated   = order.status === 'Created';
  const isModReq    = order.status === 'Vendor Clarification Required';
  const isCompleted = order.status === 'Completed';

  return (
    <div className="card" style={{
      padding: 0, overflow: 'hidden',
      borderLeft: `3px solid ${isRejected ? '#EF4444' : isCompleted ? '#059669' : isModReq ? '#F59E0B' : colors.accent}`,
      transition: 'box-shadow 0.2s',
    }}>
      {/* Summary row */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{order.title}</span>
            <StatusBadge status={order.status} size="sm" />
            {isModReq && <span style={{ fontSize: '0.7rem', background: '#FFF7ED', color: '#C2410C', padding: '2px 8px', borderRadius: '10px', fontWeight: 700, border: '1px solid #FED7AA' }}>🔄 Vendor wants changes</span>}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span>📋 {order.id}</span>
            <span>🗓️ {new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
            <span>🍽️ {(order.vendorOrders||[]).length} vendor(s)</span>
            {order.totalBillAmount > 0 && <span style={{ color: '#059669', fontWeight: 700 }}>₹{order.totalBillAmount.toLocaleString('en-IN')}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isCreated && (
            <button onClick={e => { e.stopPropagation(); onSubmit(); }}
              className="btn btn-primary btn-sm" style={{ '--role-accent': colors.accent }}>
              📤 Submit
            </button>
          )}
          {isRejected && (
            <button onClick={e => { e.stopPropagation(); onResubmit(); }}
              className="btn btn-sm" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
              🔄 Resubmit
            </button>
          )}
          {(order.status === 'Bill Generated' || isCompleted) && (
            <Link href={`/bill/${order.id}`}
              style={{ padding: '5px 12px', borderRadius: '8px', background: '#ECFDF5', color: '#047857', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none', border: '1px solid #A7F3D0' }}>
              🧾 Bill
            </Link>
          )}
          <Link href={`/order/${order.id}`}
            style={{ padding: '5px 12px', borderRadius: '8px', background: 'var(--surface-1)', color: 'var(--gray-600)', fontWeight: 600, fontSize: '0.8rem', textDecoration: 'none' }}
            onClick={e => e.stopPropagation()}>
            View →
          </Link>
          <span style={{ color: 'var(--gray-400)', fontSize: '1.1rem' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded view */}
      {expanded && (
        <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--gray-100)' }}>
          <div style={{ padding: '12px 0', color: 'var(--gray-600)', fontSize: '0.875rem', borderBottom: '1px solid var(--gray-100)', marginBottom: '12px' }}>
            📝 {order.purpose}
          </div>

          {/* Vendor sub-orders */}
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Vendor Orders
          </div>
          {(order.vendorOrders || []).map(vo => (
            <div key={vo.id} style={{ marginBottom: '8px', padding: '10px 14px', background: 'var(--surface-1)', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ fontSize: '0.875rem' }}>🍽️ {vo.vendorName}</strong>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {vo.billAmount > 0 && <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.8rem' }}>₹{vo.billAmount}</span>}
                  {vo.modification && (
                    <span style={{ fontSize: '0.7rem', background: '#FFF7ED', color: '#C2410C', padding: '2px 7px', borderRadius: '10px', fontWeight: 700 }}>
                      🔄 Mod Requested
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {vo.items.map((item, i) => (
                  <span key={i} style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'white', border: '1px solid var(--gray-200)', borderRadius: '12px' }}>
                    {item.name} × {item.quantity}
                  </span>
                ))}
              </div>
              {/* Modification info */}
              {vo.modification && (
                <div style={{ marginTop: '8px', padding: '8px 12px', background: '#FFF7ED', borderRadius: '6px', fontSize: '0.8125rem', color: '#C2410C' }}>
                  <strong>Vendor Reason:</strong> {vo.modification.reason}
                </div>
              )}
            </div>
          ))}

          {/* Rejection details */}
          {order.status === 'Principal Rejected' && order.principalApproval?.remarks && (
            <div style={{ padding: '10px 14px', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA', marginTop: '8px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B91C1C', marginBottom: '4px' }}>Principal Rejection Reason:</div>
              <div style={{ fontSize: '0.875rem', color: '#DC2626' }}>{order.principalApproval.remarks}</div>
            </div>
          )}
          {order.status === 'DCR Rejected' && order.dcrApproval?.remarks && (
            <div style={{ padding: '10px 14px', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA', marginTop: '8px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B91C1C', marginBottom: '4px' }}>DCR Rejection Reason:</div>
              <div style={{ fontSize: '0.875rem', color: '#DC2626' }}>{order.dcrApproval.remarks}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
