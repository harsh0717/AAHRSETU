'use client';
/**
 * Administration Payments & Settlements Hub
 * Professional-grade payment tracking, aging analysis, direct disbursement recording,
 * and monthly settlement finalization workflow.
 * All financial calculations are server-computed (vendor-bills only, no double-counting).
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { getSession, UserProfile } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { api } from '@/lib/api';

interface Settlement {
  id: number;
  settlement_number: string;
  month: number;
  year: number;
  month_name: string;
  total_bills: number;
  total_amount: number;
  settled_amount: number;
  pending_amount: number;
  status: 'DRAFT' | 'FINALIZED' | 'REOPENED';
  created_at: string;
  finalized_at: string | null;
  creator_name: string | null;
  department_breakdown: DeptBreakdown[];
  vendor_breakdown: VendorBreakdown[];
}

interface DeptBreakdown {
  department_id: string;
  department_name: string;
  bill_count: number;
  total_amount: number;
  settled_amount: number;
  pending_amount: number;
}

interface VendorBreakdown {
  vendor_id: string;
  vendor_name: string;
  bill_count: number;
  total_amount: number;
  settled_amount: number;
  pending_amount: number;
}

interface VendorPaymentDetail {
  utr: string;
  mode: string;
  bank_name: string;
  notes: string;
}

interface OutstandingVendor {
  vendor_id: string;
  vendor_name: string;
  owner_name: string;
  phone: string;
  email: string;
  total_billed: number;
  total_paid: number;
  outstanding: number;
  settled_bills_count: number;
  pending_bills_count: number;
  total_bills_count: number;
  aging_0_30: number;
  aging_31_60: number;
  aging_over_60: number;
  last_payment_date: string | null;
  last_payment_amount: number | null;
  last_payment_ref: string | null;
}

interface OutstandingData {
  as_of: string;
  summary: {
    grand_billed: number;
    grand_paid: number;
    grand_outstanding: number;
    aging_0_30: number;
    aging_31_60: number;
    aging_over_60: number;
    total_pending_bills: number;
    vendors_with_dues_count: number;
    total_vendors_count: number;
  };
  vendors: OutstandingVendor[];
}

interface PaymentRecord {
  id: number;
  payment_reference: string;
  settlement_id: number | null;
  vendor_id: string;
  vendor_name: string;
  amount: number;
  currency: string;
  payment_method: string;
  bank_name: string | null;
  status: string;
  notes: string | null;
  payment_date: string | null;
  created_by: string | null;
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const PAYMENT_MODES = ['NEFT', 'RTGS', 'UPI', 'Cheque', 'Cash', 'IMPS', 'DD'];
const POPULAR_BANKS = ['State Bank of India (SBI)', 'HDFC Bank', 'ICICI Bank', 'Canara Bank', 'Punjab National Bank', 'Bank of Baroda', 'Axis Bank', 'Union Bank', 'Other Bank'];

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  'DRAFT':     { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA', label: 'Draft' },
  'FINALIZED': { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', label: 'Finalized' },
  'REOPENED':  { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', label: 'Reopened' },
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '8px',
  border: '1px solid #CBD5E1',
  fontSize: '0.85rem',
  background: 'white',
  boxSizing: 'border-box',
  color: '#0F172A',
  outline: 'none',
};

export default function SettlementsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [session, setSession] = useState<UserProfile | null>(null);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'record_payment' | 'history' | 'new'>('overview');

  // Overview / Outstanding state
  const [outstandingData, setOutstandingData] = useState<OutstandingData | null>(null);
  const [outstandingLoading, setOutstandingLoading] = useState(true);

  // Payments log state
  const [paymentsList, setPaymentsList] = useState<PaymentRecord[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentVendorFilter, setPaymentVendorFilter] = useState<string>('all');

  // Record Payment Form state
  const [payVendorId, setPayVendorId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('NEFT');
  const [payBank, setPayBank] = useState('State Bank of India (SBI)');
  const [payUtr, setPayUtr] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Settlement History state
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // New Settlement Form state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [draft, setDraft] = useState<Settlement | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [vendorPayments, setVendorPayments] = useState<Record<string, VendorPaymentDetail>>({});

  // Global messages & loading
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Quick Pay Modal from Overview tab
  const [quickPayVendor, setQuickPayVendor] = useState<OutstandingVendor | null>(null);

  const loadOutstanding = useCallback(async () => {
    setOutstandingLoading(true);
    try {
      const data = await api.get<OutstandingData>('/settlements/outstanding');
      setOutstandingData(data);
    } catch (err) {
      console.warn('[Settlements] Failed to load outstanding dues:', err);
    } finally {
      setOutstandingLoading(false);
    }
  }, []);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const data = await api.get<PaymentRecord[]>('/settlements/payments');
      setPaymentsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('[Settlements] Failed to load payments list:', err);
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  const loadSettlements = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await api.get<Settlement[]>('/settlements');
      setSettlements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('[Settlements] Failed to load settlements history:', err);
      setSettlements([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadOutstanding(), loadPayments(), loadSettlements()]);
  }, [loadOutstanding, loadPayments, loadSettlements]);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace('/login'); return; }
    if (s.role !== 'dcr' && s.role !== 'administration' && s.role !== 'admin') {
      router.replace(`/${s.role}`);
      return;
    }
    setSession(s);
    refreshAll();
  }, [refreshAll]);

  // Initialise per-vendor details when draft loads
  const initVendorPayments = (vendors: VendorBreakdown[]) => {
    const init: Record<string, VendorPaymentDetail> = {};
    vendors.forEach(v => {
      init[v.vendor_id] = { utr: '', mode: 'NEFT', bank_name: 'State Bank of India (SBI)', notes: '' };
    });
    setVendorPayments(init);
  };

  const handleCalculate = async () => {
    setCalculating(true);
    setError('');
    setDraft(null);
    try {
      const existing = settlements.find(s => s.month === selectedMonth && s.year === selectedYear);
      if (existing && existing.status === 'FINALIZED') {
        setError(`Settlement for ${MONTHS[selectedMonth - 1]} ${selectedYear} is already finalized.`);
        return;
      }
      const data = await api.post<Settlement>('/settlements', {
        month: selectedMonth,
        year: selectedYear,
        notes,
      });
      setDraft(data);
      initVendorPayments(data.vendor_breakdown || []);
      await loadSettlements();
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Failed to create settlement. Please try again.');
    } finally {
      setCalculating(false);
    }
  };

  const handleFinalize = async () => {
    if (!draft) return;
    setFinalizing(true);
    setError('');
    try {
      await api.post(`/settlements/${draft.id}/finalize`, {
        vendor_payments: vendorPayments
      });
      setSuccessMsg(`Settlement ${draft.settlement_number} finalized successfully! All ${draft.vendor_breakdown?.length || 0} vendor(s) recorded.`);
      setDraft(null);
      setConfirmOpen(false);
      setVendorPayments({});
      await refreshAll();
      setActiveTab('history');
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Finalization failed. Please verify settlement totals.');
    } finally {
      setFinalizing(false);
    }
  };

  const updateVendorPayment = (vendorId: string, field: keyof VendorPaymentDetail, value: string) => {
    setVendorPayments(prev => ({
      ...prev,
      [vendorId]: { ...prev[vendorId], [field]: value },
    }));
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payVendorId) {
      setError('Please select a vendor.');
      return;
    }
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    setRecordingPayment(true);
    setError('');
    try {
      const res = await api.post<any>('/settlements/payments', {
        vendor_id: payVendorId,
        amount: amt,
        payment_method: payMode,
        bank_name: payBank,
        payment_reference: payUtr,
        payment_date: payDate,
        notes: payNotes
      });
      setSuccessMsg(`Payment of ₹${amt.toLocaleString('en-IN')} recorded successfully! Ref: ${res.payment_reference}`);
      setPayAmount('');
      setPayUtr('');
      setPayNotes('');
      setQuickPayVendor(null);
      await refreshAll();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Failed to record payment transaction.');
    } finally {
      setRecordingPayment(false);
    }
  };

  const openQuickPay = (vendor: OutstandingVendor) => {
    setPayVendorId(vendor.vendor_id);
    setPayAmount(vendor.outstanding > 0 ? String(vendor.outstanding) : '');
    setPayUtr(`UTR-${Date.now().toString().slice(-6)}`);
    setPayNotes(`Dues settlement for ${vendor.vendor_name}`);
    setQuickPayVendor(vendor);
    setActiveTab('record_payment');
  };

  const handleExport = async (settlementId: number, type: 'pdf' | 'excel', number: string) => {
    setExportLoading(`${settlementId}-${type}`);
    try {
      const token = sessionStorage.getItem('aharsetu_access_token') || localStorage.getItem('aharsetu_access_token');
      const res = await fetch(`/api/v1/settlements/${settlementId}/export/${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `AaharSetu_Settlement_${number}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert('Export failed. Please try again.');
    } finally {
      setExportLoading(null);
    }
  };

  const fmtAmount = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtDateTime = (s: string | null) => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  if (!session) return null;

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];
  const vendorsInDraft = draft?.vendor_breakdown || [];
  const grandDraftTotal = vendorsInDraft.reduce((sum, v) => sum + v.total_amount, 0);

  const selectedPayVendorObj = outstandingData?.vendors.find(v => v.vendor_id === payVendorId);
  const filteredPayments = paymentVendorFilter === 'all' 
    ? paymentsList 
    : paymentsList.filter(p => p.vendor_id === paymentVendorFilter);

  return (
    <AppShell role={(session.role as 'dcr' | 'administration') || 'dcr'} currentPath="/dcr/settlements">
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Top Header Card */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '20px 24px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Link href="/dcr" style={{ color: '#64748B', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600 }}>Administration</Link>
              <span style={{ color: '#CBD5E1' }}>›</span>
              <span style={{ fontSize: '0.82rem', color: '#0D9488', fontWeight: 700 }}>Payments & Settlements</span>
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 4px', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>💳</span> Vendor Payments & Settlements
            </h1>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748B' }}>
              Enterprise financial ledger, aging analytics, direct disbursement recording, and monthly reconciliation.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Link href="/dcr/bills" style={{ padding: '8px 14px', borderRadius: '8px', background: '#F8FAFC', color: '#0F766E', border: '1px solid #CBD5E1', textDecoration: 'none', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🧾 All Bills
            </Link>
            <button onClick={refreshAll} style={{ padding: '8px 14px', borderRadius: '8px', background: '#F0FDFA', color: '#0D9488', border: '1px solid #99F6E4', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🔄 Refresh Data
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#15803D', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ✅ {successMsg}
          </div>
        )}
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#991B1B', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚠️ {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B', fontWeight: 800, fontSize: '1rem' }}>✕</button>
          </div>
        )}

        {/* Main Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px', overflowX: 'auto' }}>
          {[
            { id: 'overview', label: '📊 Dues & Aging Overview', count: outstandingData?.summary.vendors_with_dues_count ? `${outstandingData.summary.vendors_with_dues_count} with dues` : undefined },
            { id: 'record_payment', label: '💸 Record Payment', count: paymentsList.length > 0 ? `${paymentsList.length} logs` : undefined },
            { id: 'history', label: '📋 Monthly Settlements', count: settlements.length > 0 ? `${settlements.length}` : undefined },
            { id: 'new', label: '➕ New Monthly Settlement' },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: isActive ? '#0D9488' : '#F1F5F9',
                  color: isActive ? 'white' : '#475569',
                  boxShadow: isActive ? '0 2px 8px rgba(13, 148, 136, 0.25)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.label}</span>
                {tab.count && (
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '2px 7px',
                    borderRadius: '12px',
                    background: isActive ? 'rgba(255,255,255,0.25)' : '#E2E8F0',
                    color: isActive ? 'white' : '#64748B',
                    fontWeight: 800
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OUTSTANDING DUES & AGING OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* KPI Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '18px 20px', borderLeft: '5px solid #DC2626' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Outstanding Dues</span>
                  <span style={{ fontSize: '1.1rem' }}>⏳</span>
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#991B1B' }}>
                  {outstandingLoading ? '...' : fmtAmount(outstandingData?.summary.grand_outstanding || 0)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                  Across {outstandingData?.summary.vendors_with_dues_count || 0} vendor(s) with pending bills
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '18px 20px', borderLeft: '5px solid #059669' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Disbursed / Paid</span>
                  <span style={{ fontSize: '1.1rem' }}>✅</span>
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#059669' }}>
                  {outstandingLoading ? '...' : fmtAmount(outstandingData?.summary.grand_paid || 0)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                  Total cleared payment disbursements
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '18px 20px', borderLeft: '5px solid #0284C7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Invoiced / Billed</span>
                  <span style={{ fontSize: '1.1rem' }}>🧾</span>
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#0369A1' }}>
                  {outstandingLoading ? '...' : fmtAmount(outstandingData?.summary.grand_billed || 0)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                  {outstandingData?.summary.total_pending_bills || 0} pending bill records
                </div>
              </div>
            </div>

            {/* Aging Breakdown Buckets Banner */}
            <div style={{ background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⏱️</span> Outstanding Payables Aging Analysis
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Real-time maturity tracking</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #86EFAC', padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803D', textTransform: 'uppercase' }}>🟢 0 - 30 Days (Current)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#15803D', marginTop: '4px' }}>
                    {outstandingLoading ? '...' : fmtAmount(outstandingData?.summary.aging_0_30 || 0)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>Normal payment window</div>
                </div>

                <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #FDE047', padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#B45309', textTransform: 'uppercase' }}>🟡 31 - 60 Days (Due)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#B45309', marginTop: '4px' }}>
                    {outstandingLoading ? '...' : fmtAmount(outstandingData?.summary.aging_31_60 || 0)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>Requires upcoming clearance</div>
                </div>

                <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #FCA5A5', padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#B91C1C', textTransform: 'uppercase' }}>🔴 &gt; 60 Days (Overdue)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#B91C1C', marginTop: '4px' }}>
                    {outstandingLoading ? '...' : fmtAmount(outstandingData?.summary.aging_over_60 || 0)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>Priority settlement needed</div>
                </div>
              </div>
            </div>

            {/* Vendor Outstanding Table */}
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: '#FAF5FF' }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 800, color: '#581C87', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🍽️</span> Vendor Dues & Settlement Register
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#7E22CE' }}>
                    Click &quot;Pay Vendor&quot; to disburse funds, or &quot;Passbook&quot; to inspect full debit/credit history.
                  </p>
                </div>
                <button onClick={() => setActiveTab('record_payment')} style={{ padding: '8px 14px', borderRadius: '8px', background: '#0D9488', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  💸 Direct Payment Entry
                </button>
              </div>

              {outstandingLoading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div> Loading vendor ledger analytics...
                </div>
              ) : !outstandingData || outstandingData.vendors.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎉</div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1E293B' }}>All vendor accounts are clear!</div>
                  <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>No outstanding dues or pending vendor bills found.</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Vendor / Contact</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>Total Invoiced</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>Total Paid</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>Net Outstanding</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Aging Breakdown</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Last Payment</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outstandingData.vendors.map((v, idx) => {
                        const hasDues = v.outstanding > 0;
                        return (
                          <tr key={v.vendor_id} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? 'white' : '#FAFAFA' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>🍽️ {v.vendor_name}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                                Owner: {v.owner_name} · 📞 {v.phone}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#475569' }}>
                              {fmtAmount(v.total_billed)}
                              <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{v.total_bills_count} bills</div>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                              {fmtAmount(v.total_paid)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <span style={{
                                fontSize: '1rem',
                                fontWeight: 900,
                                color: hasDues ? '#DC2626' : '#15803D'
                              }}>
                                {fmtAmount(v.outstanding)}
                              </span>
                              {hasDues && (
                                <div style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 700 }}>
                                  {v.pending_bills_count} pending bill{v.pending_bills_count !== 1 ? 's' : ''}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                {v.aging_0_30 > 0 && (
                                  <span style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', borderRadius: '6px', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 700 }} title="0-30 days old">
                                    0-30d: {fmtAmount(v.aging_0_30)}
                                  </span>
                                )}
                                {v.aging_31_60 > 0 && (
                                  <span style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', borderRadius: '6px', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 700 }} title="31-60 days old">
                                    31-60d: {fmtAmount(v.aging_31_60)}
                                  </span>
                                )}
                                {v.aging_over_60 > 0 && (
                                  <span style={{ background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5', borderRadius: '6px', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 800 }} title="Over 60 days overdue">
                                    &gt;60d: {fmtAmount(v.aging_over_60)}
                                  </span>
                                )}
                                {!hasDues && (
                                  <span style={{ color: '#15803D', fontSize: '0.75rem', fontWeight: 700 }}>Settled 0.00</span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              {v.last_payment_date ? (
                                <div>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                                    {fmtDate(v.last_payment_date)}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontFamily: 'monospace' }}>
                                    {v.last_payment_ref || 'Bank Transfer'}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>No recent payment</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                {hasDues && (
                                  <button
                                    onClick={() => openQuickPay(v)}
                                    style={{
                                      padding: '5px 12px',
                                      borderRadius: '6px',
                                      background: '#0D9488',
                                      color: 'white',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontWeight: 700,
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    💳 Pay Dues
                                  </button>
                                )}
                                <Link
                                  href={`/dcr/settlements/vendor/${v.vendor_id}`}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    background: '#EFF6FF',
                                    color: '#1D4ED8',
                                    border: '1px solid #BFDBFE',
                                    textDecoration: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  📖 Passbook
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: RECORD PAYMENT (DIRECT DISBURSEMENT & LOGS) */}
        {/* ========================================================================= */}
        {activeTab === 'record_payment' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '20px', alignItems: 'start' }}>
            {/* Payment Form */}
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', background: '#F0FDFA' }}>
                <h3 style={{ margin: 0, fontWeight: 800, color: '#0F766E', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>💳</span> Record Vendor Payment Entry
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  Log actual bank disbursement to vendor account with UTR audit trail.
                </p>
              </div>

              <form onSubmit={handleRecordPaymentSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '6px', fontSize: '0.82rem' }}>
                    Select Vendor <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <select
                    value={payVendorId}
                    onChange={e => {
                      const vId = e.target.value;
                      setPayVendorId(vId);
                      const target = outstandingData?.vendors.find(v => v.vendor_id === vId);
                      if (target && target.outstanding > 0) {
                        setPayAmount(String(target.outstanding));
                      }
                    }}
                    style={inputStyle}
                    required
                  >
                    <option value="">-- Choose Canteen Vendor --</option>
                    {outstandingData?.vendors.map(v => (
                      <option key={v.vendor_id} value={v.vendor_id}>
                        {v.vendor_name} (Due: ₹{v.outstanding.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vendor Balance Live Indicator */}
                {selectedPayVendorObj && (
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Current Outstanding</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: selectedPayVendorObj.outstanding > 0 ? '#DC2626' : '#15803D' }}>
                        {fmtAmount(selectedPayVendorObj.outstanding)}
                      </div>
                    </div>
                    {selectedPayVendorObj.outstanding > 0 && (
                      <button
                        type="button"
                        onClick={() => setPayAmount(String(selectedPayVendorObj.outstanding))}
                        style={{ padding: '4px 10px', borderRadius: '6px', background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
                      >
                        ⚡ Set Full Amount
                      </button>
                    )}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '6px', fontSize: '0.82rem' }}>
                      Amount (₹) <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="e.g. 15000"
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value)}
                      style={inputStyle}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '6px', fontSize: '0.82rem' }}>
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={e => setPayDate(e.target.value)}
                      style={inputStyle}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '6px', fontSize: '0.82rem' }}>
                      Payment Mode
                    </label>
                    <select
                      value={payMode}
                      onChange={e => setPayMode(e.target.value)}
                      style={inputStyle}
                    >
                      {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '6px', fontSize: '0.82rem' }}>
                      Bank Name
                    </label>
                    <select
                      value={payBank}
                      onChange={e => setPayBank(e.target.value)}
                      style={inputStyle}
                    >
                      {POPULAR_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '6px', fontSize: '0.82rem' }}>
                    UTR / Cheque / Transaction Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-SBI-2026082600129"
                    value={payUtr}
                    onChange={e => setPayUtr(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '6px', fontSize: '0.82rem' }}>
                    Notes / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cleared via Institutional Account"
                    value={payNotes}
                    onChange={e => setPayNotes(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <button
                  type="submit"
                  disabled={recordingPayment}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#0D9488',
                    color: 'white',
                    border: 'none',
                    cursor: recordingPayment ? 'not-allowed' : 'pointer',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {recordingPayment ? '⏳ Recording...' : '💾 Save Payment Record'}
                </button>
              </form>
            </div>

            {/* Payment Transactions Log */}
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 800, color: '#1E293B', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📜</span> Disbursement Transaction Log
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                    Historical record of all payments made to vendors.
                  </p>
                </div>

                <select
                  value={paymentVendorFilter}
                  onChange={e => setPaymentVendorFilter(e.target.value)}
                  style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: '0.78rem' }}
                >
                  <option value="all">All Vendors</option>
                  {outstandingData?.vendors.map(v => (
                    <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>
                  ))}
                </select>
              </div>

              {paymentsLoading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div> Loading disbursement log...
                </div>
              ) : filteredPayments.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📝</div>
                  <div style={{ fontWeight: 700 }}>No payment transactions found</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Recorded payments will appear here in chronological order.</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', maxHeight: '550px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Date & Ref</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Vendor</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Mode & Bank</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map((p, idx) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? 'white' : '#FAFAFA' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>{fmtDate(p.payment_date)}</div>
                            <div style={{ fontSize: '0.72rem', color: '#0D9488', fontFamily: 'monospace', fontWeight: 700 }}>
                              {p.payment_reference}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 700, color: '#334155' }}>{p.vendor_name}</div>
                            {p.notes && <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{p.notes}</div>}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#F1F5F9', color: '#334155', fontWeight: 700, fontSize: '0.72rem' }}>
                              {p.payment_method}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>{p.bank_name || 'Direct Transfer'}</div>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 900, color: '#059669', fontSize: '0.92rem' }}>
                            {fmtAmount(p.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MONTHLY SETTLEMENTS HISTORY */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 800, color: '#1E293B', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📋</span> Monthly Reconciliation Ledger
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  Permanent monthly audit records and institution reconciliation summaries.
                </p>
              </div>
              <button onClick={() => setActiveTab('new')} style={{ padding: '8px 14px', borderRadius: '8px', background: '#0D9488', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ➕ Generate Monthly Settlement
              </button>
            </div>

            {historyLoading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#9CA3AF' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div> Loading settlements...
              </div>
            ) : settlements.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#9CA3AF' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>💳</div>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>No monthly settlements created yet</div>
                <div style={{ fontSize: '0.85rem', marginBottom: '16px' }}>Calculate and finalize monthly settlements to maintain permanent records.</div>
                <button onClick={() => setActiveTab('new')} style={{ padding: '10px 20px', borderRadius: '8px', background: '#0D9488', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                  ➕ Create First Monthly Settlement
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Settlement #</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Period</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Vendor Bills</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Total Amount</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Finalized At</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((s, idx) => {
                      const ss = STATUS_STYLES[s.status] || STATUS_STYLES['DRAFT'];
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid #F3F4F6', background: idx % 2 === 0 ? 'white' : '#FAFAFA' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0F766E', fontFamily: 'monospace' }}>{s.settlement_number}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 700 }}>{MONTHS[s.month - 1]} {s.year}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: '#374151' }}>{s.total_bills}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>{fmtAmount(s.total_amount)}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: ss.bg, color: ss.text, border: `1px solid ${ss.border}` }}>
                              {ss.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#6B7280', fontSize: '0.8rem' }}>
                            {s.finalized_at ? fmtDateTime(s.finalized_at) : '—'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                              <Link href={`/dcr/settlements/${s.id}`} style={{ padding: '5px 10px', borderRadius: '6px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', textDecoration: 'none', fontWeight: 700, fontSize: '0.75rem' }}>
                                📊 View Details
                              </Link>
                              <button
                                onClick={() => handleExport(s.id, 'pdf', s.settlement_number)}
                                disabled={exportLoading === `${s.id}-pdf`}
                                style={{ padding: '5px 10px', borderRadius: '6px', background: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
                              >
                                {exportLoading === `${s.id}-pdf` ? '⏳' : '📄'} PDF
                              </button>
                              <button
                                onClick={() => handleExport(s.id, 'excel', s.settlement_number)}
                                disabled={exportLoading === `${s.id}-excel`}
                                style={{ padding: '5px 10px', borderRadius: '6px', background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
                              >
                                {exportLoading === `${s.id}-excel` ? '⏳' : '📊'} Excel
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: NEW MONTHLY SETTLEMENT WORKFLOW */}
        {/* ========================================================================= */}
        {activeTab === 'new' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Step 1: Configure */}
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', background: '#F0FDFA' }}>
                <h3 style={{ margin: 0, fontWeight: 800, color: '#0F766E', fontSize: '1rem' }}>Step 1 — Select Reconciliation Period</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6B7280' }}>Choose the month and year to consolidate vendor bill totals</p>
              </div>
              <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '6px', fontSize: '0.85rem' }}>Month</label>
                  <select value={selectedMonth} onChange={e => { setSelectedMonth(Number(e.target.value)); setDraft(null); setVendorPayments({}); }} style={{ ...inputStyle, padding: '10px 12px' }}>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '6px', fontSize: '0.85rem' }}>Year</label>
                  <select value={selectedYear} onChange={e => { setSelectedYear(Number(e.target.value)); setDraft(null); setVendorPayments({}); }} style={{ ...inputStyle, padding: '10px 12px' }}>
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '6px', fontSize: '0.85rem' }}>Notes (optional)</label>
                  <input
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Monthly settlement Aug 2026"
                    style={{ ...inputStyle, padding: '10px 12px' }}
                  />
                </div>
                <div>
                  <button
                    onClick={handleCalculate}
                    disabled={calculating}
                    style={{ width: '100%', padding: '11px', borderRadius: '8px', background: '#0D9488', color: 'white', border: 'none', cursor: calculating ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    {calculating ? '⏳ Calculating...' : '🔢 Calculate Settlement'}
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: Per-vendor review cards */}
            {draft && (
              <div style={{ background: 'white', borderRadius: '14px', border: '2px solid #0D9488', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', background: '#F0FDF4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 800, color: '#15803D', fontSize: '1rem' }}>
                      Step 2 — Verify & Record Vendor Disbursements
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6B7280' }}>
                      {MONTHS[draft.month - 1]} {draft.year} · {draft.settlement_number} · {vendorsInDraft.length} vendor{vendorsInDraft.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '8px', padding: '6px 14px', fontWeight: 900, color: '#15803D', fontSize: '1.05rem' }}>
                    Total to Settle: {fmtAmount(grandDraftTotal)}
                  </div>
                </div>

                {vendorsInDraft.length === 0 ? (
                  <div style={{ padding: '36px', textAlign: 'center', color: '#9CA3AF' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔍</div>
                    <div style={{ fontWeight: 700 }}>No vendor bills found for this period</div>
                    <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Make sure orders are completed and invoiced for {MONTHS[draft.month - 1]} {draft.year}.</div>
                  </div>
                ) : (
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '10px 14px', fontSize: '0.8rem', color: '#1E40AF' }}>
                      ℹ️ Each vendor is settled <strong>separately</strong>. Amounts shown are derived strictly from vendor bills (master department invoices are excluded to prevent double-counting).
                    </div>

                    {vendorsInDraft.map((v, i) => {
                      const vp = vendorPayments[v.vendor_id] || { utr: '', mode: 'NEFT', bank_name: 'State Bank of India (SBI)', notes: '' };
                      return (
                        <div key={v.vendor_id} style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{ padding: '12px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ background: '#0D9488', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                                {i + 1}
                              </span>
                              <div>
                                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>🍽️ {v.vendor_name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{v.bill_count} bill{v.bill_count !== 1 ? 's' : ''} in period</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>Disbursement Amount</div>
                              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#059669' }}>{fmtAmount(v.total_amount)}</div>
                            </div>
                          </div>

                          <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                            <div>
                              <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '4px', fontSize: '0.78rem' }}>Payment Mode</label>
                              <select
                                value={vp.mode}
                                onChange={e => updateVendorPayment(v.vendor_id, 'mode', e.target.value)}
                                style={inputStyle}
                              >
                                {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '4px', fontSize: '0.78rem' }}>Bank / Branch</label>
                              <select
                                value={vp.bank_name}
                                onChange={e => updateVendorPayment(v.vendor_id, 'bank_name', e.target.value)}
                                style={inputStyle}
                              >
                                {POPULAR_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '4px', fontSize: '0.78rem' }}>UTR / Reference No.</label>
                              <input
                                type="text"
                                value={vp.utr}
                                onChange={e => updateVendorPayment(v.vendor_id, 'utr', e.target.value)}
                                placeholder="e.g. NEFT20260826001"
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '4px', fontSize: '0.78rem' }}>Notes (optional)</label>
                              <input
                                type="text"
                                value={vp.notes}
                                onChange={e => updateVendorPayment(v.vendor_id, 'notes', e.target.value)}
                                placeholder="e.g. Month end batch"
                                style={inputStyle}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Grand Total Bar */}
                    <div style={{ background: '#F0FDFA', border: '2px solid #0D9488', borderRadius: '10px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#0F766E', fontSize: '0.95rem' }}>💰 Consolidated Settlement Amount</div>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>
                          {draft.total_bills} vendor bills across {vendorsInDraft.length} vendor(s)
                        </div>
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F766E' }}>{fmtAmount(grandDraftTotal)}</div>
                    </div>

                    <button
                      onClick={() => setConfirmOpen(true)}
                      style={{ width: '100%', padding: '13px', borderRadius: '8px', background: '#059669', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '1rem' }}
                    >
                      ✅ Review & Finalize Settlement Record
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmOpen && draft && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '28px', maxWidth: '560px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.35)', maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>✅ Confirm Settlement Finalization</h2>
              <p style={{ margin: '0 0 16px', color: '#6B7280', fontSize: '0.85rem' }}>
                You are finalizing settlement for <strong>{MONTHS[draft.month - 1]} {draft.year}</strong> ({draft.settlement_number}).
              </p>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Vendor</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>Amount</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Mode</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorsInDraft.map((v, i) => {
                      const vp = vendorPayments[v.vendor_id] || { utr: '', mode: 'NEFT', bank_name: '', notes: '' };
                      return (
                        <tr key={v.vendor_id} style={{ borderTop: '1px solid #F3F4F6', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 700 }}>🍽️ {v.vendor_name}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>{fmtAmount(v.total_amount)}</td>
                          <td style={{ padding: '8px 12px' }}>{vp.mode}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.74rem', color: '#64748B' }}>{vp.utr || 'Auto-generated'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #0D9488', background: '#F0FDFA' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0F766E' }}>TOTAL</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#0F766E', fontSize: '1.05rem' }}>{fmtAmount(grandDraftTotal)}</td>
                      <td colSpan={2} style={{ padding: '10px 12px', fontSize: '0.75rem', color: '#6B7280' }}>{draft.total_bills} bills</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setConfirmOpen(false)} disabled={finalizing} style={{ flex: 1, padding: '11px', borderRadius: '8px', background: '#F1F5F9', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#475569' }}>
                  ← Back & Edit
                </button>
                <button onClick={handleFinalize} disabled={finalizing} style={{ flex: 2, padding: '11px', borderRadius: '8px', background: '#059669', color: 'white', border: 'none', cursor: finalizing ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '0.95rem' }}>
                  {finalizing ? '⏳ Finalizing...' : '✅ Confirm & Close Month'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
