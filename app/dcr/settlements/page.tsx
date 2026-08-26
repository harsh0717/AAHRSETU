'use client';
/**
 * Administration Payments & Settlements Hub
 * Minimalist, intuitive design for tracking vendor payables, recording disbursements,
 * and closing monthly institutional reconciliation accounts.
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

  // Responsive device tracking
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobileDevice(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 3 Primary Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'reconciliation'>('overview');

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
  }, [refreshAll, router]);

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
      setSuccessMsg(`Settlement ${draft.settlement_number} finalized successfully!`);
      setDraft(null);
      setConfirmOpen(false);
      setVendorPayments({});
      await refreshAll();
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
    setActiveTab('payments');
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
      <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '32px' }}>
        
        {/* Minimalist Top Header */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '16px 20px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
              <Link href="/dcr" style={{ color: '#64748B', textDecoration: 'none' }}>Administration</Link>
              <span>›</span>
              <span style={{ color: '#0D9488', fontWeight: 700 }}>Settlements & Payments</span>
            </div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
              💳 Vendor Payments & Settlements
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link href="/dcr/bills" style={{ padding: '7px 12px', borderRadius: '8px', background: '#F8FAFC', color: '#0F766E', border: '1px solid #CBD5E1', textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem' }}>
              🧾 Bills Hub
            </Link>
            <button onClick={refreshAll} style={{ padding: '7px 12px', borderRadius: '8px', background: '#F0FDFA', color: '#0D9488', border: '1px solid #99F6E4', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '10px', padding: '10px 16px', marginBottom: '14px', color: '#15803D', fontWeight: 700, fontSize: '0.85rem' }}>
            ✓ {successMsg}
          </div>
        )}
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', padding: '10px 16px', marginBottom: '14px', color: '#991B1B', fontWeight: 700, fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B', fontWeight: 800 }}>✕</button>
          </div>
        )}

        {/* 3 Clean Modern Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px', overflowX: 'auto' }}>
          {[
            { id: 'overview', label: '📊 Dues & Balances', count: outstandingData?.summary.vendors_with_dues_count ? `${outstandingData.summary.vendors_with_dues_count} Dues` : undefined },
            { id: 'payments', label: '💸 Disburse Payment', count: paymentsList.length > 0 ? `${paymentsList.length}` : undefined },
            { id: 'reconciliation', label: '📋 Monthly Reconciliation', count: settlements.length > 0 ? `${settlements.length}` : undefined },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: isActive ? '#0D9488' : '#F1F5F9',
                  color: isActive ? 'white' : '#475569',
                  boxShadow: isActive ? '0 2px 6px rgba(13, 148, 136, 0.2)' : 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{tab.label}</span>
                {tab.count && (
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    borderRadius: '10px',
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
        {/* TAB 1: OVERVIEW & VENDOR DUES */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Minimal KPI Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '12px' }}>
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', borderTop: '4px solid #DC2626', padding: '14px 16px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outstanding Dues</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#991B1B', marginTop: '2px' }}>
                  {outstandingLoading ? '...' : fmtAmount(outstandingData?.summary.grand_outstanding || 0)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                  {outstandingData?.summary.vendors_with_dues_count || 0} vendor(s) pending clearance
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', borderTop: '4px solid #059669', padding: '14px 16px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Disbursed / Paid</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#059669', marginTop: '2px' }}>
                  {outstandingLoading ? '...' : fmtAmount(outstandingData?.summary.grand_paid || 0)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                  All cleared vendor payments
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', borderTop: '4px solid #0284C7', padding: '14px 16px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Invoiced / Billed</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0369A1', marginTop: '2px' }}>
                  {outstandingLoading ? '...' : fmtAmount(outstandingData?.summary.grand_billed || 0)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                  {outstandingData?.summary.total_pending_bills || 0} pending bill vouchers
                </div>
              </div>
            </div>

            {/* Compact Aging Status Bar */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>⏱️ Maturity Aging:</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', borderRadius: '6px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 700 }}>
                  0-30d: {outstandingLoading ? '...' : fmtAmount(outstandingData?.summary.aging_0_30 || 0)}
                </span>
                <span style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', borderRadius: '6px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 700 }}>
                  31-60d: {outstandingLoading ? '...' : fmtAmount(outstandingData?.summary.aging_31_60 || 0)}
                </span>
                <span style={{ background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5', borderRadius: '6px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 800 }}>
                  &gt;60d: {outstandingLoading ? '...' : fmtAmount(outstandingData?.summary.aging_over_60 || 0)}
                </span>
              </div>
            </div>

            {/* Vendor Balance Register */}
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
                  🍽️ Vendor Balance Register
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{outstandingData?.vendors.length || 0} Canteens</span>
              </div>

              {outstandingLoading ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>⏳</div> Loading vendor balances...
                </div>
              ) : !outstandingData || outstandingData.vendors.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🎉</div>
                  <div style={{ fontWeight: 800, color: '#1E293B' }}>All vendor accounts are clear!</div>
                </div>
              ) : isMobileDevice ? (
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {outstandingData.vendors.map(v => {
                    const hasDues = v.outstanding > 0;
                    return (
                      <div key={v.vendor_id} style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', background: hasDues ? '#FEF2F2' : '#F8FAFC' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A' }}>{v.vendor_name}</span>
                          <span style={{ fontSize: '1rem', fontWeight: 900, color: hasDues ? '#DC2626' : '#15803D' }}>
                            {fmtAmount(v.outstanding)}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '10px' }}>
                          Owner: {v.owner_name} · 📞 {v.phone}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.72rem', color: '#475569', marginBottom: '10px' }}>
                          <div>Invoiced: <strong>{fmtAmount(v.total_billed)}</strong></div>
                          <div>Paid: <strong style={{ color: '#059669' }}>{fmtAmount(v.total_paid)}</strong></div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                          {hasDues && (
                            <button
                              onClick={() => openQuickPay(v)}
                              style={{ flex: 1, padding: '8px', borderRadius: '8px', background: '#0D9488', color: 'white', border: 'none', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}
                            >
                              💳 Pay Dues
                            </button>
                          )}
                          <Link
                            href={`/dcr/settlements/vendor/${v.vendor_id}`}
                            style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: '8px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', textDecoration: 'none', fontWeight: 700, fontSize: '0.78rem' }}
                          >
                            📖 Passbook
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Vendor</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>Invoiced</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>Paid</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>Outstanding</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outstandingData.vendors.map((v, idx) => {
                        const hasDues = v.outstanding > 0;
                        return (
                          <tr key={v.vendor_id} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? 'white' : '#FAFAFA' }}>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ fontWeight: 800, color: '#0F172A' }}>🍽️ {v.vendor_name}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{v.owner_name} · {v.phone}</div>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>
                              {fmtAmount(v.total_billed)}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                              {fmtAmount(v.total_paid)}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                              <span style={{ fontSize: '0.92rem', fontWeight: 900, color: hasDues ? '#DC2626' : '#15803D' }}>
                                {fmtAmount(v.outstanding)}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                {hasDues && (
                                  <button
                                    onClick={() => openQuickPay(v)}
                                    style={{ padding: '5px 12px', borderRadius: '6px', background: '#0D9488', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
                                  >
                                    💳 Pay Dues
                                  </button>
                                )}
                                <Link
                                  href={`/dcr/settlements/vendor/${v.vendor_id}`}
                                  style={{ padding: '5px 10px', borderRadius: '6px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', textDecoration: 'none', fontWeight: 700, fontSize: '0.75rem' }}
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
        {/* TAB 2: DISBURSE PAYMENT & RECENT LOGS */}
        {/* ========================================================================= */}
        {activeTab === 'payments' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '16px', alignItems: 'start' }}>
            {/* Clean Payment Form */}
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', background: '#F0FDFA' }}>
                <h3 style={{ margin: 0, fontWeight: 800, color: '#0F766E', fontSize: '0.95rem' }}>
                  💳 Record Vendor Payment Entry
                </h3>
              </div>

              <form onSubmit={handleRecordPaymentSubmit} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px', fontSize: '0.8rem' }}>
                    Select Canteen Vendor *
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
                    <option value="">-- Choose Vendor --</option>
                    {outstandingData?.vendors.map(v => (
                      <option key={v.vendor_id} value={v.vendor_id}>
                        {v.vendor_name} (Due: ₹{v.outstanding.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPayVendorObj && (
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Outstanding: <strong style={{ color: selectedPayVendorObj.outstanding > 0 ? '#DC2626' : '#15803D' }}>{fmtAmount(selectedPayVendorObj.outstanding)}</strong></span>
                    {selectedPayVendorObj.outstanding > 0 && (
                      <button
                        type="button"
                        onClick={() => setPayAmount(String(selectedPayVendorObj.outstanding))}
                        style={{ padding: '3px 8px', borderRadius: '4px', background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem' }}
                      >
                        ⚡ Set Full Amount
                      </button>
                    )}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px', fontSize: '0.8rem' }}>Amount (₹) *</label>
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
                    <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px', fontSize: '0.8rem' }}>Payment Date</label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={e => setPayDate(e.target.value)}
                      style={inputStyle}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px', fontSize: '0.8rem' }}>Payment Mode</label>
                    <select value={payMode} onChange={e => setPayMode(e.target.value)} style={inputStyle}>
                      {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px', fontSize: '0.8rem' }}>Bank / Account</label>
                    <select value={payBank} onChange={e => setPayBank(e.target.value)} style={inputStyle}>
                      {POPULAR_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px', fontSize: '0.8rem' }}>UTR / Reference #</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-SBI-20260826001"
                    value={payUtr}
                    onChange={e => setPayUtr(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px', fontSize: '0.8rem' }}>Notes (optional)</label>
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
                    padding: '11px',
                    borderRadius: '8px',
                    background: '#0D9488',
                    color: 'white',
                    border: 'none',
                    cursor: recordingPayment ? 'not-allowed' : 'pointer',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    marginTop: '4px'
                  }}
                >
                  {recordingPayment ? '⏳ Recording...' : '💾 Save Payment Record'}
                </button>
              </form>
            </div>

            {/* Payment Transactions Log */}
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0, fontWeight: 800, color: '#1E293B', fontSize: '0.92rem' }}>
                  📜 Recent Payments Log
                </h3>
                <select
                  value={paymentVendorFilter}
                  onChange={e => setPaymentVendorFilter(e.target.value)}
                  style={{ ...inputStyle, width: 'auto', padding: '5px 8px', fontSize: '0.75rem' }}
                >
                  <option value="all">All Vendors</option>
                  {outstandingData?.vendors.map(v => (
                    <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>
                  ))}
                </select>
              </div>

              {paymentsLoading ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>⏳</div> Loading payments...
                </div>
              ) : filteredPayments.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '6px' }}>📝</div>
                  <div style={{ fontWeight: 700 }}>No payments recorded yet</div>
                </div>
              ) : isMobileDevice ? (
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredPayments.map(p => (
                    <div key={p.id} style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px', background: '#F8FAFC' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F172A' }}>{p.vendor_name}</span>
                        <span style={{ fontWeight: 900, color: '#059669', fontSize: '0.92rem' }}>{fmtAmount(p.amount)}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        {fmtDate(p.payment_date)} · {p.payment_method} ({p.payment_reference || 'Ref'})
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ overflowX: 'auto', maxHeight: '480px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Date & Ref</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Vendor</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Mode</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map((p, idx) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? 'white' : '#FAFAFA' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>{fmtDate(p.payment_date)}</div>
                            <div style={{ fontSize: '0.7rem', color: '#0D9488', fontFamily: 'monospace' }}>{p.payment_reference}</div>
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#334155' }}>{p.vendor_name}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#F1F5F9', color: '#334155', fontWeight: 700, fontSize: '0.7rem' }}>
                              {p.payment_method}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>
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
        {/* TAB 3: MONTHLY RECONCILIATION */}
        {/* ========================================================================= */}
        {activeTab === 'reconciliation' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Quick Month Reconcile Generator */}
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontWeight: 800, color: '#0F766E', fontSize: '0.95rem' }}>
                  🗓️ Reconcile Institutional Month
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Consolidate monthly vendor bills</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '4px', fontSize: '0.78rem' }}>Month</label>
                  <select value={selectedMonth} onChange={e => { setSelectedMonth(Number(e.target.value)); setDraft(null); setVendorPayments({}); }} style={inputStyle}>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '4px', fontSize: '0.78rem' }}>Year</label>
                  <select value={selectedYear} onChange={e => { setSelectedYear(Number(e.target.value)); setDraft(null); setVendorPayments({}); }} style={inputStyle}>
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <button
                    onClick={handleCalculate}
                    disabled={calculating}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0D9488', color: 'white', border: 'none', cursor: calculating ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '0.85rem' }}
                  >
                    {calculating ? '⏳ Consolidating...' : '🔢 Calculate Monthly Settlement'}
                  </button>
                </div>
              </div>
            </div>

            {/* Calculated Draft Summary Card */}
            {draft && (
              <div style={{ background: 'white', borderRadius: '14px', border: '2px solid #0D9488', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontWeight: 800, color: '#0F766E', fontSize: '0.95rem' }}>
                      Settlement Draft: {MONTHS[draft.month - 1]} {draft.year} ({draft.settlement_number})
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{vendorsInDraft.length} vendor(s) · {draft.total_bills} bills</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#059669' }}>
                    Total: {fmtAmount(grandDraftTotal)}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  {vendorsInDraft.map(v => {
                    const vp = vendorPayments[v.vendor_id] || { utr: '', mode: 'NEFT', bank_name: 'State Bank of India (SBI)', notes: '' };
                    return (
                      <div key={v.vendor_id} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 14px', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>{v.vendor_name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{v.bill_count} bills</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="text"
                            placeholder="UTR / Ref (optional)"
                            value={vp.utr}
                            onChange={e => updateVendorPayment(v.vendor_id, 'utr', e.target.value)}
                            style={{ ...inputStyle, width: '150px', padding: '5px 8px', fontSize: '0.75rem' }}
                          />
                          <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.9rem' }}>{fmtAmount(v.total_amount)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setConfirmOpen(true)}
                  style={{ width: '100%', padding: '11px', borderRadius: '8px', background: '#059669', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem' }}
                >
                  ✅ Confirm & Finalize Settlement
                </button>
              </div>
            )}

            {/* Reconciliation Ledger History */}
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                <h3 style={{ margin: 0, fontWeight: 800, color: '#1E293B', fontSize: '0.92rem' }}>
                  📋 Reconciliation Ledger Records
                </h3>
              </div>

              {historyLoading ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>⏳</div> Loading settlements...
                </div>
              ) : settlements.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '6px' }}>💳</div>
                  <div style={{ fontWeight: 700 }}>No monthly settlement records found</div>
                </div>
              ) : isMobileDevice ? (
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {settlements.map(s => {
                    const ss = STATUS_STYLES[s.status] || STATUS_STYLES['DRAFT'];
                    return (
                      <div key={s.id} style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', background: '#F8FAFC' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F766E' }}>{MONTHS[s.month - 1]} {s.year}</span>
                          <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, background: ss.bg, color: ss.text, border: `1px solid ${ss.border}` }}>
                            {ss.label}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '8px' }}>
                          Ref: {s.settlement_number} · {s.total_bills} bills
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0F172A', marginBottom: '10px' }}>
                          {fmtAmount(s.total_amount)}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <Link href={`/dcr/settlements/${s.id}`} style={{ flex: 1, textAlign: 'center', padding: '7px', borderRadius: '6px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', textDecoration: 'none', fontWeight: 700, fontSize: '0.75rem' }}>
                            View
                          </Link>
                          <button onClick={() => handleExport(s.id, 'pdf', s.settlement_number)} style={{ padding: '7px 10px', borderRadius: '6px', background: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}>
                            PDF
                          </button>
                          <button onClick={() => handleExport(s.id, 'excel', s.settlement_number)} style={{ padding: '7px 10px', borderRadius: '6px', background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}>
                            Excel
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Settlement #</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Period</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Bills</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>Total Amount</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Status</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlements.map((s, idx) => {
                        const ss = STATUS_STYLES[s.status] || STATUS_STYLES['DRAFT'];
                        return (
                          <tr key={s.id} style={{ borderBottom: '1px solid #F3F4F6', background: idx % 2 === 0 ? 'white' : '#FAFAFA' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0F766E', fontFamily: 'monospace' }}>{s.settlement_number}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 700 }}>{MONTHS[s.month - 1]} {s.year}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: '#374151' }}>{s.total_bills}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>{fmtAmount(s.total_amount)}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, background: ss.bg, color: ss.text, border: `1px solid ${ss.border}` }}>
                                {ss.label}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <Link href={`/dcr/settlements/${s.id}`} style={{ padding: '4px 8px', borderRadius: '6px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', textDecoration: 'none', fontWeight: 700, fontSize: '0.72rem' }}>
                                  View
                                </Link>
                                <button onClick={() => handleExport(s.id, 'pdf', s.settlement_number)} style={{ padding: '4px 8px', borderRadius: '6px', background: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem' }}>
                                  PDF
                                </button>
                                <button onClick={() => handleExport(s.id, 'excel', s.settlement_number)} style={{ padding: '4px 8px', borderRadius: '6px', background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem' }}>
                                  Excel
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
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmOpen && draft && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', maxWidth: '500px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                Confirm Final Settlement
              </h3>
              <p style={{ margin: '0 0 14px', color: '#64748B', fontSize: '0.82rem' }}>
                Finalizing settlement for <strong>{MONTHS[draft.month - 1]} {draft.year}</strong> will lock these records.
              </p>

              <div style={{ background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#0F766E', fontSize: '0.85rem' }}>Total Settlement Amount:</span>
                <span style={{ fontWeight: 900, color: '#0F766E', fontSize: '1.2rem' }}>{fmtAmount(grandDraftTotal)}</span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setConfirmOpen(false)} disabled={finalizing} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#F1F5F9', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}>
                  Cancel
                </button>
                <button onClick={handleFinalize} disabled={finalizing} style={{ flex: 2, padding: '10px', borderRadius: '8px', background: '#059669', color: 'white', border: 'none', cursor: finalizing ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '0.85rem' }}>
                  {finalizing ? '⏳ Finalizing...' : '✓ Confirm & Finalize'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
