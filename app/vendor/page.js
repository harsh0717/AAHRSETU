'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import VendorPricing from '@/components/VendorPricing';
import MenuManager from '@/components/MenuManager';
import { getOrders, getSession, upsertOrder, addHistoryEntry, initSeedData } from '@/lib/store';
import { ROLE_COLORS } from '@/lib/constants';

export default function VendorPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('orders');
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
    setTimeout(() => setToast(null), 3500);
  }

  const vendorOrders = orders.filter(o =>
    ['DCR Approved', 'Vendor Processing'].includes(o.status)
  );
  const completedOrders = orders.filter(o =>
    ['Order Done/Confirmed', 'Bill Generated', 'Completed'].includes(o.status)
  );

  function handleStartProcessing(order) {
    if (order.status === 'DCR Approved') {
      const updated = { ...order, status: 'Vendor Processing' };
      upsertOrder(updated);
      addHistoryEntry(order.id, { action: 'Vendor Started Processing', role: 'vendor', user: session?.name || 'Vendor', remarks: '' });
      loadOrders();
    }
    setExpandedOrder(order.id === expandedOrder ? null : order.id);
  }

  function handlePricesSet(order, prices, total) {
    const updatedItems = order.items.map(item => ({
      ...item,
      price: prices[item.name] || 0,
    }));
    const updated = {
      ...order,
      items: updatedItems,
      status: 'Order Done/Confirmed',
      billAmount: total,
    };
    upsertOrder(updated);
    addHistoryEntry(order.id, {
      action: 'Prices Updated & Order Confirmed',
      role: 'vendor',
      user: session?.name || 'Vendor',
      remarks: updatedItems.map(i => `${i.name}: ₹${i.price}`).join(', '),
    });

    // Auto-generate bill
    setTimeout(() => {
      const withBill = {
        ...updated,
        status: 'Bill Generated',
        billGeneratedAt: new Date().toISOString(),
      };
      upsertOrder(withBill);
      addHistoryEntry(order.id, { action: 'Bill Generated', role: 'admin', user: 'System', remarks: `Total: ₹${total}` });

      // Auto-complete
      setTimeout(() => {
        const completed = {
          ...withBill,
          status: 'Completed',
          notified: { coordinator: true, principal: true, dcr: true },
        };
        upsertOrder(completed);
        addHistoryEntry(order.id, { action: 'Order Completed & Notified', role: 'admin', user: 'System', remarks: 'All parties notified.' });
        loadOrders();
      }, 1500);

      loadOrders();
    }, 1000);

    setExpandedOrder(null);
    loadOrders();
    showToast(`Order confirmed! Bill of ₹${total} generated. 🎉`);
  }

  const colors = ROLE_COLORS.vendor;

  const stats = {
    pending:   vendorOrders.length,
    completed: completedOrders.length,
    total:     orders.filter(o => ['DCR Approved', 'Vendor Processing', 'Order Done/Confirmed', 'Bill Generated', 'Completed'].includes(o.status)).length,
    billed:    orders.filter(o => o.billAmount > 0).reduce((s, o) => s + (o.billAmount || 0), 0),
  };

  return (
    <AppShell role="vendor" currentPath="/vendor">
      <div className="stat-grid" style={{ marginBottom: '28px' }}>
        {[
          { label: 'Pending Orders',  value: stats.pending,           icon: '📋', color: colors.accent },
          { label: 'Completed',       value: stats.completed,         icon: '✅', color: '#059669' },
          { label: 'Total Processed', value: stats.total,             icon: '🍽️', color: 'var(--gray-600)' },
          { label: 'Total Billed',    value: `₹${stats.billed}`,     icon: '💰', color: '#047857' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color, fontSize: typeof s.value === 'string' && s.value.startsWith('₹') ? '1.5rem' : '2rem' }}>{s.value}</div>
              </div>
              <div style={{ fontSize: '1.75rem' }}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="tabs" style={{ '--role-accent': colors.accent }}>
          <button className={`tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            📋 Approved Orders ({vendorOrders.length})
          </button>
          <button className={`tab ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>
            ✅ Completed ({completedOrders.length})
          </button>
          <button className={`tab ${activeTab === 'menu' ? 'active' : ''}`} onClick={() => setActiveTab('menu')}>
            🍽️ Manage Menu
          </button>
        </div>

        {activeTab === 'menu' && <MenuManager />}

        {activeTab !== 'menu' && (() => {
          const displayOrders = activeTab === 'orders' ? vendorOrders : completedOrders;
          if (displayOrders.length === 0) return (
            <div className="empty-state">
              <div className="empty-state-icon">{activeTab === 'orders' ? '📭' : '🎉'}</div>
              <h3>{activeTab === 'orders' ? 'No approved orders' : 'No completed orders'}</h3>
              <p>{activeTab === 'orders' ? 'Orders approved by DCR will appear here.' : 'Fulfilled orders show here.'}</p>
            </div>
          );

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {displayOrders.map(order => {
                const isExpanded = expandedOrder === order.id;
                const isCompleted = activeTab === 'completed';
                return (
                  <div key={order.id} style={{
                    border: `1.5px solid ${isExpanded ? colors.accent : 'var(--gray-200)'}`,
                    borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s',
                  }}>
                    <div style={{
                      padding: '16px 20px',
                      background: isExpanded ? `color-mix(in srgb, ${colors.accent} 5%, transparent)` : 'var(--surface-0)',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
                    }} onClick={() => isCompleted ? setExpandedOrder(order.id === expandedOrder ? null : order.id) : handleStartProcessing(order)}>
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
                          {order.billAmount > 0 && <span style={{ color: '#059669', fontWeight: 600 }}>💰 ₹{order.billAmount}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {!isCompleted && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: colors.accent }}>
                          {order.status === 'DCR Approved' ? 'Click to Process' : 'Set Prices ↓'}
                        </span>}
                        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); router.push(`/order/${order.id}`); }}>Detail →</button>
                        <span style={{ color: 'var(--gray-400)', fontSize: '1.1rem' }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '20px', borderTop: '1px solid var(--gray-200)' }}>
                        {!isCompleted ? (
                          <VendorPricing order={order} onPricesSet={(prices, total) => handlePricesSet(order, prices, total)} />
                        ) : (
                          <div>
                            <div className="table-wrapper" style={{ marginBottom: '12px' }}>
                              <table className="table">
                                <thead>
                                  <tr><th>Item</th><th style={{ textAlign: 'center' }}>Qty</th><th style={{ textAlign: 'right' }}>Price</th><th style={{ textAlign: 'right' }}>Subtotal</th></tr>
                                </thead>
                                <tbody>
                                  {order.items?.map(item => (
                                    <tr key={item.name}>
                                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                      <td style={{ textAlign: 'right' }}>₹{item.price}</td>
                                      <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{item.price * item.quantity}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                              <button className="btn btn-success btn-sm" onClick={() => router.push(`/bill/${order.id}`)}>
                                🧾 View Bill
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✅' : '❌'} {toast.msg}</div>
        </div>
      )}
    </AppShell>
  );
}
