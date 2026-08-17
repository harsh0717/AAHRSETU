'use client';
import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function VerifyInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const invoiceId = resolvedParams.id;
  
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
      background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        background: 'white',
        borderRadius: '24px',
        boxShadow: '0 20px 40px rgba(37, 99, 235, 0.12)',
        border: '1px solid #E2E8F0',
        padding: '32px',
        textAlign: 'center',
        boxSizing: 'border-box'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🛡️</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
          AharSetu Invoice Verification
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '24px' }}>
          Official Institutional Billing Authenticator
        </p>

        {loading ? (
          <div style={{ padding: '32px 0', color: '#64748B' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px', animation: 'spin 1s infinite linear' }}>🔄</div>
            <div>Verifying digital invoice signatures...</div>
          </div>
        ) : error ? (
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#FEE2E2',
              color: '#991B1B',
              fontWeight: 800,
              fontSize: '0.85rem',
              padding: '8px 16px',
              borderRadius: '999px',
              marginBottom: '24px'
            }}>
              ✕ VERIFICATION FAILED
            </div>
            <div style={{
              background: '#FFF5F5',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center',
              fontSize: '0.85rem',
              marginBottom: '24px',
              border: '1px solid #FEE2E2',
              color: '#991B1B',
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
              background: '#DCFCE7',
              color: '#15803D',
              fontWeight: 800,
              fontSize: '0.85rem',
              padding: '8px 16px',
              borderRadius: '999px',
              marginBottom: '24px'
            }}>
              ✓ VERIFIED GENUINE INVOICE
            </div>

            <div style={{
              background: '#F8FAFC',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              fontSize: '0.85rem',
              marginBottom: '24px',
              border: '1px solid #E2E8F0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Invoice No:</span>
                <span style={{ fontWeight: 800, color: '#0F172A' }}>{invoice.invoice_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Order Ref:</span>
                <span style={{ fontWeight: 800, color: '#2563EB' }}>{invoice.order_reference}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Purpose:</span>
                <span style={{ fontWeight: 700, color: '#0F172A', textAlign: 'right' }}>{invoice.title} ({invoice.purpose})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Department:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{invoice.department_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Canteen Vendor:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{invoice.vendor_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Issued Date:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{invoice.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>System Status:</span>
                <span style={{ fontWeight: 800, color: '#16A34A' }}>🟢 {invoice.order_status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: '10px' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Total Billed:</span>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#16A34A' }}>₹{invoice.total_amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Itemized details section */}
            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '10px' }}>Itemized Breakdown</h4>
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Item</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Qty</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>Price</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items && invoice.items.map((item: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: idx < invoice.items.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                        <td style={{ padding: '10px 12px', color: '#0F172A', fontWeight: 600 }}>
                          {item.name}
                          {item.vendor && (
                            <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748B', fontWeight: 500 }}>
                              Canteen: {item.vendor}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#334155' }}>{item.quantity}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#334155' }}>₹{item.price.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0F172A', fontWeight: 700 }}>₹{item.subtotal.toFixed(2)}</td>
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
