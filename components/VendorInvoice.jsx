'use client';
import { COLLEGE_INFO } from '@/lib/constants';

function numToWords(n) {
  if (isNaN(n) || n < 0 || !isFinite(n)) return 'Zero';
  const floorN = Math.floor(n);
  if (floorN === 0) return 'Zero';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (floorN < 20) return ones[floorN];
  if (floorN < 100) return tens[Math.floor(floorN/10)] + (floorN%10 ? ' ' + ones[floorN%10] : '');
  if (floorN < 1000) return ones[Math.floor(floorN/100)] + ' Hundred' + (floorN%100 ? ' ' + numToWords(floorN%100) : '');
  if (floorN < 100000) return numToWords(Math.floor(floorN/1000)) + ' Thousand' + (floorN%1000 ? ' ' + numToWords(floorN%1000) : '');
  return numToWords(Math.floor(floorN/100000)) + ' Lakh' + (floorN%100000 ? ' ' + numToWords(floorN%100000) : '');
}

export default function VendorInvoice({ masterOrder, vendorOrder }) {
  if (!masterOrder || !vendorOrder) return null;

  const items = vendorOrder.items || [];
  const total = vendorOrder.billAmount || items.reduce((s, i) => s + (i.price * i.quantity), 0);
  const invoiceNo = vendorOrder.invoiceNumber || `INV-${masterOrder.id}-${vendorOrder.vendorId.toUpperCase()}`;
  const now = new Date();

  return (
    <div id="vendor-invoice" style={{
      fontFamily: 'Arial, sans-serif', background: 'white',
      maxWidth: '680px', margin: '0 auto',
      border: '1px solid #e5e7eb',
    }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', padding: '24px 32px', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '1.8rem', marginBottom: '4px' }}>{COLLEGE_INFO.logo}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.03em' }}>{COLLEGE_INFO.name}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '3px' }}>{COLLEGE_INFO.address}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '6px' }}>
              VENDOR INVOICE
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '8px', fontFamily: 'monospace' }}>{invoiceNo}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '4px' }}>{now.toLocaleDateString('en-IN', { day:'2-digit',month:'long',year:'numeric' })}</div>
          </div>
        </div>
      </div>

      {/* Vendor & Order Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: '2px solid #E5E7EB' }}>
        <div style={{ padding: '16px 24px', borderRight: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Vendor Details</div>
          <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '3px' }}>{vendorOrder.vendorName}</div>
          <div style={{ fontSize: '0.8rem', color: '#374151' }}>Vendor ID: {vendorOrder.vendorId}</div>
        </div>
        <div style={{ padding: '16px 24px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Order Details</div>
          <table style={{ fontSize: '0.8rem', borderCollapse: 'collapse', width: '100%' }}>
            {[
              ['Master Order', masterOrder.id],
              ['Title', masterOrder.title],
              ['Department', masterOrder.departmentLabel],
              ['Coordinator', masterOrder.createdBy?.name],
              ['Principal', masterOrder.principalApproval?.reviewedBy],
              ['DCR', masterOrder.dcrApproval?.reviewedBy],
            ].map(([k, v]) => v ? (
              <tr key={k}>
                <td style={{ color: '#6B7280', paddingRight: '10px', paddingBottom: '2px', whiteSpace: 'nowrap' }}>{k}:</td>
                <td style={{ fontWeight: 600, color: '#111827' }}>{v}</td>
              </tr>
            ) : null)}
          </table>
        </div>
      </div>

      {/* Items Table */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
          Itemized List
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#F3F4F6' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>#</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>Item</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>Qty</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>Rate</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '8px 12px', color: '#9CA3AF' }}>{i + 1}</td>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{item.name}</td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{item.price}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>₹{item.price * item.quantity}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#1E3A8A' }}>
              <td colSpan={4} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: 'white', fontSize: '0.95rem' }}>TOTAL</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: 'white', fontSize: '1.1rem' }}>₹{total}</td>
            </tr>
          </tfoot>
        </table>

        <div style={{ marginTop: '10px', padding: '10px 14px', background: '#F3F4F6', borderRadius: '6px', fontSize: '0.8rem', fontStyle: 'italic', color: '#374151' }}>
          Rupees {numToWords(Math.floor(total))} Only
        </div>
      </div>

      {/* Approval Timeline */}
      <div style={{ padding: '0 24px 16px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
          Approval Timeline
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {[
            { label: 'Coordinator', name: masterOrder.createdBy?.name, date: masterOrder.createdAt, action: 'Created' },
            { label: 'Principal', name: masterOrder.principalApproval?.reviewedBy, date: masterOrder.principalApproval?.reviewedAt, action: 'Approved' },
            { label: 'DCR', name: masterOrder.dcrApproval?.reviewedBy, date: masterOrder.dcrApproval?.reviewedAt, action: 'Approved' },
          ].map(entry => (
            <div key={entry.label} style={{ padding: '10px 12px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '0.7rem', color: '#6B7280', marginBottom: '4px', fontWeight: 600 }}>{entry.label}</div>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '3px' }}>{entry.name || '—'}</div>
              <div style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 600 }}>✓ {entry.action}</div>
              {entry.date && <div style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: '2px' }}>{new Date(entry.date).toLocaleDateString('en-IN')}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 24px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
          Generated by {COLLEGE_INFO.shortName} ERP System · {now.toLocaleString('en-IN')}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Vendor Sub-Invoice</div>
      </div>
    </div>
  );
}
