'use client';
/**
 * Settlement Detail Report Page
 * Shows a complete settlement record with dept/vendor breakdown and export options.
 * This is a permanent, immutable audit record once finalized.
 */
import { useState, useEffect } from 'react';
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
  status: string;
  created_at: string;
  finalized_at: string | null;
  creator_name: string | null;
  notes: string | null;
  department_breakdown: Array<{
    department_id: string;
    department_name: string;
    bill_count: number;
    total_amount: number;
    settled_amount: number;
    pending_amount: number;
  }>;
  vendor_breakdown: Array<{
    vendor_id: string;
    vendor_name: string;
    bill_count: number;
    total_amount: number;
    settled_amount: number;
    pending_amount: number;
  }>;
  bills: Array<{
    id: string;
    invoice_number: string;
    order_id: string;
    department_label: string;
    vendor_name: string | null;
    amount: number;
    settlement_status: string;
    generated_at: string;
  }>;
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

export default function SettlementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useI18n();
  const router = useRouter();
  const [session, setSession] = useState<UserProfile | null>(null);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [settlementId, setSettlementId] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => setSettlementId(p.id));
  }, [params]);

  useEffect(() => {
    if (!settlementId) return;
    const s = getSession();
    if (!s) { router.replace('/login'); return; }
    if (s.role !== 'dcr' && s.role !== 'administration' && s.role !== 'admin') {
      router.replace(`/${s.role}`);
      return;
    }
    setSession(s);

    const load = async () => {
      setLoading(true);
      try {
        const data = await api.get<Settlement>(`/settlements/${settlementId}/report`);
        setSettlement(data);
      } catch {
        // Fallback to basic GET
        try {
          const data = await api.get<Settlement>(`/settlements/${settlementId}`);
          setSettlement(data);
        } catch (err) {
          console.error('[Settlement Detail] Failed:', err);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [settlementId]);

  const handleExport = async (type: 'pdf' | 'excel') => {
    if (!settlement) return;
    setExportLoading(type);
    try {
      const token = sessionStorage.getItem('aharsetu_access_token') || localStorage.getItem('aharsetu_access_token');
      const res = await fetch(`/api/v1/settlements/${settlement.id}/export/${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `AaharSetu_Settlement_${settlement.settlement_number}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert('Export failed. Please try again.');
    } finally {
      setExportLoading(null);
    }
  };

  const fmtAmount = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  if (!session || loading) {
    return (
      <AppShell role="dcr" currentPath="/dcr/settlements">
        <div style={{ padding: '48px', textAlign: 'center', color: '#9CA3AF' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
          Loading settlement details...
        </div>
      </AppShell>
    );
  }

  if (!settlement) {
    return (
      <AppShell role="dcr" currentPath="/dcr/settlements">
        <div style={{ padding: '48px', textAlign: 'center', color: '#9CA3AF' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔍</div>
          <div style={{ fontWeight: 700 }}>Settlement not found</div>
          <Link href="/dcr/settlements" style={{ display: 'inline-block', marginTop: '16px', padding: '10px 20px', borderRadius: '8px', background: '#0D9488', color: 'white', textDecoration: 'none', fontWeight: 700 }}>
            ← Back to Settlements
          </Link>
        </div>
      </AppShell>
    );
  }

  const ss = STATUS_STYLES[settlement.status] || STATUS_STYLES['DRAFT'];

  return (
    <AppShell role={(session.role as 'dcr' | 'administration') || 'dcr'} currentPath="/dcr/settlements">
      <div>
        {/* Header */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px 24px', marginBottom: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <Link href="/dcr" style={{ color: '#6B7280', textDecoration: 'none', fontSize: '0.85rem' }}>Administration</Link>
            <span style={{ color: '#D1D5DB' }}>›</span>
            <Link href="/dcr/settlements" style={{ color: '#6B7280', textDecoration: 'none', fontSize: '0.85rem' }}>Settlements</Link>
            <span style={{ color: '#D1D5DB' }}>›</span>
            <span style={{ fontSize: '0.85rem', color: '#0D9488', fontWeight: 600 }}>{settlement.settlement_number}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ margin: '0 0 4px', fontWeight: 800, color: '#0F172A', fontSize: '1.5rem' }}>
                Settlement Report — {MONTHS[settlement.month - 1]} {settlement.year}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F766E', fontSize: '0.9rem' }}>{settlement.settlement_number}</span>
                <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: ss.bg, color: ss.text, border: `1px solid ${ss.border}` }}>
                  {ss.label}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => handleExport('pdf')} disabled={exportLoading === 'pdf'} style={{ padding: '8px 16px', borderRadius: '8px', background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
                {exportLoading === 'pdf' ? '⏳' : '📄'} Export PDF
              </button>
              <button onClick={() => handleExport('excel')} disabled={exportLoading === 'excel'} style={{ padding: '8px 16px', borderRadius: '8px', background: '#22C55E', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
                {exportLoading === 'excel' ? '⏳' : '📊'} Export Excel
              </button>
              <button onClick={() => window.print()} style={{ padding: '8px 16px', borderRadius: '8px', background: '#374151', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
                🖨️ Print
              </button>
            </div>
          </div>
        </div>

        {/* Settlement KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Bills', value: String(settlement.total_bills), color: '#3B82F6', icon: '🧾' },
            { label: 'Total Amount', value: fmtAmount(settlement.total_amount), color: '#0D9488', icon: '💰' },
            { label: 'Settled Amount', value: fmtAmount(settlement.settled_amount), color: '#059669', icon: '✅' },
            { label: 'Pending Amount', value: fmtAmount(settlement.pending_amount), color: '#D97706', icon: '⏳' },
          ].map((card, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', borderTop: `4px solid ${card.color}`, padding: '16px 20px' }}>
              <div style={{ fontSize: '1.2rem', marginBottom: '6px' }}>{card.icon}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', marginTop: '2px' }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Settlement metadata */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontWeight: 800, color: '#374151', fontSize: '0.95rem' }}>Settlement Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.85rem' }}>
            {[
              ['Settlement Number', settlement.settlement_number],
              ['Period', `${MONTHS[settlement.month - 1]} ${settlement.year}`],
              ['Status', ss.label],
              ['Created', fmtDate(settlement.created_at)],
              ['Finalized', fmtDate(settlement.finalized_at)],
              ['Created By', settlement.creator_name || '—'],
            ].map(([label, value], i) => (
              <div key={i}>
                <div style={{ color: '#9CA3AF', fontWeight: 700, marginBottom: '2px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontWeight: 700, color: '#0F172A' }}>{value}</div>
              </div>
            ))}
          </div>
          {settlement.notes && (
            <div style={{ marginTop: '12px', padding: '10px 14px', background: '#F8FAFC', borderRadius: '8px', fontSize: '0.85rem', color: '#6B7280' }}>
              <strong>Notes:</strong> {settlement.notes}
            </div>
          )}
        </div>

        {/* Department Breakdown */}
        {settlement.department_breakdown && settlement.department_breakdown.length > 0 && (
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <h3 style={{ margin: 0, fontWeight: 800, color: '#374151', fontSize: '0.95rem' }}>🏫 Department Expenditure</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Department</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Bills</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Total Amount</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Settled</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {settlement.department_breakdown.map((d, i) => (
                    <tr key={d.department_id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 700 }}>{d.department_name}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#6B7280' }}>{d.bill_count}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>{fmtAmount(d.total_amount)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>{fmtAmount(d.settled_amount)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#D97706', fontWeight: 600 }}>{fmtAmount(d.pending_amount)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #E2E8F0', background: '#F0FDFA' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 800 }}>TOTAL</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800 }}>{settlement.total_bills}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, color: '#0D9488' }}>{fmtAmount(settlement.total_amount)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>{fmtAmount(settlement.settled_amount)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, color: '#D97706' }}>{fmtAmount(settlement.pending_amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vendor Breakdown */}
        {settlement.vendor_breakdown && settlement.vendor_breakdown.length > 0 && (
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <h3 style={{ margin: 0, fontWeight: 800, color: '#374151', fontSize: '0.95rem' }}>🍽️ Vendor Settlement</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Vendor</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Bills</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Total Amount</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Settled</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {settlement.vendor_breakdown.map((v, i) => (
                    <tr key={v.vendor_id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 700 }}>{v.vendor_name}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#6B7280' }}>{v.bill_count}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>{fmtAmount(v.total_amount)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>{fmtAmount(v.settled_amount)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#D97706', fontWeight: 600 }}>{fmtAmount(v.pending_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bill Register */}
        {settlement.bills && settlement.bills.length > 0 && (
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <h3 style={{ margin: 0, fontWeight: 800, color: '#374151', fontSize: '0.95rem' }}>📋 Bill Register ({settlement.bills.length} bills)</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', background: '#F8FAFC' }}>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Invoice #</th>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Order ID</th>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Department</th>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Vendor</th>
                    <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Amount</th>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {settlement.bills.map((bill, i) => (
                    <tr key={bill.id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                      <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#0F766E' }}>{bill.invoice_number || bill.id}</td>
                      <td style={{ padding: '8px 14px', color: '#6B7280' }}>{bill.order_id}</td>
                      <td style={{ padding: '8px 14px' }}>{bill.department_label || '—'}</td>
                      <td style={{ padding: '8px 14px', color: '#6B7280' }}>{bill.vendor_name || 'Master Invoice'}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700 }}>{fmtAmount(bill.amount)}</td>
                      <td style={{ padding: '8px 14px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, background: bill.settlement_status === 'SETTLED' ? '#F0FDF4' : '#FFF7ED', color: bill.settlement_status === 'SETTLED' ? '#15803D' : '#C2410C', border: `1px solid ${bill.settlement_status === 'SETTLED' ? '#BBF7D0' : '#FED7AA'}` }}>
                          {bill.settlement_status?.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
