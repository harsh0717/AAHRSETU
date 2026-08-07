'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import ApprovalPanel from '@/components/ApprovalPanel';
import OrderStepper from '@/components/OrderStepper';
import { getSession, getUsers } from '@/lib/auth';
import { getOrders, upsertOrder, addHistoryEntry, initSeedData } from '@/lib/store';
import { notifyCoordinator, notifyVendorsOnDCRApproval } from '@/lib/notifications';
import { ROLE_COLORS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';

export default function DCRPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const colors = ROLE_COLORS.dcr;

  useEffect(() => {
    initSeedData();
    const s = getSession();
    if (!s || s.role !== 'dcr') {
      router.push('/login');
      return;
    }
    setSession(s);
    loadOrders();
  }, []);

  function loadOrders() {
    setOrders(getOrders());
  }

  function handleCardClick(order) {
    if (expandedOrderId === order.id) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(order.id);
      // Automatically update status to DCR Reviewing if it is currently Principal Approved
      if (order.status === 'Principal Approved') {
        const updated = {
          ...order,
          status: 'DCR Reviewing',
          updatedAt: new Date().toISOString(),
        };
        upsertOrder(updated);
        addHistoryEntry(order.id, {
          action: 'DCR Reviewing Started',
          role: session.role,
          user: session.name,
          remarks: 'Reviewing budget and order details'
        });
        loadOrders();
      }
    }
  }

  function handleApprove(order, remarks) {
    const now = new Date().toISOString();
    
    // Setup DCR approval details
    const dcrApproval = {
      status: 'approved',
      remarks,
      reviewedAt: now,
      reviewedBy: session.name
    };

    // Forward immediately to vendor processing
    // Initialize vendorOrder statuses to Pending
    const updatedVendorOrders = (order.vendorOrders || []).map(vo => ({
      ...vo,
      status: 'Pending'
    }));

    const updated = {
      ...order,
      status: 'Vendor Processing',
      dcrApproval,
      vendorOrders: updatedVendorOrders,
      updatedAt: now
    };

    upsertOrder(updated);
    addHistoryEntry(order.id, {
      action: 'DCR Approved & Sent to Vendors',
      role: session.role,
      user: session.name,
      remarks: remarks || 'Approved budget and forwarded order to vendors'
    });

    // Notify all vendors involved
    const allUsers = getUsers();
    notifyVendorsOnDCRApproval(updated, allUsers);

    // Notify coordinator
    notifyCoordinator(updated, 'approved by DCR', remarks);

    setExpandedOrderId(null);
    loadOrders();
  }

  function handleReject(order, remarks) {
    const now = new Date().toISOString();
    const updated = {
      ...order,
      status: 'DCR Rejected',
      dcrApproval: {
        status: 'rejected',
        remarks,
        reviewedAt: now,
        reviewedBy: session.name
      },
      updatedAt: now
    };
    upsertOrder(updated);
    addHistoryEntry(order.id, {
      action: 'DCR Rejected',
      role: session.role,
      user: session.name,
      remarks
    });
    
    // Notify coordinator
    notifyCoordinator(updated, 'rejected by DCR', remarks);

    setExpandedOrderId(null);
    loadOrders();
  }

  if (!session) return null;

  // Filter orders
  // Pending review: status is 'Principal Approved' or 'DCR Reviewing'
  const pendingOrders = orders.filter(o => o.status === 'Principal Approved' || o.status === 'DCR Reviewing');

  // History orders: Reviewed by DCR
  const historyOrders = orders.filter(o => o.dcrApproval && o.dcrApproval.status !== null && o.status !== 'Principal Approved' && o.status !== 'DCR Reviewing');

  // Stats
  const totalPending = pendingOrders.length;
  const totalApproved = historyOrders.filter(o => o.dcrApproval.status === 'approved').length;
  const totalRejected = historyOrders.filter(o => o.dcrApproval.status === 'rejected').length;

  const currentTabOrders = activeTab === 'pending' ? pendingOrders : historyOrders;

  return (
    <AppShell role="dcr" currentPath="/dcr">
      <div style={{ '--role-accent': colors.accent }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px' }}>
            {t('dashboard.welcome')} {session.name} 👋
          </h1>
          <div style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
            {t('role.dcr')} · Canteen Budget & Order Audit
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Pending Audit', value: totalPending, color: colors.accent, icon: '⏳' },
            { label: 'Approved & Sent to Vendor', value: totalApproved, color: '#059669', icon: '✅' },
            { label: 'Total Rejected', value: totalRejected, color: '#EF4444', icon: '❌' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '16px 20px', borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid var(--gray-200)' }}>
          {[
            { key: 'pending', label: 'Pending Review', count: pendingOrders.length },
            { key: 'history', label: 'DCR Audit History', count: historyOrders.length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setExpandedOrderId(null); }}
              style={{
                padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.875rem',
                color: activeTab === tab.key ? colors.accent : 'var(--gray-500)',
                borderBottom: activeTab === tab.key ? `3px solid ${colors.accent}` : '3px solid transparent',
                marginBottom: '-2px', transition: 'all 0.15s',
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* List of Orders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {currentTabOrders.length === 0 ? (
            <div className="card empty-state" style={{ padding: '48px 24px' }}>
              <div className="empty-state-icon">📋</div>
              <h3>{activeTab === 'pending' ? 'No Pending Audits' : 'No Audit Records'}</h3>
              <p>{activeTab === 'pending' ? 'All clear! No orders are currently awaiting budget/DCR audit.' : 'Your historical audit and forwarding records will appear here.'}</p>
            </div>
          ) : (
            currentTabOrders.map(order => {
              const isExpanded = expandedOrderId === order.id;
              const itemCount = (order.vendorOrders || []).flatMap(vo => vo.items || []).reduce((s, i) => s + i.quantity, 0);

              return (
                <div
                  key={order.id}
                  className="card"
                  style={{
                    padding: 0,
                    overflow: 'hidden',
                    borderLeft: `4px solid ${
                      order.status.includes('Rejected')
                        ? '#EF4444'
                        : order.status.includes('Approved') || order.status === 'Completed' || order.status === 'Bill Generated' || order.status === 'Vendor Processing' || order.status === 'Vendor Confirmed'
                        ? '#059669'
                        : colors.accent
                    }`,
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Card Summary Clickable Area */}
                  <div
                    style={{ padding: '16px 20px', cursor: 'pointer' }}
                    onClick={() => handleCardClick(order)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{order.title}</span>
                          <StatusBadge status={order.status} size="sm" />
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <span>📋 {order.id}</span>
                          <span>🏢 {order.departmentLabel}</span>
                          <span>👤 {order.createdBy?.name}</span>
                          <span>🗓️ {new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
                          <span>🍽️ {itemCount} Items</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {order.totalBillAmount > 0 && (
                          <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>
                            ₹{order.totalBillAmount}
                          </span>
                        )}
                        <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                          {isExpanded ? '▲ Collapse' : '▼ Expand'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content Area */}
                  {isExpanded && (
                    <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--gray-100)', marginTop: '2px' }}>
                      <div style={{ padding: '12px 0', fontSize: '0.875rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--gray-700)', marginBottom: '4px' }}>{t('common.purpose')}</div>
                        <div style={{ color: 'var(--gray-600)' }}>{order.purpose}</div>
                      </div>

                      {/* Item Details grouped by Vendor */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                          Order Items & Vendor Splits
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {(order.vendorOrders || []).map(vo => (
                            <div key={vo.id} style={{ background: 'var(--surface-1)', border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '10px 14px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <strong style={{ fontSize: '0.85rem' }}>🏪 {vo.vendorName}</strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Vendor ID: {vo.vendorId}</span>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {vo.items.map((item, idx) => (
                                  <span key={idx} style={{ fontSize: '0.75rem', background: 'white', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
                                    {item.name} × {item.quantity}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Approval History - Principal info */}
                      {order.principalApproval && (
                        <div style={{ background: '#F5F3FF', borderLeft: '3px solid #7C3AED', borderRadius: '4px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.82rem' }}>
                          <strong>🎓 Principal Approval:</strong> Approved by {order.principalApproval.reviewedBy} on {new Date(order.principalApproval.reviewedAt).toLocaleDateString('en-IN')}
                          {order.principalApproval.remarks && (
                            <div style={{ fontStyle: 'italic', marginTop: '4px', color: '#4C1D95' }}>
                              "{order.principalApproval.remarks}"
                            </div>
                          )}
                        </div>
                      )}

                      {/* Stepper progress indicator */}
                      <div style={{ marginBottom: '20px', background: '#F8FAFC', borderRadius: '8px', padding: '10px' }}>
                        <OrderStepper status={order.status} />
                      </div>

                      {/* Review details for history or decision panel for pending */}
                      {activeTab === 'pending' ? (
                        <div style={{ marginTop: '16px' }}>
                          <ApprovalPanel
                            order={order}
                            role="dcr"
                            onApprove={(remarks) => handleApprove(order, remarks)}
                            onReject={(remarks) => handleReject(order, remarks)}
                          />
                        </div>
                      ) : (
                        <div style={{ marginTop: '16px', background: '#F3F4F6', borderRadius: '8px', padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.8.rem', color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                            Your Audit Verdict
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <strong>Verdict: </strong>
                              <span style={{ color: order.dcrApproval.status === 'approved' ? '#059669' : '#EF4444', fontWeight: 700 }}>
                                {order.dcrApproval.status === 'approved' ? 'Approved & Sent to Vendor' : 'Rejected'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                              Audited: {new Date(order.dcrApproval.reviewedAt).toLocaleString('en-IN')}
                            </div>
                          </div>
                          {order.dcrApproval.remarks && (
                            <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--gray-700)', fontStyle: 'italic', background: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--gray-200)' }}>
                              " {order.dcrApproval.remarks} "
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}
