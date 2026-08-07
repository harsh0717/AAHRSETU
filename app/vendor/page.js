'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import MenuManager from '@/components/MenuManager';
import VendorPricing from '@/components/VendorPricing';
import VendorStatusBadge from '@/components/VendorStatusBadge';
import ModificationPanel from '@/components/ModificationPanel';
import { getSession } from '@/lib/auth';
import { getOrders, upsertOrder, updateVendorOrderInMaster, initSeedData } from '@/lib/store';
import { getVendorById, updateVendorStatus } from '@/lib/vendors';
import { notifyCoordinatorModification } from '@/lib/notifications';
import { ROLE_COLORS, VENDOR_STATUS, VENDOR_STATUS_LABELS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';

export default function VendorPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState(null);
  const [vendorInfo, setVendorInfo] = useState(null);
  const [myVendorOrders, setMyVendorOrders] = useState([]); // { masterOrder, vendorOrder }
  const [activeTab, setActiveTab] = useState('orders');
  const [pricingOrderId, setPricingOrderId] = useState(null); // vendorOrder id for pricing UI
  const colors = ROLE_COLORS.vendor;

  useEffect(() => {
    initSeedData();
    const s = getSession();
    if (!s || s.role !== 'vendor') { router.push('/login'); return; }
    setSession(s);
    if (s.vendorId) {
      setVendorInfo(getVendorById(s.vendorId));
      loadOrders(s.vendorId);
    }
    if (typeof window !== 'undefined' && window.location.hash) {
      const h = window.location.hash.slice(1);
      if (['orders','menu','revenue'].includes(h)) setActiveTab(h);
    }
  }, []);

  function loadOrders(vendorId) {
    const vid = vendorId || session?.vendorId;
    if (!vid) return;
    const all = getOrders();
    const mine = [];
    all.forEach(masterOrder => {
      if (!masterOrder.vendorOrders) return;
      const vo = masterOrder.vendorOrders.find(v => v.vendorId === vid);
      if (vo && ['Vendor Processing','Vendor Clarification Required','Coordinator Updated','Vendor Confirmed','Bill Generated','Completed'].includes(masterOrder.status)) {
        mine.push({ masterOrder, vendorOrder: vo });
      }
    });
    mine.sort((a, b) => new Date(b.masterOrder.updatedAt) - new Date(a.masterOrder.updatedAt));
    setMyVendorOrders(mine);
  }

  function refresh() {
    if (session?.vendorId) {
      setVendorInfo(getVendorById(session.vendorId));
      loadOrders(session.vendorId);
    }
  }

  function handleStatusChange(newStatus) {
    if (!session?.vendorId) return;
    updateVendorStatus(session.vendorId, newStatus);
    refresh();
  }

  function handlePricesSet(vendorOrderId, masterOrder, prices, total) {
    // Update items with new prices
    const updatedVendorOrder = {
      ...masterOrder.vendorOrders.find(v => v.id === vendorOrderId),
    };
    updatedVendorOrder.items = updatedVendorOrder.items.map(item => ({
      ...item,
      price: parseFloat(prices[item.name]) || 0,
    }));
    updatedVendorOrder.billAmount = total;
    updatedVendorOrder.status = 'Vendor Confirmed';
    updatedVendorOrder.modification = null;

    // Check if ALL vendor orders in this master order are confirmed
    const allVOs = masterOrder.vendorOrders.map(vo =>
      vo.id === vendorOrderId ? updatedVendorOrder : vo
    );
    const allDone = allVOs.every(vo => vo.status === 'Vendor Confirmed');
    const masterTotal = allVOs.reduce((s, vo) => s + (vo.billAmount || 0), 0);

    const updatedMaster = {
      ...masterOrder,
      vendorOrders: allVOs,
      status: allDone ? 'Vendor Confirmed' : 'Vendor Processing',
      totalBillAmount: allDone ? masterTotal : masterOrder.totalBillAmount,
      history: [...(masterOrder.history || []), {
        action: allDone ? 'All Vendors Confirmed' : `${updatedVendorOrder.vendorName} Confirmed`,
        role: 'vendor', user: session.name,
        timestamp: new Date().toISOString(),
        remarks: `₹${total} confirmed by ${updatedVendorOrder.vendorName}`,
      }],
    };
    upsertOrder(updatedMaster);
    setPricingOrderId(null);
    refresh();
  }

  function handleRequestMod(masterOrder, vendorOrder, modData) {
    const updatedVO = { ...vendorOrder, modification: modData };
    const allVOs = masterOrder.vendorOrders.map(vo => vo.id === vendorOrder.id ? updatedVO : vo);
    const updatedMaster = {
      ...masterOrder,
      vendorOrders: allVOs,
      status: 'Vendor Clarification Required',
      history: [...(masterOrder.history || []), {
        action: 'Modification Requested',
        role: 'vendor', user: session.name,
        timestamp: new Date().toISOString(),
        remarks: modData.reason,
      }],
    };
    upsertOrder(updatedMaster);
    notifyCoordinatorModification(masterOrder, vendorInfo?.name || session.name);
    refresh();
  }

  // Stats
  const pending   = myVendorOrders.filter(({ masterOrder }) => masterOrder.status === 'Vendor Processing').length;
  const confirmed = myVendorOrders.filter(({ vendorOrder }) => vendorOrder.status === 'Vendor Confirmed').length;
  const revenue   = myVendorOrders.filter(({ vendorOrder }) => vendorOrder.status === 'Vendor Confirmed').reduce((s, { vendorOrder }) => s + (vendorOrder.billAmount || 0), 0);

  if (!session) return null;

  const TABS = [
    { key: 'orders', label: t('nav.orders_queue'), icon: '📋' },
    { key: 'menu',   label: t('nav.manage_menu'),  icon: '🍽️' },
    { key: 'revenue',label: t('nav.revenue'),       icon: '💰' },
  ];

  return (
    <AppShell role="vendor" currentPath="/vendor">
      <div style={{ '--role-accent': colors.accent }}>
        {/* Header */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 800 }}>
              {vendorInfo?.name || session.name}
            </h1>
            <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>{t('role.vendor')}</div>
          </div>
          {/* Vendor availability control */}
          {vendorInfo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <VendorStatusBadge status={vendorInfo.status} />
              <select
                value={vendorInfo.status}
                onChange={e => handleStatusChange(e.target.value)}
                style={{
                  padding: '7px 12px', borderRadius: '8px', border: '1.5px solid var(--gray-300)',
                  fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', background: 'white',
                }}
              >
                {Object.entries(VENDOR_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Pending Orders',      value: pending,   color: '#D97706', icon: '⏳' },
            { label: 'Confirmed',           value: confirmed, color: '#059669', icon: '✅' },
            { label: t('vendor.total_revenue'), value: `₹${revenue.toLocaleString('en-IN')}`, color: '#7C3AED', icon: '💰' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '14px 16px', borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: '1.3rem', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid var(--gray-200)', paddingBottom: '0' }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.875rem',
              color: activeTab === tab.key ? colors.accent : 'var(--gray-500)',
              borderBottom: activeTab === tab.key ? `3px solid ${colors.accent}` : '3px solid transparent',
              marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.15s',
            }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Orders tab */}
        {activeTab === 'orders' && (
          <div id="orders" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {myVendorOrders.length === 0 ? (
              <div className="card empty-state" style={{ padding: '48px' }}>
                <div className="empty-state-icon">📋</div>
                <h3>{t('dashboard.no_pending')}</h3>
                <p>No orders have been assigned to you yet.</p>
              </div>
            ) : myVendorOrders.map(({ masterOrder, vendorOrder }) => {
              const isPricing = pricingOrderId === vendorOrder.id;
              const hasMod = !!vendorOrder.modification;
              const isConfirmed = vendorOrder.status === 'Vendor Confirmed';

              return (
                <div key={vendorOrder.id} className="card" style={{
                  padding: 0, overflow: 'hidden',
                  borderLeft: `3px solid ${isConfirmed ? '#059669' : hasMod ? '#F59E0B' : colors.accent}`,
                }}>
                  {/* Header row */}
                  <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700 }}>{masterOrder.title}</span>
                        <StatusBadge status={masterOrder.status} size="sm" />
                        {isConfirmed && <span style={{ fontSize: '0.7rem', background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>✅ Confirmed</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span>📋 {masterOrder.id}</span>
                        <span>🏛️ {masterOrder.departmentLabel}</span>
                        <span>👤 {masterOrder.createdBy?.name}</span>
                        <span>🗓️ {new Date(masterOrder.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      {vendorOrder.billAmount > 0 && (
                        <span style={{ fontWeight: 800, color: '#059669', fontSize: '1rem' }}>₹{vendorOrder.billAmount}</span>
                      )}
                      {!isConfirmed && (
                        <button onClick={() => setPricingOrderId(isPricing ? null : vendorOrder.id)}
                          className="btn btn-primary btn-sm" style={{ '--role-accent': colors.accent }}>
                          {isPricing ? '✕ Cancel' : '₹ Set Prices'}
                        </button>
                      )}
                      <Link href={`/order/${masterOrder.id}`}
                        style={{ padding: '5px 12px', background: 'var(--surface-1)', color: 'var(--gray-600)', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', textDecoration: 'none' }}>
                        View →
                      </Link>
                    </div>
                  </div>

                  {/* Items from this vendor */}
                  <div style={{ padding: '0 18px 14px', borderTop: '1px solid var(--gray-100)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '10px 0 6px' }}>
                      Your Items ({masterOrder.purpose})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                      {vendorOrder.items.map((item, i) => (
                        <div key={i} style={{
                          fontSize: '0.8125rem', padding: '4px 12px', background: 'var(--surface-1)',
                          border: '1px solid var(--gray-200)', borderRadius: '20px', fontWeight: 600,
                        }}>
                          {item.name} × {item.quantity}
                          {item.price > 0 && <span style={{ color: '#059669', marginLeft: '6px' }}>₹{item.price}</span>}
                        </div>
                      ))}
                    </div>

                    {/* Pricing panel */}
                    {isPricing && (
                      <VendorPricing
                        vendorOrder={vendorOrder}
                        onPricesSet={(prices, total) => handlePricesSet(vendorOrder.id, masterOrder, prices, total)}
                      />
                    )}

                    {/* Modification panel */}
                    {!isConfirmed && !isPricing && (
                      <ModificationPanel
                        mode="vendor"
                        vendorOrder={vendorOrder}
                        masterOrderId={masterOrder.id}
                        session={session}
                        onSubmitMod={(modData) => handleRequestMod(masterOrder, vendorOrder, modData)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Menu management tab */}
        {activeTab === 'menu' && (
          <div id="menu" className="card">
            <MenuManager vendorId={session.vendorId} vendorName={vendorInfo?.name || session.name} />
          </div>
        )}

        {/* Revenue tab */}
        {activeTab === 'revenue' && (
          <div id="revenue">
            <div className="card" style={{ marginBottom: '16px', padding: '20px 24px' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                Revenue Summary
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '12px' }}>
                {[
                  { label: 'Total Revenue', value: `₹${revenue.toLocaleString('en-IN')}`, color: '#7C3AED' },
                  { label: 'Orders Served',  value: confirmed,                               color: '#059669' },
                  { label: 'Avg. per Order', value: confirmed > 0 ? `₹${Math.round(revenue/confirmed)}` : '—', color: '#D97706' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '16px', background: 'var(--surface-1)', borderRadius: '10px', border: '1px solid var(--gray-200)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '4px', fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Revenue table */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: '12px' }}>Confirmed Orders</div>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Department</th>
                      <th>Purpose</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myVendorOrders.filter(({vendorOrder}) => vendorOrder.status === 'Vendor Confirmed').map(({masterOrder, vendorOrder}) => (
                      <tr key={vendorOrder.id}>
                        <td><Link href={`/order/${masterOrder.id}`} style={{ color: colors.accent, fontWeight: 700, textDecoration: 'none' }}>{masterOrder.id}</Link></td>
                        <td style={{ color: 'var(--gray-600)' }}>{masterOrder.departmentLabel}</td>
                        <td style={{ color: 'var(--gray-500)', fontSize: '0.8125rem' }}>{masterOrder.purpose}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>₹{vendorOrder.billAmount}</td>
                      </tr>
                    ))}
                    {myVendorOrders.filter(({vendorOrder}) => vendorOrder.status === 'Vendor Confirmed').length === 0 && (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '24px' }}>No confirmed orders yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
