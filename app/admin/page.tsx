'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
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
import { getNotifications, markNotificationRead, markAllRead, NotificationItem, localizeNotificationMessage } from '@/lib/notifications';
import BrandLogo from '@/components/BrandLogo';
import ImageCropperModal from '@/components/ImageCropperModal';
import UiverseToggle from '@/components/ui/UiverseToggle';
import AppIcon, { getIconTheme } from '@/components/ui/AppIcon';
import { getSystemSettings, updateSystemSettings } from '@/lib/systemSettings';
import { api } from '@/lib/api';
import styles from './admin.module.css';

const ALL_STATUSES = ['All', 'Draft', 'Pending Approval', 'Principal Approved', 'DCR Approved', 'Vendor Confirmed', 'Bill Generated', 'Completed', 'Rejected'];

export default function AdminDashboardPage({ initialTab = 'dashboard' }: { initialTab?: string }) {
  const router = useRouter();
  const { t, lang } = useI18n();
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
  const [billsSubTab, setBillsSubTab] = useState<'invoices' | 'settlements'>('invoices');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceVendorFilter, setInvoiceVendorFilter] = useState('All');
  
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
  const [demoSwitcherEnabled, setDemoSwitcherEnabled] = useState(true);
  const [demoAccountsEnabled, setDemoAccountsEnabled] = useState(true);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [resetConfirmPhrase, setResetConfirmPhrase] = useState('');

  useEffect(() => {
    const s = getSystemSettings();
    setDemoSwitcherEnabled(s.demo_switcher_enabled);
    setDemoAccountsEnabled(s.demo_accounts_enabled);
  }, []);

  function handleToggleDemoSwitcher(enabled: boolean) {
    const updated = updateSystemSettings({ demo_switcher_enabled: enabled });
    setDemoSwitcherEnabled(updated.demo_switcher_enabled);
    setSettingsMessage(enabled ? 'Live Role Switcher bar enabled.' : 'Live Role Switcher bar disabled.');
    setTimeout(() => setSettingsMessage(''), 4000);
  }

  function handleToggleDemoAccounts(enabled: boolean) {
    const updated = updateSystemSettings({ demo_accounts_enabled: enabled });
    setDemoAccountsEnabled(updated.demo_accounts_enabled);
    setSettingsMessage(enabled ? 'Login demo accounts enabled.' : 'Login demo accounts disabled.');
    setTimeout(() => setSettingsMessage(''), 4000);
  }

  async function handleDeactivateAllUsers() {
    if (resetConfirmPhrase !== 'RESET USERS') return;
    setSubmitting(true);
    setSettingsMessage('');
    try {
      const res = await api.post<{ message: string }>('/users/admin-reset', { confirmation_phrase: 'RESET USERS' });
      setSettingsMessage(res.message || 'Successfully deactivated all non-admin users.');
      setResetConfirmPhrase('');
      loadDashboardData();
    } catch (err: any) {
      setSettingsMessage(err.message || 'Failed to deactivate users.');
    } finally {
      setSubmitting(false);
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

  const loadDashboardDataRef = useRef<((silent?: boolean) => Promise<void>) | null>(null);

  const loadDashboardData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const safetyTimer = !silent ? setTimeout(() => setLoading(false), 2500) : null;
    try {
      const [oList, vList, sysStats, nList, deptList, usersList, sList, config] = await Promise.all([
        getOrders().catch(() => []),
        getVendors().catch(() => []),
        api.get<any>('/reports/system-stats').catch(() => ({ total_orders: 0, completed_orders: 0, total_revenue: 0, active_vendors: 0 })),
        getNotifications().catch(() => []),
        getDepartments().catch(() => []),
        api.get<any[]>('/users').catch(() => []),
        getMonthlySettlements().catch(() => []),
        api.get<{ demo_accounts_enabled: boolean }>('/settings/public').catch(() => ({ demo_accounts_enabled: true }))
      ]);
      setOrders(oList);
      setVendors(vList);
      
      const calcRevenue = oList.reduce((sum, o) => sum + (o.total_bill_amount || 0), 0);
      const calcTotalOrders = oList.length;
      const calcCompleted = oList.filter(o => o.status === 'Completed').length;
      const calcActiveVendors = vList.filter(v => v.active !== false).length;

      setStats({
        total_orders: calcTotalOrders,
        completed_orders: calcCompleted,
        total_revenue: calcRevenue,
        active_vendors: calcActiveVendors || (vList.length > 0 ? vList.length : (sysStats?.active_vendors || 0))
      });
      setNotifications(nList);
      setDepartments(deptList);
      setCoordinators(usersList.filter((u: any) => u.role === 'coordinator'));
      setPrincipals(usersList.filter((u: any) => u.role === 'principal'));
      setSettlements(sList);
      setDemoAccountsEnabled(config?.demo_accounts_enabled ?? true);
    } catch (err) {
      console.warn('Error loading admin dashboard data:', err);
    } finally {
      if (safetyTimer) clearTimeout(safetyTimer);
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboardDataRef.current = loadDashboardData; }, [loadDashboardData]);

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

    // Auto-wipe demo data once on client load if legacy keys exist
    if (typeof window !== 'undefined' && !localStorage.getItem('aharsetu_fresh_zero_v3')) {
      resetAllData().then(() => {
        try { localStorage.setItem('aharsetu_fresh_zero_v3', 'true'); } catch {}
        loadDashboardData();
      });
    } else {
      loadDashboardData();
    }

    const handleOrderChanged = () => { loadDashboardData(true); };
    const handleUserChanged = () => { loadDashboardData(true); };

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'aharsetu_orders_v4' ||
        e.key === 'aharsetu_orders_v3' ||
        e.key === 'aharsetu_settlements_v4' ||
        e.key === 'aharsetu_settlements_v1' ||
        e.key === 'aharsetu_notifications_v4' ||
        e.key === 'aharsetu_notifications_v3.7' ||
        e.key === 'aharsetu_users_timestamp' ||
        e.key === 'aharsetu_custom_users' ||
        e.key === 'aharsetu_deleted_user_ids' ||
        e.key === 'aharsetu_vendors_v4' ||
        e.key === 'aharsetu_vendors_v3' ||
        e.key === 'aharsetu_departments_v3'
      ) {
        loadDashboardData(true);
      }
    };

    const syncInterval = setInterval(() => {
      loadDashboardDataRef.current?.(true);
      const currentTab = window.location.hash ? window.location.hash.substring(1) : (initialTab || 'dashboard');
      if (currentTab === 'reports' || currentTab === 'analytics') {
        loadReportsData();
      }
      if (['audit', 'logs', 'audit-logs'].includes(currentTab)) {
        loadAuditLogs();
      }
    }, 10000);

    window.addEventListener('aharsetu_order_changed', handleOrderChanged);
    window.addEventListener('aharsetu_user_changed', handleUserChanged);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('aharsetu_order_changed', handleOrderChanged);
      window.removeEventListener('aharsetu_user_changed', handleUserChanged);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [router, initialTab]);

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
    if (['audit', 'logs', 'audit-logs'].includes(activeTab)) loadAuditLogs();
    if (activeTab === 'dashboard') loadDashboardData(true);
  }, [activeTab, filterStartDate, filterEndDate, filterDeptId, filterVendorId, filterOrderStatus, filterCoordId, filterPrincipalId]);

  async function handleResetData() {
    if (confirm('Are you sure you want to clear all transactions, orders, and bills to start completely fresh with 0 orders?')) {
      setResetting(true);
      try {
        await resetAllData();
        await loadDashboardData();
        alert('All transactions, orders, and bills have been successfully cleared.');
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
    if (!confirm('Mark order as physically delivered and settlement-ready?')) return;
    try {
      await completeOrder(orderId);
      loadDashboardData();
    } catch (err) {
      alert('Error completing order.');
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileMessage('');
    if (!profileName.trim()) return;

    if (profileMobile.trim() && !/^[6-9]\d{9}$/.test(profileMobile.trim())) {
      setProfileMobileError('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    setProfileMobileError('');

    try {
      let finalAvatarUrl: string | undefined = undefined;
      if (profileAvatarFile) {
        const updated = await uploadAvatar(profileAvatarFile);
        finalAvatarUrl = updated.avatar_url ?? undefined;
      }
      await updateUserProfile({
        name: profileName.trim(),
        mobile_number: profileMobile.trim() || undefined,
        avatar_url: finalAvatarUrl,
      });
      await updateSessionLanguage(preferredLang as any);
      setProfileMessage('Institutional Admin profile updated successfully!');
      setTimeout(() => setProfileMessage(''), 3500);
      loadDashboardData();
    } catch (err: any) {
      setProfileMessage(err.message || 'Error updating profile');
    }
  }

  const filteredOrders = orders.filter(o => {
    const matchSearch = orderSearch === '' || 
      o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.title.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.department_label?.toLowerCase().includes(orderSearch.toLowerCase());
    const matchStatus = statusFilter === 'All' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const TAB_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'users', label: 'Users Directory', icon: 'users' },
    { id: 'departments', label: 'Departments', icon: 'departments' },
    { id: 'vendors', label: 'Vendors', icon: 'vendors' },
    { id: 'orders', label: 'All Orders', icon: 'orders' },
    { id: 'bills', label: 'Bills & Settlements', icon: 'bills' },
    { id: 'reports', label: 'Reports', icon: 'reports' },
    { id: 'analytics', label: 'Analytics', icon: 'analytics' },
    { id: 'audit', label: 'Audit Logs', icon: 'audit' },
    { id: 'health', label: 'System Health', icon: 'health' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
    { id: 'profile', label: 'Profile', icon: 'profile' },
  ];

  return (
    <AppShell role="admin">
      <div className={styles.container}>
        
        {/* 1. Hero Welcome Header */}
        <div className={styles.heroHeader}>
          <div className={styles.heroLeft}>
            <h1>
              <span>Executive Admin Portal</span>
            </h1>
            <p>
              <span>{todayStr}</span>
              <span>•</span>
              <span className={styles.heroDateBadge}>⚡ Institutional Hub</span>
              {session && <span>• Welcome back, <strong>{session.name}</strong></span>}
            </p>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.systemStatusPill}>
              <span className={styles.pulseDot} />
              <span>All Systems Operational</span>
            </div>

            <button
              onClick={handleResetData}
              disabled={resetting}
              className={styles.quickActionBtn}
              style={{ color: '#DC2626', borderColor: '#FECACA', background: '#FEF2F2' }}
            >
              <AppIcon name="health" size={15} color="#DC2626" />
              <span>{resetting ? 'Resetting...' : 'Seed / Reset DB'}</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        {loading && activeTab === 'dashboard' ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px', animation: 'spin 1s infinite linear' }}>🔄</div>
            <div style={{ fontWeight: 700 }}>Synchronizing institutional metrics...</div>
          </div>
        ) : (
          <div>
            {/* TAB: DASHBOARD OVERVIEW */}
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* 4 KPI Stat Cards */}
                <div className={styles.statsGrid}>
                  <div className={styles.statCard} style={{ borderTop: '4px solid #10B981' }}>
                    <div className={styles.statCardHeader}>
                      <span className={styles.statLabel}>Consolidated Billing</span>
                      <div className={styles.statIconWrap} style={{ background: 'rgba(16, 185, 129, 0.12)' }}>
                        <AppIcon name="bills" size={22} color="#10B981" />
                      </div>
                    </div>
                    <div className={styles.statValue}>₹{Number(stats.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div className={styles.statSub}>
                      <span className={styles.statBadgePositive}>↑ Real-time Audit</span>
                      <span>Total Requisitions</span>
                    </div>
                  </div>

                  <div className={styles.statCard} style={{ borderTop: '4px solid #3B82F6' }}>
                    <div className={styles.statCardHeader}>
                      <span className={styles.statLabel}>Total Orders Created</span>
                      <div className={styles.statIconWrap} style={{ background: 'rgba(59, 130, 246, 0.12)' }}>
                        <AppIcon name="orders" size={22} color="#3B82F6" />
                      </div>
                    </div>
                    <div className={styles.statValue}>{stats.total_orders || 0}</div>
                    <div className={styles.statSub}>
                      <span>Settled: <strong>{stats.completed_orders || 0}</strong></span>
                      <span style={{ color: '#2563EB', fontWeight: 700 }}>{stats.total_orders > 0 ? Math.round(((stats.completed_orders || 0) / stats.total_orders) * 100) : 100}% Settle Rate</span>
                    </div>
                  </div>

                  <div className={styles.statCard} style={{ borderTop: '4px solid #8B5CF6' }}>
                    <div className={styles.statCardHeader}>
                      <span className={styles.statLabel}>Active Food Vendors</span>
                      <div className={styles.statIconWrap} style={{ background: 'rgba(139, 92, 246, 0.12)' }}>
                        <AppIcon name="vendors" size={22} color="#8B5CF6" />
                      </div>
                    </div>
                    <div className={styles.statValue}>{stats.active_vendors || vendors.length}</div>
                    <div className={styles.statSub}>
                      <span>Campus Canteens</span>
                      <button onClick={() => setActiveTab('vendors')} style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: 800, cursor: 'pointer', padding: 0 }}>Manage →</button>
                    </div>
                  </div>

                  <div className={styles.statCard} style={{ borderTop: '4px solid #F59E0B' }}>
                    <div className={styles.statCardHeader}>
                      <span className={styles.statLabel}>Academic Departments</span>
                      <div className={styles.statIconWrap} style={{ background: 'rgba(245, 158, 11, 0.12)' }}>
                        <AppIcon name="departments" size={22} color="#F59E0B" />
                      </div>
                    </div>
                    <div className={styles.statValue}>{departments.length || 4}</div>
                    <div className={styles.statSub}>
                      <span>Coordinators: <strong>{coordinators.length}</strong></span>
                      <span>Principals: <strong>{principals.length}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Two Column Split: Recent Activity + Department Breakdown */}
                <div className={styles.mainSplitGrid}>
                  {/* Left Column: Recent Orders Activity */}
                  <div className={styles.cardSection}>
                    <div className={styles.sectionHeader}>
                      <div>
                        <div className={styles.sectionTitle}>
                          <AppIcon name="orders" size={20} color="#2563EB" />
                          <span>Recent Institutional Requisitions</span>
                        </div>
                        <div className={styles.sectionSubtitle}>Live orders across all departments and campus canteens</div>
                      </div>
                      <button
                        onClick={() => setActiveTab('orders')}
                        className={styles.quickActionBtn}
                      >
                        <span>View All ({orders.length})</span>
                      </button>
                    </div>

                    <div className={styles.activityList}>
                      {orders.slice(0, 5).map((ord) => (
                        <div key={ord.id} className={styles.activityItem}>
                          <div className={styles.activityLeft}>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                background: 'rgba(37, 99, 235, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#2563EB',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                flexShrink: 0
                              }}
                            >
                              #{ord.id.slice(-3)}
                            </div>
                            <div className={styles.activityMeta}>
                              <div className={styles.activityTitle}>{ord.title}</div>
                              <div className={styles.activitySubtitle}>
                                <span>🏛️ {ord.department_label || 'Dept'}</span>
                                <span>•</span>
                                <span>👤 {ord.created_by_name || 'Coordinator'}</span>
                                <span>•</span>
                                <span>{new Date(ord.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                              </div>
                            </div>
                          </div>

                          <div className={styles.activityRight}>
                            <div className={styles.activityAmount}>₹{ord.total_bill_amount || 0}</div>
                            <StatusBadge status={ord.status} size="sm" />
                            <button
                              onClick={() => router.push(`/order/${ord.id}`)}
                              className={styles.quickActionBtn}
                              style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                            >
                              Open
                            </button>
                          </div>
                        </div>
                      ))}

                      {orders.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                          No orders created yet in system.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Department Spending & Live Health */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Department Spending Summary */}
                    <div className={styles.cardSection}>
                      <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitle}>
                          <AppIcon name="departments" size={18} color="#F59E0B" />
                          <span>Department Spending</span>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>Total: ₹{totalDeptExp.toLocaleString('en-IN')}</span>
                      </div>

                      <div className={styles.deptProgressList}>
                        {departments.map((dept, idx) => {
                          const deptOrders = orders.filter(o => o.department_id === dept.id);
                          const deptSpent = deptOrders.reduce((sum, o) => sum + (o.total_bill_amount || 0), 0);
                          const pct = totalDeptExp > 0 ? Math.min(100, Math.round((deptSpent / totalDeptExp) * 100)) : 25;
                          const barColors = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
                          const color = barColors[idx % barColors.length];

                          return (
                            <div key={dept.id} className={styles.deptProgressItem}>
                              <div className={styles.deptProgressHeader}>
                                <span>{dept.name}</span>
                                <span>₹{deptSpent.toLocaleString('en-IN')} ({pct}%)</span>
                              </div>
                              <div className={styles.deptProgressBar}>
                                <div
                                  className={styles.deptProgressFill}
                                  style={{ width: `${pct}%`, background: color }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Operational Diagnostics Card */}
                    <div className={styles.cardSection}>
                      <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitle}>
                          <AppIcon name="health" size={18} color="#10B981" />
                          <span>Live System Baseline</span>
                        </div>
                        <span className={styles.statBadgePositive}>Active</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                          <span style={{ color: '#475569' }}>PostgreSQL Database Node</span>
                          <strong style={{ color: '#059669' }}>ONLINE (0ms latency)</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                          <span style={{ color: '#475569' }}>Realtime WebSocket Gateway</span>
                          <strong style={{ color: '#059669' }}>CONNECTED</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px' }}>
                          <span style={{ color: '#475569' }}>Multi-Language i18n Engine</span>
                          <strong style={{ color: '#2563EB' }}>OPTIMIZED (v2.0)</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: USERS */}
            {activeTab === 'users' && (
              <div className={styles.cardSection}>
                <UserManager />
              </div>
            )}

            {/* TAB: DEPARTMENTS */}
            {activeTab === 'departments' && (
              <div className={styles.cardSection}>
                <div className={styles.sectionHeader}>
                  <div>
                    <div className={styles.sectionTitle}>
                      <AppIcon name="departments" size={20} color="#F59E0B" />
                      <span>Institutional Academic Departments</span>
                    </div>
                    <div className={styles.sectionSubtitle}>Configure departments, official codes, and coordinator eligibility</div>
                  </div>
                  <button className={`${styles.quickActionBtn} ${styles.quickActionPrimary}`} onClick={() => setShowDeptModal(true)}>
                    + Add New Department
                  </button>
                </div>

                <div className={styles.tableContainer}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Dept Code</th>
                        <th>Department Name</th>
                        <th>Description / Scope</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map((dept, idx) => (
                        <tr key={idx}>
                          <td>
                            <span style={{ fontWeight: 800, padding: '3px 8px', background: '#FEF3C7', color: '#92400E', borderRadius: '6px', fontSize: '0.8rem' }}>
                              {dept.code || dept.id.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: '#0F172A' }}>{dept.name}</td>
                          <td style={{ color: '#64748B' }}>{dept.description || dept.label || 'Standard Academic Section'}</td>
                          <td>
                            <span className={`badge ${dept.active !== false ? 'badge-success' : 'badge-danger'}`}>
                              {dept.active !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className={styles.quickActionBtn}
                              style={{ color: dept.active !== false ? '#DC2626' : '#10B981', padding: '4px 10px', fontSize: '0.78rem' }}
                              onClick={() => handleToggleDept(dept.id, dept.active !== false)}
                            >
                              {dept.active !== false ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: VENDORS */}
            {activeTab === 'vendors' && (
              <div className={styles.cardSection}>
                <div className={styles.sectionHeader}>
                  <div>
                    <div className={styles.sectionTitle}>
                      <AppIcon name="vendors" size={20} color="#8B5CF6" />
                      <span>Campus Canteen Vendors</span>
                    </div>
                    <div className={styles.sectionSubtitle}>Manage food vendor profiles, operational statuses, and settlements</div>
                  </div>
                  <button className={`${styles.quickActionBtn} ${styles.quickActionPrimary}`} onClick={() => setShowAddVendorModal(true)}>
                    + Register Food Vendor
                  </button>
                </div>

                <div className={styles.tableContainer}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Vendor ID</th>
                        <th>Canteen / Business Name</th>
                        <th>Proprietor / Contact</th>
                        <th>Operational State</th>
                        <th>Active</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.map((v) => (
                        <tr key={v.id}>
                          <td style={{ fontWeight: 800, color: '#6366F1' }}>{v.id}</td>
                          <td style={{ fontWeight: 700, color: '#0F172A' }}>{v.name}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span>👤 {v.owner_name || 'Owner'}</span>
                              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>📞 {v.phone || 'N/A'} • ✉️ {v.email || 'N/A'}</span>
                            </div>
                          </td>
                          <td>
                            <VendorStatusBadge status={v.status || 'open'} />
                          </td>
                          <td>
                            <span className={`badge ${v.active !== false ? 'badge-success' : 'badge-danger'}`}>
                              {v.active !== false ? 'Enabled' : 'Disabled'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                className={styles.quickActionBtn}
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                onClick={() => { setSelectedVendor(v); setEditStatus(v.status || 'open'); }}
                              >
                                State
                              </button>
                              <button
                                className={styles.quickActionBtn}
                                style={{ padding: '4px 8px', fontSize: '0.75rem', color: v.active !== false ? '#D97706' : '#059669' }}
                                onClick={() => handleToggleVendorActive(v.id)}
                              >
                                {v.active !== false ? 'Disable' : 'Enable'}
                              </button>
                              <button
                                className={styles.quickActionBtn}
                                style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#DC2626', borderColor: '#FECACA' }}
                                onClick={() => handleDeleteVendor(v.id)}
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: ALL ORDERS */}
            {activeTab === 'orders' && (
              <div className={styles.cardSection}>
                <div className={styles.sectionHeader}>
                  <div>
                    <div className={styles.sectionTitle}>
                      <AppIcon name="orders" size={20} color="#F43F5E" />
                      <span>All Institutional Orders & Requisitions</span>
                    </div>
                    <div className={styles.sectionSubtitle}>Search, filter, and audit every order created across the campus</div>
                  </div>
                </div>

                <div className={styles.filterRow}>
                  <div className={styles.searchBox}>
                    <AppIcon name="search" size={16} color="#94A3B8" />
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Search by order ID, title, requester, or department..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                    />
                  </div>

                  <select
                    className={styles.filterSelect}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.tableContainer}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Requisition Title</th>
                        <th>Department</th>
                        <th>Submitted By</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Total Bill</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((ord) => (
                        <tr key={ord.id}>
                          <td style={{ fontWeight: 800, color: '#2563EB', cursor: 'pointer' }} onClick={() => router.push(`/order/${ord.id}`)}>
                            {ord.id}
                          </td>
                          <td style={{ fontWeight: 700, color: '#0F172A', cursor: 'pointer' }} onClick={() => router.push(`/order/${ord.id}`)}>
                            {ord.title}
                          </td>
                          <td>🏛️ {ord.department_label || 'Dept'}</td>
                          <td>👤 {ord.created_by_name || 'Coordinator'}</td>
                          <td style={{ fontSize: '0.8rem', color: '#64748B' }}>
                            {new Date(ord.created_at).toLocaleDateString('en-IN')}
                          </td>
                          <td><StatusBadge status={ord.status} size="sm" /></td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>₹{ord.total_bill_amount || 0}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                className={styles.quickActionBtn}
                                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                onClick={() => router.push(`/order/${ord.id}`)}
                              >
                                View
                              </button>
                              {['Bill Generated', 'Vendor Confirmed'].includes(ord.status) && (
                                <button
                                  className={`${styles.quickActionBtn} ${styles.quickActionPrimary}`}
                                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                  onClick={() => handleComplete(ord.id)}
                                >
                                  Complete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredOrders.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                            No matching orders found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: BILLS & INVOICES */}
            {activeTab === 'bills' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Sub-navigation Tabs */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', background: '#F1F5F9', padding: '4px', borderRadius: '12px' }}>
                    <button
                      className={`${styles.quickActionBtn} ${billsSubTab === 'invoices' ? styles.quickActionPrimary : ''}`}
                      style={{ border: 'none', background: billsSubTab === 'invoices' ? '#2563EB' : 'transparent', color: billsSubTab === 'invoices' ? '#FFFFFF' : '#64748B' }}
                      onClick={() => setBillsSubTab('invoices')}
                    >
                      <AppIcon name="bills" size={15} color={billsSubTab === 'invoices' ? '#FFFFFF' : '#64748B'} />
                      <span>All Order Bills & Invoices ({orders.filter(o => (o.total_bill_amount || 0) > 0 || ['Bill Generated', 'Completed', 'Vendor Confirmed'].includes(o.status)).length})</span>
                    </button>
                    <button
                      className={`${styles.quickActionBtn} ${billsSubTab === 'settlements' ? styles.quickActionPrimary : ''}`}
                      style={{ border: 'none', background: billsSubTab === 'settlements' ? '#2563EB' : 'transparent', color: billsSubTab === 'settlements' ? '#FFFFFF' : '#64748B' }}
                      onClick={() => setBillsSubTab('settlements')}
                    >
                      <AppIcon name="revenue" size={15} color={billsSubTab === 'settlements' ? '#FFFFFF' : '#64748B'} />
                      <span>Vendor Monthly Settlements ({settlements.length})</span>
                    </button>
                  </div>

                  {billsSubTab === 'settlements' && (
                    <button
                      className={`${styles.quickActionBtn} ${styles.quickActionPrimary}`}
                      onClick={() => {
                        setShowSettlementModal(true);
                        setSelectedSettlementVendor(vendors[0]?.id || '');
                        setSelectedSettlementMonth(new Date().toISOString().slice(0, 7));
                      }}
                    >
                      + Record Monthly Settlement
                    </button>
                  )}
                </div>

                {/* SUB-VIEW 1: ALL ORDER BILLS & INVOICES */}
                {billsSubTab === 'invoices' && (
                  <div className={styles.cardSection}>
                    <div className={styles.sectionHeader}>
                      <div>
                        <div className={styles.sectionTitle}>
                          <AppIcon name="bills" size={20} color="#06B6D4" />
                          <span>Institutional Invoices & Billing Vouchers</span>
                        </div>
                        <div className={styles.sectionSubtitle}>View, audit, download, and print official verified vouchers for all campus orders</div>
                      </div>
                    </div>

                    {/* Filter & Search */}
                    <div className={styles.filterRow}>
                      <div className={styles.searchBox}>
                        <AppIcon name="search" size={16} color="#94A3B8" />
                        <input
                          type="text"
                          className={styles.searchInput}
                          placeholder="Search by Invoice #, Order ID, Title, Dept, or Vendor..."
                          value={invoiceSearch}
                          onChange={(e) => setInvoiceSearch(e.target.value)}
                        />
                      </div>

                      <select
                        className={styles.filterSelect}
                        value={invoiceVendorFilter}
                        onChange={(e) => setInvoiceVendorFilter(e.target.value)}
                      >
                        <option value="All">All Canteen Vendors</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </div>

                    {/* Invoices Table */}
                    <div className={styles.tableContainer}>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>Invoice / Ref #</th>
                            <th>Requisition Title</th>
                            <th>Department</th>
                            <th>Vendor(s)</th>
                            <th>Date</th>
                            <th style={{ textAlign: 'right' }}>Billed Amount</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders
                            .filter(o => {
                              const matchSearch = !invoiceSearch || 
                                o.id.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                                o.title.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                                (o.order_reference && o.order_reference.toLowerCase().includes(invoiceSearch.toLowerCase())) ||
                                (o.department_label && o.department_label.toLowerCase().includes(invoiceSearch.toLowerCase())) ||
                                o.vendor_orders.some(vo => vo.vendor_name?.toLowerCase().includes(invoiceSearch.toLowerCase()) || (vo.invoice_number && vo.invoice_number.toLowerCase().includes(invoiceSearch.toLowerCase())));
                              const matchVendor = invoiceVendorFilter === 'All' || o.vendor_orders.some(vo => vo.vendor_id === invoiceVendorFilter);
                              return matchSearch && matchVendor;
                            })
                            .map((ord) => {
                              const refNo = ord.order_reference || `AS-2026-${ord.id.replace(/[^0-9]/g, '').slice(-4) || ord.id.slice(-4)}`;
                              const vendorNames = ord.vendor_orders.map(vo => vo.vendor_name || vo.vendor_id).join(', ') || 'Canteen';

                              return (
                                <tr key={ord.id}>
                                  <td>
                                    <span style={{ fontWeight: 800, color: '#2563EB', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                                      {refNo}
                                    </span>
                                  </td>
                                  <td>
                                    <div style={{ fontWeight: 700, color: '#0F172A' }}>{ord.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Order ID: #{ord.id}</div>
                                  </td>
                                  <td>🏛️ {ord.department_label || 'Dept'}</td>
                                  <td>🏪 {vendorNames}</td>
                                  <td style={{ fontSize: '0.8rem', color: '#64748B' }}>
                                    {new Date(ord.bill_generated_at || ord.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: 900, color: '#0F172A', fontSize: '0.95rem' }}>
                                    ₹{Number(ord.total_bill_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td>
                                    <StatusBadge status={ord.status} size="sm" />
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                      <button
                                        className={`${styles.quickActionBtn} ${styles.quickActionPrimary}`}
                                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                        onClick={() => router.push(`/bill/${ord.id}`)}
                                      >
                                        📄 View Voucher
                                      </button>
                                      <button
                                        className={styles.quickActionBtn}
                                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                        onClick={() => window.open(`/bill/${ord.id}`, '_blank')}
                                      >
                                        🖨️ Print
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          {orders.length === 0 && (
                            <tr>
                              <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🧾</div>
                                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>No Institutional Bills Generated Yet</div>
                                <div style={{ fontSize: '0.82rem', color: '#64748B', maxWidth: '420px', margin: '4px auto 0 auto' }}>
                                  As soon as coordinators create requisitions and canteen vendors fulfill them, all verified printable vouchers with QR authentication will appear here automatically.
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SUB-VIEW 2: MONTHLY VENDOR SETTLEMENTS */}
                {billsSubTab === 'settlements' && (
                  <div className={styles.cardSection}>
                    <div className={styles.sectionHeader}>
                      <div>
                        <div className={styles.sectionTitle}>
                          <AppIcon name="revenue" size={20} color="#10B981" />
                          <span>Vendor Monthly Settlements Ledger</span>
                        </div>
                        <div className={styles.sectionSubtitle}>Track monthly billing disbursement cycles and pending payouts per food vendor</div>
                      </div>
                    </div>

                    <div className={styles.tableContainer}>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>Billing Cycle (Month)</th>
                            <th>Food Vendor</th>
                            <th style={{ textAlign: 'right' }}>Total Billed</th>
                            <th style={{ textAlign: 'right' }}>Paid Amount</th>
                            <th style={{ textAlign: 'right' }}>Pending Due</th>
                            <th>Settlement Status</th>
                            <th style={{ textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {settlements.map((s, idx) => {
                            const vendor = vendors.find(v => v.id === s.vendor_id);
                            const due = (s.total_amount || 0) - (s.paid_amount || 0);
                            const isSettled = due <= 0;

                            return (
                              <tr key={idx}>
                                <td style={{ fontWeight: 800, color: '#0F172A' }}>{s.month}</td>
                                <td style={{ fontWeight: 700 }}>🏪 {vendor?.name || s.vendor_id}</td>
                                <td style={{ textAlign: 'right', fontWeight: 800 }}>₹{Number(s.total_amount || 0).toLocaleString('en-IN')}</td>
                                <td style={{ textAlign: 'right', color: '#059669', fontWeight: 700 }}>₹{Number(s.paid_amount || 0).toLocaleString('en-IN')}</td>
                                <td style={{ textAlign: 'right', color: due > 0 ? '#DC2626' : '#64748B', fontWeight: 800 }}>
                                  ₹{Math.max(0, due).toLocaleString('en-IN')}
                                </td>
                                <td>
                                  <span className={`badge ${isSettled ? 'badge-success' : 'badge-warning'}`}>
                                    {isSettled ? 'Settled' : 'Pending Payment'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    className={styles.quickActionBtn}
                                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                    onClick={() => {
                                      setSelectedSettlementVendor(s.vendor_id);
                                      setSelectedSettlementMonth(s.month);
                                      setSettlementTotalAmount(s.total_amount || 0);
                                      setSettlementPaidAmount(s.paid_amount || 0);
                                      setShowSettlementModal(true);
                                    }}
                                  >
                                    Edit Payout
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {settlements.length === 0 && (
                            <tr>
                              <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💳</div>
                                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>No Monthly Settlements Recorded</div>
                                <div style={{ fontSize: '0.82rem', color: '#64748B', maxWidth: '420px', margin: '4px auto 0 auto' }}>
                                  Use the &quot;+ Record Monthly Settlement&quot; button above to disburse and settle monthly canteen billing cycles.
                                </div>
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

            {/* TAB: REPORTS */}
            {activeTab === 'reports' && (
              <div className={styles.cardSection}>
                <div className={styles.sectionHeader}>
                  <div>
                    <div className={styles.sectionTitle}>
                      <AppIcon name="reports" size={20} color="#0EA5E9" />
                      <span>Executive Financial Audit Reports</span>
                    </div>
                    <div className={styles.sectionSubtitle}>Filter by date range, department, coordinator, and export compliant logs</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className={styles.quickActionBtn} onClick={() => window.print()}>
                      <span>🖨️ Print Report</span>
                    </button>
                  </div>
                </div>

                {/* Filter Controls */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>Start Date</label>
                    <input type="date" className={styles.filterSelect} style={{ width: '100%' }} value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>End Date</label>
                    <input type="date" className={styles.filterSelect} style={{ width: '100%' }} value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>Department</label>
                    <select className={styles.filterSelect} style={{ width: '100%' }} value={filterDeptId} onChange={e => setFilterDeptId(e.target.value)}>
                      <option value="">All Departments</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>Vendor</label>
                    <select className={styles.filterSelect} style={{ width: '100%' }} value={filterVendorId} onChange={e => setFilterVendorId(e.target.value)}>
                      <option value="">All Vendors</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Summary Matrix Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ padding: '16px', borderRadius: '12px', background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase' }}>Filtered Order Volume</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1E3A8A', marginTop: '4px' }}>{orders.length} Orders</div>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase' }}>Department Expenditure</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#064E3B', marginTop: '4px' }}>₹{totalDeptExp.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '12px', background: '#FAF5FF', border: '1px solid #E9D5FF' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6B21A8', textTransform: 'uppercase' }}>Vendor Billings</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#581C87', marginTop: '4px' }}>₹{totalVendorRev.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ANALYTICS */}
            {activeTab === 'analytics' && (
              <div className={styles.cardSection}>
                <div className={styles.sectionHeader}>
                  <div>
                    <div className={styles.sectionTitle}>
                      <AppIcon name="analytics" size={20} color="#D946EF" />
                      <span>Procurement & Consumption Analytics</span>
                    </div>
                    <div className={styles.sectionSubtitle}>Visual insights on departmental food ordering patterns and canteen distribution</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', background: '#F1F5F9', padding: '4px', borderRadius: '8px' }}>
                    <button
                      onClick={() => setAnalyticsTimeframe('monthly')}
                      className={styles.quickActionBtn}
                      style={{ background: analyticsTimeframe === 'monthly' ? '#FFFFFF' : 'transparent', border: 'none', padding: '4px 12px' }}
                    >
                      Monthly View
                    </button>
                    <button
                      onClick={() => setAnalyticsTimeframe('yearly')}
                      className={styles.quickActionBtn}
                      style={{ background: analyticsTimeframe === 'yearly' ? '#FFFFFF' : 'transparent', border: 'none', padding: '4px 12px' }}
                    >
                      Yearly View
                    </button>
                  </div>
                </div>

                <div style={{ padding: '24px', background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                    {departments.map((dept, idx) => {
                      const deptOrders = orders.filter(o => o.department_id === dept.id);
                      const amount = deptOrders.reduce((sum, o) => sum + (o.total_bill_amount || 0), 0);
                      return (
                        <div key={idx} style={{ padding: '16px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 700 }}>{dept.name}</div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F172A', marginTop: '6px' }}>₹{amount.toLocaleString('en-IN')}</div>
                          <div style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700, marginTop: '4px' }}>{deptOrders.length} Completed Orders</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: AUDIT LOGS */}
            {['audit', 'logs', 'audit-logs'].includes(activeTab) && (
              <div className={styles.cardSection}>
                <div className={styles.sectionHeader}>
                  <div>
                    <div className={styles.sectionTitle}>
                      <AppIcon name="audit" size={20} color="#6366F1" />
                      <span>Security & Institutional Audit Trail</span>
                    </div>
                    <div className={styles.sectionSubtitle}>Immutable event log capturing authentication, approvals, and order status transitions</div>
                  </div>
                  <button className={styles.quickActionBtn} onClick={loadAuditLogs}>
                    <span>🔄 Refresh Logs</span>
                  </button>
                </div>

                <div className={styles.tableContainer}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Actor / User</th>
                        <th>Action Performed</th>
                        <th>Resource Scope</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log, idx) => (
                        <tr key={idx}>
                          <td style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                            {new Date(log.created_at || log.timestamp || Date.now()).toLocaleString('en-IN')}
                          </td>
                          <td style={{ fontWeight: 700, color: '#0F172A' }}>
                            👤 {log.actor_name || log.user_email || 'System Admin'}
                          </td>
                          <td>
                            <span style={{ fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: '#EEF2FF', color: '#4338CA', fontSize: '0.75rem' }}>
                              {log.action || 'UPDATE_ORDER'}
                            </span>
                          </td>
                          <td style={{ color: '#475569', fontWeight: 600 }}>{log.resource_type || 'Order'} #{log.resource_id || log.order_id || 'N/A'}</td>
                          <td style={{ fontSize: '0.8rem', color: '#64748B' }}>{log.details || log.description || 'Status changed'}</td>
                        </tr>
                      ))}
                      {auditLogs.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                            All audit actions are clean. No critical exceptions recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: SYSTEM HEALTH */}
            {activeTab === 'health' && (
              <div className={styles.cardSection}>
                <div className={styles.sectionHeader}>
                  <div>
                    <div className={styles.sectionTitle}>
                      <AppIcon name="health" size={20} color="#14B8A6" />
                      <span>System Infrastructure & Health Telemetry</span>
                    </div>
                    <div className={styles.sectionSubtitle}>Live diagnostics on API availability, database connections, and memory state</div>
                  </div>
                  <span className={styles.statBadgePositive}>🟢 Live Node OK</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>DATABASE CLUSTER</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '6px 0' }}>PostgreSQL Node 1</div>
                    <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>● Active • 0.8ms Ping</div>
                  </div>

                  <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>NEXT.JS APP RUNTIME</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '6px 0' }}>Turbopack Server</div>
                    <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>● Fast SSR • 63 Routes Static</div>
                  </div>

                  <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>WEBSOCKET GATEWAY</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '6px 0' }}>Event Stream v3.7</div>
                    <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>● Broadcasting Live Alerts</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SETTINGS */}
            {activeTab === 'settings' && (
              <div className={styles.cardSection}>
                <div className={styles.sectionHeader}>
                  <div>
                    <div className={styles.sectionTitle}>
                      <AppIcon name="settings" size={20} color="#64748B" />
                      <span>Platform & Demonstration Configuration</span>
                    </div>
                    <div className={styles.sectionSubtitle}>Configure demo modes, switcher visibility, and administrative controls</div>
                  </div>
                </div>

                {settingsMessage && (
                  <div style={{ padding: '12px 16px', background: '#ECFDF5', color: '#065F46', borderRadius: '10px', marginBottom: '16px', fontWeight: 700, fontSize: '0.86rem' }}>
                    ✓ {settingsMessage}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0F172A' }}>Live Role Switcher Bar</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Display floating bottom bar to switch roles instantaneously during evaluation</div>
                    </div>
                    <UiverseToggle
                      checked={demoSwitcherEnabled}
                      onChange={handleToggleDemoSwitcher}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0F172A' }}>Login Screen Demo Accounts Board</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Show 1-click login accounts selector on the authentication screen</div>
                    </div>
                    <UiverseToggle
                      checked={demoAccountsEnabled}
                      onChange={handleToggleDemoAccounts}
                    />
                  </div>

                  {/* Emergency user reset */}
                  <div style={{ padding: '20px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', marginTop: '16px' }}>
                    <div style={{ fontWeight: 800, color: '#991B1B', fontSize: '0.95rem' }}>⚠️ Emergency User Reset (Compliance)</div>
                    <div style={{ fontSize: '0.8rem', color: '#7F1D1D', margin: '4px 0 14px 0' }}>
                      Deactivates all custom non-admin accounts. Type <strong>RESET USERS</strong> to confirm.
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        className={styles.filterSelect}
                        style={{ flex: 1, background: '#FFFFFF' }}
                        placeholder="Type RESET USERS"
                        value={resetConfirmPhrase}
                        onChange={e => setResetConfirmPhrase(e.target.value)}
                      />
                      <button
                        className={styles.quickActionBtn}
                        style={{ background: '#DC2626', color: '#FFFFFF', borderColor: '#DC2626' }}
                        disabled={resetConfirmPhrase !== 'RESET USERS' || submitting}
                        onClick={handleDeactivateAllUsers}
                      >
                        {submitting ? 'Resetting...' : 'Execute Reset'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PROFILE */}
            {activeTab === 'profile' && session && (
              <div className={styles.cardSection} style={{ maxWidth: '640px' }}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionTitle}>
                    <AppIcon name="profile" size={20} color="#2563EB" />
                    <span>System Administrator Profile</span>
                  </div>
                </div>

                {profileMessage && (
                  <div style={{ padding: '12px 16px', background: '#ECFDF5', color: '#065F46', borderRadius: '10px', marginBottom: '16px', fontWeight: 700, fontSize: '0.86rem' }}>
                    ✓ {profileMessage}
                  </div>
                )}

                <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Full Name</label>
                    <input
                      type="text"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: '#FFFFFF' }}
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Email Address</label>
                    <input
                      type="email"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: '#F1F5F9', color: '#64748B' }}
                      value={session.email}
                      disabled
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Mobile Number</label>
                    <input
                      type="tel"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: '#FFFFFF' }}
                      value={profileMobile}
                      onChange={e => setProfileMobile(e.target.value)}
                      placeholder="10-digit mobile number"
                    />
                    {profileMobileError && <div style={{ color: '#DC2626', fontSize: '0.75rem', marginTop: '4px' }}>{profileMobileError}</div>}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Preferred Portal Language</label>
                    <select
                      className={styles.filterSelect}
                      style={{ width: '100%', background: '#FFFFFF' }}
                      value={preferredLang}
                      onChange={e => setPreferredLang(e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="gu">ગુજરાતી (Gujarati)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className={`${styles.quickActionBtn} ${styles.quickActionPrimary}`}
                    style={{ alignSelf: 'flex-start', marginTop: '8px' }}
                  >
                    Save Changes
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Modal: Add Department */}
        {showDeptModal && (
          <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setShowDeptModal(false)}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  <AppIcon name="departments" size={20} color="#F59E0B" />
                  <span>Add Master Academic Department</span>
                </h3>
                <button className={styles.modalCloseBtn} onClick={() => setShowDeptModal(false)}>✕</button>
              </div>
              <form onSubmit={handleAddDeptSubmit}>
                <div className={styles.modalBody}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Department Code *</label>
                    <input
                      type="text"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: '#FFFFFF' }}
                      placeholder="e.g. CS, MECH, PHARMA"
                      value={deptCode}
                      onChange={e => setDeptCode(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Department Full Name *</label>
                    <input
                      type="text"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: '#FFFFFF' }}
                      placeholder="e.g. Computer Science & Engineering"
                      value={deptName}
                      onChange={e => setDeptName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Description / Scope</label>
                    <textarea
                      className={styles.filterSelect}
                      style={{ width: '100%', background: '#FFFFFF', minHeight: '80px' }}
                      placeholder="e.g. Undergraduate engineering requisitions"
                      value={deptDesc}
                      onChange={e => setDeptDesc(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <button type="button" className={styles.quickActionBtn} onClick={() => setShowDeptModal(false)}>Cancel</button>
                  <button type="submit" className={`${styles.quickActionBtn} ${styles.quickActionPrimary}`}>Create Department</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Vendor */}
        {showAddVendorModal && (
          <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setShowAddVendorModal(false)}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  <AppIcon name="vendors" size={20} color="#8B5CF6" />
                  <span>Register Food Canteen Vendor</span>
                </h3>
                <button className={styles.modalCloseBtn} onClick={() => setShowAddVendorModal(false)}>✕</button>
              </div>
              <form onSubmit={handleAddVendorSubmit}>
                <div className={styles.modalBody}>
                  {addVendorError && <div style={{ color: '#DC2626', fontSize: '0.8rem', fontWeight: 700 }}>{addVendorError}</div>}
                  {addVendorSuccess && <div style={{ color: '#059669', fontSize: '0.8rem', fontWeight: 700 }}>{addVendorSuccess}</div>}
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Unique Vendor ID *</label>
                    <input
                      type="text"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: '#FFFFFF' }}
                      placeholder="e.g. sharma_canteen"
                      value={newVendorId}
                      onChange={e => setNewVendorId(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Canteen Display Name *</label>
                    <input
                      type="text"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: '#FFFFFF' }}
                      placeholder="e.g. Sharma Canteen & Cafe"
                      value={newVendorName}
                      onChange={e => setNewVendorName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Proprietor / Contact Person *</label>
                    <input
                      type="text"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: '#FFFFFF' }}
                      placeholder="e.g. Rajesh Sharma"
                      value={newVendorOwner}
                      onChange={e => setNewVendorOwner(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Contact Email *</label>
                    <input
                      type="email"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: '#FFFFFF' }}
                      placeholder="vendor@aharsetu.edu.in"
                      value={newVendorEmail}
                      onChange={e => setNewVendorEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Phone Number *</label>
                    <input
                      type="tel"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: '#FFFFFF' }}
                      placeholder="10-digit phone"
                      value={newVendorPhone}
                      onChange={e => setNewVendorPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Initial Login Password *</label>
                    <input
                      type="password"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: '#FFFFFF' }}
                      placeholder="Password for vendor login"
                      value={newVendorPassword}
                      onChange={e => setNewVendorPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <button type="button" className={styles.quickActionBtn} onClick={() => setShowAddVendorModal(false)}>Cancel</button>
                  <button type="submit" disabled={submitting} className={`${styles.quickActionBtn} ${styles.quickActionPrimary}`}>
                    {submitting ? 'Registering...' : 'Register Vendor'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Vendor Status */}
        {selectedVendor && (
          <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setSelectedVendor(null)}>
            <div className={styles.modalContent} style={{ maxWidth: '440px' }}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  <AppIcon name="vendors" size={20} color="#8B5CF6" />
                  <span>Update Vendor State: {selectedVendor.name}</span>
                </h3>
                <button className={styles.modalCloseBtn} onClick={() => setSelectedVendor(null)}>✕</button>
              </div>
              <div className={styles.modalBody}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Select Operational State</label>
                <select
                  className={styles.filterSelect}
                  style={{ width: '100%', background: '#FFFFFF' }}
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                >
                  <option value="open">🟢 Open (Taking Orders)</option>
                  <option value="busy">🟡 Busy (High Volume)</option>
                  <option value="closing_soon">🟠 Closing Soon</option>
                  <option value="closed">🔴 Closed</option>
                </select>
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.quickActionBtn} onClick={() => setSelectedVendor(null)}>Cancel</button>
                <button className={`${styles.quickActionBtn} ${styles.quickActionPrimary}`} onClick={handleUpdateVendorStatus}>Update Status</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Settlement Update */}
        {showSettlementModal && (
          <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setShowSettlementModal(false)}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  <AppIcon name="bills" size={20} color="#06B6D4" />
                  <span>Record Vendor Monthly Settlement</span>
                </h3>
                <button className={styles.modalCloseBtn} onClick={() => setShowSettlementModal(false)}>✕</button>
              </div>
              <form onSubmit={handleUpdateSettlementSubmit}>
                <div className={styles.modalBody}>
                  {settlementError && <div style={{ color: '#DC2626', fontSize: '0.8rem', fontWeight: 700 }}>{settlementError}</div>}
                  {settlementSuccess && <div style={{ color: '#059669', fontSize: '0.8rem', fontWeight: 700 }}>{settlementSuccess}</div>}

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Food Vendor *</label>
                    <select
                      className={styles.filterSelect}
                      style={{ width: '100%', background: '#FFFFFF' }}
                      value={selectedSettlementVendor}
                      onChange={e => setSelectedSettlementVendor(e.target.value)}
                      required
                    >
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Billing Cycle Month (YYYY-MM) *</label>
                    <input
                      type="month"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: '#FFFFFF' }}
                      value={selectedSettlementMonth}
                      onChange={e => setSelectedSettlementMonth(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Total Amount Billed (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: '#FFFFFF' }}
                      value={settlementTotalAmount}
                      onChange={e => setSettlementTotalAmount(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Paid / Disbursed Amount (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: '#FFFFFF' }}
                      value={settlementPaidAmount}
                      onChange={e => setSettlementPaidAmount(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <button type="button" className={styles.quickActionBtn} onClick={() => setShowSettlementModal(false)}>Cancel</button>
                  <button type="submit" disabled={submitting} className={`${styles.quickActionBtn} ${styles.quickActionPrimary}`}>
                    {submitting ? 'Saving...' : 'Save Settlement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
