'use client';

export default function BillView({ order }) {
  if (!order) return null;

  const total = order.billAmount || order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const billDate = order.billGeneratedAt ? new Date(order.billGeneratedAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const principalName = order.principalApproval?.status === 'approved' ? 'Dr. A. Mehta' : '-';
  const dcrName = order.dcrApproval?.status === 'approved' ? 'S. Patil' : '-';

  return (
    <div id="bill-print-area" style={{
      maxWidth: '700px',
      margin: '0 auto',
      background: '#fff',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
        color: '#fff',
        padding: '32px 40px',
        borderRadius: '0',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>🍱 AharSetu</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '4px' }}>Canteen Order Management ERP</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '2px' }}>Government Institution Canteen Services</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>BILL / INVOICE</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.05em', marginTop: '4px' }}>
              #{order.id}
            </div>
          </div>
        </div>
      </div>

      {/* Meta info */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0',
        borderBottom: '1px solid #E5E7EB',
      }}>
        <div style={{ padding: '20px 40px', borderRight: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280', marginBottom: '12px' }}>Order Details</div>
          <table style={{ fontSize: '0.875rem', borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              {[
                ['Order ID', order.id],
                ['Title', order.title],
                ['Purpose', order.purpose],
                ['Requested By', order.createdBy?.name || '-'],
                ['Date Created', new Date(order.createdAt).toLocaleDateString('en-IN')],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ paddingBottom: '6px', color: '#6B7280', width: '40%', verticalAlign: 'top' }}>{k}</td>
                  <td style={{ paddingBottom: '6px', fontWeight: 600, color: '#111827', paddingLeft: '8px' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '20px 40px' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280', marginBottom: '12px' }}>Approval Details</div>
          <table style={{ fontSize: '0.875rem', borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              {[
                ['Principal', principalName],
                ['Principal Date', order.principalApproval?.reviewedAt ? new Date(order.principalApproval.reviewedAt).toLocaleDateString('en-IN') : '-'],
                ['DCR', dcrName],
                ['DCR Date', order.dcrApproval?.reviewedAt ? new Date(order.dcrApproval.reviewedAt).toLocaleDateString('en-IN') : '-'],
                ['Bill Date', billDate],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ paddingBottom: '6px', color: '#6B7280', width: '45%', verticalAlign: 'top' }}>{k}</td>
                  <td style={{ paddingBottom: '6px', fontWeight: 600, color: '#111827', paddingLeft: '8px' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Items table */}
      <div style={{ padding: '24px 40px' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280', marginBottom: '16px' }}>
          Itemized Bill
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderRadius: '8px' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB' }}>S.No.</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Item Description</th>
              <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Qty</th>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Rate (₹)</th>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={item.name} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '12px 16px', color: '#6B7280' }}>{idx + 1}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>{item.name}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>₹{item.price.toFixed(2)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>₹{(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', fontSize: '0.875rem' }}>
              <span style={{ color: '#6B7280' }}>Subtotal</span>
              <span style={{ fontWeight: 600 }}>₹{total.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', fontSize: '0.875rem' }}>
              <span style={{ color: '#6B7280' }}>Tax (0%)</span>
              <span>₹0.00</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', padding: '14px 16px',
              background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
              borderRadius: '8px', marginTop: '8px',
            }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>Total Amount</span>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: '1.25rem' }}>₹{total.toFixed(2)}</span>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#6B7280', marginTop: '8px', fontStyle: 'italic' }}>
              Rupees {numberToWords(total)} Only
            </div>
          </div>
        </div>
      </div>

      {/* Signature section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '0',
        borderTop: '1px solid #E5E7EB',
        padding: '24px 40px',
      }}>
        {[
          { label: 'Coordinator', name: order.createdBy?.name || 'Coordinator' },
          { label: 'Principal Approval', name: principalName },
          { label: 'DCR Approval', name: dcrName },
        ].map(sig => (
          <div key={sig.label} style={{ textAlign: 'center', padding: '0 16px' }}>
            <div style={{ height: '40px', borderBottom: '1.5px solid #374151', marginBottom: '8px' }} />
            <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#111827' }}>{sig.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{sig.label}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        background: '#F9FAFB',
        padding: '16px 40px',
        borderTop: '1px solid #E5E7EB',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
          Generated by AharSetu ERP · {billDate}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
          Order #{order.id} · {order.status}
        </div>
      </div>
    </div>
  );
}

function numberToWords(num) {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  const n = Math.floor(num);
  
  function helper(n) {
    if (n < 20) return units[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + units[n%10] : '');
    if (n < 1000) return units[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + helper(n%100) : '');
    if (n < 100000) return helper(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + helper(n%1000) : '');
    return helper(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + helper(n%100000) : '');
  }
  return helper(n);
}
