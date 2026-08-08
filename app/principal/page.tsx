'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import { getSession, UserProfile } from '@/lib/auth';
import { getOrders, MasterOrder } from '@/lib/store';
import { ROLE_COLORS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';
import Link from 'next/link';

export default function PrincipalDashboardPage() {
  const { t } = useI18n();
  const [session, setSession] = useState<UserProfile | null>(null);
  const colors = ROLE_COLORS.principal;

  // Active Tab: pending | history
  const [activeTab, setActiveTab] = useState('pending');
  const [orders, setOrders] = useState<MasterOrder[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const list = await getOrders();
      setOrders(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== 'principal') {
      window.location.href = '/login';
      return;
    }
    setSession(s);
    loadData();

    if (window.location.hash === '#pending') {
      setActiveTab('pending');
    } else if (window.location.hash === '#history') {
      setActiveTab('history');
    }
  }, []);

  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  if (!session) return null;

  // Filter orders matching principal's managed departments
  const managedDepts = session.principal_depts || [];
  const deptOrders = orders.filter(o => o.department_id && managedDepts.includes(o.department_id));

  // Tab splits
  const pendingOrders = deptOrders.filter(o => ['Sent for Approval', 'Principal Reviewing'].includes(o.status));
  const historyOrders = deptOrders.filter(o => !['Created', 'Sent for Approval', 'Principal Reviewing'].includes(o.status));

  // Compute Stats
  const totalPending = pendingOrders.length;
  const totalApproved = deptOrders.filter(o => o.history.some(h => h.role === 'principal' && h.action === 'Principal Approved')).length;
  const totalRejected = deptOrders.filter(o => o.history.some(h => h.role === 'principal' && h.action === 'Principal Rejected')).length;

  return (
    <AppShell role="principal" currentPath="/principal">
      <div style={{ '--role-accent': colors.accent } as React.CSSProperties}>
        
        {/* Title */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px' }}>
            Principal Dashboard
          </h1>
          <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
            Review, approve, and reject canteen order requests submitted by department coordinators.
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Pending Review', value: totalPending, color: '#6366F1', icon: '⏳' },
            { label: 'Approved Orders', value: totalApproved, color: '#10B981', icon: '✅' },
            { label: 'Rejected Orders', value: totalRejected, color: '#EF4444', icon: '❌' }
          ].map((s, idx) => (
            <div key={idx} className="card" style={{ padding: '16px 20px', borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: '1.3rem', marginBottom: '4px' }}>{s.icon}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gray-900)' }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid var(--gray-200)' }}>
          {[
            { key: 'pending', label: `Pending Approvals (${totalPending})`, icon: '⏳' },
            { key: 'history', label: 'Review History', icon: '📜' }
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

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px', animation: 'spin 1s infinite linear' }}>🔄</div>
            <div>Loading pending reviews...</div>
          </div>
        ) : (
          <div>
            {/* 1. Pending Approvals */}
            {activeTab === 'pending' && (
              <div className="card" style={{ padding: '20px' }}>
                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Title Description</th>
                        <th>Department</th>
                        <th>Prepared By</th>
                        <th>Submitted Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingOrders.map(o => (
                        <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/order/${o.id}`}>
                          <td style={{ fontWeight: 700 }}>{o.id}</td>
                          <td style={{ fontWeight: 600 }}>{o.title}</td>
                          <td>{o.department_label}</td>
                          <td>{o.created_by_name}</td>
                          <td style={{ fontSize: '0.8rem' }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                          <td><StatusBadge status={o.status} size="sm" /></td>
                        </tr>
                      ))}
                      {pendingOrders.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                            No orders currently awaiting approval.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. Review History */}
            {activeTab === 'history' && (
              <div className="card" style={{ padding: '20px' }}>
                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Title Description</th>
                        <th>Department</th>
                        <th>Prepared By</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyOrders.map(o => (
                        <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/order/${o.id}`}>
                          <td style={{ fontWeight: 700 }}>{o.id}</td>
                          <td style={{ fontWeight: 600 }}>{o.title}</td>
                          <td>{o.department_label}</td>
                          <td>{o.created_by_name}</td>
                          <td><StatusBadge status={o.status} size="sm" /></td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{o.total_bill_amount}</td>
                        </tr>
                      ))}
                      {historyOrders.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                            No previous reviews logged.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </AppShell>
  );
}
