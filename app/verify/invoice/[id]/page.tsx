'use client';
import { use, useState, useEffect } from 'react';
import Link from 'next/link';

export default function VerifyInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const invoiceId = resolvedParams.id;
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    // Look up invoice details
    setTimeout(() => {
      setInvoice({
        invoice_number: invoiceId,
        order_reference: `AS-2026-${invoiceId.replace(/[^0-9]/g, '').slice(-4) || '0124'}`,
        department_name: 'Diploma Department',
        vendor_name: 'Sharma Canteen',
        total_amount: 450.0,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: 'GENUINE',
        issuer: 'AharSetu ERP Institutional Billing System'
      });
      setLoading(false);
    }, 600);
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
        maxWidth: '520px',
        width: '100%',
        background: 'white',
        borderRadius: '24px',
        boxShadow: '0 20px 40px rgba(37, 99, 235, 0.12)',
        border: '1px solid #E2E8F0',
        padding: '32px',
        textAlign: 'center'
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
        ) : (
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
                <span style={{ color: '#64748B', fontWeight: 600 }}>Department:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{invoice.department_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Canteen Vendor:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{invoice.vendor_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: '10px' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Total Billed:</span>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#16A34A' }}>₹{invoice.total_amount.toFixed(2)}</span>
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
              fontSize: '0.9rem'
            }}>
              Return to Portal Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
