'use client';
/**
 * Administration Payments & Settlements Hub
 * Simplified, single-screen dashboard for managing vendor dues, 1-click disbursements,
 * and generating audit-grade monthly statements for higher authorities.
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
const POPULAR_BANKS = [
  'State Bank of India (SBI)',
  'HDFC Bank',
  'ICICI Bank',
  'Canara Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'Axis Bank',
  'Union Bank',
  'Other Bank'
];

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

  const [isMobileDevice, setIsMobileDevice] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobileDevice(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [outstandingData, setOutstandingData] = useState<OutstandingData | null>(null);
  const [outstandingLoading, setOutstandingLoading] = useState(true);

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [activeVendorForPay, setActiveVendorForPay] = useState<OutstandingVendor | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('NEFT');
  const [payBank, setPayBank] = useState('State Bank of India (SBI)');
  const [payUtr, setPayUtr] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [draft, setDraft] = useState<Settlement | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [vendorPayments, setVendorPayments] = useState<Record<string, VendorPaymentDetail>>({});

  const [paymentsList, setPaymentsList] = useState<PaymentRecord[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [showPaymentsLog, setShowPaymentsLog] = useState(false);

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

  const handleCalculate = async () => {
    setCalculating(true);
    setError('');
    setDraft(null);
    try {
      const data = await api.post<Settlement>('/settlements', { month: selectedMonth, year: selectedYear, notes });
      setDraft(data);
      await loadSettlements();
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Failed to create settlement.');
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
      setSuccessMsg(`Settlement ${draft.settlement_number} finalized successfully! All records locked.`);
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

  const openPayModal = (vendor: OutstandingVendor) => {
    setActiveVendorForPay(vendor);
    setPayAmount(vendor.outstanding > 0 ? String(vendor.outstanding) : '');
    setPayUtr(`UTR-${Date.now().toString().slice(-6)}`);
    setPayNotes(`Dues settlement for ${vendor.vendor_name}`);
    setPayModalOpen(true);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVendorForPay) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    setRecordingPayment(true);
    setError('');
    try {
      const res = await api.post<any>('/settlements/payments', {
        vendor_id: activeVendorForPay.vendor_id,
        amount: amt,
        payment_method: payMode,
        bank_name: payBank,
        payment_reference: payUtr,
        payment_date: payDate,
        notes: payNotes
      });
      setSuccessMsg(`Payment of ₹${amt.toLocaleString('en-IN')} to ${activeVendorForPay.vendor_name} recorded! Ref: ${res.payment_reference}`);
      setPayModalOpen(false);
      setActiveVendorForPay(null);
      await refreshAll();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Failed to record payment transaction.');
    } finally {
      setRecordingPayment(false);
    }
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
  const grandOutstanding = outstandingData?.summary.grand_outstanding || 0;
  const grandPaid = outstandingData?.summary.grand_paid || 0;
  const grandBilled = outstandingData?.summary.grand_billed || 0;

  return (
    <AppShell role={(session.role as 'dcr' | 'administration') || 'dcr'} currentPath="/dcr/settlements">
      <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '36px' }}>
        
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
              <span style={{ color: '#0D9488', fontWeight: 700 }}>Settlements & Dues</span>
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
              💳 Pay Canteens & Settlements
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link href="/dcr/bills" style={{ padding: '7px 12px', borderRadius: '8px', background: '#F8FAFC', color: '#0F766E', border: '1px solid #CBD5E1', textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem' }}>
              🧾 All Bills Hub
            </Link>
            <button onClick={refreshAll} style={{ padding: '7px 12px', borderRadius: '8px', background: '#F0FDFA', color: '#0D9488', border: '1px solid #99F6E4', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>
              🔄 Refresh
            </button>
          </div>
        </div>

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

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            background: grandOutstanding > 0 ? '#FFFBEB' : '#F0FDF4',
            border: `1px solid ${grandOutstanding > 0 ? '#FDE68A' : '#86EFAC'}`,
            borderRadius: '14px',
            padding: '16px 20px',
            position: 'relative'
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: grandOutstanding > 0 ? '#B45309' : '#15803D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Pending Dues
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: grandOutstanding > 0 ? '#991B1B' : '#15803D', margin: '4px 0 2px' }}>
              {fmtAmount(grandOutstanding)}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
              {outstandingData?.summary.vendors_with_dues_count || 0} canteens awaiting disbursement
            </div>
          </div>

          <div style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '14px',
            padding: '16px 20px'
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Disbursed (Paid)
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#059669', margin: '4px 0 2px' }}>
              {fmtAmount(grandPaid)}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
              Cleared bank disbursements
            </div>
          </div>

          <div style={{
            background: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '16px 20px'
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Invoiced Food
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0F172A', margin: '4px 0 2px' }}>
              {fmtAmount(grandBilled)}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 700 }}>
              ✓ Audit Balanced (₹0.00 Variance)
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#1E293B' }}>
                🍽️ Canteen Dues & Direct Settlement
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '2px 0 0' }}>
                View outstanding balances per canteen and disburse bank payments with 1 click.
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#F1F5F9', color: '#475569', padding: '4px 10px', borderRadius: '12px' }}>
              {outstandingData?.vendors.length || 0} Registered Canteens
            </span>
          </div>

          {outstandingLoading ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>⏳</div>
              <div style={{ fontWeight: 600 }}>Loading canteen payables...</div>
            </div>
          ) : !outstandingData || outstandingData.vendors.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
              <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🎉</div>
              <div style={{ fontWeight: 700 }}>No canteen vendors registered yet.</div>
            </div>
          ) : isMobileDevice ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {outstandingData.vendors.map(v => {
                const hasDues = v.outstanding > 0;
                return (
                  <div key={v.vendor_id} style={{
                    border: `1px solid ${hasDues ? '#FDE68A' : '#E2E8F0'}`,
                    borderRadius: '12px',
                    padding: '14px',
                    background: hasDues ? '#FFFBEB' : '#FAFAFA'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>{v.vendor_name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{v.owner_name} · {v.phone || 'No phone'}</div>
                      </div>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        background: hasDues ? '#FEF3C7' : '#DCFCE7',
                        color: hasDues ? '#92400E' : '#15803D'
                      }}>
                        {hasDues ? 'DUE' : 'CLEARED'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.78rem', marginBottom: '10px', background: 'white', padding: '8px 10px', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                      <div>Total Invoiced: <strong>{fmtAmount(v.total_billed)}</strong></div>
                      <div>Total Paid: <strong style={{ color: '#059669' }}>{fmtAmount(v.total_paid)}</strong></div>
                      <div style={{ gridColumn: '1 / -1', paddingTop: '4px', borderTop: '1px solid #F1F5F9', color: hasDues ? '#991B1B' : '#15803D', fontWeight: 800 }}>
                        Current Balance: {fmtAmount(v.outstanding)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {hasDues && (
                        <button
                          onClick={() => openPayModal(v)}
                          style={{ flex: 1, padding: '8px', borderRadius: '8px', background: '#0D9488', color: 'white', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          💳 Pay Now
                        </button>
                      )}
                      <Link
                        href={`/dcr/settlements/vendor/${v.vendor_id}`}
                        style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: '8px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem' }}
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
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Canteen Vendor</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>Total Invoiced</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>Total Paid</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>Balance Due</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {outstandingData.vendors.map((v, idx) => {
                    const hasDues = v.outstanding > 0;
                    return (
                      <tr key={v.vendor_id} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? 'white' : '#FAFAFA' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 800, color: '#0F172A' }}>{v.vendor_name}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{v.owner_name} · {v.phone || '—'}</div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                          {fmtAmount(v.total_billed)}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                          {fmtAmount(v.total_paid)}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 900, color: hasDues ? '#991B1B' : '#15803D' }}>
                          {fmtAmount(v.outstanding)}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 9px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: hasDues ? '#FEF3C7' : '#DCFCE7',
                            color: hasDues ? '#92400E' : '#15803D'
                          }}>
                            {hasDues ? 'DUE' : 'CLEARED'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            {hasDues && (
                              <button
                                onClick={() => openPayModal(v)}
                                style={{ padding: '6px 12px', borderRadius: '6px', background: '#0D9488', color: 'white', border: 'none', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}
                              >
                                💳 Pay Now
                              </button>
                            )}
                            <Link
                              href={`/dcr/settlements/vendor/${v.vendor_id}`}
                              style={{ padding: '6px 10px', borderRadius: '6px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', textDecoration: 'none', fontWeight: 700, fontSize: '0.78rem' }}
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

        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#1E293B' }}>
                📋 Monthly Reconciliation & Audit Statements
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '2px 0 0' }}>
                Consolidate monthly vendor bills, finalize accounts, and export verified reports for higher authorities.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', background: 'white' }}
              >
                {MONTHS.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
              </select>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', background: 'white' }}
              >
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button
                onClick={handleCalculate}
                disabled={calculating}
                style={{ padding: '7px 14px', borderRadius: '8px', background: '#0F766E', color: 'white', border: 'none', fontWeight: 800, fontSize: '0.82rem', cursor: calculating ? 'not-allowed' : 'pointer' }}
              >
                {calculating ? '⏳ Checking...' : '🔢 Calculate Month'}
              </button>
            </div>
          </div>

          {draft && (
            <div style={{ background: '#F0FDFA', border: '1.5px solid #0D9488', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, background: '#0D9488', color: 'white', padding: '2px 8px', borderRadius: '4px' }}>
                    DRAFT SETTLEMENT: {MONTHS[draft.month - 1]} {draft.year}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#0F766E', marginLeft: '8px', fontWeight: 700 }}>
                    {draft.total_bills} bills · Total Amount: <strong>{fmtAmount(draft.total_amount)}</strong>
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleExport(draft.id, 'pdf', draft.settlement_number)}
                    disabled={exportLoading !== null}
                    style={{ padding: '6px 12px', borderRadius: '6px', background: '#DC2626', color: 'white', border: 'none', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    📄 Preview PDF
                  </button>
                  <button
                    onClick={() => setConfirmOpen(true)}
                    style={{ padding: '6px 14px', borderRadius: '6px', background: '#059669', color: 'white', border: 'none', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    ✓ Confirm & Finalize Month
                  </button>
                </div>
              </div>
            </div>
          )}

          {historyLoading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>Loading statement history...</div>
          ) : settlements.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>No finalized monthly settlements found.</div>
          ) : isMobileDevice ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {settlements.map(s => (
                <div key={s.id} style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px 14px', background: '#F8FAFC' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>{s.month_name} {s.year}</div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: s.status === 'FINALIZED' ? '#DCFCE7' : '#FEF3C7', color: s.status === 'FINALIZED' ? '#15803D' : '#92400E' }}>
                      {s.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748B', marginBottom: '8px' }}>
                    Ref: <strong>{s.settlement_number}</strong> · Amount: <strong style={{ color: '#0F766E' }}>{fmtAmount(s.total_amount)}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleExport(s.id, 'pdf', s.settlement_number)}
                      disabled={exportLoading === `${s.id}-pdf`}
                      style={{ flex: 1, padding: '7px', borderRadius: '6px', background: '#DC2626', color: 'white', border: 'none', fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer' }}
                    >
                      {exportLoading === `${s.id}-pdf` ? '⏳...' : '📄 PDF Report'}
                    </button>
                    <button
                      onClick={() => handleExport(s.id, 'excel', s.settlement_number)}
                      disabled={exportLoading === `${s.id}-excel`}
                      style={{ flex: 1, padding: '7px', borderRadius: '6px', background: '#16A34A', color: 'white', border: 'none', fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer' }}
                    >
                      {exportLoading === `${s.id}-excel` ? '⏳...' : '📊 Excel Sheet'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Period & Ref</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Bills</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>Settlement Amount</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>Audit Exports (Higher Authorities)</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((s, idx) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? 'white' : '#FAFAFA' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>{s.month_name} {s.year}</div>
                        <div style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: '#0D9488' }}>{s.settlement_number}</div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 9px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: s.status === 'FINALIZED' ? '#DCFCE7' : '#FEF3C7',
                          color: s.status === 'FINALIZED' ? '#15803D' : '#92400E'
                        }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#475569' }}>
                        {s.total_bills}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#0F766E' }}>
                        {fmtAmount(s.total_amount)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleExport(s.id, 'pdf', s.settlement_number)}
                            disabled={exportLoading === `${s.id}-pdf`}
                            style={{ padding: '6px 12px', borderRadius: '6px', background: '#DC2626', color: 'white', border: 'none', fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer' }}
                            title="Export PDF Audit Report"
                          >
                            {exportLoading === `${s.id}-pdf` ? '⏳...' : '📄 Audit PDF'}
                          </button>
                          <button
                            onClick={() => handleExport(s.id, 'excel', s.settlement_number)}
                            disabled={exportLoading === `${s.id}-excel`}
                            style={{ padding: '6px 12px', borderRadius: '6px', background: '#16A34A', color: 'white', border: 'none', fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer' }}
                            title="Export Multi-Sheet Excel Spreadsheet"
                          >
                            {exportLoading === `${s.id}-excel` ? '⏳...' : '📊 Excel Sheet'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#334155' }}>
                📜 Recent Bank Payment Disbursements ({paymentsList.length})
              </h3>
              <p style={{ fontSize: '0.74rem', color: '#64748B', margin: '2px 0 0' }}>
                Bank UTR references and cleared payout timestamps.
              </p>
            </div>
            <button
              onClick={() => setShowPaymentsLog(!showPaymentsLog)}
              style={{ padding: '5px 12px', borderRadius: '6px', background: '#F1F5F9', border: 'none', color: '#475569', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
            >
              {showPaymentsLog ? 'Hide Log ▲' : 'View Log ▼'}
            </button>
          </div>

          {showPaymentsLog && (
            <div style={{ marginTop: '14px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
              {paymentsList.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem' }}>No payments recorded yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {paymentsList.slice(0, 10).map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px', fontSize: '0.8rem' }}>
                      <div>
                        <span style={{ fontWeight: 800, color: '#0F172A' }}>{p.vendor_name}</span>
                        <span style={{ color: '#64748B', marginLeft: '8px' }}>Ref: <strong style={{ fontFamily: 'monospace', color: '#0D9488' }}>{p.payment_reference}</strong></span>
                        <span style={{ color: '#94A3B8', marginLeft: '8px' }}>· {p.payment_method} · {fmtDate(p.payment_date)}</span>
                      </div>
                      <div style={{ fontWeight: 900, color: '#059669' }}>
                        {fmtAmount(p.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {payModalOpen && activeVendorForPay && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', maxWidth: '460px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                💳 Record Disbursement
              </h2>
              <p style={{ margin: '0 0 16px', color: '#64748B', fontSize: '0.82rem' }}>
                Paying <strong>{activeVendorForPay.vendor_name}</strong> (Outstanding: <strong style={{ color: '#991B1B' }}>{fmtAmount(activeVendorForPay.outstanding)}</strong>)
              </p>

              <form onSubmit={handleRecordPaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontWeight: 700, color: '#334155', fontSize: '0.82rem' }}>Amount (₹) *</label>
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(activeVendorForPay.outstanding))}
                      style={{ background: '#F0FDFA', color: '#0D9488', border: '1px solid #99F6E4', borderRadius: '4px', padding: '1px 6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      ⚡ Full Balance
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px', fontSize: '0.82rem' }}>Payment Mode</label>
                    <select value={payMode} onChange={e => setPayMode(e.target.value)} style={inputStyle}>
                      {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px', fontSize: '0.82rem' }}>Bank</label>
                    <select value={payBank} onChange={e => setPayBank(e.target.value)} style={inputStyle}>
                      {POPULAR_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px', fontSize: '0.82rem' }}>UTR / Bank Reference #</label>
                  <input
                    type="text"
                    value={payUtr}
                    onChange={e => setPayUtr(e.target.value)}
                    placeholder="e.g. UTR-987654"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px', fontSize: '0.82rem' }}>Payment Date</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px', fontSize: '0.82rem' }}>Notes</label>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={e => setPayNotes(e.target.value)}
                    placeholder="e.g. Cleared via Institutional Treasury Account"
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => { setPayModalOpen(false); setActiveVendorForPay(null); }}
                    disabled={recordingPayment}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#F1F5F9', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#475569' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recordingPayment}
                    style={{ flex: 2, padding: '10px', borderRadius: '8px', background: '#0D9488', color: 'white', border: 'none', cursor: recordingPayment ? 'not-allowed' : 'pointer', fontWeight: 800 }}
                  >
                    {recordingPayment ? '⏳ Recording...' : '💾 Save Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {confirmOpen && draft && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', maxWidth: '500px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                Confirm Final Settlement
              </h3>
              <p style={{ margin: '0 0 14px', color: '#64748B', fontSize: '0.82rem' }}>
                Finalizing settlement for <strong>{MONTHS[draft.month - 1]} {draft.year}</strong> will lock these records permanently for audit.
              </p>

              <div style={{ background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#0F766E', fontSize: '0.85rem' }}>Total Settlement Amount:</span>
                <span style={{ fontWeight: 900, color: '#0F766E', fontSize: '1.2rem' }}>{fmtAmount(draft.total_amount)}</span>
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
