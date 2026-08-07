'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getOrderById, upsertOrder } from '@/lib/store';
import { getUsers } from '@/lib/auth';
import { notifyVendorsOnDCRApproval } from '@/lib/notifications';
import { COLLEGE_INFO } from '@/lib/constants';
import VendorInvoice from '@/components/VendorInvoice';

function numToWords(n) {
  if (n === 0) return 'Zero';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
  if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + numToWords(n%100) : '');
  if (n < 100000) return numToWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + numToWords(n%1000) : '');
  return numToWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + numToWords(n%100000) : '');
}

export default function BillPage() {
  const router = useRouter();
  const params = useParams();
  const [order, setOrder] = useState(null);
  const [session, setSession] = useState(null);
  const [selectedVendorId, setSelectedVendorId] = useState('master');

  useEffect(() => {
    const s = getSession();
    if (!s) { router.push('/login'); return; }
    setSession(s);
    const o = getOrderById(params.id);
    if (!o) { router.push('/' + s.role); return; }
    setOrder(o);
  }, [params.id]);

  if (!order || !session) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--gray-500)' }}>Loading bill...</div>
    </div>
  );

  const now = new Date();
  const invoiceNo = `INV-${order.id}-MASTER`;
  const completedVOs = (order.vendorOrders || []).filter(vo => vo.billAmount > 0);
  const allItems = completedVOs.flatMap(vo => vo.items);
  const total = order.totalBillAmount || allItems.reduce((s, i) => s + (i.price * i.quantity), 0);

  // Vendor view: show only their sub-invoice
  if (session.role === 'vendor' && session.vendorId) {
    const myVO = (order.vendorOrders || []).find(vo => vo.vendorId === session.vendorId);
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '24px 16px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <Link href="/vendor" style={{ color: '#059669', fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem' }}>← Back to Dashboard</Link>
            <button onClick={() => window.print()} style={{ padding: '8px 18px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
              🖨️ Print / Save PDF
            </button>
          </div>
          <VendorInvoice masterOrder={order} vendorOrder={myVO} />
        </div>
      </div>
    );
  }

  // Full master invoice view
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '24px 16px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <Link href={`/${session.role}`} style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem' }}>← Back</Link>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Vendor filter */}
            <select value={selectedVendorId} onChange={e => setSelectedVendorId(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid var(--gray-300)', borderRadius: '8px', fontSize: '0.8125rem', cursor: 'pointer' }}>
              <option value="master">Master Invoice</option>
              {completedVOs.map(vo => (
                <option key={vo.vendorId} value={vo.vendorId}>{vo.vendorName} Invoice</option>
              ))}
            </select>
            <button onClick={() => window.print()} style={{ padding: '8px 18px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
              🖨️ Print / Save PDF
            </button>
          </div>
        </div>

        {/* Vendor sub-invoice */}
        {selectedVendorId !== 'master' ? (
          <VendorInvoice masterOrder={order} vendorOrder={completedVOs.find(vo => vo.vendorId === selectedVendorId)} />
        ) : (
          /* Master Invoice */
          <div id="bill-print" style={{ fontFamily: 'Arial, sans-serif', background: 'white', border: '1px solid #e5e7eb' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', padding: '24px 32px', color: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '2rem', marginBottom: '4px' }}>{COLLEGE_INFO.logo}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{COLLEGE_INFO.name}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '2px' }}>{COLLEGE_INFO.address}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '2px' }}>📞 {COLLEGE_INFO.phone} · {COLLEGE_INFO.email}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '6px' }}>
                    MASTER INVOICE
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '8px', fontFamily: 'monospace' }}>{invoiceNo}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '4px' }}>
                    {now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>

            {/* Order info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ padding: '16px 24px', borderRight: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Order Details</div>
                <table style={{ fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
                  {[
                    ['Order ID', order.id],
                    ['Title', order.title],
                    ['Purpose', order.purpose],
                    ['Department', order.departmentLabel],
                    ['Coordinator', order.createdBy?.name],
                    ['Created On', new Date(order.createdAt).toLocaleDateString('en-IN')],
                  ].map(([k, v]) => v ? (
                    <tr key={k}>
                      <td style={{ color: '#6B7280', paddingRight: '10px', paddingBottom: '4px', whiteSpace: 'nowrap' }}>{k}:</td>
                      <td style={{ fontWeight: 600, color: '#111827', paddingBottom: '4px' }}>{v}</td>
                    </tr>
                  ) : null)}
                </table>
              </div>
              <div style={{ padding: '16px 24px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Approvals</div>
                <table style={{ fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
                  {[
                    ['Principal', order.principalApproval?.reviewedBy, order.principalApproval?.reviewedAt],
                    ['DCR',       order.dcrApproval?.reviewedBy,       order.dcrApproval?.reviewedAt],
                  ].map(([k, v, d]) => v ? (
                    <tr key={k}>
                      <td style={{ color: '#6B7280', paddingRight: '10px', paddingBottom: '4px', whiteSpace: 'nowrap' }}>{k}:</td>
                      <td style={{ fontWeight: 600, color: '#111827', paddingBottom: '4px' }}>
                        {v} <span style={{ color: '#10B981', fontWeight: 700 }}>✓</span>
                        {d && <span style={{ color: '#9CA3AF', marginLeft: '6px', fontWeight: 400 }}>{new Date(d).toLocaleDateString('en-IN')}</span>}
                      </td>
                    </tr>
                  ) : null)}
                </table>
              </div>
            </div>

            {/* Items by vendor */}
            <div style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Itemized Bill</div>
              {completedVOs.map((vo, vi) => (
                <div key={vo.id} style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', padding: '6px 12px', background: '#F3F4F6', borderRadius: '6px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>🍽️ {vo.vendorName}</span>
                    <span style={{ color: '#059669' }}>Subtotal: ₹{vo.billAmount}</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ background: '#F9FAFB' }}>
                        <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Item</th>
                        <th style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Qty</th>
                        <th style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Rate</th>
                        <th style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vo.items.map((item, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '6px 12px', fontWeight: 600 }}>{item.name}</td>
                          <td style={{ padding: '6px 12px', textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ padding: '6px 12px', textAlign: 'right' }}>₹{item.price}</td>
                          <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700 }}>₹{item.price * item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              {/* Total */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <div style={{ background: '#1E3A8A', color: 'white', padding: '12px 20px', borderRadius: '8px', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>GRAND TOTAL</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>₹{total.toLocaleString('en-IN')}</div>
                </div>
              </div>
              <div style={{ marginTop: '10px', padding: '10px 14px', background: '#F3F4F6', borderRadius: '6px', fontSize: '0.8125rem', fontStyle: 'italic', color: '#374151' }}>
                Rupees {numToWords(total)} Only
              </div>
            </div>

            {/* Vendor sub-totals summary */}
            {completedVOs.length > 1 && (
              <div style={{ padding: '0 24px 16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Vendor-wise Summary</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ background: '#F3F4F6' }}>
                      <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 700 }}>Vendor</th>
                      <th style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 700 }}>Items</th>
                      <th style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700 }}>Amount</th>
                      <th style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700 }}>Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedVOs.map(vo => (
                      <tr key={vo.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '7px 12px', fontWeight: 600 }}>{vo.vendorName}</td>
                        <td style={{ padding: '7px 12px', textAlign: 'center' }}>{vo.items.length} types</td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>₹{vo.billAmount}</td>
                        <td style={{ padding: '7px 12px', textAlign: 'right' }}>
                          <button onClick={() => setSelectedVendorId(vo.vendorId)}
                            style={{ fontSize: '0.75rem', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}>
                            View Invoice
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            <div style={{ padding: '12px 24px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                Generated by {COLLEGE_INFO.shortName} ERP System · {now.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Master Invoice</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
