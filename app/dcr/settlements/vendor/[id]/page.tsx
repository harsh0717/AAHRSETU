'use client';
/**
 * Vendor Financial Passbook & Account Ledger Page
 * Tally / ERP-style chronological debit/credit ledger with running balance.
 * Full audit record of every invoice raised and every payment disbursed.
 */
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { getSession, UserProfile } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { api } from '@/lib/api';

interface LedgerEntry {
  date: string;
  type: 'INVOICE' | 'PAYMENT';
  reference: string;
  order_id: string | null;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  settlement_status: string;
}

interface VendorLedgerData {
  vendor: {
    id: string;
    name: string;
    owner_name: string;
    phone: string;
    email: string;
    status: string;
  };
  summary: {
    total_billed: number;
    total_paid: number;
    current_outstanding: number;
    total_entries: number;
  };
  ledger_entries: LedgerEntry[];
}

const PAYMENT_MODES = ['NEFT', 'RTGS', 'UPI', 'Cheque', 'Cash', 'IMPS', 'DD'];
const POPULAR_BANKS = ['State Bank of India (SBI)', 'HDFC Bank', 'ICICI Bank', 'Canara Bank', 'Punjab National Bank', 'Bank of Baroda', 'Axis Bank', 'Union Bank', 'Other Bank'];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '8px',
  border: '1px solid var(--gray-300, #CBD5E1)',
  fontSize: '0.85rem',
  background: 'var(--surface-0)',
  boxSizing: 'border-box',
  color: 'var(--gray-900, #0F172A)',
  outline: 'none',
};

