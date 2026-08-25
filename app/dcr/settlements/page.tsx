'use client';
/**
 * Administration Payments & Settlements Page
 * Provides monthly settlement workflow, settlement history, and export capabilities.
 * All financial calculations are server-side. Never hardcoded values.
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  'DRAFT':     { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA', label: 'Draft' },
  'FINALIZED': { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', label: 'Finalized' },
  'REOPENED':  { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', label: 'Reopened' },
};

export default function SettlementsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [session, setSession] = useState<UserProfile | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('history');

  // New Settlement form
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [draft, setDraft] = useState<Settlement | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadSettlements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Settlement[]>('/settlements');
      setSettlements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('[Settlements] Failed to load:', err);
      setSettlements([]);
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
    loadSettlements();
  }, []);

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
      await api.post(`/settlements/${draft.id}/finalize`, {});
      setSuccessMsg(`Settlement ${draft.settlement_number} finalized successfully!`);
      setDraft(null);
      setConfirmOpen(false);
      await loadSettlements();
      setActiveTab('history');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Finalization failed. Please verify settlement totals.');
    } finally {
      setFinalizing(false);
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
  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  if (!session) return null;

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <AppShell role={(session.role as 'dcr' | 'administration') || 'dcr'} currentPath="/dcr/settlements">
      <div>
        {/* Header */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <Link href="/dcr" style={{ color: '#6B7280', textDecoration: 'none', fontSize: '0.85rem' }}>Administration</Link>
              <span style={{ color: '#D1D5DB' }}>›</span>
              <span style={{ fontSize: '0.85rem', color: '#0D9488', fontWeight: 600 }}>Payments & Settlements</span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px', color: '#0F172A' }}>💳 Payments & Settlements</h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280' }}>Monthly settlement workflow and permanent settlement history.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/dcr/bills" style={{ padding: '8px 16px', borderRadius: '8px', background: '#F0FDFA', color: '#0F766E', border: '1px solid #0D9488', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
              🧾 All Bills
            </Link>
          </div>
        </div>

        {/* Success message */}
        {successMsg && (
          <div style={{ background: '#F0FDF4', border: '1px solid #22C55E', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#15803D', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            ✅ {successMsg}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #EF4444', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#991B1B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚠️ {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B', fontWeight: 700 }}>✕</button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {(['history', 'new'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 20px', borderRadius: '8px', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.9rem',
                background: activeTab === tab ? '#0D9488' : '#F3F4F6',
                color: activeTab === tab ? 'white' : '#374151',
              }}
            >
              {tab === 'history' ? '📋 Settlement History' : '➕ New Settlement'}
            </button>
          ))}
        </div>

        {/* Settlement History Tab */}
        {activeTab === 'history' && (
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#374151' }}>
                {loading ? 'Loading...' : `${settlements.length} settlement${settlements.length !== 1 ? 's' : ''}`}
              </span>
              <button onClick={loadSettlements} style={{ padding: '6px 14px', borderRadius: '8px', background: '#F3F4F6', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                🔄 Refresh
              </button>
            </div>
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#9CA3AF' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div> Loading settlements...
              </div>
            ) : settlements.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#9CA3AF' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>💳</div>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>No settlements yet</div>
                <div style={{ fontSize: '0.85rem', marginBottom: '16px' }}>Once a monthly settlement is finalized, it will appear here permanently.</div>
                <button onClick={() => setActiveTab('new')} style={{ padding: '10px 20px', borderRadius: '8px', background: '#0D9488', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                  ➕ Create First Settlement
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Settlement #</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Period</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Total Bills</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Total Amount</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Status</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Finalized</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Actions</th>
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
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>{fmtAmount(s.total_amount)}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: ss.bg, color: ss.text, border: `1px solid ${ss.border}` }}>
                              {ss.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#6B7280', fontSize: '0.8rem' }}>
                            {s.finalized_at ? fmtDate(s.finalized_at) : '—'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                              <Link href={`/dcr/settlements/${s.id}`} style={{ padding: '4px 10px', borderRadius: '6px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', textDecoration: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
                                📊 View
                              </Link>
                              <button
                                onClick={() => handleExport(s.id, 'pdf', s.settlement_number)}
                                disabled={exportLoading === `${s.id}-pdf`}
                                style={{ padding: '4px 10px', borderRadius: '6px', background: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
                              >
                                {exportLoading === `${s.id}-pdf` ? '⏳' : '📄'} PDF
                              </button>
                              <button
                                onClick={() => handleExport(s.id, 'excel', s.settlement_number)}
                                disabled={exportLoading === `${s.id}-excel`}
                                style={{ padding: '4px 10px', borderRadius: '6px', background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
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

        {/* New Settlement Tab */}
        {activeTab === 'new' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '20px', alignItems: 'start' }}>
            {/* Step 1: Configure */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', background: '#F0FDFA' }}>
                <h3 style={{ margin: 0, fontWeight: 800, color: '#0F766E', fontSize: '1rem' }}>Step 1: Configure Settlement</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6B7280' }}>Select the month and year to settle</p>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '6px', fontSize: '0.85rem' }}>Month</label>
                  <select value={selectedMonth} onChange={e => { setSelectedMonth(Number(e.target.value)); setDraft(null); }} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.9rem', background: 'white' }}>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '6px', fontSize: '0.85rem' }}>Year</label>
                  <select value={selectedYear} onChange={e => { setSelectedYear(Number(e.target.value)); setDraft(null); }} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.9rem', background: 'white' }}>
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '6px', fontSize: '0.85rem' }}>Notes (optional)</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Settlement notes..." style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <button
                  onClick={handleCalculate}
                  disabled={calculating}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0D9488', color: 'white', border: 'none', cursor: calculating ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {calculating ? '⏳ Calculating...' : '🔢 Calculate Settlement'}
                </button>
              </div>
            </div>

            {/* Step 2: Preview */}
            {draft && (
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', background: '#F0FDF4' }}>
                  <h3 style={{ margin: 0, fontWeight: 800, color: '#15803D', fontSize: '1rem' }}>Step 2: Verify & Finalize</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6B7280' }}>Review the calculated settlement — all amounts are server-computed</p>
                </div>
                <div style={{ padding: '20px' }}>
                  {/* Summary numbers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                    {[
                      { label: 'Period', value: `${MONTHS[draft.month - 1]} ${draft.year}` },
                      { label: 'Settlement #', value: draft.settlement_number },
                      { label: 'Total Bills', value: String(draft.total_bills) },
                      { label: 'Total Amount', value: fmtAmount(draft.total_amount) },
                    ].map((item, i) => (
                      <div key={i} style={{ background: '#F8FAFC', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Department breakdown */}
                  {draft.department_breakdown && draft.department_breakdown.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ margin: '0 0 8px', fontWeight: 700, color: '#374151', fontSize: '0.85rem' }}>Department Breakdown</h4>
                      <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                          <thead>
                            <tr style={{ background: '#F8FAFC' }}>
                              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Department</th>
                              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Bills</th>
                              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {draft.department_breakdown.map((d, i) => (
                              <tr key={d.department_id} style={{ borderTop: '1px solid #F3F4F6', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                                <td style={{ padding: '8px 12px' }}>{d.department_name}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#6B7280' }}>{d.bill_count}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>{fmtAmount(d.total_amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Vendor breakdown */}
                  {draft.vendor_breakdown && draft.vendor_breakdown.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ margin: '0 0 8px', fontWeight: 700, color: '#374151', fontSize: '0.85rem' }}>Vendor Breakdown</h4>
                      <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                          <thead>
                            <tr style={{ background: '#F8FAFC' }}>
                              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Vendor</th>
                              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Bills</th>
                              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {draft.vendor_breakdown.map((v, i) => (
                              <tr key={v.vendor_id} style={{ borderTop: '1px solid #F3F4F6', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                                <td style={{ padding: '8px 12px' }}>{v.vendor_name}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#6B7280' }}>{v.bill_count}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>{fmtAmount(v.total_amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Total confirmation box */}
                  <div style={{ background: '#F0FDFA', border: '1px solid #0D9488', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#0F766E', fontSize: '0.9rem' }}>Total Settlement Amount</span>
                      <span style={{ fontWeight: 900, color: '#0F766E', fontSize: '1.3rem' }}>{fmtAmount(draft.total_amount)}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '4px' }}>
                      {draft.total_bills} bills across {draft.department_breakdown?.length || 0} department(s) and {draft.vendor_breakdown?.length || 0} vendor(s). Calculated server-side.
                    </div>
                  </div>

                  {/* Important notice */}
                  <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.8rem', color: '#92400E' }}>
                    ⚠️ <strong>Important:</strong> Finalizing this settlement marks all included bills as SETTLED. This is a permanent record. Settlement and actual payment are separate — marking settled does NOT imply an electronic payment was made.
                  </div>

                  <button
                    onClick={() => setConfirmOpen(true)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#059669', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}
                  >
                    ✅ Finalize Settlement
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmOpen && draft && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>Confirm Finalization</h2>
              <p style={{ margin: '0 0 20px', color: '#6B7280', fontSize: '0.9rem' }}>
                You are about to finalize the settlement for <strong>{MONTHS[draft.month - 1]} {draft.year}</strong>.
              </p>
              <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#6B7280', fontSize: '0.85rem' }}>Settlement Number</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{draft.settlement_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#6B7280', fontSize: '0.85rem' }}>Total Bills</span>
                  <span style={{ fontWeight: 700 }}>{draft.total_bills}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
                  <span style={{ fontWeight: 700 }}>Total Amount</span>
                  <span style={{ fontWeight: 900, fontSize: '1.2rem', color: '#0F766E' }}>{fmtAmount(draft.total_amount)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setConfirmOpen(false)} disabled={finalizing} style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#F3F4F6', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#374151' }}>
                  Cancel
                </button>
                <button onClick={handleFinalize} disabled={finalizing} style={{ flex: 2, padding: '12px', borderRadius: '8px', background: '#059669', color: 'white', border: 'none', cursor: finalizing ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.95rem' }}>
                  {finalizing ? '⏳ Finalizing...' : '✅ Confirm & Finalize'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
