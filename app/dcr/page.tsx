'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import { getSession, UserProfile, updateSessionLanguage, updateUserProfile, uploadAvatar } from '@/lib/auth';
import { getOrders, MasterOrder } from '@/lib/store';
import { ROLE_COLORS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';
import { getNotifications, markNotificationRead, markAllRead, NotificationItem, localizeNotificationMessage } from '@/lib/notifications';
import BrandLogo from '@/components/BrandLogo';
import ImageCropperModal from '@/components/ImageCropperModal';

import { api } from '@/lib/api';

export default function DCRDashboardPage({ initialTab = 'dashboard' }: { initialTab?: string }) {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [session, setSession] = useState<UserProfile | null>(null);
  // Support both 'dcr' (legacy) and 'administration' (new) role
  const colors = ROLE_COLORS['administration'] || ROLE_COLORS.dcr;

  // Active Tab
  const [activeTab, setActiveTab] = useState(initialTab);

  const [isMobileDevice, setIsMobileDevice] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobileDevice(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Lists
  const [orders, setOrders] = useState<MasterOrder[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Financial summary & reminder
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [reminderState, setReminderState] = useState<any>(null);

  // Profile Edit State
  const [profileName, setProfileName] = useState('');
  const [profileMobile, setProfileMobile] = useState('');
  const [profileMobileError, setProfileMobileError] = useState('');
  const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState('');
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  // Settings State
  const [preferredLang, setPreferredLang] = useState('en');

  const loadDataRef = useRef<((silent?: boolean) => Promise<void>) | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const safetyTimer = !silent ? setTimeout(() => setLoading(false), 2500) : null;
    try {
      const [oList, nList, fSum, rState] = await Promise.all([
        getOrders().catch(() => []),
        getNotifications().catch(() => []),
        api.get('/bills/financial-summary').catch(() => null),
        api.get('/notifications/month-end-check').catch(() => null)
      ]);
      setOrders(oList);
      setNotifications(nList);
      if (fSum) setFinancialSummary(fSum);
      if (rState) setReminderState(rState);
    } catch (err) {
      console.warn('Error in dcr loadData:', err);
    } finally {
      if (safetyTimer) clearTimeout(safetyTimer);
      if (!silent) setLoading(false);
    }
  }, []);

  // Keep a stable ref so the interval always calls the latest version
  useEffect(() => { loadDataRef.current = loadData; }, [loadData]);

  // Load session & data
  useEffect(() => {
    const s = getSession();
    if (!s) {
      window.location.href = '/login';
      return;
    }
    if (s.role !== 'dcr' && s.role !== 'administration') {
      window.location.href = `/${s.role}`;
      return;
    }
    setSession(s);

    setProfileName(s.name);
    setProfileMobile(s.mobile_number || '');
    setPreferredLang(s.preferred_language || 'en');
    loadData();

    // WebSocket-driven sync
    const handleOrderChanged = () => { loadData(true); };

    // Cross-tab real-time sync (same browser)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'aharsetu_orders_v3' || e.key === 'aharsetu_notifications_v3.7') {
        loadData(true);
      }
    };

    // Cross-device sync: poll every 10 seconds silently
    const syncInterval = setInterval(() => {
      loadDataRef.current?.(true);
    }, 10000);

    window.addEventListener('aharsetu_order_changed', handleOrderChanged);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('aharsetu_order_changed', handleOrderChanged);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Listen to hash changes for sidebar navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleHash = () => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        setActiveTab(hash);
      } else {
        setActiveTab(initialTab || 'dashboard');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [initialTab]);

  // Sync state changes back to hash
  useEffect(() => {
    if (activeTab && window.location.hash !== '#' + activeTab) {
      window.location.hash = activeTab;
    }
  }, [activeTab]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileName.trim() || !session) return;
    if (profileMobile) {
      const digits = profileMobile.replace(/\D/g, '');
      if (digits.length !== 10) {
        setProfileMobileError('Mobile number must be exactly 10 digits');
        return;
      }
      setProfileMobileError('');
    }
    setSubmitting(true);
    setProfileMessage('');
    try {
      if (profileAvatarFile) {
        await uploadAvatar(profileAvatarFile);
        setProfileAvatarFile(null);
      }
      const mobileDigits = profileMobile.replace(/\D/g, '') || null;
      const updated = await updateUserProfile({ name: profileName.trim(), mobile_number: mobileDigits });
      setSession(updated);
      setProfileMessage('Profile updated successfully!');
      setTimeout(() => setProfileMessage(''), 4000);
    } catch (err: any) {
      setProfileMessage(err.message || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLanguageChange(lang: string) {
    setPreferredLang(lang);
    if (session) {
      await updateSessionLanguage(lang);
      window.location.reload();
    }
  }

  async function handleMarkNotification(id: string) {
    await markNotificationRead(id);
    const nList = await getNotifications();
    setNotifications(nList);
  }

  async function handleMarkAllNotifications() {
    await markAllRead();
    const nList = await getNotifications();
    setNotifications(nList);
  }

  if (!session) return null;

  // DCR pending orders (Principal Approved / DCR Reviewing)
  const pendingQueue = orders.filter(o => ['Principal Approved', 'DCR Reviewing'].includes(o.status));
  const approvedOrders = orders.filter(o => o.history.some(h => h.role === 'dcr' && h.action === 'DCR Approved & Forwarded'));
  const rejectedOrders = orders.filter(o => o.history.some(h => h.role === 'dcr' && h.action === 'DCR Rejected'));
  const historyOrders = orders.filter(o => !['Created', 'Sent for Approval', 'Principal Reviewing', 'Principal Approved', 'DCR Reviewing'].includes(o.status));
  const ordersWithBills = orders.filter(o => ['Bill Generated', 'Completed'].includes(o.status));

  // Compute Stats
  const totalPending = pendingQueue.length;
  const totalApproved = approvedOrders.length;
  const totalRejected = rejectedOrders.length;

  // Department-wise audit reports data
  const deptAuditSummary: Record<string, { count: number; total: number; label: string }> = {};
  orders.forEach(o => {
    if (o.history.some(h => h.role === 'dcr')) {
      const dept = o.department_label || o.department_id || 'Unknown';
      if (!deptAuditSummary[dept]) {
        deptAuditSummary[dept] = { count: 0, total: 0, label: dept };
      }
      deptAuditSummary[dept].count += 1;
      deptAuditSummary[dept].total += o.total_bill_amount;
    }
  });
  const deptAuditRows = Object.values(deptAuditSummary);

  return (
    <AppShell role={(session?.role as 'dcr' | 'administration') || 'dcr'} currentPath="/dcr">
      <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '48px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        
        {/* Enterprise Institutional Top Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: '20px',
          padding: '24px 28px',
          marginBottom: '20px',
          color: 'white',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#0D9488', color: 'white', padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px' }}>
                INSTITUTIONAL ADMINISTRATION
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                TAN: BLRA00000A · FY 2026-27
              </span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, margin: '2px 0 6px', letterSpacing: '-0.5px', color: '#F8FAFC' }}>
              🏛️ Administration & Financial Control Hub
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94A3B8', maxWidth: '650px' }}>
              Institutional financial position, department requisition approvals, canteen settlements, and real-time audit ledger.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/dcr/reports"
              style={{
                padding: '9px 16px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#E2E8F0',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              📊 Financial Reports
            </Link>
            <Link
              href="/dcr/settlements"
              style={{
                padding: '9px 16px',
                borderRadius: '10px',
                background: '#0D9488',
                color: 'white',
                border: 'none',
                textDecoration: 'none',
                fontWeight: 800,
                fontSize: '0.84rem',
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              💳 Settlements Hub
            </Link>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px', animation: 'spin 1s infinite linear' }}>🔄</div>
            <div>{t('common.loading', 'Loading details...')}</div>
          </div>
        ) : (
          <div>
            {/* TAB: DASHBOARD OVERVIEW */}
            {activeTab === 'dashboard' && (
              <div>
                {/* Month-End Reminder Alert Banner */}
                {reminderState?.should_remind && (
                  <div style={{ background: '#FFFBEB', border: '1.5px solid #F59E0B', borderRadius: '14px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '1.8rem' }}>⏰</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, color: '#92400E', fontSize: '0.95rem', marginBottom: '2px' }}>
                        Month-End Settlement Notice — {reminderState.days_remaining} Days Remaining
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#78350F' }}>
                        {reminderState.unsettled_bills_count} bill(s) are awaiting monthly settlement. Finalize the monthly settlement before month end.
                      </div>
                    </div>
                    <Link href="/dcr/settlements" style={{ padding: '8px 18px', borderRadius: '8px', background: '#D97706', color: 'white', textDecoration: 'none', fontWeight: 800, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      Review Settlements →
                    </Link>
                  </div>
                )}

                {/* Real-time Institutional Financial Stats Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                  gap: '16px',
                  marginBottom: '24px',
                  width: '100%'
                }}>
                  {/* Tile 1: Pending Audits */}
                  <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    border: '1.5px solid #E2E8F0',
                    padding: '20px 24px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#D97706', letterSpacing: '0.05em' }}>
                        AUDIT REVIEW QUEUE
                      </span>
                      <span style={{ background: '#FEF3C7', color: '#92400E', borderRadius: '8px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 800 }}>
                        {totalPending} REQUISITIONS
                      </span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: totalPending > 0 ? '#D97706' : '#059669', letterSpacing: '-0.5px' }}>
                      {totalPending}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
                      Orders awaiting administrative verification & clearance
                    </div>
                  </div>

                  {/* Tile 2: Pending Settlements */}
                  <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    border: '1.5px solid #E2E8F0',
                    padding: '20px 24px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803D', letterSpacing: '0.05em' }}>
                        TOTAL PENDING DUES
                      </span>
                      <span style={{ background: '#DCFCE7', color: '#15803D', borderRadius: '8px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 800 }}>
                        {financialSummary?.pending_settlement_bills || 0} BILLS DUE
                      </span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: Number(financialSummary?.pending_settlement_total || 0) > 0 ? '#DC2626' : '#059669', letterSpacing: '-0.5px' }}>
                      {financialSummary ? `₹${Number(financialSummary.pending_settlement_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
                      Total unsettled canteen payables awaiting clearance
                    </div>
                  </div>

                  {/* Tile 3: Total Disbursed */}
                  <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    border: '1.5px solid #10B981',
                    padding: '20px 24px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803D', letterSpacing: '0.05em' }}>
                        TOTAL DISBURSED (PAID)
                      </span>
                      <span style={{ background: '#DCFCE7', color: '#15803D', borderRadius: '8px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 800 }}>
                        CLEARED PAYMENTS
                      </span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: '#059669', letterSpacing: '-0.5px' }}>
                      {financialSummary ? `₹${Number(financialSummary.settled_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
                      Direct NEFT/RTGS/UPI cleared disbursements
                    </div>
                  </div>
                </div>

                {/* Quick actions & modules grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px', alignItems: 'start' }}>
                  {/* Financial Review Queue */}
                  <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px' }}>⏳ Financial Review Queue</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '16px' }}>There are currently {totalPending} order requests awaiting budget verification and clearance.</p>
                    <button className="btn btn-primary" onClick={() => setActiveTab('queue')}>
                      📋 Open Audit Queue ({totalPending})
                    </button>
                  </div>

                  {/* Bills & Invoices Hub */}
                  <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px' }}>🧾 Bills & Invoices</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '16px' }}>Access itemized invoices, server-side bill search, filter by department or vendor, and export PDF/Excel.</p>
                    <Link href="/dcr/bills" className="btn" style={{ background: '#0D9488', color: 'white', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      🧾 View Bills & Invoices →
                    </Link>
                  </div>

                  {/* Monthly Settlements Hub */}
                  <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px' }}>💳 Monthly Settlements</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '16px' }}>Create monthly institutional settlement records, review department/vendor breakdowns, and finalize payments.</p>
                    <Link href="/dcr/settlements" className="btn" style={{ background: '#059669', color: 'white', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      💳 Payments & Settlements →
                    </Link>
                  </div>

                  {/* Recent Notifications */}
                  <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>🔔 Recent Notifications</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {notifications.slice(0, 3).map(n => (
                        <div key={n.id} style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', borderBottom: '1px solid var(--gray-100)', paddingBottom: '6px' }}>
                          <span>🔔</span>
                          <span style={{ color: n.read ? 'var(--gray-600)' : 'var(--gray-900)', fontWeight: n.read ? 500 : 700 }}>{n.message}</span>
                        </div>
                      ))}
                      {notifications.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>No notifications.</div>}
                      <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', padding: 0 }} onClick={() => setActiveTab('notifications')}>
                        View all notifications
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: APPROVAL QUEUE (PENDING AUDITS) */}
            {activeTab === 'queue' && (
              <div className="card" style={{ padding: '20px' }}>
                {isMobileDevice ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {pendingQueue.map(o => (
                      <div key={o.id} style={{ border: '1px solid #FDE68A', padding: '16px', borderRadius: '16px', background: '#FFFBEB', cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#B45309' }}>{o.id}</span>
                          <StatusBadge status={o.status} size="sm" />
                        </div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>{o.title}</h4>
                        <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#64748B' }}>Prepared By: {o.created_by_name} · Dept: {o.department_label}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #FDE68A' }}>
                          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{new Date(o.created_at).toLocaleDateString()}</span>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>₹{o.total_bill_amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                    {pendingQueue.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: '0.85rem' }}>No orders currently awaiting audit.</div>
                    )}
                  </div>
                ) : (
                  <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Title Description</th>
                          <th>Department</th>
                          <th>Prepared By</th>
                          <th>Estimated Bill</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingQueue.map(o => (
                          <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>
                            <td style={{ fontWeight: 700 }}>{o.id}</td>
                            <td style={{ fontWeight: 600 }}>{o.title}</td>
                            <td>{o.department_label}</td>
                            <td>{o.created_by_name}</td>
                            <td style={{ fontWeight: 700 }}>₹{o.total_bill_amount}</td>
                            <td><StatusBadge status={o.status} size="sm" /></td>
                          </tr>
                        ))}
                        {pendingQueue.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                              No orders currently awaiting audit.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: APPROVED ORDERS */}
            {activeTab === 'approved' && (
              <div className="card" style={{ padding: '20px' }}>
                {isMobileDevice ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {approvedOrders.map(o => (
                      <div key={o.id} style={{ border: '1px solid #A7F3D0', padding: '16px', borderRadius: '16px', background: '#ECFDF5', cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#047857' }}>{o.id}</span>
                          <StatusBadge status={o.status} size="sm" />
                        </div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>{o.title}</h4>
                        <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#64748B' }}>Prepared By: {o.created_by_name} · Dept: {o.department_label}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #A7F3D0' }}>
                          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{new Date(o.created_at).toLocaleDateString()}</span>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>₹{o.total_bill_amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                    {approvedOrders.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: '0.85rem' }}>No audited and cleared orders.</div>
                    )}
                  </div>
                ) : (
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
                        {approvedOrders.map(o => (
                          <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>
                            <td style={{ fontWeight: 700 }}>{o.id}</td>
                            <td style={{ fontWeight: 600 }}>{o.title}</td>
                            <td>{o.department_label}</td>
                            <td>{o.created_by_name}</td>
                            <td><StatusBadge status={o.status} size="sm" /></td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{o.total_bill_amount}</td>
                          </tr>
                        ))}
                        {approvedOrders.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                              No audited and cleared orders.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: REJECTED ORDERS */}
            {activeTab === 'rejected' && (
              <div className="card" style={{ padding: '20px' }}>
                {isMobileDevice ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {rejectedOrders.map(o => (
                      <div key={o.id} style={{ border: '1px solid #FECACA', padding: '16px', borderRadius: '16px', background: '#FEF2F2', cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#991B1B' }}>{o.id}</span>
                          <StatusBadge status={o.status} size="sm" />
                        </div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>{o.title}</h4>
                        <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#64748B' }}>Prepared By: {o.created_by_name} · Dept: {o.department_label}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #FECACA' }}>
                          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{new Date(o.created_at).toLocaleDateString()}</span>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>₹{o.total_bill_amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                    {rejectedOrders.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: '0.85rem' }}>No rejected budgets.</div>
                    )}
                  </div>
                ) : (
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
                        {rejectedOrders.map(o => (
                          <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>
                            <td style={{ fontWeight: 700 }}>{o.id}</td>
                            <td style={{ fontWeight: 600 }}>{o.title}</td>
                            <td>{o.department_label}</td>
                            <td>{o.created_by_name}</td>
                            <td><StatusBadge status={o.status} size="sm" /></td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{o.total_bill_amount}</td>
                          </tr>
                        ))}
                        {rejectedOrders.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                              No rejected budgets.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: AUDIT HISTORY */}
            {activeTab === 'history' && (
              <div className="card" style={{ padding: '20px' }}>
                {isMobileDevice ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {historyOrders.map(o => (
                      <div key={o.id} style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '16px', background: '#F8FAFC', cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>{o.id}</span>
                          <StatusBadge status={o.status} size="sm" />
                        </div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>{o.title}</h4>
                        <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#64748B' }}>Prepared By: {o.created_by_name} · Dept: {o.department_label}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
                          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{new Date(o.created_at).toLocaleDateString()}</span>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>₹{o.total_bill_amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                    {historyOrders.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: '0.85rem' }}>No previous audit trails logged.</div>
                    )}
                  </div>
                ) : (
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
                          <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/order/${o.id}`)}>
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
                              No previous audit trails logged.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: BILLS / INVOICES */}
            {activeTab === 'bills' && (
              <div className="card" style={{ padding: '20px' }}>
                {isMobileDevice ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {ordersWithBills.map(o => (
                      <div key={o.id} style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '16px', background: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>{o.id}</span>
                          <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#059669' }}>₹{o.total_bill_amount.toFixed(2)}</span>
                        </div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>{o.title}</h4>
                        <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem', color: '#64748B' }}>
                          Billing Date: {o.bill_generated_at ? new Date(o.bill_generated_at).toLocaleDateString('en-IN') : new Date(o.created_at).toLocaleDateString('en-IN')}
                        </p>
                        <Link
                          href={`/bill/${o.id}`}
                          style={{
                            display: 'block',
                            textAlign: 'center',
                            padding: '10px',
                            background: '#F0FDFA',
                            color: '#0D9488',
                            borderRadius: '10px',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            textDecoration: 'none',
                            border: '1px solid #99F6E4'
                          }}
                        >
                          🧾 View & Print Bill
                        </Link>
                      </div>
                    ))}
                    {ordersWithBills.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: '0.85rem' }}>
                        No invoice sheets found.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Title Description</th>
                          <th>Billing Date</th>
                          <th style={{ textAlign: 'right' }}>Bill Amount</th>
                          <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordersWithBills.map(o => (
                          <tr key={o.id}>
                            <td style={{ fontWeight: 700 }}>{o.id}</td>
                            <td style={{ fontWeight: 600 }}>{o.title}</td>
                            <td style={{ fontSize: '0.8rem' }}>{o.bill_generated_at ? new Date(o.bill_generated_at).toLocaleDateString('en-IN') : new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{o.total_bill_amount}</td>
                            <td style={{ textAlign: 'center' }}>
                              <Link href={`/bill/${o.id}`} className="btn btn-ghost btn-sm" style={{ color: colors.accent, fontWeight: 700 }}>
                                🧾 Print Bill
                              </Link>
                            </td>
                          </tr>
                        ))}
                        {ordersWithBills.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                              No invoice sheets found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: REPORTS */}
            {activeTab === 'reports' && (
              <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 4px', color: '#0F172A' }}>📊 Financial & Departmental Audit Reports</h3>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748B' }}>Access comprehensive department ledgers, vendor aging, and certified CA settlement statements.</p>
                  </div>
                  <Link
                    href="/dcr/reports"
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      background: '#0D9488',
                      color: 'white',
                      textDecoration: 'none',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    Open Full Financial Reports Suite →
                  </Link>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '16px', marginTop: '20px' }}>
                  <div style={{ padding: '16px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: '6px' }}>🏛️</div>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem', marginBottom: '4px' }}>Department-Wise Budget Ledger</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Track spend share, requisition counts, and average order value across all college branches.</div>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: '6px' }}>🍽️</div>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem', marginBottom: '4px' }}>Canteen Disbursements & Aging</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Real-time 0-30 / 31-60 / 60+ days payable analysis and bank UTR transaction logs.</div>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: '6px' }}>📑</div>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem', marginBottom: '4px' }}>Statutory CA Downloads</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>1-Click certified PDF statements and multi-sheet Excel (.xlsx) workbooks for audits.</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>🔔 Received Alerts</h3>
                  {notifications.filter(n => !n.read).length > 0 && (
                    <button className="btn btn-ghost btn-sm text-primary" onClick={handleMarkAllNotifications}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {notifications.map(n => {
                    const loc = localizeNotificationMessage(n, lang);
                    return (
                    <div key={n.id} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: n.read ? '#FAFAFA' : 'var(--sidebar-bg)', border: '1px solid var(--sidebar-border)', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.2rem' }}>🔔</span>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: n.read ? 500 : 700, color: 'var(--gray-800)' }}>{loc.message}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: '2px' }}>{new Date(n.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      {!n.read && (
                        <button className="btn btn-ghost btn-sm" style={{ color: colors.accent }} onClick={() => handleMarkNotification(n.id)}>
                          Check Read
                        </button>
                      )}
                    </div>
                  );})}
                  {notifications.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-400)' }}>
                      No alerts or notifications recorded.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: PROFILE */}
            {activeTab === 'profile' && (
              <div style={{ maxWidth: '560px' }}>
                <div className="card" style={{ padding: '28px', background: 'white', borderRadius: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #E2E8F0' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', border: '3px solid white', outline: '2px solid #BFDBFE', boxShadow: '0 4px 12px rgba(37,99,235,0.15)' }}>
                      {profileAvatarPreview ? (
                        <img src={profileAvatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : session.avatar_url ? (
                        <img src={`${session.avatar_url}?v=${session.avatar_version || 1}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: 'white', fontSize: '1.8rem', fontWeight: 800 }}>{session.name[0]}</div>
                      )}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{session.name}</h3>
                      <div style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: 700, marginTop: '2px' }}>🟢 DCR Officer</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '1px' }}>{session.email}</div>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '8px' }}>Profile Photo</label>
                      <label style={{ cursor: 'pointer', background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', padding: '7px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        📷 {profileAvatarFile ? '✓ Photo Selected — Change' : 'Upload New Photo'}
                        <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) { setProfileMessage('Image must be less than 5MB.'); return; }
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              if (evt.target?.result) {
                                setCropSrc(evt.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                            setProfileMessage('');
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '5px' }}>JPEG, PNG or WEBP • Max 5MB</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Full Name</label>
                      <input type="text" className="form-input" value={profileName} onChange={e => setProfileName(e.target.value)} required placeholder="Your full name" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Mobile Number <span style={{ color: '#94A3B8', fontWeight: 500 }}>(optional)</span></label>
                      <input type="tel" className="form-input" value={profileMobile} onChange={e => { setProfileMobile(e.target.value); setProfileMobileError(''); }} placeholder="10-digit mobile number" maxLength={14} style={{ borderColor: profileMobileError ? '#EF4444' : undefined }} />
                      {profileMobileError && <p style={{ fontSize: '0.76rem', color: '#EF4444', marginTop: '4px' }}>{profileMobileError}</p>}
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Email Address</label>
                      <input type="email" className="form-input" value={session.email} disabled style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }} />
                    </div>
                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ alignSelf: 'flex-start', minWidth: '140px' }}>
                      {submitting ? '⏳ Saving...' : '✓ Save Profile'}
                    </button>
                    {profileMessage && (
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: profileMessage.includes('success') ? '#10B981' : '#EF4444' }}>
                        {profileMessage}
                      </div>
                    )}
                  </form>
                  {cropSrc && (
                    <ImageCropperModal
                      imageSrc={cropSrc}
                      onCrop={(croppedFile) => {
                        setProfileAvatarFile(croppedFile);
                        setProfileAvatarPreview(URL.createObjectURL(croppedFile));
                        setCropSrc(null);
                      }}
                      onCancel={() => setCropSrc(null)}
                    />
                  )}
                </div>
              </div>
            )}

            {/* TAB: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="card" style={{ padding: '20px', maxWidth: '500px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px' }}>⚙️ Dashboard Settings</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Preferred Language / भाषा पसंद</label>
                    <select className="form-input" value={preferredLang} onChange={e => handleLanguageChange(e.target.value)}>
                      <option value="en">English (English)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="gu">ગુજરાતી (Gujarati)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </AppShell>
  );
}
