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

  // Filters
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
      previous_month_total: 0,
      ytd_total: 0,
      pending_settlement_total: 0,
      settled_total: 0,
      total_bills_count: 0,
      pending_bills_count: 0,
      settled_bills_count: 0
    });
  }, []);

  const loadBills = useCallback(async (resetPage = false) => {
    setLoading(true);
    const safetyTimer = setTimeout(() => setLoading(false), 2500);
    const p = resetPage ? 1 : page;
    if (resetPage) setPage(1);
    try {
      const params = new URLSearchParams();
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
  }, [searchQuery, filterStatus, filterDept, filterVendor, dateFrom, dateTo, filterMonth, filterYear, page]);

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
      <div>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', background: 'white', padding: '20px 24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <Link href="/dcr" style={{ color: '#6B7280', textDecoration: 'none', fontSize: '0.85rem' }}>Administration</Link>
              <span style={{ color: '#D1D5DB' }}>›</span>
              <span style={{ fontSize: '0.85rem', color: '#0F766E', fontWeight: 600 }}>Bills & Invoices</span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px', color: '#0F172A' }}>🧾 Bills & Invoices</h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280' }}>All institutional canteen bills. Search, filter, and export.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleExport('pdf', 'monthly')}
              disabled={exportLoading === 'pdf'}
              style={{ padding: '8px 16px', borderRadius: '8px', background: '#EF4444', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {exportLoading === 'pdf' ? '⏳' : '📄'} PDF
            </button>
            <button
              onClick={() => handleExport('excel', 'monthly')}
              disabled={exportLoading === 'excel'}
              style={{ padding: '8px 16px', borderRadius: '8px', background: '#22C55E', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {exportLoading === 'excel' ? '⏳' : '📊'} Excel
            </button>
            <Link href="/dcr/settlements" style={{ padding: '8px 16px', borderRadius: '8px', background: '#0D9488', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              💳 Settlements
            </Link>
          </div>
        </div>

        {/* Month-End Reminder */}
        {reminderState?.should_remind && reminderState.has_pending_settlement && (
          <div style={{ background: '#FFFBEB', border: '1px solid #F59E0B', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#92400E', marginBottom: '2px' }}>Month-End Settlement Reminder</div>
              <div style={{ fontSize: '0.85rem', color: '#78350F' }}>
                {reminderState.days_remaining} days remaining before month end. Please finalize the pending monthly settlement.
              </div>
            </div>
            <Link href="/dcr/settlements" style={{ padding: '8px 16px', borderRadius: '8px', background: '#F59E0B', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem' }}>
              Review Bills
            </Link>
          </div>
        )}

        {/* Financial Summary Cards */}
        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: `${summary.current_month_name} Expenditure`, value: fmtAmount(summary.current_month_total), sub: `${summary.current_month_bills} bills`, color: '#0D9488', icon: '📅', border: '#0D9488' },
              { label: 'Pending Settlement', value: fmtAmount(summary.pending_settlement_total), sub: `${summary.pending_settlement_bills} bills pending`, color: '#D97706', icon: '⏳', border: '#D97706' },
              { label: 'Settled This Year', value: fmtAmount(summary.settled_total), sub: `${summary.settled_bills} bills settled`, color: '#059669', icon: '✅', border: '#059669' },
              { label: 'Year-to-Date Total', value: fmtAmount(summary.ytd_total), sub: 'All completed orders', color: '#3B82F6', icon: '📊', border: '#3B82F6' },
            ].map((card, i) => (
              <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', borderTop: `4px solid ${card.border}`, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '1.3rem', marginBottom: '6px' }}>{card.icon}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: card.color, marginBottom: '2px' }}>{card.value}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151' }}>{card.label}</div>
                <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: '2px' }}>{card.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px 20px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '12px' }}>
            <input
              type="text"
              placeholder="🔍 Search by invoice #, order ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem', outline: 'none', gridColumn: 'span 2' }}
            />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem', background: 'white' }}>
              <option value="">All Statuses</option>
              <option value="PENDING_SETTLEMENT">Pending Settlement</option>
              <option value="SETTLED">Settled</option>
              <option value="GENERATED">Generated</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem', background: 'white' }}>
              <option value={0}>All Months</option>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem', background: 'white' }}>
              <option value={0}>All Years</option>
              {[currentYear, currentYear - 1, currentYear - 2].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From date" style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }} />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="To date" style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }} />
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
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {/* Table header */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
              {/* Desktop table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', width: '40px' }}>
                        <input type="checkbox" checked={selectedBills.size === bills.length && bills.length > 0} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Invoice #</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Order ID</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Department</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Vendor</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Amount</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Bill Date</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Settlement Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((bill, idx) => {
                      const statusStyle = getStatusStyle(bill.settlement_status);
                      return (
                        <tr key={bill.id} style={{ borderBottom: '1px solid #F3F4F6', background: selectedBills.has(bill.id) ? '#F0FDFA' : (idx % 2 === 0 ? 'white' : '#FAFAFA') }}>
                          <td style={{ padding: '10px 12px' }}>
                            <input type="checkbox" checked={selectedBills.has(bill.id)} onChange={() => toggleSelect(bill.id)} style={{ cursor: 'pointer' }} />
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0F766E', fontFamily: 'monospace' }}>{bill.invoice_number || bill.id}</td>
                          <td style={{ padding: '10px 12px', color: '#6B7280' }}>{bill.order_id}</td>
                          <td style={{ padding: '10px 12px' }}>{bill.department_label || bill.department_id || '—'}</td>
                          <td style={{ padding: '10px 12px', color: '#6B7280' }}>{bill.vendor_name || 'Master Invoice'}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>{fmtAmount(bill.amount)}</td>
                          <td style={{ padding: '10px 12px', color: '#6B7280' }}>{fmtDate(bill.generated_at)}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}`, whiteSpace: 'nowrap' }}>
                              {bill.settlement_status?.replace('_', ' ') || 'PENDING'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button onClick={() => viewBillPdf(bill)} title="View PDF" style={{ padding: '4px 10px', borderRadius: '6px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>Page {page} of {totalPages}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: page === 1 ? '#F9FAFB' : 'white', cursor: page === 1 ? 'default' : 'pointer', fontWeight: 600 }}>
                      ← Prev
                    </button>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: page === totalPages ? '#F9FAFB' : 'white', cursor: page === totalPages ? 'default' : 'pointer', fontWeight: 600 }}>
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
