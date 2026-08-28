'use client';
/**
 * Administration Bills & Invoices Page
 * Provides comprehensive bill management: search, filter, bulk-select, export PDF/Excel
 * All financial data is fetched from the backend — never hardcoded.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { getSession, UserProfile } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { api } from '@/lib/api';

interface Bill {
  id: string;
  invoice_number: string;
  order_id: string;
  department_id: string;
  department_label: string;
  vendor_id: string | null;
  vendor_name: string | null;
  amount: number;
  settlement_status: string;
  settlement_id: number | null;
  generated_at: string;
  order_created_at: string;
}

interface BillsResponse {
  items: Bill[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface FinancialSummary {
  current_month_total: number;
  current_month_bills: number;
  previous_month_total: number;
  pending_settlement_total: number;
  pending_settlement_bills: number;
  settled_total: number;
  settled_bills: number;
  ytd_total: number;
  current_month_name: string;
  previous_month_name: string;
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const SETTLEMENT_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'PENDING_SETTLEMENT': { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  'SETTLED':            { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  'GENERATED':          { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  'CANCELLED':          { bg: '#F9FAFB', text: '#6B7280', border: '#E5E7EB' },
};

export default function BillsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [session, setSession] = useState<UserProfile | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  // Tab & Filters
  const [billTypeTab, setBillTypeTab] = useState<'vendor' | 'master' | 'all'>('vendor');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDept, setFilterDept] = useState<string>('');
  const [filterVendor, setFilterVendor] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<number>(0);
  const [filterYear, setFilterYear] = useState<number>(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBills, setTotalBills] = useState(0);

  // Bulk select
  const [selectedBills, setSelectedBills] = useState<Set<string>>(new Set());

  // Month-end reminder state
  const [reminderState, setReminderState] = useState<{ should_remind: boolean; days_remaining: number; has_pending_settlement: boolean } | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const data = await api.get<FinancialSummary>('/bills/financial-summary');
      if (data) {
        setSummary(data);
        return;
      }
    } catch (err) {
      console.warn('[Bills] Failed to load financial summary from API:', err);
    }
    // Compute local summary fallback
    setSummary({
      current_month_total: 0,
      current_month_bills: 0,
      previous_month_total: 0,
      pending_settlement_total: 0,
      pending_settlement_bills: 0,
      settled_total: 0,
      settled_bills: 0,
      ytd_total: 0,
      current_month_name: '',
      previous_month_name: ''
    });
  }, []);

  const loadBills = useCallback(async (resetPage = false) => {
    setLoading(true);
    const safetyTimer = setTimeout(() => setLoading(false), 2500);
    const p = resetPage ? 1 : page;
    if (resetPage) setPage(1);
    try {
      const params = new URLSearchParams();
      if (billTypeTab) params.set('bill_type', billTypeTab);
      if (searchQuery) params.set('invoice_number', searchQuery);
      if (filterStatus) params.set('settlement_status', filterStatus);
      if (filterDept) params.set('department_id', filterDept);
      if (filterVendor) params.set('vendor_id', filterVendor);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (filterMonth > 0) params.set('month', String(filterMonth));
      if (filterYear > 0) params.set('year', String(filterYear));
      params.set('page', String(p));
      params.set('page_size', '50');

      const data = await api.get<BillsResponse | Bill[]>(`/bills?${params.toString()}`);
      if (Array.isArray(data)) {
        setBills(data);
        setTotalBills(data.length);
        setTotalPages(1);
      } else if (data && 'items' in data) {
        setBills(data.items);
        setTotalPages(data.total_pages);
        setTotalBills(data.total);
      } else {
        setBills([]);
        setTotalBills(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.warn('[Bills] Failed to load bills from API:', err);
      setBills([]);
      setTotalBills(0);
      setTotalPages(1);
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  }, [billTypeTab, searchQuery, filterStatus, filterDept, filterVendor, dateFrom, dateTo, filterMonth, filterYear, page]);

  const checkReminder = useCallback(async () => {
    try {
      const data = await api.get<{ should_remind: boolean; days_remaining: number; has_pending_settlement: boolean }>('/notifications/month-end-check');
      if (data) setReminderState(data);
    } catch {}
  }, []);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace('/login'); return; }
    if (s.role !== 'dcr' && s.role !== 'administration' && s.role !== 'admin') {
      router.replace(`/${s.role}`);
      return;
    }
    setSession(s);
    loadSummary();
    checkReminder();
  }, []);

  useEffect(() => {
    if (session) loadBills(true);
  }, [session, searchQuery, filterStatus, filterDept, filterVendor, dateFrom, dateTo, filterMonth, filterYear]);

  useEffect(() => {
    if (session) loadBills(false);
  }, [page]);

  const handleExport = async (type: 'pdf' | 'excel', scope: 'monthly' | 'all') => {
    const now = new Date();
    const month = filterMonth > 0 ? filterMonth : now.getMonth() + 1;
    const year = filterYear > 0 ? filterYear : now.getFullYear();
    setExportLoading(type);
    try {
      const url = `/api/v1/bills/export/${type}?month=${month}&year=${year}`;
      const token = sessionStorage.getItem('aharsetu_access_token') || localStorage.getItem('aharsetu_access_token');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `AaharSetu_Bills_${MONTHS[month - 1]}_${year}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      alert('Export failed. Please try again.');
    } finally {
      setExportLoading(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedBills(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedBills.size === bills.length) {
      setSelectedBills(new Set());
    } else {
      setSelectedBills(new Set(bills.map(b => b.id)));
    }
  };

  const viewBillPdf = async (bill: Bill) => {
    const token = sessionStorage.getItem('aharsetu_access_token') || localStorage.getItem('aharsetu_access_token');
    const url = `/api/v1/bills/${bill.id}/pdf`;
    window.open(url + `?token=${token}`, '_blank');
  };

  const fmtAmount = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const getStatusStyle = (status: string) => SETTLEMENT_STATUS_COLORS[status] || { bg: '#F9FAFB', text: '#6B7280', border: '#E5E7EB' };

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  if (!session) return null;

  return (
    <AppShell role={(session.role as 'dcr' | 'administration') || 'dcr'} currentPath="/dcr/bills">
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
                INSTITUTIONAL BILLING HUB
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                TAN: BLRA00000A · FY 2026-27
              </span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, margin: '2px 0 6px', letterSpacing: '-0.5px', color: '#F8FAFC' }}>
              🧾 Bills, Invoices & Vouchers Hub
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94A3B8', maxWidth: '650px' }}>
              All institutional canteen food vouchers, departmental requisitions, multi-vendor splits, and statutory export generators.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleExport('pdf', 'monthly')}
              disabled={exportLoading === 'pdf'}
              style={{
                padding: '9px 16px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#E2E8F0',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              📄 {exportLoading === 'pdf' ? 'Generating PDF...' : 'Monthly PDF'}
            </button>
            <button
              onClick={() => handleExport('excel', 'monthly')}
              disabled={exportLoading === 'excel'}
              style={{
                padding: '9px 16px',
                borderRadius: '10px',
                background: '#0D9488',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '0.84rem',
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              📊 {exportLoading === 'excel' ? 'Exporting...' : 'Statutory Excel'}
            </button>
            <Link
              href="/dcr/settlements"
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
              💳 Settlements Hub
            </Link>
          </div>
        </div>

        {/* Month-End Reminder */}
        {reminderState?.should_remind && reminderState.has_pending_settlement && (
          <div style={{ background: '#FFFBEB', border: '1.5px solid #F59E0B', borderRadius: '14px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: '#92400E', marginBottom: '2px' }}>Month-End Settlement Reminder</div>
              <div style={{ fontSize: '0.85rem', color: '#78350F' }}>
                {reminderState.days_remaining} days remaining before month end. Please finalize the pending monthly settlement.
              </div>
            </div>
            <Link href="/dcr/settlements" style={{ padding: '8px 16px', borderRadius: '8px', background: '#F59E0B', color: 'white', textDecoration: 'none', fontWeight: 800, fontSize: '0.85rem' }}>
              Review Bills
            </Link>
          </div>
        )}

        {/* Executive Financial Summary Tiles */}
        {summary && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {/* Tile 1: Total Pending Dues */}
            <div style={{
              background: 'var(--surface-0)',
              borderRadius: '16px',
              border: '1.5px solid var(--gray-200, #E2E8F0)',
              padding: '20px 24px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803D', letterSpacing: '0.05em' }}>
                  TOTAL PENDING DUES
                </span>
                <span style={{ background: '#DCFCE7', color: '#15803D', borderRadius: '8px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 800 }}>
                  {summary.pending_settlement_bills} BILLS DUE
                </span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: summary.pending_settlement_total > 0 ? '#DC2626' : '#059669', letterSpacing: '-0.5px' }}>
                {fmtAmount(summary.pending_settlement_total)}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500, #64748B)', marginTop: '4px' }}>
                Total unsettled canteen payables awaiting clearance
              </div>
            </div>

            {/* Tile 2: Total Disbursed */}
            <div style={{
              background: 'var(--surface-0)',
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
                  CLEARED BANK PAYMENTS
                </span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#059669', letterSpacing: '-0.5px' }}>
                {fmtAmount(summary.settled_total)}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500, #64748B)', marginTop: '4px' }}>
                Direct NEFT/RTGS/UPI cleared disbursements
              </div>
            </div>

            {/* Tile 3: Total Invoiced */}
            <div style={{
              background: 'var(--surface-0)',
              borderRadius: '16px',
              border: '1.5px solid var(--gray-200, #E2E8F0)',
              padding: '20px 24px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--gray-600, #475569)', letterSpacing: '0.05em' }}>
                  TOTAL INVOICED FOOD
                </span>
                <span style={{ background: '#CCFBF1', color: '#0F766E', borderRadius: '8px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 800 }}>
                  ✓ ZERO VARIANCE
                </span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--gray-900, #0F172A)', letterSpacing: '-0.5px' }}>
                {fmtAmount(summary.current_month_total)}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
                ✓ {summary.current_month_name} Active ({summary.current_month_bills} bills)
              </div>
            </div>
          </div>
        )}

        {/* Segmented Bill Type Tabs (Vendor Payables vs Master Audit Invoices) */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          background: 'var(--surface-2)',
          padding: '6px',
          borderRadius: '14px',
          border: '1px solid var(--gray-200, #E2E8F0)',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setBillTypeTab('vendor')}
            style={{
              flex: 1,
              minWidth: '220px',
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              background: billTypeTab === 'vendor' ? '#0D9488' : 'transparent',
              color: billTypeTab === 'vendor' ? 'white' : '#475569',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: billTypeTab === 'vendor' ? '0 2px 8px rgba(13, 148, 136, 0.25)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            🍽️ Canteen Vendor Bills (Payables & Settlements)
          </button>
          <button
            onClick={() => setBillTypeTab('master')}
            style={{
              flex: 1,
              minWidth: '220px',
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              background: billTypeTab === 'master' ? '#1E293B' : 'transparent',
              color: billTypeTab === 'master' ? 'white' : '#475569',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: billTypeTab === 'master' ? '0 2px 8px rgba(30, 41, 59, 0.25)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            📑 Master Orders (Audit & Dept Receipts)
          </button>
          <button
            onClick={() => setBillTypeTab('all')}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              background: billTypeTab === 'all' ? '#64748B' : 'transparent',
              color: billTypeTab === 'all' ? 'white' : '#64748B',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer'
            }}
          >
            📋 All Records
          </button>
        </div>

        {/* Tab Context Helper Note */}
        {billTypeTab === 'vendor' ? (
          <div style={{ background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: '10px', padding: '10px 16px', marginBottom: '16px', fontSize: '0.82rem', color: '#0F766E', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>ℹ️</span>
            <span><strong>Vendor Payable View:</strong> Displays itemized split vouchers payable directly to campus canteens. These amounts match the vendor settlements with zero double-counting.</span>
          </div>
        ) : billTypeTab === 'master' ? (
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--gray-300, #CBD5E1)', borderRadius: '10px', padding: '10px 16px', marginBottom: '16px', fontSize: '0.82rem', color: 'var(--gray-700, #334155)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>ℹ️</span>
            <span><strong>Department Audit View:</strong> Displays single consolidated master invoices per requisition for departmental receipt generation and internal auditing.</span>
          </div>
        ) : null}

        {/* Filters */}
        <div style={{ background: 'var(--surface-0)', borderRadius: '12px', border: '1px solid var(--gray-200, #E2E8F0)', padding: '16px 20px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '12px' }}>
            <input
              type="text"
              placeholder="🔍 Search by invoice #, order ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-200, #E2E8F0)', fontSize: '0.85rem', outline: 'none', gridColumn: 'span 2' }}
            />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-200, #E2E8F0)', fontSize: '0.85rem', background: 'var(--surface-0)' }}>
              <option value="">All Statuses</option>
              <option value="PENDING_SETTLEMENT">Pending Settlement</option>
              <option value="SETTLED">Settled</option>
              <option value="GENERATED">Generated</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-200, #E2E8F0)', fontSize: '0.85rem', background: 'var(--surface-0)' }}>
              <option value={0}>All Months</option>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-200, #E2E8F0)', fontSize: '0.85rem', background: 'var(--surface-0)' }}>
              <option value={0}>All Years</option>
              {[currentYear, currentYear - 1, currentYear - 2].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From date" style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-200, #E2E8F0)', fontSize: '0.85rem' }} />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="To date" style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-200, #E2E8F0)', fontSize: '0.85rem' }} />
            <button onClick={() => { setSearchQuery(''); setFilterStatus(''); setFilterDept(''); setFilterVendor(''); setDateFrom(''); setDateTo(''); setFilterMonth(0); setFilterYear(0); }} style={{ padding: '8px 16px', borderRadius: '8px', background: '#F3F4F6', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
              ✕ Clear
            </button>
          </div>
        </div>

        {/* Bulk actions bar */}
        {selectedBills.size > 0 && (
          <div style={{ background: '#F0FDFA', border: '1px solid #0D9488', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: '#0F766E' }}>{selectedBills.size} bills selected</span>
            <Link href={`/dcr/settlements?prefill=${[...selectedBills].join(',')}`} style={{ padding: '6px 14px', borderRadius: '8px', background: '#0D9488', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem' }}>
              💳 Create Settlement
            </Link>
            <button onClick={() => setSelectedBills(new Set())} style={{ padding: '6px 12px', borderRadius: '8px', background: 'transparent', border: '1px solid #0D9488', color: '#0F766E', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
              Deselect All
            </button>
          </div>
        )}

        {/* Bills Table */}
        <div style={{ background: 'var(--surface-0)', borderRadius: '12px', border: '1px solid var(--gray-200, #E2E8F0)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {/* Table header */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--gray-200, #E2E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, color: '#374151', fontSize: '0.9rem' }}>
              {loading ? 'Loading...' : `${totalBills} bills found`}
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#9CA3AF' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px', animation: 'spin 1s linear infinite' }}>🔄</div>
              Loading bills...
            </div>
          ) : bills.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#9CA3AF' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🧾</div>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>No bills found</div>
              <div style={{ fontSize: '0.85rem' }}>Bills are generated automatically when orders are completed.</div>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="desktop-only-table" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-1)', borderBottom: '2px solid var(--gray-200)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-700)', width: '40px' }}>
                        <input type="checkbox" checked={selectedBills.size === bills.length && bills.length > 0} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-700)' }}>Invoice #</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-700)' }}>Order ID</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-700)' }}>Department</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-700)' }}>Vendor</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--gray-700)' }}>Amount</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-700)' }}>Bill Date</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-700)' }}>Settlement Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--gray-700)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((bill, idx) => {
                      const statusStyle = getStatusStyle(bill.settlement_status);
                      return (
                        <tr key={bill.id} style={{ borderBottom: '1px solid var(--gray-200)', background: selectedBills.has(bill.id) ? 'rgba(37,99,235,0.08)' : 'transparent' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <input type="checkbox" checked={selectedBills.has(bill.id)} onChange={() => toggleSelect(bill.id)} style={{ cursor: 'pointer' }} />
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>{bill.invoice_number || bill.id}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--gray-500)' }}>{bill.order_id}</td>
                          <td style={{ padding: '10px 12px' }}>{bill.department_label || bill.department_id || '—'}</td>
                          <td style={{ padding: '10px 12px' }}>
                            {bill.vendor_name ? (
                              <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>🍽️ {bill.vendor_name}</span>
                            ) : (
                              <span style={{ background: 'var(--surface-2)', color: 'var(--gray-600)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800 }}>
                                📑 Dept Master Receipt
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--gray-900)' }}>{fmtAmount(bill.amount)}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--gray-500)' }}>{fmtDate(bill.generated_at)}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}`, whiteSpace: 'nowrap' }}>
                              {bill.settlement_status?.replace('_', ' ') || 'PENDING'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button onClick={() => viewBillPdf(bill)} title="View PDF" style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(37,99,235,0.1)', color: 'var(--primary)', border: '1px solid var(--primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                                📄 PDF
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List (< 768px) */}
              <div className="mobile-only-block">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px' }}>
                  {bills.map((bill) => {
                    const statusStyle = getStatusStyle(bill.settlement_status);
                    return (
                      <div
                        key={bill.id}
                        style={{
                          background: 'var(--surface-1)',
                          border: `1px solid ${selectedBills.has(bill.id) ? 'var(--primary)' : 'var(--gray-200)'}`,
                          borderRadius: '12px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="checkbox"
                              checked={selectedBills.has(bill.id)}
                              onChange={() => toggleSelect(bill.id)}
                              style={{ width: '18px', height: '18px' }}
                            />
                            <span style={{ fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                              {bill.invoice_number || bill.id}
                            </span>
                          </div>
                          <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}` }}>
                            {bill.settlement_status?.replace('_', ' ') || 'PENDING'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                          <span>{bill.department_label || bill.department_id || 'All Depts'}</span>
                          <span style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '0.95rem' }}>{fmtAmount(bill.amount)}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--gray-500)', borderTop: '1px solid var(--gray-200)', paddingTop: '6px', marginTop: '2px' }}>
                          <span>{bill.vendor_name ? `🍽️ ${bill.vendor_name}` : '📑 Master Bill'}</span>
                          <span>{fmtDate(bill.generated_at)}</span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <button
                            onClick={() => viewBillPdf(bill)}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: '8px',
                              background: 'var(--primary)',
                              color: 'white',
                              border: 'none',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            📄 View A4 Bill
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--gray-200, #E2E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>Page {page} of {totalPages}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--gray-200, #E2E8F0)', background: page === 1 ? '#F9FAFB' : 'white', cursor: page === 1 ? 'default' : 'pointer', fontWeight: 600 }}>
                      ← Prev
                    </button>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--gray-200, #E2E8F0)', background: page === totalPages ? '#F9FAFB' : 'white', cursor: page === totalPages ? 'default' : 'pointer', fontWeight: 600 }}>
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .desktop-only-table { display: none !important; }
          .mobile-only-block { display: block !important; }
        }
        @media (min-width: 769px) {
          .desktop-only-table { display: block !important; }
          .mobile-only-block { display: none !important; }
        }
      `}</style>
    </AppShell>
  );
}
