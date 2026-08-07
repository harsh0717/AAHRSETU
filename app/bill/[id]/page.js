'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import BillView from '@/components/BillView';
import { getOrderById, getSession, initSeedData } from '@/lib/store';
import { ROLE_COLORS } from '@/lib/constants';

export default function BillPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id;

  const [order, setOrder] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    initSeedData();
    const s = getSession();
    setSession(s);
    if (orderId) setOrder(getOrderById(orderId));
  }, [orderId]);

  const role = session?.role || 'admin';
  const colors = ROLE_COLORS[role] || ROLE_COLORS.admin;

  function handlePrint() {
    window.print();
  }

  if (!order) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-1)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❓</div>
        <h3>Order not found</h3>
        <button onClick={() => router.push(`/${role}`)} className="btn btn-primary" style={{ '--role-accent': colors.accent, marginTop: '16px' }}>
          ← Go Back
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Print controls (no-print) */}
      <div className="no-print" style={{
        background: 'var(--gray-900)',
        padding: '12px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.push(`/order/${orderId}`)}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            ← Back to Order
          </button>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
            Bill for <strong style={{ color: '#fff' }}>{order.title}</strong> · {order.id}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handlePrint}
            style={{
              background: '#2563EB', border: 'none', color: '#fff',
              padding: '8px 20px', borderRadius: '6px', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            🖨️ Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Bill content */}
      <div style={{
        minHeight: '100vh',
        background: '#E5E7EB',
        padding: '40px 20px',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '700px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <BillView order={order} />
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          div[style*="background: #E5E7EB"] {
            background: white !important;
            padding: 0 !important;
            min-height: auto !important;
          }
          div[style*="box-shadow"] {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
          }
          @page {
            margin: 0;
            size: A4;
          }
        }
      `}</style>
    </>
  );
}
