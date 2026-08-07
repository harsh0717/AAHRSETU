'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import OrderStepper from '@/components/OrderStepper';
import ApprovalPanel from '@/components/ApprovalPanel';
import ModificationPanel from '@/components/ModificationPanel';
import { getSession, logout } from '@/lib/auth';
import {
  getOrderById, upsertOrder, addHistoryEntry, updateVendorOrderInMaster, initSeedData,
} from '@/lib/store';
import { getUsers } from '@/lib/auth';
import { notifyCoordinator, notifyVendorsOnDCRApproval } from '@/lib/notifications';
import { ROLE_COLORS, ROLE_LABELS, STATUS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';

const ROLE_ICONS_MAP = {
  coordinator: '👤', principal: '🎓', dcr: '📋', vendor: '🍽️', admin: '⚙️', system: '🤖',
};

const ROLE_DASHBOARDS = {
  coordinator: '/coordinator', principal: '/principal',
  dcr: '/dcr', vendor: '/vendor', admin: '/admin',
};

export default function OrderDetailPage() {
  const router   = useRouter();
  const params   = useParams();
  const { t }    = useI18n();
  const orderId  = params?.id;

  const [order,   setOrder]   = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState(null);
  const [activeTab, setActiveTab] = useState('details');

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  const refreshOrder = useCallback(() => {
    if (orderId) {
      const o = getOrderById(orderId);
      setOrder(o);
    }
  }, [orderId]);

  useEffect(() => {
    initSeedData();
    const s = getSession();
    if (!s) { router.push('/login'); return; }
    setSession(s);
    if (orderId) {
      const o = getOrderById(orderId);
      setOrder(o);
    }
    setLoading(false);
  }, [orderId]);

  const role   = session?.role || 'coordinator';
  const colors = ROLE_COLORS[role] || ROLE_COLORS.coordinator;

  function goBack() {
    router.push(ROLE_DASHBOARDS[role] || '/');
  }

  // ── Coordinator actions ───────────────────────────────────────────────────────
  function handleSubmitForApproval() {
    if (!order) return;
    const updated = upsertOrder({ ...order, status: STATUS.SENT_FOR_APPROVAL });
    addHistoryEntry(order.id, {
      action: 'Submitted for Approval',
      role: 'coordinator',
      user: session.name,
      remarks: 'Order sent to principal for review',
    });
    showToast('Order submitted for approval');
    refreshOrder();
  }

  function handleEditAndResubmit() {
    if (!order) return;
    const updated = upsertOrder({
      ...order,
      status: STATUS.SENT_FOR_APPROVAL,
      principalApproval: { status: null, remarks: '', reviewedAt: '', reviewedBy: '' },
      dcrApproval:       { status: null, remarks: '', reviewedAt: '', reviewedBy: '' },
    });
    addHistoryEntry(order.id, {
      action: 'Resubmitted After Rejection',
      role: 'coordinator',
      user: session.name,
      remarks: 'Coordinator revised and resubmitted the order',
    });
    showToast('Order resubmitted for approval');
    refreshOrder();
  }

  function handleAcceptModification(vendorOrder, modType) {
    if (!order) return;
    const updatedVo = { ...vendorOrder, modification: null, status: 'Vendor Clarification Accepted' };
    const newStatus = STATUS.COORDINATOR_UPDATED;
    updateVendorOrderInMaster(order.id, updatedVo);
    upsertOrder({ ...getOrderById(order.id), status: newStatus });
    addHistoryEntry(order.id, {
      action: 'Modification Accepted',
      role: 'coordinator',
      user: session.name,
      remarks: `Accepted ${modType} modification from ${vendorOrder.vendorName}`,
    });
    showToast(`Modification from ${vendorOrder.vendorName} accepted`);
    refreshOrder();
  }

  function handleRejectModification(vendorOrder) {
    if (!order) return;
    const updatedVo = { ...vendorOrder, modification: null, status: 'Modification Rejected' };
    updateVendorOrderInMaster(order.id, updatedVo);
    addHistoryEntry(order.id, {
      action: 'Modification Rejected',
      role: 'coordinator',
      user: session.name,
      remarks: `Rejected modification request from ${vendorOrder.vendorName}`,
    });
    showToast(`Modification from ${vendorOrder.vendorName} rejected`);
    refreshOrder();
  }

  // ── Principal actions ─────────────────────────────────────────────────────────
  function handlePrincipalApprove(remarks) {
    if (!order) return;
    const now = new Date().toISOString();
    const updated = upsertOrder({
      ...order,
      status: STATUS.PRINCIPAL_APPROVED,
      principalApproval: { status: 'approved', remarks, reviewedAt: now, reviewedBy: session.name },
    });
    addHistoryEntry(order.id, {
      action: 'Principal Approved',
      role: 'principal',
      user: session.name,
      remarks: remarks || 'Approved without remarks',
    });
    notifyCoordinator(getOrderById(order.id), 'approved by principal', remarks);
    showToast('Order approved — forwarding to DCR');
    refreshOrder();
  }

  function handlePrincipalReject(reason) {
    if (!order) return;
    const now = new Date().toISOString();
    upsertOrder({
      ...order,
      status: STATUS.PRINCIPAL_REJECTED,
      principalApproval: { status: 'rejected', remarks: reason, reviewedAt: now, reviewedBy: session.name },
    });
    addHistoryEntry(order.id, {
      action: 'Principal Rejected',
      role: 'principal',
      user: session.name,
      remarks: reason,
    });
    notifyCoordinator(getOrderById(order.id), 'rejected by principal', reason);
    showToast('Order rejected', 'error');
    refreshOrder();
  }

  // ── DCR actions ───────────────────────────────────────────────────────────────
  function handleDCRApprove(remarks) {
    if (!order) return;
    const now = new Date().toISOString();
    const allUsers = getUsers();
    const updated = upsertOrder({
      ...order,
      status: STATUS.DCR_APPROVED,
      dcrApproval: { status: 'approved', remarks, reviewedAt: now, reviewedBy: session.name },
    });
    addHistoryEntry(order.id, {
      action: 'DCR Approved',
      role: 'dcr',
      user: session.name,
      remarks: remarks || 'Approved without remarks',
    });
    notifyCoordinator(getOrderById(order.id), 'approved by DCR', remarks);
    notifyVendorsOnDCRApproval(getOrderById(order.id), allUsers);
    showToast('Order approved — vendors notified');
    refreshOrder();
  }

  function handleDCRReject(reason) {
    if (!order) return;
    const now = new Date().toISOString();
    upsertOrder({
      ...order,
      status: STATUS.DCR_REJECTED,
      dcrApproval: { status: 'rejected', remarks: reason, reviewedAt: now, reviewedBy: session.name },
    });
    addHistoryEntry(order.id, {
      action: 'DCR Rejected',
      role: 'dcr',
      user: session.name,
      remarks: reason,
    });
    notifyCoordinator(getOrderById(order.id), 'rejected by DCR', reason);
    showToast('Order rejected by DCR', 'error');
    refreshOrder();
  }

  // ── Admin actions ─────────────────────────────────────────────────────────────
  function handleGenerateBill() {
    if (!order) return;
    const total = (order.vendorOrders || []).reduce((s, vo) => s + (vo.billAmount || 0), 0);
    upsertOrder({
      ...order,
      status: STATUS.BILL_GENERATED,
      totalBillAmount: total,
      billGeneratedAt: new Date().toISOString(),
    });
    addHistoryEntry(order.id, {
      action: 'Bill Generated',
      role: 'admin',
      user: session?.name || 'Admin',
      remarks: `Total bill: ₹${total}`,
    });
    showToast(`Bill generated — ₹${total}`);
    refreshOrder();
  }

  function handleMarkComplete() {
    if (!order) return;
    upsertOrder({ ...order, status: STATUS.COMPLETED });
    addHistoryEntry(order.id, {
      action: 'Order Completed',
      role: 'admin',
      user: session?.name || 'Admin',
      remarks: 'Marked complete by admin',
    });
    showToast('Order marked as Completed ✅');
    refreshOrder();
  }

  // ── Loading / not found states ────────────────────────────────────────────────
  if (loading) return (
    <AppShell role={role}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', fontSize: '1.5rem' }}>
        ⏳ Loading…
      </div>
    </AppShell>
  );

  if (!order) return (
    <AppShell role={role}>
      <div className="empty-state">
        <div className="empty-state-icon">❓</div>
        <h3>Order not found</h3>
        <p>Order #{orderId} does not exist or was deleted.</p>
        <button className="btn btn-primary" style={{ '--role-accent': colors.accent, marginTop: '16px' }} onClick={goBack}>
          ← Go Back
        </button>
      </div>
    </AppShell>
  );

  const canCoordSubmit  = role === 'coordinator' && order.status === STATUS.CREATED;
  const canCoordResubmit = role === 'coordinator' && (order.status === STATUS.PRINCIPAL_REJECTED || order.status === STATUS.DCR_REJECTED);
  const canCoordViewMods = role === 'coordinator' && order.status === STATUS.VENDOR_CLARIFICATION
    && (order.vendorOrders || []).some(vo => vo.modification);
  const canPrincipalApprove = role === 'principal' && order.status === STATUS.SENT_FOR_APPROVAL;
  const canDCRApprove        = role === 'dcr' && order.status === STATUS.PRINCIPAL_APPROVED;
  const canAdminGenBill      = role === 'admin' && order.status === STATUS.VENDOR_CONFIRMED;
  const canAdminComplete     = role === 'admin' && order.status === STATUS.BILL_GENERATED;
  const canViewBill          = order.status === STATUS.BILL_GENERATED || order.status === STATUS.COMPLETED;

  const hasAnyAction = canCoordSubmit || canCoordResubmit || canCoordViewMods
    || canPrincipalApprove || canDCRApprove || canAdminGenBill || canAdminComplete;

  const TABS = [
    { key: 'details',   label: '📝 Details' },
    { key: 'vendors',   label: `🍽️ Vendors (${(order.vendorOrders || []).length})` },
    { key: 'approvals', label: '✅ Approvals' },
    { key: 'history',   label: `📜 History (${(order.history || []).length})` },
    ...(canViewBill ? [{ key: 'billing', label: '💰 Billing' }] : []),
  ];

  return (
    <AppShell role={role} currentPath={`/order/${orderId}`}>
      <div style={{ '--role-accent': colors.accent }}>

        {/* Back button */}
        <button className="btn btn-ghost btn-sm" onClick={goBack} style={{ marginBottom: '16px' }}>
          ← {t('common.back') || 'Back to Dashboard'}
        </button>

        {/* Order header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h2 style={{ margin: 0 }}>{order.title}</h2>
              <StatusBadge status={order.status} />
            </div>
            {order.purpose && (
              <p style={{ margin: '0 0 8px', fontSize: '0.875rem', color: 'var(--gray-600)' }}>{order.purpose}</p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
              <span>📋 {order.id}</span>
              <span>🏫 {order.departmentLabel || order.department}</span>
              <span>👤 {order.createdBy?.name}</span>
              <span>📅 {new Date(order.createdAt).toLocaleString('en-IN')}</span>
              <span>🔄 {new Date(order.updatedAt).toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {canViewBill && (
              <button className="btn btn-sm" style={{ background: '#0D9488', color: 'white', border: 'none' }}
                onClick={() => router.push(`/bill/${order.id}`)}>
                🧾 View Bill
              </button>
            )}
            {canAdminGenBill && (
              <button className="btn btn-primary btn-sm" onClick={handleGenerateBill}>
                🧾 Generate Bill
              </button>
            )}
            {canAdminComplete && (
              <button className="btn btn-sm btn-success" onClick={handleMarkComplete}>
                ✅ Mark Complete
              </button>
            )}
          </div>
        </div>

        {/* Order Stepper */}
        <div className="card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
          <div className="section-title" style={{ marginBottom: '4px' }}>Order Pipeline</div>
          <OrderStepper status={order.status} />
        </div>

        {/* Role-specific action banners */}
        {canCoordSubmit && (
          <div style={{ padding: '16px 20px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#1D4ED8' }}>📤 Ready to Submit</div>
              <div style={{ fontSize: '0.8125rem', color: '#3B82F6', marginTop: '2px' }}>Submit this order for principal review.</div>
            </div>
            <button className="btn btn-primary" onClick={handleSubmitForApproval}>
              📤 Submit for Approval
            </button>
          </div>
        )}

        {canCoordResubmit && (
          <div style={{ padding: '16px 20px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#DC2626' }}>❌ Order Rejected</div>
              <div style={{ fontSize: '0.8125rem', color: '#EF4444', marginTop: '2px' }}>
                {order.status === STATUS.PRINCIPAL_REJECTED ? 'Principal rejected this order. Review and resubmit.' : 'DCR rejected this order. Review and resubmit.'}
              </div>
              {(order.principalApproval?.remarks || order.dcrApproval?.remarks) && (
                <div style={{ marginTop: '8px', padding: '8px 12px', background: 'white', borderRadius: '8px', fontSize: '0.8125rem', color: '#B91C1C', fontStyle: 'italic', border: '1px solid #FECACA' }}>
                  Reason: {order.status === STATUS.PRINCIPAL_REJECTED ? order.principalApproval.remarks : order.dcrApproval.remarks}
                </div>
              )}
            </div>
            <button className="btn" style={{ background: '#DC2626', color: 'white', border: 'none' }} onClick={handleEditAndResubmit}>
              🔄 Edit &amp; Resubmit
            </button>
          </div>
        )}

        {canCoordViewMods && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '12px', color: '#C2410C' }}>
              🔄 Vendor Modification Requests
            </div>
            {(order.vendorOrders || []).filter(vo => vo.modification).map(vo => (
              <ModificationPanel
                key={vo.id}
                vendorOrder={vo}
                masterOrderId={order.id}
                session={session}
                mode="coordinator"
                onAcceptMod={(vendorOrder, modType) => handleAcceptModification(vendorOrder, modType)}
                onRejectMod={(vendorOrder) => handleRejectModification(vendorOrder)}
              />
            ))}
          </div>
        )}

        {canPrincipalApprove && (
          <div style={{ marginBottom: '20px' }}>
            <ApprovalPanel
              order={order}
              role="principal"
              onApprove={handlePrincipalApprove}
              onReject={handlePrincipalReject}
            />
          </div>
        )}

        {canDCRApprove && (
          <div style={{ marginBottom: '20px' }}>
            <ApprovalPanel
              order={order}
              role="dcr"
              onApprove={handleDCRApprove}
              onReject={handleDCRReject}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="tabs" style={{ '--role-accent': colors.accent }}>
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

        {/* ── DETAILS TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'details' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {/* Order info card */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: '16px' }}>📋 Order Information</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {[
                  { label: 'Order ID',     value: order.id,                         mono: true },
                  { label: 'Title',        value: order.title },
                  { label: 'Purpose',      value: order.purpose },
                  { label: 'Department',   value: order.departmentLabel || order.department },
                  { label: 'Created By',   value: `${order.createdBy?.name} (${ROLE_LABELS[order.createdBy?.role] || order.createdBy?.role})` },
                  { label: 'Created At',   value: new Date(order.createdAt).toLocaleString('en-IN') },
                  { label: 'Last Updated', value: new Date(order.updatedAt).toLocaleString('en-IN') },
                  { label: 'Status',       value: <StatusBadge status={order.status} size="sm" /> },
                ].map(row => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--gray-100)',
                  }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', fontWeight: 500, flexShrink: 0, minWidth: '110px' }}>{row.label}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, textAlign: 'right', fontFamily: row.mono ? 'var(--font-mono)' : 'inherit', wordBreak: 'break-all' }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Vendor orders summary */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: '16px' }}>🍽️ Vendor Orders Summary</div>
              {(order.vendorOrders || []).length === 0 ? (
                <div style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>No vendor orders.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(order.vendorOrders || []).map(vo => (
                    <div key={vo.id} style={{ padding: '12px 14px', background: 'var(--surface-1)', borderRadius: '10px', border: '1px solid var(--gray-200)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ fontWeight: 700 }}>{vo.vendorName}</div>
                        <StatusBadge status={vo.status || 'Pending'} size="sm" />
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
                        {(vo.items || []).length} item{(vo.items || []).length !== 1 ? 's' : ''}
                        {(vo.billAmount || 0) > 0 && <span style={{ color: '#047857', fontWeight: 700, marginLeft: '10px' }}>₹{vo.billAmount}</span>}
                      </div>
                    </div>
                  ))}
                  {(order.totalBillAmount || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#F0FDFA', borderRadius: '10px', border: '1px solid #99F6E4' }}>
                      <span style={{ fontWeight: 700 }}>Total Bill</span>
                      <span style={{ fontWeight: 800, color: '#047857', fontSize: '1.1rem' }}>₹{order.totalBillAmount}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── VENDORS TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'vendors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {(order.vendorOrders || []).length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🍽️</div>
                <h3>No vendor orders</h3>
              </div>
            ) : (
              (order.vendorOrders || []).map(vo => (
                <div key={vo.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>🏪 {vo.vendorName}</div>
                      {vo.invoiceNumber && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                          Invoice: {vo.invoiceNumber}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {(vo.billAmount || 0) > 0 && (
                        <span style={{ fontWeight: 800, color: '#047857', fontSize: '1rem' }}>₹{vo.billAmount}</span>
                      )}
                      <StatusBadge status={vo.status || 'Pending'} size="sm" />
                    </div>
                  </div>

                  {/* Items table */}
                  {(vo.items || []).length > 0 && (
                    <div className="table-wrapper">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Item</th>
                            <th style={{ textAlign: 'center' }}>Qty</th>
                            <th style={{ textAlign: 'right' }}>Unit Price</th>
                            <th style={{ textAlign: 'right' }}>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(vo.items || []).map((item, idx) => (
                            <tr key={idx}>
                              <td style={{ color: 'var(--gray-400)', fontWeight: 500 }}>{idx + 1}</td>
                              <td style={{ fontWeight: 600 }}>{item.name}</td>
                              <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                              <td style={{ textAlign: 'right' }}>
                                {(item.price || 0) > 0 ? `₹${item.price}` : <span style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>TBD</span>}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: (item.price || 0) > 0 ? 700 : 400 }}>
                                {(item.price || 0) > 0 ? `₹${(item.price * item.quantity).toFixed(0)}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {(vo.billAmount || 0) > 0 && (
                          <tfoot>
                            <tr style={{ background: 'var(--gray-50)' }}>
                              <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>Subtotal</td>
                              <td style={{ textAlign: 'right', fontWeight: 800, color: '#047857' }}>₹{vo.billAmount}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}

                  {/* Modification info */}
                  {vo.modification && (
                    <div style={{ marginTop: '12px', padding: '12px 14px', background: '#FFF7ED', borderRadius: '10px', border: '1px solid #FED7AA' }}>
                      <div style={{ fontWeight: 700, color: '#C2410C', marginBottom: '6px', fontSize: '0.875rem' }}>🔄 Modification Requested</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-700)' }}>{vo.modification.reason}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '4px' }}>
                        Type: {vo.modification.type} · {new Date(vo.modification.requestedAt).toLocaleString('en-IN')}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Bill total */}
            {(order.totalBillAmount || 0) > 0 && (
              <div style={{ padding: '16px 20px', background: '#F0FDFA', borderRadius: '12px', border: '2px solid #99F6E4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0F766E' }}>💰 Total Bill Amount</div>
                  {order.billGeneratedAt && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '2px' }}>
                      Generated: {new Date(order.billGeneratedAt).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#047857' }}>₹{order.totalBillAmount}</div>
              </div>
            )}
          </div>
        )}

        {/* ── APPROVALS TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'approvals' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {/* Principal approval */}
            <div className="card" style={{ borderLeft: '4px solid #7C3AED' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ fontSize: '1.5rem' }}>🎓</div>
                <div>
                  <div style={{ fontWeight: 700, color: '#7C3AED' }}>Principal Review</div>
                  {order.principalApproval?.reviewedBy && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>by {order.principalApproval.reviewedBy}</div>
                  )}
                </div>
              </div>

              {order.principalApproval?.status ? (
                <div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 14px', borderRadius: '20px', marginBottom: '12px',
                    background: order.principalApproval.status === 'approved' ? '#DCFCE7' : '#FEF2F2',
                    color: order.principalApproval.status === 'approved' ? '#166534' : '#DC2626',
                    fontWeight: 700, fontSize: '0.875rem',
                  }}>
                    {order.principalApproval.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                  </div>
                  {order.principalApproval.remarks && (
                    <div style={{ padding: '10px 14px', background: 'var(--gray-50)', borderRadius: '8px', fontSize: '0.8125rem', color: 'var(--gray-700)', fontStyle: 'italic', marginBottom: '8px' }}>
                      "{order.principalApproval.remarks}"
                    </div>
                  )}
                  {order.principalApproval.reviewedAt && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                      {new Date(order.principalApproval.reviewedAt).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--gray-400)', fontSize: '0.875rem', padding: '12px 0' }}>⏳ Pending review</div>
              )}
            </div>

            {/* DCR approval */}
            <div className="card" style={{ borderLeft: '4px solid #D97706' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ fontSize: '1.5rem' }}>📋</div>
                <div>
                  <div style={{ fontWeight: 700, color: '#D97706' }}>DCR Review</div>
                  {order.dcrApproval?.reviewedBy && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>by {order.dcrApproval.reviewedBy}</div>
                  )}
                </div>
              </div>

              {order.dcrApproval?.status ? (
                <div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 14px', borderRadius: '20px', marginBottom: '12px',
                    background: order.dcrApproval.status === 'approved' ? '#DCFCE7' : '#FEF2F2',
                    color: order.dcrApproval.status === 'approved' ? '#166534' : '#DC2626',
                    fontWeight: 700, fontSize: '0.875rem',
                  }}>
                    {order.dcrApproval.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                  </div>
                  {order.dcrApproval.remarks && (
                    <div style={{ padding: '10px 14px', background: 'var(--gray-50)', borderRadius: '8px', fontSize: '0.8125rem', color: 'var(--gray-700)', fontStyle: 'italic', marginBottom: '8px' }}>
                      "{order.dcrApproval.remarks}"
                    </div>
                  )}
                  {order.dcrApproval.reviewedAt && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                      {new Date(order.dcrApproval.reviewedAt).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--gray-400)', fontSize: '0.875rem', padding: '12px 0' }}>⏳ Pending review</div>
              )}
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="card">
            <div className="section-title" style={{ marginBottom: '20px' }}>📜 Audit Trail</div>
            {!(order.history || []).length ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <h3>No history entries</h3>
              </div>
            ) : (
              <div className="timeline">
                {[...(order.history || [])].reverse().map((entry, idx) => (
                  <div key={idx} className="timeline-item">
                    <div className="timeline-dot" style={{
                      background: ROLE_COLORS[entry.role]?.light || 'var(--gray-100)',
                      borderColor: ROLE_COLORS[entry.role]?.accent || 'var(--gray-200)',
                    }}>
                      {ROLE_ICONS_MAP[entry.role] || '📌'}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-action">{entry.action}</div>
                      <div className="timeline-meta">
                        {ROLE_LABELS[entry.role] || entry.role}
                        {entry.user ? ` · ${entry.user}` : ''}
                        {entry.timestamp ? ` · ${new Date(entry.timestamp).toLocaleString('en-IN')}` : ''}
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

        {/* ── BILLING TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'billing' && canViewBill && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="stat-card">
                <div className="stat-label">Total Bill Amount</div>
                <div className="stat-value" style={{ color: '#047857' }}>₹{order.totalBillAmount || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Bill Generated At</div>
                <div style={{ fontWeight: 600, marginTop: '8px', fontSize: '0.875rem' }}>
                  {order.billGeneratedAt ? new Date(order.billGeneratedAt).toLocaleString('en-IN') : '—'}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Vendor Invoices</div>
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(order.vendorOrders || []).map(vo => (
                    <div key={vo.id} style={{ fontSize: '0.8125rem', display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600 }}>{vo.vendorName}</span>
                      {(vo.billAmount || 0) > 0 && <span style={{ color: '#047857', fontWeight: 700 }}>₹{vo.billAmount}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {canAdminComplete && (
                <button className="btn btn-success" onClick={handleMarkComplete}>✅ Mark as Completed</button>
              )}
              <button className="btn" style={{ background: '#0D9488', color: 'white', border: 'none' }}
                onClick={() => router.push(`/bill/${order.id}`)}>
                🧾 View Full Bill
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </AppShell>
  );
}
