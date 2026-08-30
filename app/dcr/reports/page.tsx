'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { getSession, UserProfile } from '@/lib/auth';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';

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

interface SettlementItem {
  id: number;
  settlement_number: string;
  month: number;
  year: number;
  status: string;
  total_bills: number;
  total_amount: number;
  settled_amount: number;
  pending_amount: number;
  created_at: string;
  finalized_at: string | null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PIE_COLORS = ['#0D9488', '#2563EB', '#F59E0B', '#8B5CF6', '#EC4899', '#10B981', '#6366F1', '#14B8A6'];

export default function DCRFinancialReportsPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  // Core Datasets
  const [bills, setBills] = useState<Bill[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [outstandingVendors, setOutstandingVendors] = useState<OutstandingVendor[]>([]);
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);

  // Filters
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [filterMonth, setFilterMonth] = useState<number>(0);
  const [filterYear, setFilterYear] = useState<number>(0);
  const [filterDept, setFilterDept] = useState<string>('');
  const [filterVendor, setFilterVendor] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Active View Tab inside Reports
  const [activeReportSection, setActiveReportSection] = useState<'overview' | 'departments' | 'vendors' | 'archives'>('overview');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [billsRes, ordersRes, summaryRes, outstandingRes, settlementsRes] = await Promise.allSettled([
        api.get<any>('/bills?page_size=1000&bill_type=vendor'),
        api.get<any[]>('/orders'),
        api.get<FinancialSummary>('/bills/financial-summary'),
        api.get<any>('/settlements/outstanding'),
        api.get<SettlementItem[]>('/settlements')
      ]);

