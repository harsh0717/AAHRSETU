'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import OrderStepper from '@/components/OrderStepper';
import ApprovalPanel from '@/components/ApprovalPanel';
import ModificationPanel from '@/components/ModificationPanel';
import { getSession, UserProfile } from '@/lib/auth';
import {
  getOrderById, submitForApproval, principalReview, dcrReview, completeOrder,
  resolveModification, MasterOrder, VendorOrder
} from '@/lib/store';
import { getMenuItemName } from '@/lib/vendors';
import { useI18n } from '@/lib/i18n';
import { showToast } from '@/components/Toast';
import Link from 'next/link';
import EditOrderModal from '@/components/EditOrderModal';
import CancelOrderModal from '@/components/CancelOrderModal';
import KitchenTicketModal from '@/components/KitchenTicketModal';

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { t } = useI18n();

  const [order, setOrder] = useState<MasterOrder | null>(null);
  const [session, setSession] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [actioning, setActioning] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [kotModalOpen, setKotModalOpen] = useState(false);

  const loadOrderRef = useRef<((silent?: boolean) => Promise<void>) | null>(null);

  const loadOrder = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setForbidden(false);
    const safetyTimer = !silent ? setTimeout(() => setLoading(false), 2500) : null;
    try {
      const o = await getOrderById(orderId);
      const s = getSession();
      if (!o) {
        if (!silent) setForbidden(true);
        return;
      }
      if (s) {
        if (s.role === 'coordinator' && o.created_by_id !== s.id && o.department_id !== s.department_id) {
          if (!silent) setForbidden(true);
          return;
        }
      }
      setOrder(o);
    } catch (e: any) {
      if (e?.status === 403 && !silent) {
        setForbidden(true);
      }
    } finally {
      if (safetyTimer) clearTimeout(safetyTimer);
      if (!silent) setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrderRef.current = loadOrder;
  }, [loadOrder]);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.push('/login');
      return;
    }
    setSession(s);
    loadOrder();

    // Cross-device sync: poll every 10 seconds silently
    const syncInterval = setInterval(() => {
      loadOrderRef.current?.(true);
    }, 10000);

    const handleOrderChanged = () => {
      loadOrderRef.current?.(true);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'aharsetu_orders_v3' || e.key === 'aharsetu_notifications_v3.7') {
        loadOrderRef.current?.(true);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('aharsetu_order_changed', handleOrderChanged);
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      clearInterval(syncInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('aharsetu_order_changed', handleOrderChanged);
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, [loadOrder, router]);

  if (forbidden && session) {
    return (
      <AppShell role={session.role}>
        <div className="card" style={{ padding: '40px', textAlign: 'center', margin: '40px auto', maxWidth: '480px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🚫</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '8px' }}>
            Access Restricted (HTTP 403)
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: '20px' }}>
            You do not have administrative permission to view requisitions belonging to other academic departments.
          </p>
          <Link href={`/${session.role}`} className="btn btn-primary">
            Return to Dashboard
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!order || !session) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--surface-1)' }}>
        <div style={{ textAlign: 'center', color: 'var(--gray-500)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '8px', animation: 'spin 1s infinite linear' }}>🔄</div>
          <div>Loading Order Details...</div>
        </div>
      </div>
    );
  }

  // Action wrappers
  async function handleCoordinatorSubmit() {
    if (!order) return;
    setActioning(true);
    try {
      await submitForApproval(order.id);
      await loadOrder();
    } catch (e: any) {
      alert(e.message || 'Error submitting order');
    } finally {
      setActioning(false);
    }
  }

  async function handlePrincipalReview(action: 'approve' | 'reject', remarks: string) {
    if (!order) return;
    setActioning(true);
    try {
      await principalReview(order.id, action, remarks);
      showToast(action === 'approve' ? 'Requisition approved successfully & forwarded for DCR Audit' : 'Requisition rejected by Principal', action === 'approve' ? 'success' : 'warning');
      await loadOrder();
    } catch (e: any) {
      showToast(e.message || 'Error executing review', 'error');
    } finally {
      setActioning(false);
    }
  }

  async function handleDCRReview(action: 'approve' | 'reject', remarks: string) {
    if (!order) return;
    setActioning(true);
    try {
      await dcrReview(order.id, action, remarks);
      showToast(
        action === 'approve'
          ? 'Requisition cleared DCR audit & dispatched to canteens'
          : 'Requisition rejected during DCR audit',
        action === 'approve' ? 'success' : 'warning'
      );
      await loadOrder();
    } catch (e: any) {
      showToast(e.message || 'Error executing review', 'error');
    } finally {
      setActioning(false);
    }
  }

  async function handleComplete() {
    if (!order) return;
    setActioning(true);
    try {
      await completeOrder(order.id);
      await loadOrder();
    } catch (e: any) {
      alert(e.message || 'Error completing order');
    } finally {
      setActioning(false);
    }
  }

  async function handleResolveMod(vendorOrderId: string, resolution: 'accept' | 'reject') {
    setActioning(true);
    try {
      await resolveModification(vendorOrderId, resolution);
      await loadOrder();
    } catch (e: any) {
      alert(e.message || 'Error resolving modification');
    } finally {
      setActioning(false);
    }
  }

  const role = session.role;
  const roleColorsMap: Record<string, string> = {
    coordinator: '#3B82F6',
    principal: '#6366F1',
    dcr: '#0EA5E9',
    administration: '#0EA5E9',
    vendor: '#10B981',
    admin: '#8B5CF6'
  };
  const roleColor = roleColorsMap[role] || '#3B82F6';

  const calculateTotal = (ord: MasterOrder): number => {
    if (typeof ord.total_bill_amount === 'number' && ord.total_bill_amount > 0) {
      return ord.total_bill_amount;
    }
    let sum = 0;
    (ord.vendor_orders || []).forEach(vo => {
      if (typeof vo.bill_amount === 'number' && vo.bill_amount > 0) {
        sum += vo.bill_amount;
      } else {
        (vo.items || []).forEach(it => {
          sum += (it.price || 15) * (it.quantity || 1);
        });
      }
    });
    return sum;
  };
  const total = calculateTotal(order);

  // Role Action Guards
  const canEdit = role === 'coordinator' && ['Draft', 'Created', 'Sent for Approval', 'Principal Rejected'].includes(order.status);
  const canCancel = role === 'coordinator' && ['Draft', 'Created', 'Sent for Approval', 'Principal Reviewing', 'Principal Rejected', 'Principal Approved'].includes(order.status);

  const showCoordSubmit = role === 'coordinator' && order.status === 'Created';
  const showCoordResubmit = role === 'coordinator' && ['Principal Rejected', 'DCR Rejected'].includes(order.status);
  const showPrincipalReview = role === 'principal' && ['Sent for Approval', 'Principal Reviewing'].includes(order.status);
  const showDCRReview = (role === 'dcr' || role === 'administration') && ['Principal Approved', 'DCR Reviewing'].includes(order.status);
  const showAdminComplete = role === 'admin' && order.status === 'Bill Generated';

  // Find modifications awaiting coordinator resolution
  const modsAwaitingResolution = (order.vendor_orders || []).filter((vo: VendorOrder) => vo.modification && vo.modification.status === 'Pending');

  return (
    <AppShell role={role} currentPath={`/order/${order.id}`}>
      <div style={{ '--role-accent': roleColor } as React.CSSProperties}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600, marginBottom: '6px' }}>
              <Link href={`/${role}`} style={{ color: 'var(--gray-500)', textDecoration: 'none' }}>Dashboard</Link> / <Link href={`/${role}#orders`} style={{ color: 'var(--gray-500)', textDecoration: 'none' }}>Orders</Link> / <span>{order.id}</span>
            </div>
            <Link href={`/${role}`} style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
              ← Back to Dashboard
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{order.title}</h1>
              <StatusBadge status={order.status} />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '4px' }}>
              ID: {order.id} | Department: {order.department_label} | Created: {new Date(order.created_at).toLocaleString('en-IN')}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setKotModalOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <span>🖨️</span> Print Kitchen Ticket (KOT)
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditModalOpen(true)}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <span>✏️</span> Edit Requisition
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={() => setCancelModalOpen(true)}
                className="btn btn-ghost"
                style={{ padding: '8px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: '#DC2626', border: '1px solid #FECACA', fontWeight: 700 }}
              >
                <span>🚫</span> Cancel Requisition
              </button>
            )}
            {order.status === 'Completed' && (
              <Link href={`/bill/${order.id}`} className="btn btn-primary" style={{ padding: '8px 18px', borderRadius: '10px' }}>
                🧾 View Printable A4 Bill
              </Link>
            )}
          </div>
        </div>

        {/* Stepper progress pipeline */}
        <div className="card" style={{ padding: '20px', marginBottom: '24px', background: 'var(--surface-0)' }}>
          <OrderStepper status={order.status} />
        </div>

        {/* Actionable Panels */}
        {showCoordSubmit && (
          <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--color-coordinator)', marginBottom: '24px', background: '#F0F9FF' }}>
            <h4 style={{ margin: '0 0 4px', color: '#0369A1' }}>Action Required: Submit Order</h4>
            <p style={{ fontSize: '0.82rem', color: '#0284C7', margin: '0 0 12px' }}>Your order draft is ready. Submit it to send to the Principal for approval.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" onClick={handleCoordinatorSubmit} disabled={actioning}>
                {actioning ? 'Submitting...' : '🚀 Submit for Approval'}
              </button>
              <button className="btn btn-secondary" onClick={() => setEditModalOpen(true)} disabled={actioning}>
                ✏️ Edit Items
              </button>
            </div>
          </div>
        )}

        {showCoordResubmit && (
          <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--color-danger)', marginBottom: '24px', background: '#FEF2F2' }}>
            <h4 style={{ margin: '0 0 4px', color: '#991B1B' }}>Order Rejected by Supervisor</h4>
            <p style={{ fontSize: '0.82rem', color: '#B91C1C', margin: '0 0 12px' }}>
              Reason: "{order.history[0]?.remarks || 'No remarks provided.'}"
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" onClick={() => setEditModalOpen(true)} disabled={actioning}>
                ✏️ Edit & Correct Requisition
              </button>
              <button className="btn btn-ghost" onClick={() => setCancelModalOpen(true)} style={{ color: '#DC2626', border: '1px solid #FECACA' }}>
                🚫 Cancel Requisition
              </button>
            </div>
          </div>
        )}

        {showPrincipalReview && (
          <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--color-principal)', marginBottom: '24px', background: '#EEF2FF' }}>
            <ApprovalPanel
              order={order}
              role="principal"
              onApprove={(remarks) => handlePrincipalReview('approve', remarks)}
              onReject={(remarks) => handlePrincipalReview('reject', remarks)}
            />
          </div>
        )}

        {showDCRReview && (
          <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--color-dcr)', marginBottom: '24px', background: '#F0F9FF' }}>
            <ApprovalPanel
              order={order}
              role="dcr"
              onApprove={(remarks) => handleDCRReview('approve', remarks)}
              onReject={(remarks) => handleDCRReview('reject', remarks)}
            />
          </div>
        )}

        {showAdminComplete && (
          <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--color-admin)', marginBottom: '24px', background: '#F5F3FF' }}>
            <h4 style={{ margin: '0 0 4px', color: '#6D28D9' }}>Action Required: Complete Order</h4>
            <p style={{ fontSize: '0.82rem', color: '#7C3AED', margin: '0 0 12px' }}>All canteens have confirmed pricing and invoices have been generated automatically. Close this order.</p>
            <button className="btn btn-primary" onClick={handleComplete} disabled={actioning}>
              {actioning ? 'Completing...' : '✅ Mark Order Complete'}
            </button>
          </div>
        )}

        {/* Modifications List */}
        {role === 'coordinator' && modsAwaitingResolution.map(vo => (
          <div key={vo.id} className="card" style={{ padding: '20px', borderLeft: '4px solid var(--color-warning)', marginBottom: '24px', background: '#FFFBEB' }}>
            <ModificationPanel
              order={order}
              vendorOrder={vo}
              mode="coordinator"
              onResolve={(res) => handleResolveMod(vo.id, res)}
            />
          </div>
        ))}

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid var(--gray-200)' }}>
          {[
            { key: 'details', label: 'Order Details' },
            { key: 'approvals', label: 'Approvals Timeline' },
            { key: 'history', label: 'History & Audits' }
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.82rem',
                color: activeTab === t.key ? 'var(--primary)' : 'var(--gray-500)',
                borderBottom: activeTab === t.key ? '3px solid var(--primary)' : '3px solid transparent',
                marginBottom: '-2px', transition: 'all 0.15s'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '20px', alignItems: 'start' }}>
            {/* Left - Vendor Split items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(order.vendor_orders || []).map(vo => (
                <div key={vo.id} className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--gray-200)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800 }}>🏪 {vo.vendor_name}</h4>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'var(--gray-100)', color: 'var(--gray-600)' }}>
                        Sub-ID: {vo.id}
                      </span>
                    </div>
                    <StatusBadge status={vo.status || 'Pending'} size="sm" />
                  </div>

                  {vo.status === 'Vendor Rejected' && (
                    <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '0.78rem', color: '#991B1B', fontWeight: 600, marginBottom: '12px' }}>
                      ⚠️ Canteen unable to fulfill this portion. Excluded from final billing.
                    </div>
                  )}
                  
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
                    <thead>
                      <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: 700 }}>
                        <th style={{ padding: '6px', textAlign: 'left' }}>Item</th>
                        <th style={{ padding: '6px', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '6px', textAlign: 'right' }}>Price</th>
                        <th style={{ padding: '6px', textAlign: 'right' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vo.items.map((item, idx) => {
                        const effectiveName = getMenuItemName(item.menu_item_id, item.name);
                        const nameKey = `menu.${effectiveName}`;
                        const translatedName = t(nameKey) !== nameKey ? t(nameKey) : effectiveName;
                        
                        const formattedUnit = item.unit ? item.unit.toLowerCase().replace(' ', '_') : '';
                        const unitKey = `unit.${formattedUnit}`;
                        const translatedUnit = item.unit ? (t(unitKey) !== unitKey ? t(unitKey) : item.unit) : '';

                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--gray-100)', fontSize: '0.78rem' }}>
                            <td style={{ padding: '8px 6px', fontWeight: 600 }}>{translatedName}</td>
                            <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                              {item.quantity} {translatedUnit ? `(${translatedUnit})` : ''}
                            </td>
                            <td style={{ padding: '8px 6px', textAlign: 'right' }}>₹{item.price}</td>
                            <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700 }}>₹{item.price * item.quantity}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {vo.bill_amount > 0 && (
                    <div style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 800, color: '#059669', background: '#ECFDF5', padding: '8px 12px', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                      ✓ Bill Confirmed: ₹{vo.bill_amount}
                      {vo.invoice_number && <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 600, marginTop: '2px' }}>Invoice: {vo.invoice_number}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Right - Meta Summary */}
            <div className="card" style={{ padding: '20px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--gray-500)', letterSpacing: '0.05em' }}>Order Summary</h4>
              <div style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-100)', fontSize: '0.8rem' }}>
                <strong>Purpose:</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--gray-600)' }}>{order.purpose}</p>
              </div>
              <div style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-100)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Creator:</span>
                <strong>{order.created_by_name}</strong>
              </div>
              <div style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-100)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Amount:</span>
                <strong style={{ color: 'var(--color-success)', fontSize: '1rem' }}>₹{total}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Approvals Tab */}
        {activeTab === 'approvals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {order.history.filter(h => ['Principal Approved', 'Principal Rejected', 'DCR Approved & Forwarded', 'DCR Rejected'].includes(h.action)).map(h => (
              <div key={h.id} className="card" style={{ padding: '16px', borderLeft: `4px solid ${h.action.includes('Approved') ? 'var(--color-success)' : 'var(--color-danger)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong>{h.action}</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{new Date(h.timestamp).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                  By: {h.user_name} ({h.role})
                </div>
                {h.remarks && (
                  <div style={{ marginTop: '8px', fontSize: '0.8rem', padding: '8px 12px', background: 'var(--gray-50)', borderRadius: '6px', fontStyle: 'italic' }}>
                    "{h.remarks}"
                  </div>
                )}
              </div>
            ))}
            {order.history.filter(h => ['Principal Approved', 'Principal Rejected', 'DCR Approved & Forwarded', 'DCR Rejected'].includes(h.action)).length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-400)' }}>
                No supervisor approvals have been logged for this order.
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '12px' }}>Order Pipeline Audit Trails</h3>
            <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
              <table className="table">
                <thead>
                  <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', fontSize: '0.72rem', color: 'var(--gray-500)' }}>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>By User</th>
                    <th>Role</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {order.history.map(h => (
                    <tr key={h.id} style={{ fontSize: '0.78rem' }}>
                      <td style={{ color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{new Date(h.timestamp).toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{h.action}</td>
                      <td>{h.user_name}</td>
                      <td>{h.role}</td>
                      <td style={{ color: 'var(--gray-600)' }}>{h.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit and Cancel Modals */}
        {order && (
          <>
            <EditOrderModal
              order={order}
              isOpen={editModalOpen}
              onClose={() => setEditModalOpen(false)}
              onSaved={(updated) => {
                setOrder(updated);
                loadOrder(true);
              }}
            />
            <CancelOrderModal
              order={order}
              isOpen={cancelModalOpen}
              onClose={() => setCancelModalOpen(false)}
              onCancelled={(updated) => {
                setOrder(updated);
                loadOrder(true);
              }}
            />
            {kotModalOpen && (
              <KitchenTicketModal
                order={order}
                onClose={() => setKotModalOpen(false)}
              />
            )}
          </>
        )}

      </div>
    </AppShell>
  );
}
