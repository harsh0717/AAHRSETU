'use client';
import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useTheme } from '@/components/ThemeProvider';
import ThemeToggle from '@/components/ThemeToggle';

export default function VerifyInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const invoiceId = resolvedParams.id;
  
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function fetchVerification() {
      setLoading(true);
      setError('');
      try {
        const data = await api.get<any>(`/orders/verify-invoice/${invoiceId}`);
        setInvoice(data);
      } catch (err: any) {
        setError(err.message || 'Invoice signature verification failed.');
      } finally {
        setLoading(false);
      }
    }
    if (invoiceId) {
      fetchVerification();
    }
  }, [invoiceId]);

  return (
    <div style={{
      minHeight: '100vh',
      background: isDark
        ? 'radial-gradient(ellipse at top, #1E293B 0%, #0B0F17 100%)'
        : 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)',
      color: isDark ? '#F8FAFC' : '#0F172A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative'
    }}>
      {/* Quick Theme Switcher in top right corner */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 50 }}>
        <ThemeToggle variant="icon" />
      </div>

      <div style={{
        maxWidth: '580px',
        width: '100%',
        background: isDark ? 'var(--surface-0, #131E2F)' : '#FFFFFF',
        borderRadius: '24px',
        boxShadow: isDark
          ? '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)'
          : '0 20px 40px rgba(37, 99, 235, 0.12)',
        border: `1px solid ${isDark ? 'var(--gray-200, #2D3D54)' : 'var(--gray-200, #E2E8F0)'}`,
        padding: '36px 32px',
        textAlign: 'center',
        boxSizing: 'border-box',
        transition: 'all 0.2s ease'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🛡️</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: isDark ? '#FFFFFF' : 'var(--gray-900, #0F172A)', marginBottom: '4px' }}>
          AharSetu Invoice Verification
        </h2>
        <p style={{ fontSize: '0.85rem', color: isDark ? '#94A3B8' : 'var(--gray-500, #64748B)', marginBottom: '24px' }}>
          Official Institutional Billing Authenticator
        </p>

        {loading ? (
          <div style={{ padding: '32px 0', color: isDark ? '#94A3B8' : 'var(--gray-500, #64748B)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px', animation: 'spin 1s infinite linear' }}>🔄</div>
            <div>Verifying digital invoice signatures...</div>
          </div>
        ) : error ? (
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: isDark ? 'rgba(239, 68, 68, 0.18)' : '#FEE2E2',
              color: isDark ? '#FCA5A5' : '#991B1B',
              border: isDark ? '1px solid rgba(239, 68, 68, 0.35)' : 'none',
              fontWeight: 800,
              fontSize: '0.85rem',
              padding: '8px 16px',
              borderRadius: '999px',
              marginBottom: '24px'
            }}>
              ✕ VERIFICATION FAILED
            </div>
            <div style={{
              background: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FFF5F5',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center',
              fontSize: '0.85rem',
              marginBottom: '24px',
              border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2'}`,
              color: isDark ? '#FCA5A5' : '#991B1B',
              fontWeight: 600
            }}>
              {error}
            </div>
            <Link href="/login" style={{
              display: 'block',
              width: '100%',
              padding: '12px',
              background: '#2563EB',
              color: 'white',
              borderRadius: '12px',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}>
              Return to Portal Login
            </Link>
          </div>
        ) : invoice ? (
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: isDark ? 'rgba(34, 197, 94, 0.18)' : '#DCFCE7',
              color: isDark ? '#4ADE80' : '#15803D',
              border: isDark ? '1px solid rgba(34, 197, 94, 0.35)' : 'none',
              fontWeight: 800,
              fontSize: '0.85rem',
              padding: '8px 16px',
              borderRadius: '999px',
              marginBottom: '24px'
            }}>
              ✓ VERIFIED GENUINE INVOICE
            </div>

            <div style={{
              background: isDark ? 'var(--surface-1, #0B0F17)' : 'var(--surface-1, #FAFBFD)',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              fontSize: '0.85rem',
              marginBottom: '24px',
              border: `1px solid ${isDark ? 'var(--gray-200, #2D3D54)' : 'var(--gray-200, #E2E8F0)'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: isDark ? '#94A3B8' : 'var(--gray-500, #64748B)', fontWeight: 600 }}>Invoice No:</span>
                <span style={{ fontWeight: 800, color: isDark ? '#FFFFFF' : 'var(--gray-900, #0F172A)' }}>{invoice.invoice_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: isDark ? '#94A3B8' : 'var(--gray-500, #64748B)', fontWeight: 600 }}>Order Ref:</span>
                <span style={{ fontWeight: 800, color: isDark ? '#60A5FA' : '#2563EB' }}>{invoice.order_reference}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: isDark ? '#94A3B8' : 'var(--gray-500, #64748B)', fontWeight: 600 }}>Order Purpose:</span>
                <span style={{ fontWeight: 700, color: isDark ? '#FFFFFF' : 'var(--gray-900, #0F172A)', textAlign: 'right' }}>{invoice.purpose || invoice.title}</span>
              </div>
              {invoice.order_type === 'SCHEDULED' && invoice.scheduled_for && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: isDark ? '#94A3B8' : 'var(--gray-500, #64748B)', fontWeight: 600 }}>Scheduled For:</span>
                  <span style={{ fontWeight: 700, color: isDark ? '#60A5FA' : '#2563EB', textAlign: 'right' }}>
                    {new Date(invoice.scheduled_for).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: isDark ? '#94A3B8' : 'var(--gray-500, #64748B)', fontWeight: 600 }}>Department:</span>
                <span style={{ fontWeight: 700, color: isDark ? '#FFFFFF' : 'var(--gray-900, #0F172A)' }}>{invoice.department_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: isDark ? '#94A3B8' : 'var(--gray-500, #64748B)', fontWeight: 600 }}>Canteen Vendor:</span>
                <span style={{ fontWeight: 700, color: isDark ? '#FFFFFF' : 'var(--gray-900, #0F172A)' }}>{invoice.vendor_name}</span>
              </div>
              {invoice.vendor_owner_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: isDark ? '#94A3B8' : 'var(--gray-500, #64748B)', fontWeight: 600 }}>Vendor Owner:</span>
                  <span style={{ fontWeight: 700, color: isDark ? '#FFFFFF' : 'var(--gray-900, #0F172A)' }}>{invoice.vendor_owner_name}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: isDark ? '#94A3B8' : 'var(--gray-500, #64748B)', fontWeight: 600 }}>Issued Date:</span>
                <span style={{ fontWeight: 700, color: isDark ? '#FFFFFF' : 'var(--gray-900, #0F172A)' }}>{invoice.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: isDark ? '#94A3B8' : 'var(--gray-500, #64748B)', fontWeight: 600 }}>System Status:</span>
                <span style={{ fontWeight: 800, color: isDark ? '#4ADE80' : '#16A34A' }}>🟢 {invoice.order_status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px dashed ${isDark ? 'var(--gray-200, #2D3D54)' : '#CBD5E1'}`, paddingTop: '10px' }}>
                <span style={{ color: isDark ? '#94A3B8' : 'var(--gray-500, #64748B)', fontWeight: 600 }}>Total Billed:</span>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: isDark ? '#4ADE80' : '#16A34A' }}>₹{invoice.total_amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Itemized details section */}
            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: isDark ? '#E2E8F0' : 'var(--gray-700, #334155)', marginBottom: '10px' }}>Itemized Breakdown</h4>
              <div style={{ background: isDark ? 'var(--surface-1, #0B0F17)' : 'var(--surface-0, #FFFFFF)', border: `1px solid ${isDark ? 'var(--gray-200, #2D3D54)' : 'var(--gray-200, #E2E8F0)'}`, borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'var(--surface-2, #F4F5F7)', borderBottom: `1px solid ${isDark ? 'var(--gray-200, #2D3D54)' : 'var(--gray-200, #E2E8F0)'}` }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: isDark ? '#94A3B8' : 'var(--gray-600, #475569)' }}>Item</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: isDark ? '#94A3B8' : 'var(--gray-600, #475569)' }}>Qty</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: isDark ? '#94A3B8' : 'var(--gray-600, #475569)' }}>Price</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: isDark ? '#94A3B8' : 'var(--gray-600, #475569)' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items && invoice.items.map((item: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: idx < invoice.items.length - 1 ? `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9'}` : 'none' }}>
                        <td style={{ padding: '10px 12px', color: isDark ? '#FFFFFF' : 'var(--gray-900, #0F172A)', fontWeight: 600 }}>
                          {item.name}
                          {item.vendor && (
                            <span style={{ display: 'block', fontSize: '0.7rem', color: isDark ? '#94A3B8' : 'var(--gray-500, #64748B)', fontWeight: 500 }}>
                              Canteen: {item.vendor}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: isDark ? '#CBD5E1' : 'var(--gray-700, #334155)' }}>{item.quantity}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: isDark ? '#CBD5E1' : 'var(--gray-700, #334155)' }}>₹{item.price.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: isDark ? '#FFFFFF' : 'var(--gray-900, #0F172A)', fontWeight: 700 }}>₹{item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Link href="/login" style={{
              display: 'block',
              width: '100%',
              padding: '12px',
              background: '#2563EB',
              color: 'white',
              borderRadius: '12px',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}>
              Return to Portal Login
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