export default function VendorLedgerPage() {
  const { t } = useI18n();
  const router = useRouter();
  const routeParams = useParams();
  const vendorId = routeParams?.id as string;
  const [session, setSession] = useState<UserProfile | null>(null);

  const [ledgerData, setLedgerData] = useState<VendorLedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [isMobileDevice, setIsMobileDevice] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobileDevice(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INVOICE' | 'PAYMENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Quick Pay Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('NEFT');
  const [payBank, setPayBank] = useState('State Bank of India (SBI)');
  const [payUtr, setPayUtr] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace('/login'); return; }
    if (s.role !== 'dcr' && s.role !== 'administration' && s.role !== 'admin' && s.role !== 'vendor') {
      router.replace(`/${s.role}`);
      return;
    }
    setSession(s);
  }, [router]);

  const loadLedger = async (vId: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<VendorLedgerData>(`/settlements/vendor/${vId}/ledger`);
      setLedgerData(data);
      if (data.summary.current_outstanding > 0) {
        setPayAmount(String(data.summary.current_outstanding));
      }
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Failed to load vendor ledger data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId) {
      loadLedger(vendorId);
    }
  }, [vendorId]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }

    setRecordingPayment(true);
    setError('');
    try {
      const res = await api.post<any>('/settlements/payments', {
        vendor_id: vendorId,
        amount: amt,
        payment_method: payMode,
        bank_name: payBank,
        payment_reference: payUtr,
        payment_date: payDate,
        notes: payNotes
      });
      setSuccessMsg(`Payment of ₹${amt.toLocaleString('en-IN')} recorded successfully! Ref: ${res.payment_reference}`);
      setPayModalOpen(false);
      setPayUtr('');
      setPayNotes('');
      await loadLedger(vendorId);
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Failed to record payment.');
    } finally {
      setRecordingPayment(false);
    }
  };

  const fmtAmount = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtDateTime = (s: string | null) => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  // Filter and sort entries
  const filteredEntries = (ledgerData?.ledger_entries || []).filter(e => {
    if (typeFilter !== 'ALL' && e.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return e.reference?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q) || e.order_id?.toLowerCase().includes(q);
    }
    return true;
  });

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  if (!session || loading) {
    return (
      <AppShell role={(session?.role as any) || 'dcr'} currentPath="/dcr/settlements">
        <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>⏳</div>
          <div style={{ fontWeight: 700 }}>Loading vendor financial passbook...</div>
        </div>
      </AppShell>
    );
  }

  if (!ledgerData) {
    return (
      <AppShell role={(session?.role as any) || 'dcr'} currentPath="/dcr/settlements">
        <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔍</div>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--gray-800, #1E293B)' }}>Vendor not found</div>
          <p style={{ color: 'var(--gray-500, #64748B)', fontSize: '0.88rem', margin: '6px 0 16px' }}>The requested vendor profile could not be found.</p>
          <Link href="/dcr/settlements" style={{ padding: '8px 16px', borderRadius: '8px', background: '#0D9488', color: 'white', textDecoration: 'none', fontWeight: 700 }}>
            ← Back to Settlements
          </Link>
        </div>
      </AppShell>
    );
  }

  const { vendor, summary } = ledgerData;
  const isClear = summary.current_outstanding <= 0;

  return (
    <AppShell role={(session.role as any) || 'dcr'} currentPath="/dcr/settlements">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header with Breadcrumb */}
        <div style={{
          background: 'var(--surface-0)',
          borderRadius: '16px',
          border: '1px solid var(--gray-200, #E2E8F0)',
          padding: '20px 24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <Link href="/dcr" style={{ color: 'var(--gray-500, #64748B)', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600 }}>Administration</Link>
            <span style={{ color: '#CBD5E1' }}>›</span>
            <Link href="/dcr/settlements" style={{ color: 'var(--gray-500, #64748B)', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600 }}>Settlements & Dues</Link>
            <span style={{ color: '#CBD5E1' }}>›</span>
            <span style={{ fontSize: '0.82rem', color: '#0D9488', fontWeight: 700 }}>Vendor Passbook: {vendor.name}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--gray-900, #0F172A)' }}>
                  🍽️ {vendor.name} — Account Passbook
                </h1>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: isClear ? '#DCFCE7' : '#FEE2E2',
                  color: isClear ? '#15803D' : '#991B1B',
                  border: `1px solid ${isClear ? '#86EFAC' : '#FCA5A5'}`
                }}>
                  {isClear ? 'All Clear' : `₹${summary.current_outstanding.toLocaleString('en-IN')} Due`}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '0.82rem', color: 'var(--gray-500, #64748B)', flexWrap: 'wrap' }}>
                <span>👤 Owner: <strong>{vendor.owner_name}</strong></span>
                <span>📞 Phone: <strong>{vendor.phone}</strong></span>
                <span>✉️ Email: <strong>{vendor.email}</strong></span>
                <span>ID: <strong style={{ fontFamily: 'monospace' }}>{vendor.id}</strong></span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setPayUtr(`UTR-${Date.now().toString().slice(-6)}`);
                  setPayNotes(`Disbursement for ${vendor.name}`);
                  setPayModalOpen(true);
                }}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  background: '#0D9488',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                💳 Record Payment
              </button>
              <button
                onClick={() => window.print()}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'var(--surface-1)',
                  color: 'var(--gray-700, #334155)',
                  border: '1px solid var(--gray-300, #CBD5E1)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🖨️ Print Passbook
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#10B981', fontWeight: 700, fontSize: '0.9rem' }}>
            ✅ {successMsg}
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#EF4444', fontWeight: 700, fontSize: '0.9rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Summary Financial Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: 'var(--surface-0)', borderRadius: '14px', border: '1px solid var(--gray-200, #E2E8F0)', padding: '18px 20px', borderLeft: '5px solid #0284C7' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500, #64748B)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Invoiced (Debits)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary, #3B82F6)', marginTop: '4px' }}>
              {fmtAmount(summary.total_billed)}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--gray-500, #64748B)', marginTop: '4px' }}>Cumulative bills raised by vendor</div>
          </div>

          <div style={{ background: 'var(--surface-0)', borderRadius: '14px', border: '1px solid var(--gray-200, #E2E8F0)', padding: '18px 20px', borderLeft: '5px solid #059669' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500, #64748B)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Disbursed (Credits)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>
              {fmtAmount(summary.total_paid)}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--gray-500, #64748B)', marginTop: '4px' }}>Total payments cleared to vendor</div>
          </div>

          <div style={{ background: 'var(--surface-0)', borderRadius: '14px', border: '1px solid var(--gray-200, #E2E8F0)', padding: '18px 20px', borderLeft: `5px solid ${isClear ? '#10B981' : '#EF4444'}` }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500, #64748B)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Outstanding Due</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: isClear ? '#10B981' : '#EF4444', marginTop: '4px' }}>
              {fmtAmount(summary.current_outstanding)}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--gray-500, #64748B)', marginTop: '4px' }}>
              {isClear ? 'No pending dues' : 'Pending payment clearance'}
            </div>
          </div>
        </div>

        {/* Ledger Control & Filter Bar */}
        <div style={{
          background: 'var(--surface-0)',
          borderRadius: '14px',
          border: '1px solid var(--gray-200, #E2E8F0)',
          padding: '14px 20px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-600, #475569)' }}>Filter Type:</span>
            {(['ALL', 'INVOICE', 'PAYMENT'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  border: 'none',
                  cursor: 'pointer',
                  background: typeFilter === t ? '#0D9488' : 'var(--surface-2)',
                  color: typeFilter === t ? 'white' : 'var(--gray-700, #334155)',
                }}
              >
                {t === 'ALL' ? 'All Transactions' : t === 'INVOICE' ? '🧾 Invoices (Debits)' : '💸 Payments (Credits)'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search reference or description..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, width: '220px', padding: '6px 10px', fontSize: '0.8rem' }}
            />
            <button
              onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
              style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--surface-1)', border: '1px solid var(--gray-300, #CBD5E1)', color: 'var(--gray-700, #334155)', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}
            >
              Sort: {sortOrder === 'desc' ? 'Newest First ↓' : 'Oldest First ↑'}
            </button>
          </div>
        </div>

        {/* Tally / Accounting Passbook Table */}
        <div style={{ background: 'var(--surface-0)', borderRadius: '14px', border: '1px solid var(--gray-200, #E2E8F0)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-200, #E2E8F0)', background: 'var(--surface-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--gray-900, #0F172A)', fontSize: '0.95rem' }}>
              📜 Chronological Account Ledger ({sortedEntries.length} entries)
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--gray-500, #64748B)' }}>
              Running balance calculated automatically
            </span>
          </div>

          {sortedEntries.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--gray-400, #94A3B8)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📖</div>
              <div style={{ fontWeight: 700 }}>No transaction entries match the filter</div>
            </div>
          ) : isMobileDevice ? (
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sortedEntries.map((e, idx) => {
                const isInvoice = e.type === 'INVOICE';
                return (
                  <div key={idx} style={{ border: '1px solid var(--gray-200, #E2E8F0)', borderRadius: '12px', padding: '12px 14px', background: isInvoice ? 'var(--surface-1)' : 'rgba(16, 185, 129, 0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: isInvoice ? 'rgba(37, 99, 235, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: isInvoice ? 'var(--primary, #3B82F6)' : '#10B981'
                      }}>
                        {isInvoice ? '🧾 INVOICE' : '💸 PAYMENT'}
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 900, color: isInvoice ? 'var(--primary, #3B82F6)' : '#10B981' }}>
                        {isInvoice ? fmtAmount(e.debit) : fmtAmount(e.credit)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--gray-500, #64748B)', marginBottom: '4px' }}>
                      {fmtDateTime(e.date)} · Ref: <strong style={{ fontFamily: 'monospace', color: '#14B8A6' }}>{e.reference}</strong>
                    </div>
                    {e.description && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--gray-700, #334155)', marginBottom: '6px' }}>{e.description}</div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid var(--gray-200, #E2E8F0)', fontSize: '0.74rem' }}>
                      <span style={{ color: 'var(--gray-500, #64748B)' }}>Balance: <strong style={{ color: e.balance > 0 ? '#EF4444' : '#10B981' }}>{fmtAmount(e.balance)}</strong></span>
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        background: e.settlement_status === 'SETTLED' || e.settlement_status === 'PAID' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: e.settlement_status === 'SETTLED' || e.settlement_status === 'PAID' ? '#10B981' : '#F59E0B'
                      }}>
                        {e.settlement_status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-1)', borderBottom: '2px solid var(--gray-200, #E2E8F0)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Date</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Type</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Reference #</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Narration / Details</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--primary, #3B82F6)' }}>Billed (Debit)</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#10B981' }}>Paid (Credit)</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--gray-900, #0F172A)' }}>Running Balance</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((e, idx) => {
                    const isInvoice = e.type === 'INVOICE';
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--gray-200, #E2E8F0)', background: idx % 2 === 0 ? 'transparent' : 'var(--surface-1)' }}>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--gray-600, #475569)' }}>
                          {fmtDateTime(e.date)}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {isInvoice ? (
                            <span style={{ background: 'rgba(37, 99, 235, 0.15)', color: 'var(--primary, #3B82F6)', border: '1px solid rgba(37, 99, 235, 0.3)', borderRadius: '4px', padding: '2px 7px', fontSize: '0.72rem', fontWeight: 700 }}>
                              🧾 INVOICE
                            </span>
                          ) : (
                            <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '4px', padding: '2px 7px', fontSize: '0.72rem', fontWeight: 700 }}>
                              💸 PAYMENT
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#14B8A6' }}>
                          {e.reference}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--gray-700, #334155)' }}>
                          {e.description}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: isInvoice ? 700 : 400, color: isInvoice ? 'var(--primary, #3B82F6)' : 'var(--gray-400, #94A3B8)' }}>
                          {e.debit > 0 ? fmtAmount(e.debit) : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: !isInvoice ? 800 : 400, color: !isInvoice ? '#10B981' : 'var(--gray-400, #94A3B8)' }}>
                          {e.credit > 0 ? fmtAmount(e.credit) : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 900, color: e.balance > 0 ? '#EF4444' : '#10B981' }}>
                          {fmtAmount(e.balance)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: e.settlement_status === 'SETTLED' || e.settlement_status === 'PAID' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: e.settlement_status === 'SETTLED' || e.settlement_status === 'PAID' ? '#10B981' : '#F59E0B',
                            border: `1px solid ${e.settlement_status === 'SETTLED' || e.settlement_status === 'PAID' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                          }}>
                            {e.settlement_status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--surface-1)', borderTop: '2px solid #0D9488' }}>
                    <td colSpan={4} style={{ padding: '12px 14px', fontWeight: 800, color: '#14B8A6' }}>
                      TOTALS & CLOSING BALANCE
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--primary, #3B82F6)' }}>
                      {fmtAmount(summary.total_billed)}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#10B981' }}>
                      {fmtAmount(summary.total_paid)}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 900, fontSize: '1.05rem', color: isClear ? '#10B981' : '#EF4444' }}>
                      {fmtAmount(summary.current_outstanding)}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: isClear ? '#10B981' : '#EF4444' }}>
                      {isClear ? 'CLEARED' : 'DUE'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Quick Payment Modal */}
        {payModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: 'var(--surface-0)', borderRadius: '16px', border: '1px solid var(--gray-200, #E2E8F0)', padding: '26px', maxWidth: '460px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)' }}>
                💳 Record Disbursement to {vendor.name}
              </h2>
              <p style={{ margin: '0 0 16px', color: 'var(--gray-500, #64748B)', fontSize: '0.82rem' }}>
                Current outstanding balance: <strong style={{ color: '#EF4444' }}>{fmtAmount(summary.current_outstanding)}</strong>
              </p>

              <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: 'var(--gray-700, #334155)', marginBottom: '4px', fontSize: '0.82rem' }}>Amount (₹) *</label>
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
                    <label style={{ display: 'block', fontWeight: 700, color: 'var(--gray-700, #334155)', marginBottom: '4px', fontSize: '0.82rem' }}>Payment Mode</label>
                    <select value={payMode} onChange={e => setPayMode(e.target.value)} style={inputStyle}>
                      {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: 'var(--gray-700, #334155)', marginBottom: '4px', fontSize: '0.82rem' }}>Bank</label>
                    <select value={payBank} onChange={e => setPayBank(e.target.value)} style={inputStyle}>
                      {POPULAR_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: 'var(--gray-700, #334155)', marginBottom: '4px', fontSize: '0.82rem' }}>UTR / Transaction Reference</label>
                  <input
                    type="text"
                    value={payUtr}
                    onChange={e => setPayUtr(e.target.value)}
                    placeholder="e.g. UTR-123456"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: 'var(--gray-700, #334155)', marginBottom: '4px', fontSize: '0.82rem' }}>Payment Date</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: 'var(--gray-700, #334155)', marginBottom: '4px', fontSize: '0.82rem' }}>Notes</label>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={e => setPayNotes(e.target.value)}
                    placeholder="e.g. Cleared via Institutional Account"
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setPayModalOpen(false)}
                    disabled={recordingPayment}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--surface-2)', border: '1px solid var(--gray-300, #CBD5E1)', cursor: 'pointer', fontWeight: 700, color: 'var(--gray-700, #334155)' }}
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
      </div>
    </AppShell>
  );
}
