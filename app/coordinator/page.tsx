'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import { getSession, UserProfile } from '@/lib/auth';
import { getOrders, createMasterOrder, MasterOrder } from '@/lib/store';
import { getAvailableMenuByVendor, MenuItem } from '@/lib/vendors';
import { ROLE_COLORS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';
import Link from 'next/link';

export default function CoordinatorDashboardPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<UserProfile | null>(null);
  const colors = ROLE_COLORS.coordinator;

  // Active Tab: create | orders
  const [activeTab, setActiveTab] = useState('orders');

  // Lists
  const [orders, setOrders] = useState<MasterOrder[]>([]);
  const [menuByVendor, setMenuByVendor] = useState<{ id: string; name: string; menu: MenuItem[] }[]>([]);

  // Create Order States
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({}); // menu_item_id -> quantity

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [oList, mList] = await Promise.all([
        getOrders(),
        getAvailableMenuByVendor()
      ]);
      setOrders(oList);
      setMenuByVendor(mList);
    } catch (err) {
      console.error('Error fetching coordinator data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== 'coordinator') {
      window.location.href = '/login';
      return;
    }
    setSession(s);
    loadData();

    // Check hash route for tab selector
    if (window.location.hash === '#create') {
      setActiveTab('create');
    } else if (window.location.hash === '#orders') {
      setActiveTab('orders');
    }
  }, []);

  // Sync hash with state
  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  function handleQtyChange(itemId: string, qty: number) {
    setSelectedItems(prev => {
      const next = { ...prev };
      if (qty <= 0) delete next[itemId];
      else next[itemId] = qty;
      return next;
    });
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !purpose.trim()) {
      alert('Please fill out title and purpose.');
      return;
    }

    const itemsPayload = Object.entries(selectedItems).map(([id, qty]) => ({
      menu_item_id: id,
      quantity: qty
    }));

    if (itemsPayload.length === 0) {
      alert('Please select at least one menu item.');
      return;
    }

    setSubmitting(true);
    try {
      await createMasterOrder({
        title: title.trim(),
        purpose: purpose.trim(),
        items: itemsPayload
      });
      alert('Order drafted successfully! Redirecting to orders pipeline.');
      setTitle('');
      setPurpose('');
      setSelectedItems({});
      setActiveTab('orders');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create order.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) return null;

  const myOrders = orders.filter(o => o.created_by_id === session.id);
  const filteredOrders = myOrders
    .filter(o => !search || o.title.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase()))
    .filter(o => statusFilter === 'All' || o.status === statusFilter);

  const ALL_STATUSES = [
    'All', 'Created', 'Sent for Approval', 'Principal Reviewing', 'Principal Approved',
    'Principal Rejected', 'DCR Reviewing', 'DCR Approved', 'DCR Rejected', 'Vendor Processing',
    'Vendor Clarification Required', 'Coordinator Updated', 'Vendor Confirmed', 'Bill Generated', 'Completed',
  ];

  return (
    <AppShell role="coordinator" currentPath="/coordinator">
      <div style={{ '--role-accent': colors.accent } as React.CSSProperties}>
        
        {/* Title */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px' }}>
            {t('coord.dashboard_title')}
          </h1>
          <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
            {t('coord.dashboard_sub')}
          </div>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid var(--gray-200)' }}>
          {[
            { key: 'orders', label: t('coord.my_submissions'), icon: '📦' },
            { key: 'create', label: t('coord.draft_order'), icon: '➕' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.85rem',
                color: activeTab === tab.key ? colors.accent : 'var(--gray-500)',
                borderBottom: activeTab === tab.key ? `3px solid ${colors.accent}` : '3px solid transparent',
                marginBottom: '-2px', transition: 'all 0.15s'
              }}
            >
              <span style={{ marginRight: '6px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading Spinner */}
        {loading && activeTab === 'orders' ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px', animation: 'spin 1s infinite linear' }}>🔄</div>
            <div>Loading orders and menus...</div>
          </div>
        ) : (
          <div>
            {/* Tab 1: My Submissions */}
            {activeTab === 'orders' && (
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <input
                    className="form-input"
                    style={{ maxWidth: '240px' }}
                    placeholder={t('coord.search_ph')}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  <select
                    className="form-input"
                    style={{ maxWidth: '180px' }}
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                  >
                    {ALL_STATUSES.map(s => (
                      <option key={s} value={s}>
                        {s === 'All' ? t('common.all') : (t(`status.${s}`) !== `status.${s}` ? t(`status.${s}`) : s)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t('coord.order_id')}</th>
                        <th>{t('coord.title_desc')}</th>
                        <th>{t('common.purpose')}</th>
                        <th>{t('coord.created_date')}</th>
                        <th>{t('common.status')}</th>
                        <th style={{ textAlign: 'right' }}>{t('coord.total_bill')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(o => (
                        <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>
                          <td style={{ fontWeight: 700 }}>{o.id}</td>
                          <td style={{ fontWeight: 600 }}>{o.title}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>{o.purpose}</td>
                          <td style={{ fontSize: '0.8rem' }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                          <td><StatusBadge status={o.status} size="sm" /></td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{o.total_bill_amount}</td>
                        </tr>
                      ))}
                      {filteredOrders.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                            {t('coord.no_orders')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 2: Create Order */}
            {activeTab === 'create' && (
              <form onSubmit={handleCreateOrder} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start' }}>
                {/* Menu items list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {menuByVendor.map(v => (
                    <div key={v.id} className="card" style={{ padding: '20px' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px', color: 'var(--gray-800)', borderBottom: '1px solid var(--gray-100)', paddingBottom: '6px' }}>
                        🏪 {v.name}
                      </h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {v.menu.map(item => {
                          const nameKey = `menu.${item.name}`;
                          const translatedName = t(nameKey) !== nameKey ? t(nameKey) : item.name;
                          const formattedUnit = item.unit.toLowerCase().replace(' ', '_');
                          const unitKey = `unit.${formattedUnit}`;
                          const translatedUnit = t(unitKey) !== unitKey ? t(unitKey) : item.unit;
                          
                          return (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                              <div>
                                <strong style={{ color: 'var(--gray-800)' }}>{translatedName}</strong>
                                <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>₹{item.price} / {translatedUnit}</div>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  style={{ width: '28px', height: '28px', padding: 0 }}
                                  onClick={() => handleQtyChange(item.id, (selectedItems[item.id] || 0) - 1)}
                                >
                                  -
                                </button>
                                <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 700 }}>
                                  {selectedItems[item.id] || 0}
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  style={{ width: '28px', height: '28px', padding: 0 }}
                                  onClick={() => handleQtyChange(item.id, (selectedItems[item.id] || 0) + 1)}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {menuByVendor.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)', background: 'white', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
                      {t('coord.no_vendors')}
                    </div>
                  )}
                </div>

                {/* Form parameters */}
                <div className="card" style={{ padding: '20px', position: 'sticky', top: '80px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '14px' }}>{t('coord.draft_specs')}</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>
                        {t('coord.event_title')}
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={t('coord.event_title_ph')}
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>
                        {t('coord.meeting_purpose')}
                      </label>
                      <textarea
                        className="form-input"
                        style={{ height: '80px', resize: 'none' }}
                        placeholder={t('coord.meeting_ph')}
                        value={purpose}
                        onChange={e => setPurpose(e.target.value)}
                      />
                    </div>

                    <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '10px', marginTop: '10px' }}>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="btn btn-primary"
                        style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '6px' }}
                      >
                        {submitting ? t('coord.drafting_btn') : `🚀 ${t('coord.draft_btn')}`}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

      </div>
    </AppShell>
  );
}
