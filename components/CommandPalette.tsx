'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getOrders } from '@/lib/store';

export default function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ type: string; title: string; subtitle: string; action: () => void }[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Trigger open
          const evt = new CustomEvent('open_command_palette');
          window.dispatchEvent(evt);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([
        { type: 'PAGE', title: '➕ Create Requisition', subtitle: 'Order beverages & canteen meals', action: () => { router.push('/coordinator/orders/create'); onClose(); } },
        { type: 'PAGE', title: '🖥️ System Health & Observability', subtitle: 'View API & microservices status', action: () => { router.push('/admin/system-health'); onClose(); } },
        { type: 'PAGE', title: '📊 Expenditure Reports', subtitle: 'Department expenditure analytics', action: () => { router.push('/admin/reports'); onClose(); } }
      ]);
      return;
    }

    async function search() {
      const q = query.toLowerCase();
      const allOrders = await getOrders();
      const matchedOrders = allOrders.filter(o => o.id.toLowerCase().includes(q) || (o.order_reference && o.order_reference.toLowerCase().includes(q)) || (o.title && o.title.toLowerCase().includes(q)));

      const items = matchedOrders.slice(0, 4).map(o => ({
        type: 'ORDER',
        title: `Order ${o.order_reference || o.id}`,
        subtitle: `${o.department_label || 'Department'} • ₹${o.total_bill_amount}`,
        action: () => { router.push(`/order/${o.id}`); onClose(); }
      }));

      if ('sharma canteen'.includes(q) || 'vendor'.includes(q)) {
        items.push({
          type: 'VENDOR',
          title: 'Sharma Canteen',
          subtitle: 'Active Vendor • Rating 4.8/5',
          action: () => { router.push('/vendor'); onClose(); }
        });
      }

      setResults(items);
    }
    search();
  }, [query, router, onClose]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(4px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: '80px'
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        border: '1px solid #E2E8F0',
        overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Search Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E2E8F0', gap: '12px' }}>
          <span style={{ fontSize: '1.2rem', color: '#64748B' }}>🔍</span>
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search orders, invoices, vendors (Cmd + K)..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: '#0F172A',
              background: 'transparent'
            }}
          />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', background: '#F1F5F9', padding: '4px 8px', borderRadius: '6px' }}>ESC</span>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '8px' }}>
          {results.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
              No matching records found.
            </div>
          ) : (
            results.map((item, idx) => (
              <div
                key={idx}
                onClick={item.action}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>{item.title}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>{item.subtitle}</div>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#2563EB', background: '#EFF6FF', padding: '3px 8px', borderRadius: '6px' }}>
                  {item.type}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
