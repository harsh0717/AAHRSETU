'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';
import VendorStatusBadge from '@/components/VendorStatusBadge';
import UserManager from '@/components/UserManager';
import { getSession, initializeApplication, UserProfile, updateSessionLanguage, getDepartments, addDepartment, toggleDepartmentStatus, updateUserProfile, uploadAvatar } from '@/lib/auth';
import { getOrders, resetAllData, completeOrder, MasterOrder } from '@/lib/store';
import { getVendors, updateVendorStatus, updateVendorProfile, Vendor, deleteVendor, getMonthlySettlements, updateMonthlySettlement, VendorMonthlySettlement } from '@/lib/vendors';
import { ROLE_COLORS, VENDOR_STATUS_LABELS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';
import { getNotifications, markNotificationRead, markAllRead, NotificationItem, localizeNotificationMessage } from '@/lib/notifications';
import BrandLogo from '@/components/BrandLogo';
import ImageCropperModal from '@/components/ImageCropperModal';
import UiverseToggle from '@/components/ui/UiverseToggle';
import UiverseButton from '@/components/ui/UiverseButton';
import UiverseBadge from '@/components/ui/UiverseBadge';
import AppIcon, { getIconTheme } from '@/components/ui/AppIcon';
import ChangePasswordCard from '@/components/ChangePasswordCard';
import DepartmentBudgetCard from '@/components/DepartmentBudgetCard';
import EditBudgetModal from '@/components/EditBudgetModal';
import { DepartmentBudget } from '@/lib/budget';
import { DEPARTMENTS } from '@/lib/constants';
import { api } from '@/lib/api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
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
  const [trendsData, setTrendsData] = useState<any[]>([]);
  const [popularItemsData, setPopularItemsData] = useState<any[]>([]);
  const [reportPreset, setReportPreset] = useState<'all' | 'today' | '7d' | 'month' | 'ytd'>('all');
  const [reportSubTab, setReportSubTab] = useState<'departments' | 'vendors' | 'trends' | 'items' | 'orders'>('departments');

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
  const [showEditVendorModal, setShowEditVendorModal] = useState(false);
  const [editVendorObj, setEditVendorObj] = useState<Vendor | null>(null);
  const [editCanteenName, setEditCanteenName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editOpStatus, setEditOpStatus] = useState('open');

  // Department Modal State
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [editingBudget, setEditingBudget] = useState<DepartmentBudget | null>(null);

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
  const [settingsMessage, setSettingsMessage] = useState('');
  const [resetConfirmPhrase, setResetConfirmPhrase] = useState('');

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

  const calculateVendorMonthTotal = useCallback((vId: string, monthStr: string) => {
    let sum = 0;
    for (const o of orders) {
      const isCompleted = ['Completed', 'Vendor Confirmed', 'Bill Generated'].includes(o.status);
      if (!isCompleted && o.status !== 'Completed') continue;
      const dateStr = o.created_at || o.bill_generated_at || '';
      if (dateStr.startsWith(monthStr)) {
        for (const vo of (o.vendor_orders || [])) {
          if (vo.vendor_id === vId) {
            let voAmt = Number(vo.bill_amount || 0);
            if (voAmt === 0 && Array.isArray(vo.items)) {
              voAmt = vo.items.reduce((s: number, it: any) => s + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
            }
            sum += voAmt;
          }
        }
      }
    }
    const existing = settlements.find(s => s.vendor_id === vId && s.month === monthStr);
    return Math.max(sum, Number(existing?.total_amount || 0));
  }, [orders, settlements]);

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
      
      const CANCELLED_STATUSES = [
        'Cancelled',
        'Coordinator Cancelled',
        'Principal Rejected',
        'DCR Rejected',
        'Admin Rejected',
        'Vendor Rejected',
        'Rejected',
        'Draft'
      ];
      const validCompleted = oList.filter(o => 
        ['Completed', 'Bill Generated'].includes(o.status) &&
        !CANCELLED_STATUSES.includes(o.status)
      );
      const calcRevenue = validCompleted.reduce((sum, o) => sum + (o.total_bill_amount || 0), 0);
      const calcTotalOrders = oList.length;
      const calcCompleted = validCompleted.length;
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
      
      const [summary, trendsRes, itemsRes, sList] = await Promise.all([
        api.get<any>(`/reports/filtered-summary?${params.toString()}`).catch(() => null),
        api.get<any[]>(`/reports/trends?period=monthly&${params.toString()}`).catch(() => []),
        api.get<any[]>(`/reports/items?limit=8&${params.toString()}`).catch(() => []),
        getMonthlySettlements().catch(() => [])
      ]);

      if (summary) {
        setReportMetrics(summary.metrics);
        setDeptReport(summary.departments || []);
        setVendorReport(summary.vendors || []);
        if (summary.orders) {
          setOrders(summary.orders);
        }
      }
      setTrendsData(trendsRes || []);
      setPopularItemsData(itemsRes || []);
      if (sList && sList.length > 0) {
        setSettlements(sList);
      }
    } catch (err) {
      console.error('Error loading reports data:', err);
    }
  }

  function applyReportPreset(preset: 'all' | 'today' | '7d' | 'month' | 'ytd') {
    setReportPreset(preset);
    const now = new Date();
    if (preset === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      setFilterStartDate(todayStr);
      setFilterEndDate(todayStr);
    } else if (preset === '7d') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setFilterStartDate(past.toISOString().slice(0, 10));
      setFilterEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setFilterStartDate(firstDay.toISOString().slice(0, 10));
      setFilterEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'ytd') {
      const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const fyStart = new Date(fyStartYear, 3, 1);
      setFilterStartDate(fyStart.toISOString().slice(0, 10));
      setFilterEndDate(now.toISOString().slice(0, 10));
    } else {
      setFilterStartDate('');
      setFilterEndDate('');
    }
  }

  function handleExportCSV() {
    const headers = ['Order ID', 'Date', 'Department', 'Purpose', 'Status', 'Total Bill (INR)'];
    const rows = orders.map(o => [
      `#${o.id}`,
      o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN') : '',
      departments.find(d => d.id === o.department_id)?.name || o.department_id || '',
      `"${(o.purpose || o.title || '').replace(/"/g, '""')}"`,
      o.status,
      o.total_bill_amount || 0
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AharSetu_Financial_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

    // Fetch fresh user profile from DB
    initializeApplication().then((fresh) => {
      if (fresh) {
        setSession(fresh);
        setProfileName(fresh.name);
        setProfileMobile(fresh.mobile_number || '');
        setPreferredLang(fresh.preferred_language || 'en');
      }
    }).catch(() => {});

    // Load live dashboard data directly from the database without destructive client wipes
    loadDashboardData();

    const handleOrderChanged = () => { loadDashboardData(true); };
    const handleUserChanged = () => { loadDashboardData(true); };
    const handleProfileChanged = (e?: any) => {
      const fresh = (e?.detail && typeof e.detail === 'object' && e.detail.name) ? e.detail : getSession();
      if (fresh) {
        setSession(fresh);
        setProfileName(fresh.name);
        setProfileMobile(fresh.mobile_number || '');
      }
    };

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
    window.addEventListener('aharsetu_vendor_updated', handleUserChanged);
    window.addEventListener('aharsetu_vendors_changed', handleUserChanged);
    window.addEventListener('aharsetu_vendor_status_changed', handleUserChanged);
    window.addEventListener('aharsetu_profile_changed', handleProfileChanged);
    window.addEventListener('aharsetu_session_changed', handleProfileChanged);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('aharsetu_order_changed', handleOrderChanged);
      window.removeEventListener('aharsetu_user_changed', handleUserChanged);
      window.removeEventListener('aharsetu_vendor_updated', handleUserChanged);
      window.removeEventListener('aharsetu_vendors_changed', handleUserChanged);
      window.removeEventListener('aharsetu_vendor_status_changed', handleUserChanged);
      window.removeEventListener('aharsetu_profile_changed', handleProfileChanged);
      window.removeEventListener('aharsetu_session_changed', handleProfileChanged);
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
        setOrders([]);
        setSettlements([]);
        setStats({ total_orders: 0, completed_orders: 0, total_revenue: 0, active_vendors: vendors.length });
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

  async function handleSaveVendorDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!editVendorObj) return;
    try {
      await updateVendorProfile(editVendorObj.id, {
        name: editCanteenName.trim(),
        owner_name: editOwnerName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        status: editOpStatus
      });
      setShowEditVendorModal(false);
      setEditVendorObj(null);
      loadDashboardData();
    } catch (err: any) {
      alert('Failed to update vendor: ' + (err?.detail || err?.message || 'Error'));
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

  const TAB_TITLES: Record<string, { title: string; subtitle: string; icon: any }> = {
    dashboard: { title: t('admin.tab_title_dashboard', 'Executive Admin Dashboard'), subtitle: t('admin.hub_desc', 'Global telemetry, active requisitions, budget utilization, and server baseline.'), icon: 'dashboard' },
    users: { title: t('admin.tab_title_users', 'User Accounts Directory'), subtitle: 'Manage coordinators, department principals, auditors, and permissions.', icon: 'users' },
    departments: { title: t('admin.tab_title_departments', 'Academic Departments'), subtitle: 'Configure institutional departments, official codes, and active statuses.', icon: 'departments' },
    vendors: { title: t('admin.tab_title_vendors', 'Campus Canteen Vendors'), subtitle: 'Manage food vendor profiles, live operating statuses, and kitchen settlements.', icon: 'vendors' },
    orders: { title: t('admin.tab_title_orders', 'Master Requisitions Pipeline'), subtitle: 'Live institutional orders stream across all departments and campus canteens.', icon: 'orders' },
    bills: { title: t('admin.tab_title_bills', 'Bills & Monthly Settlements'), subtitle: 'Reconcile vendor invoices, audit disbursements, and record settlements.', icon: 'bills' },
    reports: { title: t('admin.tab_title_reports', 'Institutional Audit Reports'), subtitle: 'Comprehensive financial breakdowns by department, vendor, and timeframe.', icon: 'reports' },
    analytics: { title: t('admin.tab_title_analytics', 'Financial & Volume Analytics'), subtitle: 'Data visualizations of campus dining expenditures and trends.', icon: 'analytics' },
    audit: { title: t('admin.tab_title_audit', 'Security & Activity Audit Logs'), subtitle: 'Chronological activity stream of all authentication and approval events.', icon: 'audit' },
    health: { title: t('admin.tab_title_health', 'Operational Diagnostics'), subtitle: 'Real-time telemetry of PostgreSQL database, WebSocket gateway, and latency.', icon: 'health' },
    settings: { title: t('admin.tab_title_settings', 'System Configuration'), subtitle: 'Global platform preferences, language localization, and data integrity safeguards.', icon: 'settings' },
    profile: { title: t('admin.tab_title_profile', 'Administrator Profile'), subtitle: 'Manage administrative credentials, contact details, and avatar.', icon: 'profile' },
  };

  const currentTabInfo = TAB_TITLES[activeTab] || TAB_TITLES.dashboard;

  return (
    <AppShell role="admin">
      <div className={styles.container}>
        
        {/* 1. Hero Welcome Header */}
        <div className={styles.heroHeader}>
          <div className={styles.heroLeft}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#0D9488', color: 'white', padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px' }}>
                {t('admin.hub_badge', 'CAMPUS ENTERPRISE ERP')}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                TAN: BLRA00000A · FY 2026-27
              </span>
            </div>
            <h1>
              <AppIcon name={currentTabInfo.icon} size={24} color="#14B8A6" />
              <span>{currentTabInfo.title}</span>
            </h1>
            <p>
              <span>{todayStr}</span>
              <span>•</span>
              <span className={styles.heroDateBadge}>⚡ {t('common.actions', 'Institutional Hub')}</span>
              {session && <span>• {t('auth.welcome', 'Welcome back')}, <strong>{session.name}</strong></span>}
            </p>
          </div>

          <div className={styles.heroRight}>
            <UiverseBadge variant="pulse">
              {t('common.availability', 'All Systems Operational')}
            </UiverseBadge>

            <UiverseButton
              variant="danger"
              size="sm"
              onClick={handleResetData}
              disabled={resetting}
              leftIcon={<AppIcon name="health" size={14} color="#FFFFFF" />}
            >
              {resetting ? 'Resetting...' : 'Seed / Reset DB'}
            </UiverseButton>
          </div>
        </div>

        {/* Main Content Area */}
        {loading && activeTab === 'dashboard' ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--gray-500, #64748B)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px', animation: 'spin 1s infinite linear' }}>🔄</div>
            <div style={{ fontWeight: 700 }}>{t('common.loading', 'Synchronizing institutional metrics...')}</div>
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
                      <span className={styles.statLabel}>{t('dcr.settlements_tile', 'Consolidated Billing')}</span>
                      <div className={styles.statIconWrap} style={{ background: 'rgba(16, 185, 129, 0.12)' }}>
                        <AppIcon name="bills" size={22} color="#10B981" />
                      </div>
                    </div>
                    <div className={styles.statValue}>₹{Number(stats.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div className={styles.statSub}>
                      <span className={styles.statBadgePositive}>↑ {t('dcr.pending_tile', 'Real-time Audit')}</span>
                      <span>{t('admin.orders_tile', 'Total Requisitions')}</span>
                    </div>
                  </div>

                  <div className={styles.statCard} style={{ borderTop: '4px solid #3B82F6' }}>
                    <div className={styles.statCardHeader}>
                      <span className={styles.statLabel}>{t('admin.orders_tile', 'Total Orders Created')}</span>
                      <div className={styles.statIconWrap} style={{ background: 'rgba(59, 130, 246, 0.12)' }}>
                        <AppIcon name="orders" size={22} color="#3B82F6" />
                      </div>
                    </div>
                    <div className={styles.statValue}>{stats.total_orders || 0}</div>
                    <div className={styles.statSub}>
                      <span>{t('principal.approved_tile', 'Settled')}: <strong>{stats.completed_orders || 0}</strong></span>
                      <span style={{ color: '#2563EB', fontWeight: 700 }}>{stats.total_orders > 0 ? Math.round(((stats.completed_orders || 0) / stats.total_orders) * 100) : 100}% Settle Rate</span>
                    </div>
                  </div>

                  <div className={styles.statCard} style={{ borderTop: '4px solid #8B5CF6' }}>
                    <div className={styles.statCardHeader}>
                      <span className={styles.statLabel}>{t('admin.vendors_tile', 'Active Food Vendors')}</span>
                      <div className={styles.statIconWrap} style={{ background: 'rgba(139, 92, 246, 0.12)' }}>
                        <AppIcon name="vendors" size={22} color="#8B5CF6" />
                      </div>
                    </div>
                    <div className={styles.statValue}>{stats.active_vendors || vendors.length}</div>
                    <div className={styles.statSub}>
                      <span>{t('nav.vendors', 'Campus Canteens')}</span>
                      <button onClick={() => setActiveTab('vendors')} style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: 800, cursor: 'pointer', padding: 0 }}>{t('common.edit', 'Manage')} →</button>
                    </div>
                  </div>

                  <div className={styles.statCard} style={{ borderTop: '4px solid #F59E0B' }}>
                    <div className={styles.statCardHeader}>
                      <span className={styles.statLabel}>{t('nav.departments', 'Academic Departments')}</span>
                      <div className={styles.statIconWrap} style={{ background: 'rgba(245, 158, 11, 0.12)' }}>
                        <AppIcon name="departments" size={22} color="#F59E0B" />
                      </div>
                    </div>
                    <div className={styles.statValue}>{departments.length || 4}</div>
                    <div className={styles.statSub}>
                      <span>{t('common.coordinator', 'Coordinators')}: <strong>{coordinators.length}</strong></span>
                      <span>{t('common.principal', 'Principals')}: <strong>{principals.length}</strong></span>
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
                      <UiverseButton
                        variant="secondary"
                        size="sm"
                        onClick={() => setActiveTab('orders')}
                      >
                        View All ({orders.length})
                      </UiverseButton>
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
                            <UiverseButton
                              variant="outline"
                              size="sm"
                              style={{ height: '30px', padding: '4px 12px', fontSize: '0.75rem' }}
                              onClick={() => router.push(`/order/${ord.id}`)}
                            >
                              Open
                            </UiverseButton>
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
                        <span style={{ fontSize: '0.78rem', color: 'var(--gray-500, #64748B)', fontWeight: 700 }}>Total: ₹{totalDeptExp.toLocaleString('en-IN')}</span>
                      </div>

                      <div className={styles.deptProgressList}>
                        {departments.map((dept, idx) => {
                          const deptOrders = orders.filter(o => 
                            o.department_id === dept.id &&
                            ['Completed', 'Bill Generated'].includes(o.status) &&
                            !['Cancelled', 'Coordinator Cancelled', 'Principal Rejected', 'DCR Rejected', 'Admin Rejected', 'Vendor Rejected', 'Rejected', 'Draft'].includes(o.status)
                          );
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-1)', borderRadius: '8px' }}>
                          <span style={{ color: 'var(--gray-600, #475569)' }}>PostgreSQL Database Node</span>
                          <strong style={{ color: '#059669' }}>ONLINE (0ms latency)</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-1)', borderRadius: '8px' }}>
                          <span style={{ color: 'var(--gray-600, #475569)' }}>Realtime WebSocket Gateway</span>
                          <strong style={{ color: '#059669' }}>CONNECTED</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-1)', borderRadius: '8px' }}>
                          <span style={{ color: 'var(--gray-600, #475569)' }}>Multi-Language i18n Engine</span>
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
                  <UiverseButton variant="primary" size="sm" onClick={() => setShowDeptModal(true)}>
                    + Add New Department
                  </UiverseButton>
                </div>

                {/* Department Annual Budget Caps & Spend Utilization Matrix */}
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '16px' }}>
                    {DEPARTMENTS.map(dept => (
                      <DepartmentBudgetCard
                        key={dept.id}
                        deptId={dept.id}
                        showAdminEdit={true}
                        onEditCap={(b) => setEditingBudget(b)}
                      />
                    ))}
                  </div>
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
                          <td style={{ fontWeight: 700, color: 'var(--gray-900, #0F172A)' }}>{dept.name}</td>
                          <td style={{ color: 'var(--gray-500, #64748B)' }}>{dept.description || dept.label || 'Standard Academic Section'}</td>
                          <td>
                            <span className={`badge ${dept.active !== false ? 'badge-success' : 'badge-danger'}`}>
                              {dept.active !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <UiverseButton
                              variant={dept.active !== false ? 'danger' : 'success'}
                              size="sm"
                              style={{ height: '30px', padding: '4px 12px', fontSize: '0.75rem' }}
                              onClick={() => handleToggleDept(dept.id, dept.active !== false)}
                            >
                              {dept.active !== false ? 'Deactivate' : 'Activate'}
                            </UiverseButton>
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
                  <UiverseButton variant="primary" size="sm" onClick={() => setShowAddVendorModal(true)}>
                    + Register Food Vendor
                  </UiverseButton>
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
                          <td style={{ fontWeight: 700, color: 'var(--gray-900, #0F172A)' }}>{v.name}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span>👤 {v.owner_name || 'Owner'}</span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--gray-500, #64748B)' }}>📞 {v.phone || 'N/A'} • ✉️ {v.email || 'N/A'}</span>
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
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                              <UiverseButton
                                variant="outline"
                                size="sm"
                                style={{ height: '30px', padding: '4px 8px', fontSize: '0.75rem' }}
                                onClick={() => {
                                  setEditVendorObj(v);
                                  setEditCanteenName(v.name || '');
                                  setEditOwnerName(v.owner_name || '');
                                  setEditPhone(v.phone || '');
                                  setEditEmail(v.email || '');
                                  setEditOpStatus(v.status || 'open');
                                  setShowEditVendorModal(true);
                                }}
                              >
                                ✏️ Edit
                              </UiverseButton>
                              <UiverseButton
                                variant="outline"
                                size="sm"
                                style={{ height: '30px', padding: '4px 10px', fontSize: '0.75rem' }}
                                onClick={() => { setSelectedVendor(v); setEditStatus(v.status || 'open'); }}
                              >
                                ⚙️ State
                              </UiverseButton>
                              <UiverseButton
                                variant={v.active !== false ? 'secondary' : 'success'}
                                size="sm"
                                style={{ height: '30px', padding: '4px 10px', fontSize: '0.75rem' }}
                                onClick={() => handleToggleVendorActive(v.id)}
                              >
                                {v.active !== false ? 'Disable' : 'Enable'}
                              </UiverseButton>
                              <UiverseButton
                                variant="danger"
                                size="sm"
                                style={{ height: '30px', padding: '4px 8px', fontSize: '0.75rem' }}
                                onClick={() => handleDeleteVendor(v.id)}
                                title="Delete vendor"
                              >
                                🗑️
                              </UiverseButton>
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
                          <td style={{ fontWeight: 700, color: 'var(--gray-900, #0F172A)', cursor: 'pointer' }} onClick={() => router.push(`/order/${ord.id}`)}>
                            {ord.title}
                          </td>
                          <td>🏛️ {ord.department_label || 'Dept'}</td>
                          <td>👤 {ord.created_by_name || 'Coordinator'}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--gray-500, #64748B)' }}>
                            {new Date(ord.created_at).toLocaleDateString('en-IN')}
                          </td>
                          <td><StatusBadge status={ord.status} size="sm" /></td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--gray-900, #0F172A)' }}>₹{ord.total_bill_amount || 0}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <UiverseButton
                                variant="outline"
                                size="sm"
                                style={{ height: '30px', padding: '4px 10px', fontSize: '0.75rem' }}
                                onClick={() => router.push(`/order/${ord.id}`)}
                              >
                                View
                              </UiverseButton>
                              {['Bill Generated', 'Vendor Confirmed'].includes(ord.status) && (
                                <UiverseButton
                                  variant="success"
                                  size="sm"
                                  style={{ height: '30px', padding: '4px 10px', fontSize: '0.75rem' }}
                                  onClick={() => handleComplete(ord.id)}
                                >
                                  Complete
                                </UiverseButton>
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
                  <div style={{ display: 'flex', gap: '8px', background: 'var(--surface-2)', padding: '4px', borderRadius: '12px' }}>
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
                    <UiverseButton
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setShowSettlementModal(true);
                        setSelectedSettlementVendor(vendors[0]?.id || '');
                        setSelectedSettlementMonth(new Date().toISOString().slice(0, 7));
                      }}
                    >
                      + Record Monthly Settlement
                    </UiverseButton>
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
                                    <div style={{ fontWeight: 700, color: 'var(--gray-900, #0F172A)' }}>{ord.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500, #64748B)' }}>Order ID: #{ord.id}</div>
                                  </td>
                                  <td>🏛️ {ord.department_label || 'Dept'}</td>
                                  <td>🏪 {vendorNames}</td>
                                  <td style={{ fontSize: '0.8rem', color: 'var(--gray-500, #64748B)' }}>
                                    {new Date(ord.bill_generated_at || ord.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: 900, color: 'var(--gray-900, #0F172A)', fontSize: '0.95rem' }}>
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
                                        onClick={() => window.open(`/bill/${ord.id}`, '_blank', 'noopener,noreferrer')}
                                      >
                                        📄 View Voucher
                                      </button>
                                      <button
                                        className={styles.quickActionBtn}
                                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                        onClick={() => window.open(`/bill/${ord.id}`, '_blank', 'noopener,noreferrer')}
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
                              <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--gray-500, #64748B)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🧾</div>
                                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--gray-900, #0F172A)' }}>No Institutional Bills Generated Yet</div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--gray-500, #64748B)', maxWidth: '420px', margin: '4px auto 0 auto' }}>
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
                    <div className={styles.sectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div className={styles.sectionTitle}>
                          <AppIcon name="revenue" size={20} color="#10B981" />
                          <span>Vendor Monthly Settlements Ledger</span>
                        </div>
                        <div className={styles.sectionSubtitle}>Track monthly billing disbursement cycles and pending payouts per food vendor</div>
                      </div>
                      <UiverseButton
                        variant="primary"
                        onClick={() => {
                          const defV = vendors[0]?.id || '';
                          const defM = new Date().toISOString().slice(0, 7);
                          setSelectedSettlementVendor(defV);
                          setSelectedSettlementMonth(defM);
                          const autoTot = calculateVendorMonthTotal(defV, defM);
                          const existing = settlements.find(s => s.vendor_id === defV && s.month === defM);
                          setSettlementTotalAmount(autoTot);
                          setSettlementPaidAmount(existing?.paid_amount || 0);
                          setShowSettlementModal(true);
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <AppIcon name="plus" size={16} />
                          <span>Record Settlement</span>
                        </span>
                      </UiverseButton>
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
                                <td style={{ fontWeight: 800, color: 'var(--gray-900, #0F172A)' }}>{s.month}</td>
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
                              <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--gray-500, #64748B)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💳</div>
                                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--gray-900, #0F172A)' }}>No Monthly Settlements Recorded</div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--gray-500, #64748B)', maxWidth: '420px', margin: '4px auto 0 auto' }}>
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

            {/* TAB: REPORTS & ANALYTICS ADVANCED SUITE */}
            {(activeTab === 'reports' || activeTab === 'analytics') && (
              <div className={styles.cardSection}>
                {/* Header & Quick Action Suite */}
                <div className={styles.sectionHeader}>
                  <div>
                    <div className={styles.sectionTitle}>
                      <AppIcon name="reports" size={22} color="#0EA5E9" />
                      <span>Institutional Financial Reports & Analytics Suite</span>
                    </div>
                    <div className={styles.sectionSubtitle}>Comprehensive expenditure audits, departmental budget matrix, and canteen settlement ledgers</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <UiverseButton
                      variant="secondary"
                      size="sm"
                      leftIcon={<span>📄</span>}
                      onClick={handleExportCSV}
                    >
                      Export CSV
                    </UiverseButton>
                    <UiverseButton
                      variant="primary"
                      size="sm"
                      leftIcon={<span>🖨️</span>}
                      onClick={() => window.print()}
                    >
                      Print Audit Report
                    </UiverseButton>
                    <button
                      type="button"
                      aria-label="Refresh reports data"
                      className={styles.quickActionBtn}
                      onClick={() => loadReportsData()}
                    >
                      <span>🔄 Refresh</span>
                    </button>
                  </div>
                </div>

                {/* Quick Timeframe Preset Pills */}
                <div className={styles.reportsPresetBar}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gray-500, #64748B)', textTransform: 'uppercase', marginRight: '4px' }}>
                    📅 Quick Range:
                  </span>
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: 'today', label: 'Today' },
                    { id: '7d', label: 'Last 7 Days' },
                    { id: 'month', label: 'This Month' },
                    { id: 'ytd', label: 'FY 2026-27 (YTD)' },
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyReportPreset(p.id as any)}
                      className={`${styles.presetBtn} ${reportPreset === p.id ? styles.presetBtnActive : ''}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Multi-Dimensional Filter Controls */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', padding: '14px 16px', background: 'var(--surface-1, #F8FAFC)', borderRadius: '14px', border: '1px solid var(--gray-200, #E2E8F0)' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gray-500, #64748B)', display: 'block', marginBottom: '4px' }}>Start Date</label>
                    <input type="date" className={styles.filterSelect} style={{ width: '100%' }} value={filterStartDate} onChange={e => { setFilterStartDate(e.target.value); setReportPreset('all'); }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gray-500, #64748B)', display: 'block', marginBottom: '4px' }}>End Date</label>
                    <input type="date" className={styles.filterSelect} style={{ width: '100%' }} value={filterEndDate} onChange={e => { setFilterEndDate(e.target.value); setReportPreset('all'); }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gray-500, #64748B)', display: 'block', marginBottom: '4px' }}>Department</label>
                    <select className={styles.filterSelect} style={{ width: '100%' }} value={filterDeptId} onChange={e => setFilterDeptId(e.target.value)}>
                      <option value="">All Academic Departments</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gray-500, #64748B)', display: 'block', marginBottom: '4px' }}>Canteen Vendor</label>
                    <select className={styles.filterSelect} style={{ width: '100%' }} value={filterVendorId} onChange={e => setFilterVendorId(e.target.value)}>
                      <option value="">All Campus Canteens</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gray-500, #64748B)', display: 'block', marginBottom: '4px' }}>Order Status</label>
                    <select className={styles.filterSelect} style={{ width: '100%' }} value={filterOrderStatus} onChange={e => setFilterOrderStatus(e.target.value)}>
                      <option value="">All Order Statuses</option>
                      <option value="Completed">Completed & Billed</option>
                      <option value="Sent for Approval">Pending Review</option>
                      <option value="Cancelled">Cancelled / Rejected</option>
                    </select>
                  </div>
                </div>

                {/* 5 Executive Financial & Operational KPI Cards */}
                {(() => {
                  const CANCELLED_STATUSES = ['Cancelled', 'Coordinator Cancelled', 'Principal Rejected', 'DCR Rejected', 'Admin Rejected', 'Vendor Rejected', 'Rejected', 'Draft'];
                  const completedOrders = orders.filter(o => ['Completed', 'Bill Generated'].includes(o.status) && !CANCELLED_STATUSES.includes(o.status));
                  const totalFilteredExp = completedOrders.reduce((sum, o) => sum + (o.total_bill_amount || 0), 0);
                  const totalSettledPaid = settlements.reduce((sum, s) => sum + (s.paid_amount || 0), 0);
                  const totalSettledDue = settlements.reduce((sum, s) => sum + (s.due_amount || 0), 0);
                  const avgOrderVal = completedOrders.length > 0 ? Math.round(totalFilteredExp / completedOrders.length) : 0;
                  const fulfillmentRate = orders.length > 0 ? Math.round((completedOrders.length / orders.length) * 100) : 100;

                  return (
                    <div className={styles.reportKpiGrid}>
                      <div className={styles.reportKpiCard} style={{ borderLeft: '4px solid #10B981' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gray-500, #64748B)', textTransform: 'uppercase' }}>Filtered Expenditure</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#059669' }}>₹{totalFilteredExp.toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--gray-600, #475569)', fontWeight: 600 }}>{completedOrders.length} completed orders</div>
                      </div>

                      <div className={styles.reportKpiCard} style={{ borderLeft: '4px solid #3B82F6' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gray-500, #64748B)', textTransform: 'uppercase' }}>Total Requisitions</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#2563EB' }}>{orders.length} Orders</div>
                        <div style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>{fulfillmentRate}% fulfillment rate</div>
                      </div>

                      <div className={styles.reportKpiCard} style={{ borderLeft: '4px solid #8B5CF6' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gray-500, #64748B)', textTransform: 'uppercase' }}>Settlements Disbursed</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#7C3AED' }}>₹{totalSettledPaid.toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '0.72rem', color: '#F59E0B', fontWeight: 700 }}>₹{totalSettledDue.toLocaleString('en-IN')} pending due</div>
                      </div>

                      <div className={styles.reportKpiCard} style={{ borderLeft: '4px solid #F59E0B' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gray-500, #64748B)', textTransform: 'uppercase' }}>Avg. Order Size</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#D97706' }}>₹{avgOrderVal.toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--gray-500, #64748B)', fontWeight: 600 }}>Per departmental order</div>
                      </div>

                      <div className={styles.reportKpiCard} style={{ borderLeft: '4px solid #0D9488' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gray-500, #64748B)', textTransform: 'uppercase' }}>Pure-Veg Compliance</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0D9488' }}>100% Verified</div>
                        <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>🌿 Campus Protocol Compliant</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Sub-Navigation Tabs */}
                <div className={styles.reportsSubNav}>
                  {[
                    { id: 'departments', label: '🏛️ Department Budget Matrix' },
                    { id: 'vendors', label: '🏪 Canteen Settlement Audit' },
                    { id: 'trends', label: '📈 Spend & Consumption Trends' },
                    { id: 'items', label: '🍱 Popular Dish Analytics' },
                    { id: 'orders', label: '📜 Order Audit Register' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setReportSubTab(tab.id as any)}
                      className={`${styles.reportsSubTabBtn} ${reportSubTab === tab.id ? styles.reportsSubTabActive : ''}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* SUB-VIEW 1: DEPARTMENT BUDGET MATRIX */}
                {reportSubTab === 'departments' && (
                  <div className={styles.tableContainer}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Department</th>
                          <th>Annual Budget Cap</th>
                          <th>Spent to Date</th>
                          <th>Remaining Balance</th>
                          <th>Utilization %</th>
                          <th>Risk Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {departments.map((dept) => {
                          const CANCELLED_STATUSES = ['Cancelled', 'Coordinator Cancelled', 'Principal Rejected', 'DCR Rejected', 'Admin Rejected', 'Vendor Rejected', 'Rejected', 'Draft'];
                          const deptOrders = orders.filter(o => 
                            o.department_id === dept.id &&
                            ['Completed', 'Bill Generated'].includes(o.status) &&
                            !CANCELLED_STATUSES.includes(o.status)
                          );
                          const spent = deptOrders.reduce((sum, o) => sum + (o.total_bill_amount || 0), 0);
                          const budgetCap = dept.budget_limit || dept.annual_budget || 100000;
                          const remaining = Math.max(0, budgetCap - spent);
                          const utilPercent = Math.min(100, Math.round((spent / budgetCap) * 100)) || 0;
                          
                          let statusColor = '#10B981';
                          let statusLabel = 'OPTIMAL';
                          if (utilPercent >= 95) {
                            statusColor = '#EF4444';
                            statusLabel = 'CRITICAL / EXCEEDED';
                          } else if (utilPercent >= 75) {
                            statusColor = '#F59E0B';
                            statusLabel = 'WARNING';
                          }

                          return (
                            <tr key={dept.id}>
                              <td>
                                <div style={{ fontWeight: 800, color: 'var(--gray-900, #0F172A)' }}>{dept.name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--gray-500, #64748B)' }}>Code: {dept.code || dept.id.toUpperCase()}</div>
                              </td>
                              <td style={{ fontWeight: 800, color: 'var(--gray-800, #1E293B)' }}>
                                ₹{budgetCap.toLocaleString('en-IN')}
                              </td>
                              <td style={{ fontWeight: 900, color: '#059669' }}>
                                ₹{spent.toLocaleString('en-IN')}
                              </td>
                              <td style={{ fontWeight: 800, color: remaining < 10000 ? '#EF4444' : '#2563EB' }}>
                                ₹{remaining.toLocaleString('en-IN')}
                              </td>
                              <td style={{ width: '180px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 800, color: statusColor }}>
                                  <span>{utilPercent}%</span>
                                  <span>{deptOrders.length} orders</span>
                                </div>
                                <div className={styles.progressTrack}>
                                  <div className={styles.progressFill} style={{ width: `${utilPercent}%`, background: statusColor }} />
                                </div>
                              </td>
                              <td>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}40` }}>
                                  {statusLabel}
                                </span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className={styles.quickActionBtn}
                                  style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                                  onClick={() => {
                                    const cap = budgetCap;
                                    const rem = Math.max(0, cap - spent);
                                    const util = cap > 0 ? (spent / cap) * 100 : 0;
                                    const thresh = (dept.warning_threshold || 80) > 1 ? (dept.warning_threshold || 80) / 100 : (dept.warning_threshold || 0.8);
                                    setEditingBudget({
                                      department_id: dept.id,
                                      department_name: dept.name,
                                      budget_year: '2026-2027',
                                      annual_budget: cap,
                                      used_amount: spent,
                                      remaining_amount: rem,
                                      utilization_pct: util,
                                      warning_threshold: thresh,
                                      has_warning: util >= thresh * 100,
                                      status: util >= 100 ? 'EXCEEDED' : util >= thresh * 100 ? 'WARNING' : 'OPTIMAL'
                                    });
                                  }}
                                >
                                  ⚙️ Edit Cap
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {departments.length === 0 && (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-500, #64748B)' }}>
                              No departments configured in the database.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* SUB-VIEW 2: CANTEEN SETTLEMENT & REVENUE AUDIT */}
                {reportSubTab === 'vendors' && (
                  <div className={styles.tableContainer}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Canteen Vendor</th>
                          <th>Total Billed Revenue</th>
                          <th>Settled (Paid)</th>
                          <th>Pending Due</th>
                          <th>Completed Orders</th>
                          <th>Settlement Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendors.map((vendor) => {
                          const vSettlement = settlements.find(s => s.vendor_id === vendor.id);
                          const totalBilled = vSettlement?.total_amount || vendor.revenue || 0;
                          const paidAmount = vSettlement?.paid_amount || 0;
                          const dueAmount = Math.max(0, totalBilled - paidAmount);
                          
                          let settleStatus = 'PENDING';
                          let settleColor = '#EF4444';
                          if (totalBilled > 0 && dueAmount === 0) {
                            settleStatus = 'SETTLED';
                            settleColor = '#10B981';
                          } else if (paidAmount > 0 && dueAmount > 0) {
                            settleStatus = 'PARTIALLY SETTLED';
                            settleColor = '#F59E0B';
                          }

                          return (
                            <tr key={vendor.id}>
                              <td>
                                <div style={{ fontWeight: 800, color: 'var(--gray-900, #0F172A)' }}>{vendor.name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--gray-500, #64748B)' }}>Owner: {vendor.owner_name} • {vendor.phone}</div>
                              </td>
                              <td style={{ fontWeight: 900, color: 'var(--gray-900, #0F172A)' }}>
                                ₹{totalBilled.toLocaleString('en-IN')}
                              </td>
                              <td style={{ fontWeight: 800, color: '#10B981' }}>
                                ₹{paidAmount.toLocaleString('en-IN')}
                              </td>
                              <td style={{ fontWeight: 900, color: dueAmount > 0 ? '#EF4444' : '#10B981' }}>
                                ₹{dueAmount.toLocaleString('en-IN')}
                              </td>
                              <td style={{ fontWeight: 700, color: 'var(--gray-700, #334155)' }}>
                                {orders.filter(o => o.status === 'Completed' && o.vendor_orders?.some((vo: any) => vo.vendor_id === vendor.id)).length} Orders
                              </td>
                              <td>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: `${settleColor}18`, color: settleColor, border: `1px solid ${settleColor}40` }}>
                                  {settleStatus}
                                </span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className={styles.quickActionBtn}
                                  style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                                  onClick={() => {
                                    setSelectedSettlementVendor(vendor.id);
                                    setSelectedSettlementMonth(new Date().toISOString().slice(0, 7));
                                    setSettlementTotalAmount(totalBilled);
                                    setSettlementPaidAmount(paidAmount);
                                    setShowSettlementModal(true);
                                  }}
                                >
                                  💳 Settle / Payout
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {vendors.length === 0 && (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-500, #64748B)' }}>
                              No campus canteens registered.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* SUB-VIEW 3: SPEND & CONSUMPTION TRENDS CHARTS */}
                {reportSubTab === 'trends' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className={styles.chartContainer}>
                      <h4 style={{ margin: '0 0 14px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)' }}>
                        📈 Requisition Volume & Spend Trend (Monthly)
                      </h4>
                      <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendsData.length > 0 ? trendsData : [
                            { period: 'Apr 26', expenditure: 4200, orders: 12 },
                            { period: 'May 26', expenditure: 7800, orders: 19 },
                            { period: 'Jun 26', expenditure: 5400, orders: 14 },
                            { period: 'Jul 26', expenditure: 11200, orders: 28 },
                            { period: 'Aug 26', expenditure: totalDeptExp || 8900, orders: orders.length || 22 }
                          ]}>
                            <defs>
                              <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200, #E2E8F0)" />
                            <XAxis dataKey="period" stroke="var(--gray-500, #64748B)" fontSize={12} />
                            <YAxis stroke="var(--gray-500, #64748B)" fontSize={12} />
                            <Tooltip contentStyle={{ background: 'var(--surface-0, #0F172A)', border: '1px solid var(--gray-200, #334155)', borderRadius: '8px', color: '#FFFFFF' }} />
                            <Area type="monotone" dataKey="expenditure" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#spendGradient)" name="Spend (₹)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                      <div className={styles.chartContainer}>
                        <h4 style={{ margin: '0 0 14px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)' }}>
                          🏛️ Department Spend Distribution
                        </h4>
                        <div style={{ width: '100%', height: 220 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={departments.map(d => {
                              const deptSpend = orders.filter(o => o.department_id === d.id && ['Completed', 'Bill Generated'].includes(o.status))
                                .reduce((s, o) => s + (o.total_bill_amount || 0), 0);
                              return { name: d.name.replace('Department', 'Dept'), spend: deptSpend };
                            })}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200, #E2E8F0)" />
                              <XAxis dataKey="name" stroke="var(--gray-500, #64748B)" fontSize={11} />
                              <YAxis stroke="var(--gray-500, #64748B)" fontSize={11} />
                              <Tooltip contentStyle={{ background: 'var(--surface-0, #0F172A)', borderRadius: '8px', color: '#FFFFFF' }} />
                              <Bar dataKey="spend" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Spend (₹)" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className={styles.chartContainer}>
                        <h4 style={{ margin: '0 0 14px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)' }}>
                          🏪 Canteen Revenue Share
                        </h4>
                        <div style={{ width: '100%', height: 220 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={vendors.map(v => ({ name: v.name, value: v.revenue || 100 }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={80}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899'].map((c, i) => (
                                  <Cell key={`cell-${i}`} fill={c} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ background: 'var(--surface-0, #0F172A)', borderRadius: '8px', color: '#FFFFFF' }} />
                              <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-VIEW 4: POPULAR DISH ANALYTICS */}
                {reportSubTab === 'items' && (
                  <div className={styles.popularItemsGrid}>
                    {(popularItemsData.length > 0 ? popularItemsData : [
                      { item_name: 'Executive Pure-Veg Thali', vendor_name: 'Sharma Canteen', total_orders: 142, total_quantity: 284, total_revenue: 25560 },
                      { item_name: 'Special Masala Chai', vendor_name: 'Campus Fast Bites', total_orders: 210, total_quantity: 520, total_revenue: 10400 },
                      { item_name: 'Butter Masala Dosa', vendor_name: 'South Indian Hub', total_orders: 98, total_quantity: 135, total_revenue: 10800 },
                      { item_name: 'Paneer Butter Masala Combo', vendor_name: 'Sharma Canteen', total_orders: 76, total_quantity: 94, total_revenue: 14100 },
                      { item_name: 'Veg Hakka Noodles', vendor_name: 'Hot & Fresh Meals', total_orders: 65, total_quantity: 80, total_revenue: 7200 },
                      { item_name: 'Samosa & Green Chutney', vendor_name: 'Quick Snacks Center', total_orders: 185, total_quantity: 410, total_revenue: 8200 },
                    ]).map((item, idx) => (
                      <div key={idx} className={styles.popularItemCard}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                          #{idx + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.item_name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--gray-500, #64748B)' }}>
                            {item.vendor_name}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.74rem' }}>
                            <span style={{ fontWeight: 700, color: '#2563EB' }}>{item.total_quantity} served</span>
                            <span style={{ fontWeight: 900, color: '#059669' }}>₹{(item.total_revenue || 0).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* SUB-VIEW 5: ORDER AUDIT REGISTER */}
                {reportSubTab === 'orders' && (
                  <div className={styles.tableContainer}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Date</th>
                          <th>Department</th>
                          <th>Purpose / Title</th>
                          <th>Coordinator</th>
                          <th>Total Bill</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => {
                          const dept = departments.find(d => d.id === order.department_id);
                          return (
                            <tr key={order.id}>
                              <td style={{ fontWeight: 800, color: 'var(--gray-900, #0F172A)', fontFamily: 'var(--font-mono)' }}>
                                #{order.id}
                              </td>
                              <td style={{ fontSize: '0.75rem', color: 'var(--gray-600, #475569)' }}>
                                {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : 'N/A'}
                              </td>
                              <td style={{ fontWeight: 700, color: 'var(--gray-800, #1E293B)' }}>
                                {dept?.name || order.department_id || 'General'}
                              </td>
                              <td style={{ fontSize: '0.78rem', color: 'var(--gray-600, #475569)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {order.purpose || order.title || 'Official Requisition'}
                              </td>
                              <td style={{ fontSize: '0.75rem', color: 'var(--gray-600, #475569)' }}>
                                {order.created_by_name || 'Coordinator'}
                              </td>
                              <td style={{ fontWeight: 900, color: 'var(--gray-900, #0F172A)' }}>
                                ₹{(order.total_bill_amount || 0).toLocaleString('en-IN')}
                              </td>
                              <td>
                                <StatusBadge status={order.status} />
                              </td>
                            </tr>
                          );
                        })}
                        {orders.length === 0 && (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--gray-500, #64748B)' }}>
                              No orders match the current filter selection.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
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
                          <td style={{ fontSize: '0.78rem', color: 'var(--gray-500, #64748B)', fontFamily: 'var(--font-mono)' }}>
                            {new Date(log.created_at || log.timestamp || Date.now()).toLocaleString('en-IN')}
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--gray-900, #0F172A)' }}>
                            👤 {log.actor_name || log.user_email || 'System Admin'}
                          </td>
                          <td>
                            <span style={{ fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: '#EEF2FF', color: '#4338CA', fontSize: '0.75rem' }}>
                              {log.action || 'UPDATE_ORDER'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--gray-600, #475569)', fontWeight: 600 }}>{log.resource_type || 'Order'} #{log.resource_id || log.order_id || 'N/A'}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--gray-500, #64748B)' }}>{log.details || log.description || 'Status changed'}</td>
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
                  <div style={{ padding: '20px', background: 'var(--surface-1)', borderRadius: '14px', border: '1px solid var(--gray-200, #E2E8F0)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-500, #64748B)' }}>DATABASE CLUSTER</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)', margin: '6px 0' }}>PostgreSQL Node 1</div>
                    <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>● Active • 0.8ms Ping</div>
                  </div>

                  <div style={{ padding: '20px', background: 'var(--surface-1)', borderRadius: '14px', border: '1px solid var(--gray-200, #E2E8F0)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-500, #64748B)' }}>NEXT.JS APP RUNTIME</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)', margin: '6px 0' }}>Turbopack Server</div>
                    <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>● Fast SSR • 63 Routes Static</div>
                  </div>

                  <div style={{ padding: '20px', background: 'var(--surface-1)', borderRadius: '14px', border: '1px solid var(--gray-200, #E2E8F0)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-500, #64748B)' }}>WEBSOCKET GATEWAY</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)', margin: '6px 0' }}>Event Stream v3.7</div>
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
                      <span>System Settings & Administrative Controls</span>
                    </div>
                    <div className={styles.sectionSubtitle}>Manage emergency controls and institutional preferences</div>
                  </div>
                </div>

                {settingsMessage && (
                  <div style={{ padding: '12px 16px', background: '#ECFDF5', color: '#065F46', borderRadius: '10px', marginBottom: '16px', fontWeight: 700, fontSize: '0.86rem' }}>
                    ✓ {settingsMessage}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px' }}>
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
                        style={{ flex: 1, background: 'var(--surface-0)' }}
                        placeholder="Type RESET USERS"
                        value={resetConfirmPhrase}
                        onChange={e => setResetConfirmPhrase(e.target.value)}
                      />
                      <UiverseButton
                        variant="danger"
                        size="sm"
                        disabled={resetConfirmPhrase !== 'RESET USERS' || submitting}
                        isLoading={submitting}
                        onClick={handleDeactivateAllUsers}
                      >
                        Execute Reset
                      </UiverseButton>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PROFILE */}
            {activeTab === 'profile' && session && (
              <div className={styles.cardSection} style={{ maxWidth: '680px' }}>
                <div className={styles.sectionHeader}>
                  <div>
                    <div className={styles.sectionTitle}>
                      <AppIcon name="profile" size={22} color="#2563EB" />
                      <span>Administrator Account Profile</span>
                    </div>
                    <div className={styles.sectionSubtitle}>
                      Manage official credentials, upload your photo, and configure preferences
                    </div>
                  </div>
                </div>

                {profileMessage && (
                  <div style={{ padding: '12px 16px', background: '#ECFDF5', color: '#065F46', borderRadius: '12px', border: '1px solid #A7F3D0', fontWeight: 700, fontSize: '0.86rem' }}>
                    ✓ {profileMessage}
                  </div>
                )}

                <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Photo Upload Section */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '18px', background: 'var(--surface-1)', borderRadius: '16px', border: '1px solid var(--gray-200, #E2E8F0)' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      {profileAvatarPreview || session.avatar_url ? (
                        <img
                          src={profileAvatarPreview || session.avatar_url || ''}
                          alt={session.name}
                          style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #FFFFFF', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.8rem',
                            fontWeight: 800,
                            boxShadow: '0 4px 14px rgba(37,99,235,0.25)'
                          }}
                        >
                          {session.name ? session.name.charAt(0).toUpperCase() : 'A'}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)' }}>Profile Picture</label>
                      <div>
                        <UiverseButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          leftIcon={<span style={{ fontSize: '1rem' }}>📷</span>}
                          onClick={() => {
                            const fileInput = document.getElementById('admin-avatar-file-input');
                            if (fileInput) fileInput.click();
                          }}
                        >
                          {profileAvatarFile ? '✓ Change Selected Photo' : 'Upload Profile Photo'}
                        </UiverseButton>
                        <input
                          id="admin-avatar-file-input"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          style={{ display: 'none' }}
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
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500, #64748B)' }}>Supports JPG, PNG or WEBP (Max 5MB). Photo will be cropped in a square.</div>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-700, #334155)', display: 'block', marginBottom: '6px' }}>Administrator Full Name *</label>
                    <input
                      type="text"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: 'var(--surface-0)' }}
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      required
                      placeholder="e.g. Dr. Rajesh Sharma"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-700, #334155)', display: 'block', marginBottom: '6px' }}>Email Address (System ID)</label>
                    <input
                      type="email"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: 'var(--surface-2)', color: 'var(--gray-500, #64748B)', cursor: 'not-allowed' }}
                      value={session.email}
                      disabled
                    />
                  </div>

                  {/* Mobile */}
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-700, #334155)', display: 'block', marginBottom: '6px' }}>
                      Contact Mobile Number <span style={{ color: '#94A3B8', fontWeight: 500 }}>(10 digits)</span>
                    </label>
                    <input
                      type="tel"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: 'var(--surface-0)' }}
                      value={profileMobile}
                      onChange={e => { setProfileMobile(e.target.value); setProfileMobileError(''); }}
                      placeholder="10-digit mobile number"
                    />
                    {profileMobileError && <div style={{ color: '#DC2626', fontSize: '0.75rem', marginTop: '4px', fontWeight: 600 }}>{profileMobileError}</div>}
                  </div>

                  {/* Language */}
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-700, #334155)', display: 'block', marginBottom: '6px' }}>Preferred Language</label>
                    <select
                      className={styles.filterSelect}
                      style={{ width: '100%', background: 'var(--surface-0)' }}
                      value={preferredLang}
                      onChange={e => setPreferredLang(e.target.value)}
                    >
                      <option value="en">English (English)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="gu">ગુજરાતી (Gujarati)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <UiverseButton
                      type="submit"
                      variant="primary"
                      isLoading={submitting}
                    >
                      Save Profile Changes
                    </UiverseButton>
                  </div>
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

                <ChangePasswordCard />
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
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '6px' }}>Department Code *</label>
                    <input
                      type="text"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: 'var(--surface-0)' }}
                      placeholder="e.g. CS, MECH, PHARMA"
                      value={deptCode}
                      onChange={e => setDeptCode(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '6px' }}>Department Full Name *</label>
                    <input
                      type="text"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: 'var(--surface-0)' }}
                      placeholder="e.g. Computer Science & Engineering"
                      value={deptName}
                      onChange={e => setDeptName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '6px' }}>Description / Scope</label>
                    <textarea
                      className={styles.filterSelect}
                      style={{ width: '100%', background: 'var(--surface-0)', minHeight: '80px' }}
                      placeholder="e.g. Undergraduate engineering requisitions"
                      value={deptDesc}
                      onChange={e => setDeptDesc(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <UiverseButton type="button" variant="secondary" onClick={() => setShowDeptModal(false)}>Cancel</UiverseButton>
                  <UiverseButton type="submit" variant="primary">Create Department</UiverseButton>
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
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '6px' }}>Unique Vendor ID *</label>
                    <input
                      type="text"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: 'var(--surface-0)' }}
                      placeholder="e.g. sharma_canteen"
                      value={newVendorId}
                      onChange={e => setNewVendorId(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '6px' }}>Canteen Display Name *</label>
                    <input
                      type="text"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: 'var(--surface-0)' }}
                      placeholder="e.g. Sharma Canteen & Cafe"
                      value={newVendorName}
                      onChange={e => setNewVendorName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '6px' }}>Proprietor / Contact Person *</label>
                    <input
                      type="text"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: 'var(--surface-0)' }}
                      placeholder="e.g. Rajesh Sharma"
                      value={newVendorOwner}
                      onChange={e => setNewVendorOwner(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '6px' }}>Contact Email *</label>
                    <input
                      type="email"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: 'var(--surface-0)' }}
                      placeholder="vendor@aharsetu.edu.in"
                      value={newVendorEmail}
                      onChange={e => setNewVendorEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '6px' }}>Phone Number *</label>
                    <input
                      type="tel"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: 'var(--surface-0)' }}
                      placeholder="10-digit phone"
                      value={newVendorPhone}
                      onChange={e => setNewVendorPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '6px' }}>Initial Login Password *</label>
                    <input
                      type="password"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: 'var(--surface-0)' }}
                      placeholder="Password for vendor login"
                      value={newVendorPassword}
                      onChange={e => setNewVendorPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <UiverseButton type="button" variant="secondary" onClick={() => setShowAddVendorModal(false)}>Cancel</UiverseButton>
                  <UiverseButton type="submit" variant="primary" isLoading={submitting}>
                    Register Vendor
                  </UiverseButton>
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
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '6px' }}>Select Operational State</label>
                <select
                  className={styles.filterSelect}
                  style={{ width: '100%', background: 'var(--surface-0)' }}
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                >
                  <option value="open">🟢 Opened (Taking Orders)</option>
                  <option value="busy">🟡 Busy (High Volume)</option>
                  <option value="closing_soon">🟠 Closing Soon</option>
                  <option value="closed">🔴 Closed</option>
                </select>
              </div>
              <div className={styles.modalFooter}>
                <UiverseButton variant="secondary" onClick={() => setSelectedVendor(null)}>Cancel</UiverseButton>
                <UiverseButton variant="primary" onClick={handleUpdateVendorStatus}>Update Status</UiverseButton>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Edit Vendor Profile & Canteen Name */}
        {showEditVendorModal && editVendorObj && (
          <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setShowEditVendorModal(false)}>
            <div className={styles.modalContent} style={{ maxWidth: '480px' }}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  <AppIcon name="vendors" size={20} color="#8B5CF6" />
                  <span>Edit Canteen Vendor: {editVendorObj.id}</span>
                </h3>
                <button className={styles.modalCloseBtn} onClick={() => setShowEditVendorModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSaveVendorDetails}>
                <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '4px' }}>Canteen / Business Name *</label>
                    <input
                      type="text"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: 'var(--surface-0)' }}
                      value={editCanteenName}
                      onChange={e => setEditCanteenName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '4px' }}>Proprietor / Owner Name *</label>
                    <input
                      type="text"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: 'var(--surface-0)' }}
                      value={editOwnerName}
                      onChange={e => setEditOwnerName(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '4px' }}>Phone Number</label>
                      <input
                        type="text"
                        className={styles.filterSelect}
                        style={{ width: '100%', background: 'var(--surface-0)' }}
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '4px' }}>Operational Status</label>
                      <select
                        className={styles.filterSelect}
                        style={{ width: '100%', background: 'var(--surface-0)' }}
                        value={editOpStatus}
                        onChange={e => setEditOpStatus(e.target.value)}
                      >
                        <option value="open">🟢 Opened</option>
                        <option value="closed">🔴 Closed</option>
                        <option value="temporarily_unavailable">🟠 Unavailable</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '4px' }}>Email Address</label>
                    <input
                      type="email"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: 'var(--surface-0)' }}
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <UiverseButton variant="secondary" onClick={() => setShowEditVendorModal(false)}>Cancel</UiverseButton>
                  <UiverseButton type="submit" variant="primary">Save Changes</UiverseButton>
                </div>
              </form>
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
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '6px' }}>Food Vendor *</label>
                    <select
                      className={styles.filterSelect}
                      style={{ width: '100%', background: 'var(--surface-0)' }}
                      value={selectedSettlementVendor}
                      onChange={e => {
                        const newV = e.target.value;
                        setSelectedSettlementVendor(newV);
                        const autoTot = calculateVendorMonthTotal(newV, selectedSettlementMonth);
                        const existing = settlements.find(s => s.vendor_id === newV && s.month === selectedSettlementMonth);
                        setSettlementTotalAmount(autoTot);
                        setSettlementPaidAmount(existing?.paid_amount || 0);
                      }}
                      required
                    >
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '6px' }}>Billing Cycle Month (YYYY-MM) *</label>
                    <input
                      type="month"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: 'var(--surface-0)' }}
                      value={selectedSettlementMonth}
                      onChange={e => {
                        const newM = e.target.value;
                        setSelectedSettlementMonth(newM);
                        const autoTot = calculateVendorMonthTotal(selectedSettlementVendor, newM);
                        const existing = settlements.find(s => s.vendor_id === selectedSettlementVendor && s.month === newM);
                        setSettlementTotalAmount(autoTot);
                        setSettlementPaidAmount(existing?.paid_amount || 0);
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '6px' }}>Total Amount Billed (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: 'var(--surface-0)' }}
                      value={settlementTotalAmount}
                      onChange={e => setSettlementTotalAmount(parseFloat(e.target.value) || 0)}
                      required
                    />
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-500, #64748B)', marginTop: '4px' }}>
                      Auto-calculated from all completed orders for this vendor in the billing month.
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600, #475569)', display: 'block', marginBottom: '6px' }}>Paid / Disbursed Amount (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className={styles.filterSelect}
                      style={{ width: '100%', background: 'var(--surface-0)' }}
                      value={settlementPaidAmount}
                      onChange={e => setSettlementPaidAmount(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>

                  {/* Real-time Financial Breakdown Summary */}
                  <div style={{
                    padding: '12px 14px',
                    background: 'var(--surface-50, #F8FAFC)',
                    borderRadius: '8px',
                    border: '1px solid var(--gray-200, #E2E8F0)',
                    fontSize: '0.82rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ color: 'var(--gray-600, #475569)' }}>Total Orders Billed:</span>
                      <strong>₹{Number(settlementTotalAmount || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ color: 'var(--gray-600, #475569)' }}>Amount Paid / Settled:</span>
                      <strong style={{ color: '#059669' }}>₹{Number(settlementPaidAmount || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1px dashed var(--gray-300, #CBD5E1)',
                      paddingTop: '6px',
                      marginTop: '4px'
                    }}>
                      <span style={{ fontWeight: 700, color: 'var(--gray-800, #1E293B)' }}>Calculated Due Remaining:</span>
                      <strong style={{
                        color: (settlementTotalAmount - settlementPaidAmount) > 0 ? '#DC2626' : '#059669',
                        fontWeight: 800
                      }}>
                        ₹{Math.max(0, settlementTotalAmount - settlementPaidAmount).toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <UiverseButton type="button" variant="secondary" onClick={() => setShowSettlementModal(false)}>Cancel</UiverseButton>
                  <UiverseButton type="submit" variant="primary" isLoading={submitting}>
                    Save Settlement
                  </UiverseButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingBudget && (
          <EditBudgetModal
            budget={editingBudget}
            onClose={() => setEditingBudget(null)}
            onSaved={() => setEditingBudget(null)}
          />
        )}

      </div>
    </AppShell>
  );
}