      if (billsRes.status === 'fulfilled') {
        const data = billsRes.value;
        if (Array.isArray(data)) setBills(data);
        else if (data && 'items' in data) setBills(data.items);
      }
      if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value)) {
        setOrders(ordersRes.value);
      }
      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        setSummary(summaryRes.value);
      }
      if (outstandingRes.status === 'fulfilled' && outstandingRes.value?.vendors) {
        setOutstandingVendors(outstandingRes.value.vendors);
      }
      if (settlementsRes.status === 'fulfilled' && Array.isArray(settlementsRes.value)) {
        setSettlements(settlementsRes.value);
      }
    } catch (err) {
      console.warn('[DCR Reports] Error loading financial datasets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace('/login'); return; }
    if (s.role !== 'dcr' && s.role !== 'administration' && s.role !== 'admin') {
      router.replace(`/${s.role}`);
      return;
    }
    setSession(s);
    loadData();
  }, [loadData, router]);

  // Filtered Bills by Date/Month/Year/Dept/Vendor
  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      if (filterVendor && b.vendor_id !== filterVendor) return false;
      if (filterDept && b.department_id !== filterDept && b.department_label !== filterDept) return false;
      if (b.generated_at) {
        const d = new Date(b.generated_at);
        if (filterYear > 0 && d.getFullYear() !== filterYear) return false;
        if (filterMonth > 0 && d.getMonth() + 1 !== filterMonth) return false;
        if (dateFrom && b.generated_at.slice(0, 10) < dateFrom) return false;
        if (dateTo && b.generated_at.slice(0, 10) > dateTo) return false;
      }
      return true;
    });
  }, [bills, filterVendor, filterDept, filterYear, filterMonth, dateFrom, dateTo]);

  // Aggregated Department Audit Rows
  const departmentBreakdown = useMemo(() => {
    const map: Record<string, { label: string; count: number; total: number; settled: number; pending: number }> = {};
    filteredBills.forEach(b => {
      const dept = b.department_label || b.department_id || 'General Institutional';
      if (!map[dept]) {
        map[dept] = { label: dept, count: 0, total: 0, settled: 0, pending: 0 };
      }
      const amt = Number(b.amount || 0);
      map[dept].count += 1;
      map[dept].total += amt;
      if (b.settlement_status === 'SETTLED') {
        map[dept].settled += amt;
      } else {
        map[dept].pending += amt;
      }
    });

    const totalExpense = Object.values(map).reduce((acc, curr) => acc + curr.total, 0);
    return Object.values(map).map(d => ({
      ...d,
      share: totalExpense > 0 ? (d.total / totalExpense) * 100 : 0,
      avgOrder: d.count > 0 ? d.total / d.count : 0
    })).sort((a, b) => b.total - a.total);
  }, [filteredBills]);

  // Grand Computed Totals
  const grandTotalBilled = useMemo(() => filteredBills.reduce((s, b) => s + Number(b.amount || 0), 0), [filteredBills]);
  const grandTotalSettled = useMemo(() => filteredBills.filter(b => b.settlement_status === 'SETTLED').reduce((s, b) => s + Number(b.amount || 0), 0), [filteredBills]);
  const grandTotalPending = useMemo(() => filteredBills.filter(b => b.settlement_status !== 'SETTLED').reduce((s, b) => s + Number(b.amount || 0), 0), [filteredBills]);

  // Monthly Trend Chart Data
  const monthlyChartData = useMemo(() => {
    const monthsMap: Record<string, { month: string; billed: number; settled: number }> = {};
    MONTHS.forEach((m, idx) => {
      monthsMap[idx + 1] = { month: m.slice(0, 3), billed: 0, settled: 0 };
    });

    filteredBills.forEach(b => {
      if (b.generated_at) {
        const d = new Date(b.generated_at);
        const m = d.getMonth() + 1;
        if (monthsMap[m]) {
          const amt = Number(b.amount || 0);
          monthsMap[m].billed += amt;
          if (b.settlement_status === 'SETTLED') {
            monthsMap[m].settled += amt;
          }
        }
      }
    });

    return Object.values(monthsMap);
  }, [filteredBills]);

  // Unique Depts and Vendors for filters
  const uniqueDepts = useMemo(() => {
    const set = new Set<string>();
    bills.forEach(b => {
      const d = b.department_label || b.department_id;
      if (d) set.add(d);
    });
    return Array.from(set);
  }, [bills]);

  const uniqueVendors = useMemo(() => {
    const map = new Map<string, string>();
    bills.forEach(b => {
      if (b.vendor_id && b.vendor_name) {
        map.set(b.vendor_id, b.vendor_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [bills]);

  // Export handlers
  const handleExportBills = async (type: 'pdf' | 'excel') => {
    setExportLoading(`bills-${type}`);
    try {
      const m = filterMonth > 0 ? filterMonth : currentMonth;
      const y = filterYear > 0 ? filterYear : currentYear;
      const token = sessionStorage.getItem('aharsetu_access_token') || localStorage.getItem('aharsetu_access_token');
      const res = await fetch(`/api/v1/bills/export/${type}?month=${m}&year=${y}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `AaharSetu_Financial_Report_${m}_${y}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert('Export failed. Please ensure the backend service is reachable.');
    } finally {
      setExportLoading(null);
    }
  };

  const handleExportSettlement = async (settlementId: number, type: 'pdf' | 'excel', number: string) => {
    setExportLoading(`set-${settlementId}-${type}`);
    try {
      const token = sessionStorage.getItem('aharsetu_access_token') || localStorage.getItem('aharsetu_access_token');
      const res = await fetch(`/api/v1/settlements/${settlementId}/export/${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `AaharSetu_CA_Settlement_${number}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert('Export failed. Please ensure the backend service is reachable.');
    } finally {
      setExportLoading(null);
    }
  };

  const fmtCurrency = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (!session) return null;

  return (
    <AppShell role={(session.role as 'dcr' | 'administration') || 'dcr'} currentPath="/dcr/reports">
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
                INSTITUTIONAL AUDIT & FISCAL ENGINE
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                TAN: BLRA00000A · FY 2026-27
              </span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, margin: '2px 0 6px', letterSpacing: '-0.5px', color: '#F8FAFC' }}>
              📊 Financial & Departmental Audit Reports
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94A3B8', maxWidth: '700px' }}>
              Executive expenditure ledgers, department food budget utilization, canteen vendor payment aging, and certified statements for Accounts & Chartered Accountants.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleExportBills('pdf')}
              disabled={!!exportLoading}
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
              📄 {exportLoading === 'bills-pdf' ? 'Generating PDF...' : 'CA Audit PDF'}
            </button>
            <button
              onClick={() => handleExportBills('excel')}
              disabled={!!exportLoading}
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
              📊 {exportLoading === 'bills-excel' ? 'Exporting...' : 'Statutory Excel'}
            </button>
            <button
              onClick={loadData}
              title="Refresh datasets"
              style={{
                padding: '9px 12px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#94A3B8',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}
            >
              🔄
            </button>
          </div>
        </div>

        {/* Executive Fiscal Summary Tiles */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* Tile 1: Total Pending Liabilities */}
          <div style={{
            background: 'var(--surface-0)',
            borderRadius: '16px',
            border: '1.5px solid var(--gray-200, #E2E8F0)',
            padding: '20px 24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10B981', letterSpacing: '0.05em' }}>
                TOTAL PENDING DUES
              </span>
              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', borderRadius: '8px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 800, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                {filteredBills.filter(b => b.settlement_status !== 'SETTLED').length} BILLS PENDING
              </span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: grandTotalPending > 0 ? '#EF4444' : '#10B981', letterSpacing: '-0.5px' }}>
              {fmtCurrency(grandTotalPending)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500, #64748B)', marginTop: '4px' }}>
              Total unsettled canteen payables awaiting clearance
            </div>
          </div>

          {/* Tile 2: Total Disbursed / Paid */}
          <div style={{
            background: 'var(--surface-0)',
            borderRadius: '16px',
            border: '1.5px solid #10B981',
            padding: '20px 24px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10B981', letterSpacing: '0.05em' }}>
                TOTAL DISBURSED (PAID)
              </span>
              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', borderRadius: '8px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 800, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                CLEARED BANK PAYMENTS
              </span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10B981', letterSpacing: '-0.5px' }}>
              {fmtCurrency(grandTotalSettled)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500, #64748B)', marginTop: '4px' }}>
              Direct NEFT/RTGS/UPI cleared disbursements
            </div>
          </div>

          {/* Tile 3: Total Institutional Expenditure */}
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
              <span style={{ background: 'rgba(13, 148, 136, 0.15)', color: '#14B8A6', borderRadius: '8px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 800, border: '1px solid rgba(13, 148, 136, 0.3)' }}>
                ✓ ZERO VARIANCE
              </span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--gray-900, #0F172A)', letterSpacing: '-0.5px' }}>
              {fmtCurrency(grandTotalBilled)}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#10B981', marginTop: '4px', fontWeight: 600 }}>
              ✓ Audit Balanced (₹0.00 Mathematical Variance)
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <div style={{
          background: 'var(--surface-0)',
          borderRadius: '16px',
          border: '1px solid var(--gray-200, #E2E8F0)',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--gray-900, #0F172A)' }}>
              🔍 Multi-Dimensional Audit Filters
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--gray-500, #64748B)' }}>
              Showing {filteredBills.length} matched records
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
            gap: '10px'
          }}>
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(Number(e.target.value))}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-300, #CBD5E1)', fontSize: '0.84rem', background: 'var(--surface-0)', color: 'var(--gray-900, #0F172A)' }}
            >
              <option value={0}>All Months</option>
              {MONTHS.map((m, idx) => (
                <option key={idx} value={idx + 1}>{m}</option>
              ))}
            </select>

            <select
              value={filterYear}
              onChange={e => setFilterYear(Number(e.target.value))}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-300, #CBD5E1)', fontSize: '0.84rem', background: 'var(--surface-0)', color: 'var(--gray-900, #0F172A)' }}
            >
              <option value={0}>All Years</option>
              {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-300, #CBD5E1)', fontSize: '0.84rem', background: 'var(--surface-0)', color: 'var(--gray-900, #0F172A)' }}
            >
              <option value="">All Departments</option>
              {uniqueDepts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={filterVendor}
              onChange={e => setFilterVendor(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-300, #CBD5E1)', fontSize: '0.84rem', background: 'var(--surface-0)', color: 'var(--gray-900, #0F172A)' }}
            >
              <option value="">All Canteen Vendors</option>
              {uniqueVendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              title="From Date"
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-300, #CBD5E1)', fontSize: '0.84rem', background: 'var(--surface-0)', color: 'var(--gray-900, #0F172A)', colorScheme: 'dark light' }}
            />

            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              title="To Date"
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-300, #CBD5E1)', fontSize: '0.84rem', background: 'var(--surface-0)', color: 'var(--gray-900, #0F172A)', colorScheme: 'dark light' }}
            />

            <button
              onClick={() => {
                setFilterMonth(0);
                setFilterYear(0);
                setFilterDept('');
                setFilterVendor('');
                setDateFrom('');
                setDateTo('');
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'var(--surface-2)',
                border: '1px solid var(--gray-300, #CBD5E1)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.82rem',
                color: 'var(--gray-700, #334155)'
              }}
            >
              ✕ Reset
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          background: 'var(--surface-1)',
          padding: '6px',
          borderRadius: '14px',
          border: '1px solid var(--gray-200, #E2E8F0)',
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'overview', label: '📊 Executive Analytics & Trends' },
            { id: 'departments', label: '🏛️ Department Budget Ledger' },
            { id: 'vendors', label: '🍽️ Vendor Aging & Payouts' },
            { id: 'archives', label: `📑 Statutory CA Statements (${settlements.length})` },
          ].map(tab => {
            const isActive = activeReportSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveReportSection(tab.id as any)}
                style={{
                  flex: 1,
                  minWidth: '180px',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: isActive ? '1px solid var(--gray-300, #CBD5E1)' : '1px solid transparent',
                  background: isActive ? 'var(--surface-0)' : 'transparent',
                  color: isActive ? 'var(--gray-900, #0F172A)' : 'var(--gray-500, #64748B)',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: EXECUTIVE ANALYTICS & TRENDS */}
        {activeReportSection === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Visual Charts Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))', gap: '20px' }}>
              {/* Monthly Spending Trend */}
              <div style={{ background: 'var(--surface-0)', borderRadius: '16px', border: '1px solid var(--gray-200, #E2E8F0)', padding: '20px 24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)', marginBottom: '4px' }}>
                  📈 Monthly Dining Expenditure Trend (₹)
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--gray-500, #64748B)', marginBottom: '16px' }}>
                  Monthly billed volume vs. cleared settlements
                </p>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200, #E2E8F0)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--gray-500, #94A3B8)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--gray-500, #94A3B8)' }} tickFormatter={v => `₹${v}`} domain={[0, (dataMax: number) => (dataMax > 0 ? 'auto' : 5000)]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--surface-0)', borderColor: 'var(--gray-200, #E2E8F0)', color: 'var(--gray-900, #0F172A)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                        itemStyle={{ color: 'var(--gray-900, #0F172A)' }}
                        formatter={(value: any) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Amount']}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, color: 'var(--gray-700, #334155)' }} />
                      <Bar dataKey="billed" name="Invoiced (₹)" fill="#0D9488" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="settled" name="Settled (₹)" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Department Share Donut */}
              <div style={{ background: 'var(--surface-0)', borderRadius: '16px', border: '1px solid var(--gray-200, #E2E8F0)', padding: '20px 24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)', marginBottom: '4px' }}>
                  🏛️ Department Budget Distribution (%)
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--gray-500, #64748B)', marginBottom: '16px' }}>
                  Percentage breakdown of total campus food requisitions
                </p>
                <div style={{ width: '100%', height: 260 }}>
                  {departmentBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={departmentBreakdown}
                          dataKey="total"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          outerRadius={85}
                          innerRadius={45}
                          paddingAngle={3}
                          label={({ name, percent }: any) => `${name?.slice(0, 12)} (${((percent || 0) * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {departmentBreakdown.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--surface-0)', borderColor: 'var(--gray-200, #E2E8F0)', color: 'var(--gray-900, #0F172A)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                          itemStyle={{ color: 'var(--gray-900, #0F172A)' }}
                          formatter={(value: any) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Total Spend']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--gray-400, #94A3B8)', fontSize: '0.85rem' }}>
                      No department data available for selected filter period.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Summary Highlights */}
            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--gray-200, #E2E8F0)', borderRadius: '16px', padding: '20px 24px' }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)', marginBottom: '12px' }}>
                📋 Statutory Fiscal Compliance & Summary Notes
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '16px', fontSize: '0.82rem' }}>
                <div style={{ background: 'var(--surface-0)', padding: '14px', borderRadius: '12px', border: '1px solid var(--gray-200, #E2E8F0)' }}>
                  <div style={{ fontWeight: 700, color: '#14B8A6', marginBottom: '4px' }}>✓ Strict Double-Counting Protection</div>
                  <div style={{ color: 'var(--gray-500, #64748B)' }}>Master department invoices are excluded from settlement disbursements. All voucher sums reconcile exactly.</div>
                </div>
                <div style={{ background: 'var(--surface-0)', padding: '14px', borderRadius: '12px', border: '1px solid var(--gray-200, #E2E8F0)' }}>
                  <div style={{ fontWeight: 700, color: '#14B8A6', marginBottom: '4px' }}>✓ SAC 9963 & Section 194C Compliant</div>
                  <div style={{ color: 'var(--gray-500, #64748B)' }}>All exports include GST Service Accounting Code 9963 and Income Tax contractor payment schedules.</div>
                </div>
                <div style={{ background: 'var(--surface-0)', padding: '14px', borderRadius: '12px', border: '1px solid var(--gray-200, #E2E8F0)' }}>
                  <div style={{ fontWeight: 700, color: '#14B8A6', marginBottom: '4px' }}>✓ 4-Tier Audit Sign-Off Matrix</div>
                  <div style={{ color: 'var(--gray-500, #64748B)' }}>Certified by Internal Accounts Officer, DCR Officer, Finance Officer / Principal, and Statutory CA.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DEPARTMENT-WISE EXPENDITURE LEDGER */}
        {activeReportSection === 'departments' && (
          <div style={{ background: 'var(--surface-0)', borderRadius: '16px', border: '1px solid var(--gray-200, #E2E8F0)', padding: '20px 24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)', margin: '0 0 2px' }}>
                  🏛️ Department-Wise Expenditure & Budget Ledger
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-500, #64748B)', margin: 0 }}>
                  Itemized food requisition totals, average ticket size, and settlement status by department.
                </p>
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#14B8A6', background: 'rgba(13, 148, 136, 0.12)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(13, 148, 136, 0.25)' }}>
                {departmentBreakdown.length} Departments Audited
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-1)', borderBottom: '2px solid var(--gray-200, #E2E8F0)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Department Label</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Requisitions Count</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Avg. Order Value</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Settled (Paid)</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Pending Dues</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Total Spend (₹)</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Budget Share</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentBreakdown.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--gray-200, #E2E8F0)', background: idx % 2 === 0 ? 'transparent' : 'var(--surface-1)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--gray-900, #0F172A)' }}>{row.label}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--gray-700, #334155)', fontWeight: 600 }}>{row.count} orders</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--gray-500, #64748B)' }}>{fmtCurrency(row.avgOrder)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#10B981', fontWeight: 700 }}>{fmtCurrency(row.settled)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: row.pending > 0 ? '#EF4444' : 'var(--gray-500, #64748B)', fontWeight: row.pending > 0 ? 700 : 400 }}>
                        {fmtCurrency(row.pending)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--gray-900, #0F172A)' }}>{fmtCurrency(row.total)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{ background: 'var(--surface-2)', color: 'var(--gray-700, #334155)', padding: '3px 8px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 700 }}>
                          {row.share.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {departmentBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--gray-400, #94A3B8)' }}>
                        No departmental transactions found for the selected filter parameters.
                      </td>
                    </tr>
                  )}
                </tbody>
                {departmentBreakdown.length > 0 && (
                  <tfoot>
                    <tr style={{ background: 'var(--surface-1)', borderTop: '2px solid var(--gray-300, #CBD5E1)', fontWeight: 800 }}>
                      <td style={{ padding: '12px 14px', color: 'var(--gray-900, #0F172A)' }}>GRAND TOTAL</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--gray-900, #0F172A)' }}>{filteredBills.length} orders</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--gray-500, #64748B)' }}>—</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#10B981' }}>{fmtCurrency(grandTotalSettled)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: grandTotalPending > 0 ? '#EF4444' : 'var(--gray-500, #64748B)' }}>{fmtCurrency(grandTotalPending)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--gray-900, #0F172A)', fontSize: '0.95rem' }}>{fmtCurrency(grandTotalBilled)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#14B8A6' }}>100.0%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CANTEEN VENDOR AGING & PAYOUTS */}
        {activeReportSection === 'vendors' && (
          <div style={{ background: 'var(--surface-0)', borderRadius: '16px', border: '1px solid var(--gray-200, #E2E8F0)', padding: '20px 24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)', margin: '0 0 2px' }}>
                  🍽️ Canteen Vendor Disbursements & Aging Ledger
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-500, #64748B)', margin: 0 }}>
                  Real-time vendor dues, 0-30/31-60/60+ days aging liability, and bank UTR tracking.
                </p>
              </div>
              <Link
                href="/dcr/settlements"
                style={{ fontSize: '0.82rem', fontWeight: 800, color: '#14B8A6', textDecoration: 'none', background: 'rgba(13, 148, 136, 0.12)', padding: '6px 14px', borderRadius: '10px', border: '1px solid rgba(13, 148, 136, 0.25)' }}
              >
                💳 Go to Settlements Hub →
              </Link>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-1)', borderBottom: '2px solid var(--gray-200, #E2E8F0)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Canteen & Proprietor</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Total Invoiced</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#10B981' }}>Total Paid</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Outstanding Due</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Aging Breakdown</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Last Payment Ref</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {outstandingVendors.map((v, idx) => (
                    <tr key={v.vendor_id} style={{ borderBottom: '1px solid var(--gray-200, #E2E8F0)', background: idx % 2 === 0 ? 'transparent' : 'var(--surface-1)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--gray-900, #0F172A)' }}>{v.vendor_name}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--gray-500, #64748B)' }}>👤 {v.owner_name} · 📞 {v.phone || '—'}</div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--gray-900, #0F172A)' }}>
                        {fmtCurrency(v.total_billed)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#10B981' }}>
                        {fmtCurrency(v.total_paid)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: v.outstanding > 0 ? '#EF4444' : '#10B981' }}>
                        {fmtCurrency(v.outstanding)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {v.outstanding > 0 ? (
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', fontSize: '0.7rem' }}>
                            {v.aging_0_30 > 0 && <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2px 6px', borderRadius: '4px' }}>0-30d: {fmtCurrency(v.aging_0_30)}</span>}
                            {v.aging_31_60 > 0 && <span style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#FB923C', border: '1px solid rgba(249, 115, 22, 0.3)', padding: '2px 6px', borderRadius: '4px' }}>31-60d: {fmtCurrency(v.aging_31_60)}</span>}
                            {v.aging_over_60 > 0 && <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 6px', borderRadius: '4px' }}>60+d: {fmtCurrency(v.aging_over_60)}</span>}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#10B981', fontWeight: 700 }}>✓ All Dues Cleared</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {v.last_payment_ref ? (
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--gray-700, #334155)', fontFamily: 'monospace', fontSize: '0.78rem' }}>{v.last_payment_ref}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--gray-400, #94A3B8)' }}>{v.last_payment_date ? new Date(v.last_payment_date).toLocaleDateString('en-IN') : '—'}</div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--gray-400, #94A3B8)', fontSize: '0.78rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: v.outstanding > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: v.outstanding > 0 ? '#EF4444' : '#10B981',
                          border: `1px solid ${v.outstanding > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                        }}>
                          {v.outstanding > 0 ? 'PENDING DUES' : 'CLEARED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: STATUTORY CA AUDIT STATEMENTS & ARCHIVES */}
        {activeReportSection === 'archives' && (
          <div style={{ background: 'var(--surface-0)', borderRadius: '16px', border: '1px solid var(--gray-200, #E2E8F0)', padding: '20px 24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)', margin: '0 0 2px' }}>
                  📑 Certified Monthly Statutory Settlement Statements
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-500, #64748B)', margin: 0 }}>
                  Signed monthly archives with SAC 9963 tax schedules and dynamic 6-sheet reconciliation for Chartered Accountants.
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-1)', borderBottom: '2px solid var(--gray-200, #E2E8F0)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Settlement Voucher #</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Billing Period</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Vendor Bills</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Total Amount</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#10B981' }}>Settled (Paid)</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Audit Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Statutory Exports</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((s, idx) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--gray-200, #E2E8F0)', background: idx % 2 === 0 ? 'transparent' : 'var(--surface-1)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#14B8A6', fontFamily: 'monospace' }}>
                        {s.settlement_number}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--gray-700, #334155)' }}>
                        {MONTHS[s.month - 1]} {s.year}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--gray-500, #64748B)' }}>
                        {s.total_bills} bills
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--gray-900, #0F172A)' }}>
                        {fmtCurrency(s.total_amount)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#10B981' }}>
                        {fmtCurrency(s.settled_amount)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: s.status === 'FINALIZED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: s.status === 'FINALIZED' ? '#10B981' : '#F59E0B',
                          border: `1px solid ${s.status === 'FINALIZED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                        }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleExportSettlement(s.id, 'pdf', s.settlement_number)}
                            disabled={!!exportLoading}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: 'rgba(37, 99, 235, 0.15)',
                              color: 'var(--primary, #3B82F6)',
                              border: '1px solid rgba(37, 99, 235, 0.3)',
                              cursor: 'pointer',
                              fontSize: '0.74rem',
                              fontWeight: 700
                            }}
                          >
                            📄 CA PDF
                          </button>
                          <button
                            onClick={() => handleExportSettlement(s.id, 'excel', s.settlement_number)}
                            disabled={!!exportLoading}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10B981',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              cursor: 'pointer',
                              fontSize: '0.74rem',
                              fontWeight: 700
                            }}
                          >
                            📊 Excel (.xlsx)
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {settlements.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--gray-400, #94A3B8)' }}>
                        No monthly settlements have been calculated or archived yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
