'use client';
/**
 * Settlement Detail Report Page
 * Shows a complete settlement record with dept/vendor breakdown and export options.
 * This is a permanent, immutable audit record once finalized.
 */
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  'DRAFT':     { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)', label: 'Draft' },
  'FINALIZED': { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)', label: 'Finalized' },
  'REOPENED':  { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)', label: 'Reopened' },
};

export default function SettlementDetailPage() {
  const { t } = useI18n();
  const router = useRouter();
  const routeParams = useParams();
  const settlementId = routeParams?.id as string;
  const [session, setSession] = useState<UserProfile | null>(null);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  const [isMobileDevice, setIsMobileDevice] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobileDevice(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
  }, [settlementId, router]);

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
      <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '32px' }}>
        {/* Header */}
        <div style={{ background: 'var(--surface-0)', borderRadius: '16px', border: '1px solid var(--gray-200, #E2E8F0)', padding: '16px 20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--gray-500, #64748B)', fontWeight: 600 }}>
            <Link href="/dcr" style={{ color: 'var(--gray-500, #64748B)', textDecoration: 'none' }}>Administration</Link>
            <span>›</span>
            <Link href="/dcr/settlements" style={{ color: 'var(--gray-500, #64748B)', textDecoration: 'none' }}>Settlements</Link>
            <span>›</span>
            <span style={{ color: '#0D9488', fontWeight: 700 }}>{settlement.settlement_number}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ margin: 0, fontWeight: 800, color: 'var(--gray-900, #0F172A)', fontSize: '1.3rem' }}>
                  Settlement Report — {MONTHS[settlement.month - 1]} {settlement.year}
                </h1>
                <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, background: ss.bg, color: ss.text, border: `1px solid ${ss.border}` }}>
                  {ss.label}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button onClick={() => handleExport('pdf')} disabled={exportLoading === 'pdf'} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(220, 38, 38, 0.15)', color: '#EF4444', border: '1px solid rgba(220, 38, 38, 0.3)', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>
                {exportLoading === 'pdf' ? '⏳' : '📄'} PDF
              </button>
              <button onClick={() => handleExport('excel')} disabled={exportLoading === 'excel'} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>
                {exportLoading === 'excel' ? '⏳' : '📊'} Excel
              </button>
              <button onClick={() => window.print()} style={{ padding: '6px 12px', borderRadius: '8px', background: 'var(--surface-1)', color: 'var(--gray-700, #334155)', border: '1px solid var(--gray-300, #CBD5E1)', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>
                🖨️ Print
              </button>
            </div>
          </div>
        </div>

        {/* Settlement KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px', marginBottom: '16px' }}>
          {[
            { label: 'Total Bills', value: String(settlement.total_bills), color: '#0284C7', icon: '🧾' },
            { label: 'Total Amount', value: fmtAmount(settlement.total_amount), color: '#14B8A6', icon: '💰' },
            { label: 'Settled Amount', value: fmtAmount(settlement.settled_amount), color: '#10B981', icon: '✅' },
            { label: 'Pending Amount', value: fmtAmount(settlement.pending_amount), color: '#F59E0B', icon: '⏳' },
          ].map((card, i) => (
            <div key={i} style={{ background: 'var(--surface-0)', borderRadius: '12px', border: '1px solid var(--gray-200, #E2E8F0)', borderTop: `4px solid ${card.color}`, padding: '14px 16px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-500, #64748B)', marginTop: '2px' }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Department Breakdown */}
        {settlement.department_breakdown && settlement.department_breakdown.length > 0 && (
          <div style={{ background: 'var(--surface-0)', borderRadius: '14px', border: '1px solid var(--gray-200, #E2E8F0)', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--gray-200, #E2E8F0)', background: 'var(--surface-1)' }}>
              <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--gray-900, #0F172A)', fontSize: '0.9rem' }}>🏫 Department Expenditure</h3>
            </div>
            {isMobileDevice ? (
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {settlement.department_breakdown.map(d => (
                  <div key={d.department_id} style={{ border: '1px solid var(--gray-200, #E2E8F0)', borderRadius: '10px', padding: '10px 12px', background: 'var(--surface-1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--gray-900, #0F172A)' }}>{d.department_name}</span>
                      <span style={{ fontWeight: 900, color: '#14B8A6', fontSize: '0.9rem' }}>{fmtAmount(d.total_amount)}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-500, #64748B)', marginTop: '2px' }}>{d.bill_count} bills</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--gray-200, #E2E8F0)', background: 'var(--surface-1)' }}>
                      <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Department</th>
                      <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Bills</th>
                      <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Total Amount</th>
                      <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Settled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlement.department_breakdown.map((d, i) => (
                      <tr key={d.department_id} style={{ borderBottom: '1px solid var(--gray-200, #E2E8F0)', background: i % 2 === 0 ? 'transparent' : 'var(--surface-1)' }}>
                        <td style={{ padding: '8px 14px', fontWeight: 700, color: 'var(--gray-900, #0F172A)' }}>{d.department_name}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', color: 'var(--gray-500, #64748B)' }}>{d.bill_count}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--gray-900, #0F172A)' }}>{fmtAmount(d.total_amount)}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', color: '#10B981', fontWeight: 600 }}>{fmtAmount(d.settled_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Vendor Breakdown */}
        {settlement.vendor_breakdown && settlement.vendor_breakdown.length > 0 && (
          <div style={{ background: 'var(--surface-0)', borderRadius: '14px', border: '1px solid var(--gray-200, #E2E8F0)', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--gray-200, #E2E8F0)', background: 'var(--surface-1)' }}>
              <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--gray-900, #0F172A)', fontSize: '0.9rem' }}>🍽️ Vendor Settlements</h3>
            </div>
            {isMobileDevice ? (
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {settlement.vendor_breakdown.map(v => (
                  <div key={v.vendor_id} style={{ border: '1px solid var(--gray-200, #E2E8F0)', borderRadius: '10px', padding: '10px 12px', background: 'var(--surface-1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--gray-900, #0F172A)' }}>{v.vendor_name}</span>
                      <span style={{ fontWeight: 900, color: '#10B981', fontSize: '0.9rem' }}>{fmtAmount(v.total_amount)}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-500, #64748B)', marginTop: '2px' }}>{v.bill_count} bills</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--gray-200, #E2E8F0)', background: 'var(--surface-1)' }}>
                      <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Vendor</th>
                      <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Bills</th>
                      <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Total Amount</th>
                      <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Settled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlement.vendor_breakdown.map((v, i) => (
                      <tr key={v.vendor_id} style={{ borderBottom: '1px solid var(--gray-200, #E2E8F0)', background: i % 2 === 0 ? 'transparent' : 'var(--surface-1)' }}>
                        <td style={{ padding: '8px 14px', fontWeight: 700, color: 'var(--gray-900, #0F172A)' }}>{v.vendor_name}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', color: 'var(--gray-500, #64748B)' }}>{v.bill_count}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--gray-900, #0F172A)' }}>{fmtAmount(v.total_amount)}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', color: '#10B981', fontWeight: 600 }}>{fmtAmount(v.settled_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </AppShell>
  );
}
