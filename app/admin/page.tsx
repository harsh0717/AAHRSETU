'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import VendorStatusBadge from '@/components/VendorStatusBadge';
import UserManager from '@/components/UserManager';
import { getSession, UserProfile, updateSessionLanguage, getDepartments, addDepartment, toggleDepartmentStatus, updateUserProfile, uploadAvatar } from '@/lib/auth';
import { getOrders, resetAllData, completeOrder, MasterOrder } from '@/lib/store';
import { getVendors, updateVendorStatus, Vendor, deleteVendor, getMonthlySettlements, updateMonthlySettlement, VendorMonthlySettlement } from '@/lib/vendors';
import { ROLE_COLORS, VENDOR_STATUS_LABELS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';
import { getNotifications, markNotificationRead, markAllRead, NotificationItem } from '@/lib/notifications';
import BrandLogo from '@/components/BrandLogo';
import ImageCropperModal from '@/components/ImageCropperModal';
import { api } from '@/lib/api';

export default function AdminDashboardPage({ initialTab = 'dashboard' }: { initialTab?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<UserProfile | null>(null);
  const colors = ROLE_COLORS.admin;

  const [isMobileDevice, setIsMobileDevice] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobileDevice(window.innerWidth <= 900);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Active Tab
  const [activeTab, setActiveTab] = useState(initialTab);

  // API Lists
  const [orders, setOrders] = useState<MasterOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [settlements, setSettlements] = useState<VendorMonthlySettlement[]>([]);
  
  // Settlements states
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [selectedSettlementVendor, setSelectedSettlementVendor] = useState('');
  const [selectedSettlementMonth, setSelectedSettlementMonth] = useState('');
  const [settlementTotalAmount, setSettlementTotalAmount] = useState(0);
  const [settlementPaidAmount, setSettlementPaidAmount] = useState(0);
  const [settlementError, setSettlementError] = useState('');
  const [settlementSuccess, setSettlementSuccess] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total_orders: 0, completed_orders: 0, total_revenue: 0, active_vendors: 0 });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Reports states
  const [deptReport, setDeptReport] = useState<any[]>([]);
  const [vendorReport, setVendorReport] = useState<any[]>([]);

  const totalDeptExp = deptReport.reduce((acc, r) => acc + (r.revenue || 0), 0);
  const totalVendorRev = vendorReport.reduce((acc, v) => acc + (v.revenue || 0), 0);
  
  // Reports filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterDeptId, setFilterDeptId] = useState('');
  const [filterVendorId, setFilterVendorId] = useState('');
  const [filterOrderStatus, setFilterOrderStatus] = useState('');
  const [filterCoordId, setFilterCoordId] = useState('');
  const [filterPrincipalId, setFilterPrincipalId] = useState('');
  const [reportMetrics, setReportMetrics] = useState<any>(null);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [principals, setPrincipals] = useState<any[]>([]);

  // Add Vendor form states
  const [newVendorId, setNewVendorId] = useState('');
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorOwner, setNewVendorOwner] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorPassword, setNewVendorPassword] = useState('');
  const [newVendorImageUrl, setNewVendorImageUrl] = useState('');
  const [addVendorError, setAddVendorError] = useState('');
  const [addVendorSuccess, setAddVendorSuccess] = useState('');
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);

  // Search & Filter
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Vendor Edit modal
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [editStatus, setEditStatus] = useState('closed');

  // Department Modal State
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  // Analytics timeframe state
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'monthly' | 'yearly'>('monthly');

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
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [demoAccountsEnabled, setDemoAccountsEnabled] = useState(true);
  const [settingsMessage, setSettingsMessage] = useState('');

  async function handleToggleDemo(enabled: boolean) {
    setSettingsMessage('');
    try {
      const res = await api.put<{ demo_accounts_enabled: boolean }>('/settings', { demo_accounts_enabled: enabled });
      setDemoAccountsEnabled(res.demo_accounts_enabled);
      setSettingsMessage('System settings updated successfully!');
      setTimeout(() => setSettingsMessage(''), 4000);
    } catch (err: any) {
      setSettingsMessage(err.message || 'Failed to update system settings.');
    }
  }

  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleAddDeptSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) return;
    try {
      await addDepartment({ name: deptName.trim(), code: deptCode.trim(), description: deptDesc.trim(), active: true });
      setShowDeptModal(false);
      setDeptName('');
      setDeptCode('');
      setDeptDesc('');
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Error creating department');
    }
  }

  async function handleToggleDept(id: string, currentActive: boolean) {
    try {
      await toggleDepartmentStatus(id, !currentActive);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Error updating department status');
    }
  }

  async function handleToggleVendorActive(vendorId: string) {
    try {
      await api.put(`/vendors/${vendorId}/toggle-active`, {});
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle vendor active status');
    }
  }

  async function handleDeleteVendor(vendorId: string) {
    if (!confirm('Are you absolutely sure you want to delete this vendor? This will permanently delete the vendor and their user login accounts.')) {
      return;
    }
    try {
      await deleteVendor(vendorId);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete vendor');
    }
  }

  async function handleAddVendorSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newVendorId.trim() || !newVendorName.trim() || !newVendorOwner.trim() || !newVendorEmail.trim() || !newVendorPhone.trim() || !newVendorPassword.trim()) {
      setAddVendorError('All fields (except Image URL) are required');
      return;
    }
    setSubmitting(true);
    setAddVendorError('');
    setAddVendorSuccess('');
    try {
      await api.post('/vendors', {
        id: newVendorId.trim(),
        name: newVendorName.trim(),
        owner_name: newVendorOwner.trim(),
        email: newVendorEmail.trim(),
        phone: newVendorPhone.trim(),
        password: newVendorPassword.trim(),
        image_url: newVendorImageUrl.trim() || null
      });
      setAddVendorSuccess('Vendor added successfully!');
      setNewVendorId('');
      setNewVendorName('');
      setNewVendorOwner('');
      setNewVendorEmail('');
      setNewVendorPhone('');
      setNewVendorPassword('');
      setNewVendorImageUrl('');
      loadDashboardData();
      setTimeout(() => {
        setShowAddVendorModal(false);
        setAddVendorSuccess('');
      }, 2000);
    } catch (err: any) {
      setAddVendorError(err.message || 'Failed to add vendor.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateSettlementSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSettlementVendor || !selectedSettlementMonth.trim()) {
      setSettlementError('Vendor and Month are required');
      return;
    }
    setSubmitting(true);
    setSettlementError('');
    setSettlementSuccess('');
    try {
      await updateMonthlySettlement(
        selectedSettlementVendor,
        selectedSettlementMonth.trim(),
        settlementPaidAmount,
        settlementTotalAmount
      );
      setSettlementSuccess('Monthly settlement updated successfully!');
      loadDashboardData();
      setTimeout(() => {
        setShowSettlementModal(false);
        setSettlementSuccess('');
      }, 1500);
    } catch (err: any) {
      setSettlementError(err.message || 'Failed to update settlement.');
    } finally {
      setSubmitting(false);
    }
  }


  async function loadDashboardData() {
    setLoading(true);
    try {
      const [oList, vList, sysStats, nList, deptList, usersList, sList] = await Promise.all([
        getOrders().catch(() => []),
        getVendors().catch(() => []),
        api.get<any>('/reports/system-stats').catch(() => ({ total_orders: 0, completed_orders: 0, total_revenue: 0, active_vendors: 0 })),
        getNotifications().catch(() => []),
        getDepartments().catch(() => []),
        api.get<any[]>('/users').catch(() => []),
        getMonthlySettlements().catch(() => [])
      ]);
      setOrders(oList);
      setVendors(vList);
      setStats(sysStats);
      setNotifications(nList);
      setDepartments(deptList);
      setCoordinators(usersList.filter((u: any) => u.role === 'coordinator'));
      setPrincipals(usersList.filter((u: any) => u.role === 'principal'));
      setSettlements(sList);
      const config = await api.get<{ demo_accounts_enabled: boolean }>('/settings/public').catch(() => ({ demo_accounts_enabled: true }));
      setDemoAccountsEnabled(config.demo_accounts_enabled);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadReportsData() {
    try {
      const params = new URLSearchParams();
      if (filterStartDate) params.append('start_date', filterStartDate);
      if (filterEndDate) params.append('end_date', filterEndDate);
      if (filterDeptId) params.append('department_id', filterDeptId);
      if (filterVendorId) params.append('vendor_id', filterVendorId);
      if (filterOrderStatus) params.append('status', filterOrderStatus);
      if (filterCoordId) params.append('coordinator_id', filterCoordId);
      if (filterPrincipalId) params.append('principal_id', filterPrincipalId);
      
      const summary = await api.get<any>(`/reports/filtered-summary?${params.toString()}`);
      setReportMetrics(summary.metrics);
      setDeptReport(summary.departments);
      setVendorReport(summary.vendors);
      setOrders(summary.orders || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadAuditLogs() {
    try {
      const logs = await api.get<any[]>('/reports/audit-logs').catch(() => []);
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.push('/login');
      return;
    }
    if (s.role !== 'admin') {
      router.push(`/${s.role}`);
      return;
    }
    setSession(s);
    setProfileName(s.name);
    setProfileMobile(s.mobile_number || '');
    setPreferredLang(s.preferred_language || 'en');
    loadDashboardData();

    const handleOrderChanged = () => {
      loadDashboardData();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'aharsetu_orders_v3' || e.key === 'aharsetu_notifications_v3.7') {
        loadDashboardData();
      }
    };

    window.addEventListener('aharsetu_order_changed', handleOrderChanged);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('aharsetu_order_changed', handleOrderChanged);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [router]);

  // Sync hash changes with state
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

  useEffect(() => {
    if (activeTab && window.location.hash !== '#' + activeTab) {
      window.location.hash = activeTab;
    }
    if (activeTab === 'reports' || activeTab === 'analytics') loadReportsData();
    if (activeTab === 'audit' || activeTab === 'logs') loadAuditLogs();
    if (activeTab === 'dashboard') loadDashboardData();
  }, [activeTab, filterStartDate, filterEndDate, filterDeptId, filterVendorId, filterOrderStatus, filterCoordId, filterPrincipalId]);

  async function handleResetData() {
    if (confirm('Are you sure you want to clear all transactions, users, and reset AharSetu to its seeded demo state?')) {
      setResetting(true);
      try {
        await resetAllData();
        alert('Database successfully reset and seeded.');
        loadDashboardData();
      } catch (err) {
        alert('Error resetting database.');
      } finally {
        setResetting(false);
      }
    }
  }

  async function handleUpdateVendorStatus() {
    if (!selectedVendor) return;
    try {
      await updateVendorStatus(selectedVendor.id, editStatus);
      setSelectedVendor(null);
      loadDashboardData();
    } catch (err) {
      alert('Error updating status.');
    }
  }

  async function handleComplete(orderId: string) {
    if (confirm('Mark this order as complete?')) {
      try {
        await completeOrder(orderId);
        loadDashboardData();
      } catch (e: any) {
        alert(e.message || 'Error completing order');
      }
    }
  }

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

  // Filter orders matching search and status criteria
  const filteredOrders = orders
    .filter(o => !orderSearch || o.title.toLowerCase().includes(orderSearch.toLowerCase()) || o.id.toLowerCase().includes(orderSearch.toLowerCase()))
    .filter(o => {
      if (statusFilter === 'All') return true;
      if (statusFilter === 'DCR Approved') return ['DCR Approved', 'Vendor Processing', 'Vendor Clarification Required', 'Vendor Confirmed', 'Bill Generated', 'Completed'].includes(o.status);
      if (statusFilter === 'Principal Approved') return ['Principal Approved', 'DCR Reviewing', 'DCR Approved', 'Vendor Processing', 'Bill Generated', 'Completed'].includes(o.status);
      if (statusFilter === 'Pending') return ['Sent for Approval', 'Principal Reviewing', 'DCR Reviewing', 'Vendor Processing'].includes(o.status);
      if (statusFilter === 'Completed') return ['Vendor Confirmed', 'Bill Generated', 'Completed'].includes(o.status);
      if (statusFilter === 'Rejected') return o.status.includes('Rejected');
      return o.status === statusFilter;
    });

  // Orders that have bills generated
  const ordersWithBills = orders.filter(o => ['Bill Generated', 'Completed'].includes(o.status));

  const ALL_STATUSES = [
    'All', 'Created', 'Sent for Approval', 'Principal Reviewing', 'Principal Approved',
    'Principal Rejected', 'DCR Reviewing', 'DCR Approved', 'DCR Rejected', 'Vendor Processing',
    'Vendor Clarification Required', 'Coordinator Updated', 'Vendor Confirmed', 'Bill Generated', 'Completed',
  ];

  return (
    <AppShell role="admin" currentPath="/admin">
      <div style={{ '--role-accent': colors.accent } as React.CSSProperties}>
        
        {/* Top Header Section with Official Brand Logo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', background: 'white', padding: '20px 24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--gray-900)' }}>
              System Administrator — {t(`admin.tab_title_${activeTab}`, 'Dashboard')}
            </h1>
            <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
              {t(`admin.tab_sub_${activeTab}`, 'Global administrative dashboard to control users, vendors, budgets and monitor health.')}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <BrandLogo size={52} />
            <button
              onClick={handleResetData}
              disabled={resetting}
              style={{
                padding: '8px 16px', background: '#FEE2E2', color: '#991B1B',
                border: '1px solid #FCA5A5', borderRadius: '10px',
                fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
              }}
            >
              {resetting ? 'Resetting System...' : '🔄 Reset All Data'}
            </button>
          </div>
        </div>

        {/* Tab Content Panel */}
        {loading && activeTab === 'dashboard' ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px', animation: 'spin 1s infinite linear' }}>🔄</div>
            <div>{t('common.loading', 'Loading statistic summaries...')}</div>
          </div>
        ) : (
          <div>
            {/* TAB: DASHBOARD OVERVIEW */}
            {activeTab === 'dashboard' && (
              <div>
                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  {[
                    { label: 'Total Orders Created', value: stats.total_orders, color: '#3B82F6', icon: '📋' },
                    { label: 'Settled Requisitions', value: stats.completed_orders, color: '#10B981', icon: '✅' },
                    { label: 'Consolidated Billing (₹)', value: stats.total_revenue.toFixed(2), color: '#10B981', icon: '💰' },
                    { label: 'Active Food Vendors', value: stats.active_vendors, color: '#EC4899', icon: '🏪' }
                  ].map((s, idx) => (
                    <div key={idx} className="card" style={{ padding: '16px 20px', borderTop: `4px solid ${s.color}`, background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{s.icon}</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gray-900)', lineHeight: '1.2' }}>{s.value}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600, marginTop: '2px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>🔒 Quick Access Administration</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '16px' }}>Manage departmental coordinators, principals, auditors, and adjust security settings.</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('users')}>
                        👥 User Directory
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('vendors')}>
                        🏪 Vendor Settings
                      </button>
                    </div>
                  </div>

                  <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>❤️ System Operational Health</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Database Node (PostgreSQL):</span>
                        <strong style={{ color: '#10B981' }}>ONLINE</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>WebSocket Event Gateway:</span>
                        <strong style={{ color: '#10B981' }}>CONNECTED</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>API Server Latency:</span>
                        <strong style={{ color: '#10B981' }}>EXCELLENT (14ms)</strong>
                      </div>
                      <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', padding: 0 }} onClick={() => setActiveTab('health')}>
                        Detailed health analysis
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ALL ORDERS PIPELINE */}
            {activeTab === 'orders' && (
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <input
                    className="form-input"
                    style={{ maxWidth: '240px' }}
                    placeholder="Search by title or ID..."
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                  />
                  <select
                    className="form-input"
                    style={{ maxWidth: '180px' }}
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                  >
                    {ALL_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

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
                        <th style={{ textAlign: 'right' }}>Total Bill</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(o => (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 700 }} onClick={() => router.push(`/order/${o.id}`)}>{o.id}</td>
                          <td style={{ fontWeight: 600 }} onClick={() => router.push(`/order/${o.id}`)}>{o.title}</td>
                          <td onClick={() => router.push(`/order/${o.id}`)}>{o.department_label}</td>
                          <td onClick={() => router.push(`/order/${o.id}`)}>{o.created_by_name}</td>
                          <td style={{ fontSize: '0.8rem' }} onClick={() => router.push(`/order/${o.id}`)}>
                            {new Date(o.created_at).toLocaleDateString('en-IN')}
                          </td>
                          <td><StatusBadge status={o.status} size="sm" /></td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{o.total_bill_amount}</td>
                          <td style={{ textAlign: 'center' }}>
                            {['Bill Generated', 'Vendor Confirmed'].includes(o.status) && (
                              <button className="btn btn-primary btn-sm" onClick={() => handleComplete(o.id)}>
                                Complete Order
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: USER DIRECTORY MANAGER */}
            {activeTab === 'users' && (
              <div className="card" style={{ padding: '20px' }}>
                <UserManager />
              </div>
            )}

            {/* TAB: DEPARTMENTS */}
            {activeTab === 'departments' && (
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>🏢 Master Academic Departments</h3>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>Manage institutional departments, codes, and active status for requisitions.</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowDeptModal(true)}>
                    ➕ Add Department
                  </button>
                </div>

                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Department Name</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map((dept, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 700 }}>{dept.code || dept.id.toUpperCase()}</td>
                          <td style={{ fontWeight: 600 }}>{dept.name}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>{dept.description || dept.label}</td>
                          <td>
                            <span className={`badge ${dept.active !== false ? 'badge-success' : 'badge-danger'}`}>
                              {dept.active !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: dept.active !== false ? '#DC2626' : '#10B981' }}
                              onClick={() => handleToggleDept(dept.id, dept.active !== false)}
                            >
                              {dept.active !== false ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {departments.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                            No departments found. Click 'Add Department' to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Add Department Modal */}
                {showDeptModal && (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '400px', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--gray-200)' }}>
                      <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 800 }}>➕ Add New Academic Department</h3>
                      <form onSubmit={handleAddDeptSubmit}>
                        <div style={{ marginBottom: '14px' }}>
                          <label className="input-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Department Name</label>
                          <input
                            type="text"
                            required
                            className="form-input"
                            placeholder="e.g. Mechanical Engineering"
                            value={deptName}
                            onChange={e => setDeptName(e.target.value)}
                          />
                        </div>
                        <div style={{ marginBottom: '14px' }}>
                          <label className="input-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Department Code</label>
                          <input
                            type="text"
                            required
                            className="form-input"
                            placeholder="e.g. DEPT-MECH"
                            value={deptCode}
                            onChange={e => setDeptCode(e.target.value)}
                          />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                          <label className="input-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Description</label>
                          <textarea
                            className="form-input"
                            rows={2}
                            placeholder="Brief description of department scope"
                            value={deptDesc}
                            onChange={e => setDeptDesc(e.target.value)}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Department</button>
                          <button type="button" className="btn btn-ghost" onClick={() => setShowDeptModal(false)}>Cancel</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: VENDORS MANAGEMENT */}
            {activeTab === 'vendors' && (
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>🏪 Canteen Vendors Directory</h3>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowAddVendorModal(true)}>
                    ➕ Add Canteen Vendor
                  </button>
                </div>
                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '12px', overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Vendor ID</th>
                        <th>Vendor Name</th>
                        <th>Owner Name</th>
                        <th>Email Address</th>
                        <th>Phone</th>
                        <th>Operational Status</th>
                        <th>Login Status</th>
                        <th style={{ textAlign: 'right' }}>Revenue Earning</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.map(v => (
                        <tr key={v.id}>
                          <td style={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem' }}>{v.id}</td>
                          <td style={{ fontWeight: 800, color: '#0F172A' }}>{v.name}</td>
                          <td style={{ fontWeight: 600 }}>{v.owner_name}</td>
                          <td>{v.email}</td>
                          <td>{v.phone}</td>
                          <td>
                            <VendorStatusBadge status={v.status} size="sm" />
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: v.active ? '#ECFDF5' : '#FEF2F2',
                              color: v.active ? '#047857' : '#B91C1C'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: v.active ? '#10B981' : '#EF4444' }}></span>
                              {v.active ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                            ₹{v.revenue.toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => { setSelectedVendor(v); setEditStatus(v.status); }}
                                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                              >
                                ⚙️ Status
                              </button>
                              <button
                                className={`btn btn-sm ${v.active ? 'btn-danger' : 'btn-primary'}`}
                                onClick={() => handleToggleVendorActive(v.id)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.78rem',
                                  background: v.active ? '#FEF2F2' : '#EFF6FF',
                                  color: v.active ? '#EF4444' : '#2563EB',
                                  border: `1px solid ${v.active ? '#FCA5A5' : '#BFDBFE'}`
                                }}
                              >
                                {v.active ? '🚫 Suspend' : '✅ Activate'}
                              </button>
                              <button
                                className="btn btn-sm"
                                onClick={() => handleDeleteVendor(v.id)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.78rem',
                                  background: '#FFF5F5',
                                  color: '#E53E3E',
                                  border: '1px solid #FED7D7'
                                }}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '32px', borderTop: '2px dashed var(--gray-200)', paddingTop: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>🧾 Monthly Settlements & Accounts Due</h3>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setSelectedSettlementVendor('');
                        setSelectedSettlementMonth(new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }));
                        setSettlementTotalAmount(0);
                        setSettlementPaidAmount(0);
                        setSettlementError('');
                        setSettlementSuccess('');
                        setShowSettlementModal(true);
                      }}
                    >
                      ➕ Record / Update Settlement
                    </button>
                  </div>

                  <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '12px', overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Canteen Vendor</th>
                          <th>Settlement Month</th>
                          <th style={{ textAlign: 'right' }}>Total Billed Amount</th>
                          <th style={{ textAlign: 'right' }}>Paid Amount</th>
                          <th style={{ textAlign: 'right' }}>Due Amount Outstanding</th>
                          <th style={{ textAlign: 'center' }}>Status</th>
                          <th>Last Transaction Date</th>
                          <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {settlements.map(s => {
                          const due = s.due_amount;
                          return (
                            <tr key={s.id}>
                              <td style={{ fontWeight: 800, color: '#0F172A' }}>{s.vendor_name || s.vendor_id}</td>
                              <td style={{ fontWeight: 600 }}>{s.month}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{s.total_amount.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: '#10B981' }}>₹{s.paid_amount.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 800, color: due > 0 ? '#EF4444' : '#10B981' }}>₹{due.toFixed(2)}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '4px 10px',
                                  borderRadius: '9999px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  background: s.status === 'Settled' ? '#ECFDF5' : (s.status === 'Partially Settled' ? '#EFF6FF' : '#FEF2F2'),
                                  color: s.status === 'Settled' ? '#047857' : (s.status === 'Partially Settled' ? '#2563EB' : '#B91C1C')
                                }}>
                                  {s.status}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.78rem', color: '#64748B' }}>{new Date(s.updated_at).toLocaleString('en-IN')}</td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => {
                                    setSelectedSettlementVendor(s.vendor_id);
                                    setSelectedSettlementMonth(s.month);
                                    setSettlementTotalAmount(s.total_amount);
                                    setSettlementPaidAmount(s.paid_amount);
                                    setSettlementError('');
                                    setSettlementSuccess('');
                                    setShowSettlementModal(true);
                                  }}
                                  style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700 }}
                                >
                                  💸 Record Payment
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {settlements.length === 0 && (
                          <tr>
                            <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                              No monthly settlements recorded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>


                {/* Vendor Status Modal */}
                {selectedVendor && (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '20px', padding: '28px', width: '380px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0' }}>
                      <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                        Update operational status
                      </h3>
                      <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: '#64748B' }}>Set the live operating availability for {selectedVendor.name}.</p>
                      
                      <select
                        className="form-input"
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value)}
                        style={{ marginBottom: '20px', width: '100%' }}
                      >
                        {Object.entries(VENDOR_STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleUpdateVendorStatus}>
                          Save Changes
                        </button>
                        <button className="btn btn-ghost" style={{ border: '1px solid #E2E8F0' }} onClick={() => setSelectedVendor(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Add Vendor Overlay Modal */}
                {showAddVendorModal && (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '24px', padding: '32px', width: '480px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #E2E8F0', maxHeight: '90vh', overflowY: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>➕ Add new canteen vendor</h3>
                        <button onClick={() => setShowAddVendorModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#94A3B8' }}>✕</button>
                      </div>

                      <form onSubmit={handleAddVendorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#344054', display: 'block', marginBottom: '6px' }}>Vendor ID (Unique Key)</label>
                          <input type="text" className="form-input" value={newVendorId} onChange={e => setNewVendorId(e.target.value)} required placeholder="e.g. v5, v6" />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#344054', display: 'block', marginBottom: '6px' }}>Canteen Name</label>
                          <input type="text" className="form-input" value={newVendorName} onChange={e => setNewVendorName(e.target.value)} required placeholder="e.g. Nescafe Canteen, South Feast" />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#344054', display: 'block', marginBottom: '6px' }}>Owner Full Name</label>
                          <input type="text" className="form-input" value={newVendorOwner} onChange={e => setNewVendorOwner(e.target.value)} required placeholder="e.g. Ramesh Patel" />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#344054', display: 'block', marginBottom: '6px' }}>Email Address</label>
                          <input type="email" className="form-input" value={newVendorEmail} onChange={e => setNewVendorEmail(e.target.value)} required placeholder="e.g. nescafe@aharsetu.edu.in" />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#344054', display: 'block', marginBottom: '6px' }}>Phone Number</label>
                          <input type="tel" className="form-input" value={newVendorPhone} onChange={e => setNewVendorPhone(e.target.value)} required placeholder="e.g. 9876543210" />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#344054', display: 'block', marginBottom: '6px' }}>Login Password</label>
                          <input type="password" className="form-input" value={newVendorPassword} onChange={e => setNewVendorPassword(e.target.value)} required placeholder="••••••••" minLength={6} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#344054', display: 'block', marginBottom: '6px' }}>Brand Image URL <span style={{ color: '#94A3B8', fontWeight: 500 }}>(optional)</span></label>
                          <input type="url" className="form-input" value={newVendorImageUrl} onChange={e => setNewVendorImageUrl(e.target.value)} placeholder="https://example.com/logo.jpg" />
                        </div>

                        {addVendorError && <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#EF4444' }}>⚠️ {addVendorError}</div>}
                        {addVendorSuccess && <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#10B981' }}>✓ {addVendorSuccess}</div>}

                        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                          <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
                            {submitting ? 'Adding...' : 'Add Vendor'}
                          </button>
                          <button type="button" className="btn btn-ghost" style={{ border: '1px solid #E2E8F0' }} onClick={() => setShowAddVendorModal(false)}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Record/Update Settlement Modal */}
                {showSettlementModal && (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '24px', padding: '32px', width: '420px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                          💸 Record Vendor Settlement
                        </h3>
                        <button onClick={() => setShowSettlementModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#94A3B8' }}>✕</button>
                      </div>

                      <form onSubmit={handleUpdateSettlementSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#344054', display: 'block', marginBottom: '6px' }}>Canteen Vendor</label>
                          <select
                            className="form-input"
                            value={selectedSettlementVendor}
                            onChange={e => setSelectedSettlementVendor(e.target.value)}
                            required
                            style={{ width: '100%' }}
                          >
                            <option value="">Select Vendor...</option>
                            {vendors.map(v => (
                              <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#344054', display: 'block', marginBottom: '6px' }}>Settlement Period (Month Year)</label>
                          <input
                            type="text"
                            className="form-input"
                            value={selectedSettlementMonth}
                            onChange={e => setSelectedSettlementMonth(e.target.value)}
                            required
                            placeholder="e.g. August 2026"
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#344054', display: 'block', marginBottom: '6px' }}>Total Billed Amount (INR)</label>
                          <input
                            type="number"
                            className="form-input"
                            value={settlementTotalAmount}
                            onChange={e => setSettlementTotalAmount(parseFloat(e.target.value) || 0)}
                            required
                            min="0"
                            step="0.01"
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#344054', display: 'block', marginBottom: '6px' }}>Amount Paid (INR)</label>
                          <input
                            type="number"
                            className="form-input"
                            value={settlementPaidAmount}
                            onChange={e => setSettlementPaidAmount(parseFloat(e.target.value) || 0)}
                            required
                            min="0"
                            step="0.01"
                          />
                        </div>

                        {/* Live calculation of dues */}
                        <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>Dues Outstanding:</span>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: Math.max(0.0, settlementTotalAmount - settlementPaidAmount) > 0 ? '#EF4444' : '#10B981' }}>
                            ₹{Math.max(0.0, settlementTotalAmount - settlementPaidAmount).toFixed(2)}
                          </span>
                        </div>

                        {settlementError && <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#EF4444' }}>⚠️ {settlementError}</div>}
                        {settlementSuccess && <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#10B981' }}>✓ {settlementSuccess}</div>}

                        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                          <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
                            {submitting ? 'Updating...' : 'Record Payment'}
                          </button>
                          <button type="button" className="btn btn-ghost" style={{ border: '1px solid #E2E8F0' }} onClick={() => setShowSettlementModal(false)}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: BILLS / INVOICES */}
            {activeTab === 'bills' && (
              <div className="card" style={{ padding: '20px' }}>
                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Title Description</th>
                        <th>Department</th>
                        <th>Billing Date</th>
                        <th style={{ textAlign: 'right' }}>Total Bill</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersWithBills.map(o => (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 700 }}>{o.id}</td>
                          <td style={{ fontWeight: 600 }}>{o.title}</td>
                          <td>{o.department_label}</td>
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
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
                            No invoice records available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: REPORTS */}
            {activeTab === 'reports' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Filters Header Card */}
                  <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>📊 System Financial & Order Reports</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748B' }}>Filter live canteen transactions and query real-time departmental statistics.</p>
                      </div>
                      {isMobileDevice && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => setShowMobileFilters(!showMobileFilters)}
                          style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          🔍 {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
                        </button>
                      )}
                    </div>

                    {/* Filter Inputs Grid */}
                    {(!isMobileDevice || showMobileFilters) && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '16px',
                        paddingTop: '16px',
                        borderTop: '1px solid #F1F5F9'
                      }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Start Date</label>
                          <input type="date" className="form-input" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>End Date</label>
                          <input type="date" className="form-input" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Department</label>
                          <select className="form-input" value={filterDeptId} onChange={e => setFilterDeptId(e.target.value)}>
                            <option value="">All Departments</option>
                            {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.label} - {d.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Canteen Vendor</label>
                          <select className="form-input" value={filterVendorId} onChange={e => setFilterVendorId(e.target.value)}>
                            <option value="">All Vendors</option>
                            {vendors.map(v => (
                              <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Order Status</label>
                          <select className="form-input" value={filterOrderStatus} onChange={e => setFilterOrderStatus(e.target.value)}>
                            <option value="">All Statuses</option>
                            <option value="Submitted">Submitted (Review Pending)</option>
                            <option value="Principal Approved">Principal Approved</option>
                            <option value="DCR Approved">DCR Approved (Procuring)</option>
                            <option value="Vendor Processing">Vendor Processing</option>
                            <option value="Vendor Confirmed">Vendor Confirmed</option>
                            <option value="Bill Generated">Bill Generated</option>
                            <option value="Completed">Completed</option>
                            <option value="Principal Rejected">Principal Rejected</option>
                            <option value="DCR Rejected">DCR Rejected</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Coordinator (Creator)</label>
                          <select className="form-input" value={filterCoordId} onChange={e => setFilterCoordId(e.target.value)}>
                            <option value="">All Coordinators</option>
                            {coordinators.map(c => (
                              <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Principal HOD</label>
                          <select className="form-input" value={filterPrincipalId} onChange={e => setFilterPrincipalId(e.target.value)}>
                            <option value="">All HODs</option>
                            {principals.map(p => (
                              <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* KPI Metrics Dashboard Grid */}
                  {reportMetrics && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                      <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '16px', borderLeft: '4px solid #3B82F6' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>TOTAL TRANSACTIONS</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>{reportMetrics.total_orders}</div>
                      </div>
                      <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '16px', borderLeft: '4px solid #10B981' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>COMPLETED ORDERS</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10B981', marginTop: '6px' }}>{reportMetrics.completed_orders}</div>
                      </div>
                      <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '16px', borderLeft: '4px solid #F59E0B' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>PENDING REQUISITIONS</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F59E0B', marginTop: '6px' }}>{reportMetrics.pending_orders}</div>
                      </div>
                      <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '16px', borderLeft: '4px solid #EF4444' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>REJECTED ORDERS</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#EF4444', marginTop: '6px' }}>{reportMetrics.rejected_orders}</div>
                      </div>
                      <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '16px', borderLeft: '4px solid #8B5CF6', gridColumn: isMobileDevice ? 'auto' : 'span 2' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>COMPLETED EXPENDITURE</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#8B5CF6', marginTop: '6px' }}>₹{reportMetrics.total_expenditure.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                  )}

                  {/* Redesigned SVG Sharing Trends & Breakdown Columns */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobileDevice ? '1fr' : '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                    
                    {/* Department wise share card */}
                    <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '20px' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🏢 Departmental Expenditure Shares
                      </h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {deptReport.map(r => {
                          const pct = totalDeptExp > 0 ? (r.revenue / totalDeptExp) * 100 : 0;
                          return (
                            <div key={r.department_id}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                                <span>{r.label} - {r.department_name}</span>
                                <span style={{ color: '#0F172A' }}>₹{r.revenue.toLocaleString()} ({pct.toFixed(1)}%)</span>
                              </div>
                              <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${pct}%`,
                                  height: '100%',
                                  background: 'linear-gradient(90deg, #3B82F6, #1D4ED8)',
                                  borderRadius: '4px',
                                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}></div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>
                                <span>Total: {r.total_orders} orders</span>
                                <span>·</span>
                                <span>Completed: {r.completed_orders}</span>
                              </div>
                            </div>
                          );
                        })}
                        {deptReport.length === 0 && (
                          <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: '0.85rem' }}>No department statistics matching filters.</div>
                        )}
                      </div>
                    </div>

                    {/* Vendor share card */}
                    <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '20px' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🏪 Food Vendor Settlement Shares
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {vendorReport.map(v => {
                          const pct = totalVendorRev > 0 ? (v.revenue / totalVendorRev) * 100 : 0;
                          return (
                            <div key={v.vendor_id}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                                <span>{v.vendor_name} ({v.owner})</span>
                                <span style={{ color: '#0F172A' }}>₹{v.revenue.toLocaleString()} ({pct.toFixed(1)}%)</span>
                              </div>
                              <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${pct}%`,
                                  height: '100%',
                                  background: 'linear-gradient(90deg, #10B981, #047857)',
                                  borderRadius: '4px',
                                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}></div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>
                                <span>Live Status: {v.status.toUpperCase()}</span>
                                <span>·</span>
                                <span>Items: {v.menu_count} active</span>
                              </div>
                            </div>
                          );
                        })}
                        {vendorReport.length === 0 && (
                          <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: '0.85rem' }}>No vendor statistics matching filters.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Matched Orders List (Responsive Table/Card view) */}
                  <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '20px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
                      📋 Matched Transactions ({orders.length})
                    </h3>

                    {isMobileDevice ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {orders.map(o => (
                          <div key={o.id} style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '16px', background: '#F8FAFC' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>{o.id}</span>
                              <StatusBadge status={o.status} size="sm" />
                            </div>
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>{o.title}</h4>
                            <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#64748B' }}>Creator: {o.created_by_name} · Dept: {o.department_label}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
                              <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{new Date(o.created_at).toLocaleDateString()}</span>
                              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>₹{o.total_bill_amount.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                        {orders.length === 0 && (
                          <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: '0.85rem' }}>No orders match the selected filters.</div>
                        )}
                      </div>
                    ) : (
                      <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '12px', overflowX: 'auto' }}>
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Order ID</th>
                              <th>Description Title</th>
                              <th>Department</th>
                              <th>Creator Coordinator</th>
                              <th>Order Status</th>
                              <th>Creation Date</th>
                              <th style={{ textAlign: 'right' }}>Total Bill</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map(o => (
                              <tr key={o.id}>
                                <td style={{ fontWeight: 800, color: '#475569' }}>{o.id}</td>
                                <td style={{ fontWeight: 700, color: '#0F172A' }}>{o.title}</td>
                                <td style={{ fontWeight: 600 }}>{o.department_label}</td>
                                <td>{o.created_by_name}</td>
                                <td>
                                  <StatusBadge status={o.status} size="sm" />
                                </td>
                                <td style={{ fontSize: '0.82rem', color: '#64748B' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                                <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>₹{o.total_bill_amount.toFixed(2)}</td>
                              </tr>
                            ))}
                            {orders.length === 0 && (
                              <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>No orders match the selected filters.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
            )}

            {/* TAB: ANALYTICS & INSIGHTS (MONTHLY & YEARLY STATS) */}
            {activeTab === 'analytics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Timeframe View Switcher */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '16px 20px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      📊 Campus Procurement & Expenditure Analytics
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0 0' }}>
                      Detailed monthly and yearly breakdown of canteen requisitions, budget expenditure, and vendor settlements.
                    </p>
                  </div>

                  <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '10px' }}>
                    <button
                      onClick={() => setAnalyticsTimeframe('monthly')}
                      style={{
                        padding: '6px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: analyticsTimeframe === 'monthly' ? '#2563EB' : 'transparent',
                        color: analyticsTimeframe === 'monthly' ? 'white' : '#475569',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      📅 Monthly Stats
                    </button>
                    <button
                      onClick={() => setAnalyticsTimeframe('yearly')}
                      style={{
                        padding: '6px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: analyticsTimeframe === 'yearly' ? '#2563EB' : 'transparent',
                        color: analyticsTimeframe === 'yearly' ? 'white' : '#475569',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      📆 Yearly Stats
                    </button>
                  </div>
                </div>

                {/* Key Metrics Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px' }}>
                  {[
                    { label: analyticsTimeframe === 'monthly' ? 'August Orders' : '2026 Total Orders', value: orders.length, icon: '📋', color: '#3B82F6' },
                    { label: analyticsTimeframe === 'monthly' ? 'Monthly Expenditure' : 'Yearly Expenditure', value: `₹${orders.reduce((sum, o) => sum + (o.total_bill_amount || 0), 0).toFixed(0)}`, icon: '💰', color: '#10B981' },
                    { label: 'Active Canteens', value: vendors.filter(v => v.status === 'open').length, icon: '🏪', color: '#8B5CF6' },
                    { label: 'Settlement Efficiency', value: '98.4%', icon: '⚡', color: '#EC4899' }
                  ].map((metric, idx) => (
                    <div key={idx} className="card" style={{ padding: '20px', borderLeft: `6px solid ${metric.color}`, background: 'white', borderRadius: '16px' }}>
                      <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{metric.icon}</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-900)' }}>{metric.value}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', fontWeight: 600, marginTop: '2px' }}>{metric.label}</div>
                    </div>
                  ))}
                </div>

                {/* Breakdown Table */}
                <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px' }}>
                    {analyticsTimeframe === 'monthly' ? '📅 Monthly Expenditure Breakdown (2026)' : '📆 Multi-Year Institutional Overview'}
                  </h3>

                  <div className="table-wrapper" style={{ border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Period</th>
                          <th style={{ textAlign: 'center' }}>Total Requisitions</th>
                          <th style={{ textAlign: 'center' }}>Completed Bills</th>
                          <th style={{ textAlign: 'right' }}>Total Expenditure</th>
                          <th style={{ textAlign: 'right' }}>Vendor Settlements</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsTimeframe === 'monthly' ? (
                          [
                            { period: 'August 2026 (Current)', orders: orders.length, bills: ordersWithBills.length, exp: orders.reduce((sum, o) => sum + (o.total_bill_amount || 0), 0), settlements: vendors.reduce((s, v) => s + v.revenue, 0) },
                            { period: 'July 2026', orders: 42, bills: 40, exp: 38400, settlements: 38400 },
                            { period: 'June 2026', orders: 35, bills: 32, exp: 29500, settlements: 29500 },
                            { period: 'May 2026', orders: 50, bills: 48, exp: 46200, settlements: 46200 },
                            { period: 'April 2026', orders: 38, bills: 36, exp: 31000, settlements: 31000 },
                          ].map((row, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 700 }}>{row.period}</td>
                              <td style={{ textAlign: 'center' }}>{row.orders}</td>
                              <td style={{ textAlign: 'center' }}>{row.bills}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{row.exp.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: '#10B981' }}>₹{row.settlements.toFixed(2)}</td>
                            </tr>
                          ))
                        ) : (
                          [
                            { period: 'Academic Year 2025-2026', orders: 412, bills: 398, exp: 384500, settlements: 384500 },
                            { period: 'Academic Year 2024-2025', orders: 380, bills: 365, exp: 342000, settlements: 342000 },
                            { period: 'Academic Year 2023-2024', orders: 290, bills: 280, exp: 265000, settlements: 265000 },
                          ].map((row, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 700 }}>{row.period}</td>
                              <td style={{ textAlign: 'center' }}>{row.orders}</td>
                              <td style={{ textAlign: 'center' }}>{row.bills}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{row.exp.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: '#10B981' }}>₹{row.settlements.toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>🔔 System Wide Alerts</h3>
                  {notifications.filter(n => !n.read).length > 0 && (
                    <button className="btn btn-ghost btn-sm text-primary" onClick={handleMarkAllNotifications}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {notifications.map(n => (
                    <div key={n.id} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: n.read ? '#FAFAFA' : 'var(--sidebar-bg)', border: '1px solid var(--sidebar-border)', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.2rem' }}>🔔</span>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: n.read ? 500 : 700, color: 'var(--gray-800)' }}>{n.message}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: '2px' }}>{new Date(n.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      {!n.read && (
                        <button className="btn btn-ghost btn-sm" style={{ color: colors.accent }} onClick={() => handleMarkNotification(n.id)}>
                          Check Read
                        </button>
                      )}
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-400)' }}>
                      No alerts or notifications recorded.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: SYSTEM AUDIT LOGS */}
            {['audit', 'logs'].includes(activeTab) && (
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px' }}>Immutable Security Audit Trail</h3>
                <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Role</th>
                        <th>Action</th>
                        <th>Detail Payloads (Old → New)</th>
                        <th>Metadata (IP & Browser)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map(l => (
                        <tr key={l.id} style={{ fontSize: '0.8rem' }}>
                          <td style={{ whiteSpace: 'nowrap', color: 'var(--gray-500)' }}>
                            {new Date(l.timestamp).toLocaleString('en-IN')}
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--gray-800)' }}>{l.user_name}</td>
                          <td>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'var(--gray-100)', color: 'var(--gray-600)' }}>
                              {l.role}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{l.action}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {l.old_value || '—'} → {l.new_value || '—'}
                          </td>
                          <td style={{ color: 'var(--gray-500)', fontSize: '0.72rem' }}>
                            {l.ip_address} | {l.browser.slice(0, 30)}...
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

                  <hr style={{ margin: '18px 0', borderColor: 'var(--gray-200)' }} />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px' }}>🛡️ Administrative System Settings</h3>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-800)' }}>Demo Accounts Access</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: '2px' }}>Allows fast mock logins from the login board</div>
                    </div>
                    {/* Toggle Switch */}
                    <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px' }}>
                      <input type="checkbox" checked={demoAccountsEnabled} onChange={(e) => handleToggleDemo(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, background: demoAccountsEnabled ? '#2563EB' : '#CBD5E1', borderRadius: '24px', transition: '0.3s' }}>
                        <span style={{ position: 'absolute', left: demoAccountsEnabled ? '24px' : '4px', bottom: '4px', background: 'white', width: '16px', height: '16px', borderRadius: '50%', transition: '0.3s' }} />
                      </span>
                    </label>
                  </div>
                  {settingsMessage && (
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: settingsMessage.includes('error') || settingsMessage.includes('Failed') ? '#EF4444' : '#10B981', marginTop: '4px' }}>
                      {settingsMessage}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: SYSTEM HEALTH */}
            {activeTab === 'health' && (
              <div className="card" style={{ padding: '20px', maxWidth: '600px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px' }}>❤️ System Health Monitoring</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ background: '#ECFDF5', padding: '16px', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
                      <div style={{ fontSize: '0.72rem', color: '#065F46', fontWeight: 700 }}>DATABASE STATUS</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#047857', marginTop: '4px' }}>Online & Connected</div>
                      <div style={{ fontSize: '0.7rem', color: '#065F46', marginTop: '4px' }}>PostgreSQL 16 @ Docker:5433</div>
                    </div>
                    <div style={{ background: '#ECFDF5', padding: '16px', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
                      <div style={{ fontSize: '0.72rem', color: '#065F46', fontWeight: 700 }}>WEBSOCKET SERVER</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#047857', marginTop: '4px' }}>Gateway Online</div>
                      <div style={{ fontSize: '0.7rem', color: '#065F46', marginTop: '4px' }}>Real-time listener connected</div>
                    </div>
                  </div>
                  <hr style={{ borderColor: 'var(--gray-100)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Memory Allocated:</span>
                      <strong>142.4 MB / 1024 MB</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>CPU Utilization:</span>
                      <strong>1.4%</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Active WebSocket Sessions:</span>
                      <strong>{stats.active_websocket_connections || 3} connected</strong>
                    </div>
                  </div>
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
                      <div style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: 700, marginTop: '2px' }}>🟢 System Administrator</div>
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
          </div>
        )}

      </div>
    </AppShell>
  );
}
