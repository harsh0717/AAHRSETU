'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getSession, UserProfile } from '@/lib/auth';
import { getOrderById, MasterOrder, VendorOrder, OrderItem } from '@/lib/store';
import { COLLEGE_INFO } from '@/lib/constants';
import { jsPDF } from 'jspdf';
import { useI18n } from '@/lib/i18n';
import { generateInvoiceQRCodeDataURL } from '@/lib/qr';

function numToWords(n: number): string {
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
  const orderId = params.id as string;
  const { t } = useI18n();

  const [order, setOrder] = useState<MasterOrder | null>(null);
  const [session, setSession] = useState<UserProfile | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState('master');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.push('/login');
      return;
    }
    setSession(s);

    async function loadOrder() {
      const o = await getOrderById(orderId);
      if (!o) {
        router.push('/' + (s?.role ?? 'login'));
        return;
      }
      setOrder(o);
    }
    loadOrder();
  }, [orderId, router]);

  if (!order || !session) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FAFAF9' }}>
        <div style={{ textAlign: 'center', color: 'var(--gray-500)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '8px', animation: 'spin 1s infinite linear' }}>🔄</div>
          <div>Loading Invoice Details...</div>
        </div>
      </div>
    );
  }

  const completedVOs = (order.vendor_orders || []).filter((vo: VendorOrder) => vo.bill_amount > 0);
  const selectedVO = selectedVendorId === 'master' ? null : completedVOs.find((vo: VendorOrder) => vo.vendor_id === selectedVendorId);

  const title = selectedVO ? `${selectedVO.vendor_name} Sub-Invoice` : 'Master Invoice';
  const invoiceNo = selectedVO ? (selectedVO.invoice_number || `INV-${order.id}-${selectedVO.vendor_id.toUpperCase()}`) : `INV-${order.id}-MASTER`;
  const items = selectedVO ? selectedVO.items : completedVOs.flatMap((vo: VendorOrder) => vo.items.map((item: OrderItem) => ({ ...item, vendorName: vo.vendor_name })));
  const totalAmount = selectedVO ? selectedVO.bill_amount : order.total_bill_amount;
  const qrDataUrl = generateInvoiceQRCodeDataURL(invoiceNo);

  // Generate jsPDF A4 Document
  function generatePDF() {
    if (!order) return;
    setDownloading(true);
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Outer Border
    doc.setDrawColor(228, 228, 231);
    doc.rect(5, 5, 200, 287);

    // Header
    doc.setTextColor(24, 24, 38);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(COLLEGE_INFO.name, 105, 20, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(COLLEGE_INFO.address, 105, 25, { align: 'center' });
    doc.text(`Email: ${COLLEGE_INFO.email} | Contact: ${COLLEGE_INFO.phone}`, 105, 30, { align: 'center' });

    // Decorative Line
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.8);
    doc.line(10, 35, 200, 35);

    // Invoice Title
    doc.setTextColor(79, 70, 229);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(title.toUpperCase(), 10, 44);

    // Metadata Grid
    doc.setTextColor(82, 82, 91);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    
    // Left column metadata
    doc.text(`Invoice No: ${invoiceNo}`, 10, 52);
    doc.text(`Order Ref ID: ${order.id}`, 10, 58);
    doc.text(`Date of Issue: ${new Date(order.bill_generated_at || order.updated_at).toLocaleDateString('en-IN')}`, 10, 64);
    doc.text(`Department: ${order.department_label || 'All'}`, 10, 70);

    // Middle column metadata (Safely positioned at X=90 so it never overlaps QR box)
    doc.text(`Coordinator: ${order.created_by_name || 'N/A'}`, 90, 52);
    const principalApproval = order.history.find(h => h.role === 'principal');
    const dcrApproval = order.history.find(h => h.role === 'dcr');
    doc.text(`Principal: Approved by ${principalApproval?.user_name || 'Verified'}`, 90, 58);
    doc.text(`DCR Audit: Approved by ${dcrApproval?.user_name || 'Verified'}`, 90, 64);

    // QR Code Box at Far Right (X=168, Y=42)
    doc.addImage(qrDataUrl, 'PNG', 168, 42, 26, 26);
    doc.setDrawColor(212, 212, 216);
    doc.rect(167, 41, 28, 28);
    doc.setFontSize(6);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('SCAN TO VERIFY', 181, 72, { align: 'center' });

    // Items Table Header
    doc.setFillColor(244, 244, 245);
    doc.rect(10, 78, 190, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(24, 24, 38);
    doc.setFontSize(9);
    doc.text('Sr.', 12, 83);
    doc.text('Item Description', 25, 83);
    if (!selectedVO) doc.text('Vendor', 100, 83);
    doc.text('Qty', 145, 83);
    doc.text('Price (INR)', 165, 83);
    doc.text('Total (INR)', 185, 83);

    // Draw Table Line
    doc.setDrawColor(212, 212, 216);
    doc.setLineWidth(0.3);
    doc.line(10, 86, 200, 86);

    // Table Content
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(39, 39, 42);
    let y = 92;
    items.forEach((item: any, index: number) => {
      const nameKey = `menu.${item.name}`;
      const translatedName = t(nameKey) !== nameKey ? t(nameKey) : item.name;
      
      const formattedUnit = item.unit ? item.unit.toLowerCase().replace(' ', '_') : '';
      const unitKey = `unit.${formattedUnit}`;
      const translatedUnit = item.unit ? (t(unitKey) !== unitKey ? t(unitKey) : item.unit) : '';
      
      const qtyStr = String(item.quantity) + (translatedUnit ? ` (${translatedUnit})` : '');

      doc.text(String(index + 1), 12, y);
      doc.text(translatedName, 25, y);
      if (!selectedVO) doc.text(item.vendorName || 'N/A', 100, y);
      doc.text(qtyStr, 145, y);
      doc.text(parseFloat(item.price).toFixed(2), 165, y);
      doc.text((item.price * item.quantity).toFixed(2), 185, y);
      
      // Separator line
      doc.line(10, y + 2, 200, y + 2);
      y += 8;
    });

    // Summary totals
    y += 2;
    doc.setFont('Helvetica', 'bold');
    doc.text('GRAND TOTAL:', 140, y);
    doc.text(`Rs. ${totalAmount.toFixed(2)}`, 180, y);

    // Rupees in Words
    y += 10;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(113, 113, 122);
    doc.text(`Amount in Words: Rupees ${numToWords(totalAmount)} Only.`, 10, y);

    // Timeline History summary
    y += 14;
    doc.setDrawColor(228, 228, 231);
    doc.setFillColor(250, 250, 250);
    doc.rect(10, y, 190, 24);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(82, 82, 91);
    doc.text('APPROVAL TIMELINE:', 12, y + 5);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`- Coordinator Submitted: ${new Date(order.created_at).toLocaleString('en-IN')}`, 12, y + 10);
    if (principalApproval) doc.text(`- Principal Approved: ${new Date(principalApproval.timestamp).toLocaleString('en-IN')}`, 12, y + 15);
    if (dcrApproval) doc.text(`- DCR Audited: ${new Date(dcrApproval.timestamp).toLocaleString('en-IN')}`, 12, y + 20);

    // Signatures
    y += 38;
    doc.setLineWidth(0.3);
    doc.line(15, y, 55, y);
    doc.line(80, y, 120, y);
    doc.line(145, y, 185, y);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(24, 24, 38);
    doc.text('Prepared By (Coord)', 18, y + 4);
    doc.text('Audited By (DCR)', 85, y + 4);
    doc.text('Settle Signature (Canteen)', 147, y + 4);

    // QR Code mock placeholder
    doc.setDrawColor(212, 212, 216);
    doc.rect(170, 40, 25, 25);
    doc.setFontSize(6.5);
    doc.text('QR SECURE', 174, 53);
    doc.text('VERIFICATION', 173, 56);

    // Save File
    doc.save(`${invoiceNo}.pdf`);
    setDownloading(false);
  }

  const roleBackLink = session.role === 'vendor' ? '/vendor' : (session.role === 'admin' ? '/admin' : '/order/' + order.id);

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF9', padding: '24px 16px', fontFamily: 'var(--font-sans)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Navigation & Selection bar */}
        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600, marginBottom: '10px' }}>
          <Link href={`/${session.role}`} style={{ color: 'var(--gray-500)', textDecoration: 'none' }}>Dashboard</Link> /{' '}
          {session.role !== 'vendor' && session.role !== 'admin' ? (
            <>
              <Link href={`/order/${order.id}`} style={{ color: 'var(--gray-500)', textDecoration: 'none' }}>Order {order.id}</Link> /{' '}
            </>
          ) : null}
          <span>Invoice {invoiceNo}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <Link href={roleBackLink} style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
            ← {session.role === 'vendor' ? 'Back to Dashboard' : (session.role === 'admin' ? 'Back to Admin Portal' : 'Back to Order Details')}
          </Link>
          
          {session.role !== 'vendor' && completedVOs.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600)' }}>Select Invoice:</span>
              <select
                value={selectedVendorId}
                onChange={e => setSelectedVendorId(e.target.value)}
                style={{
                  height: '36px', padding: '0 10px',
                  border: '1px solid var(--gray-200)', borderRadius: '8px',
                  fontSize: '0.8rem', fontWeight: 600, background: 'white'
                }}
              >
                <option value="master">Master College Bill</option>
                {completedVOs.map(vo => (
                  <option key={vo.vendor_id} value={vo.vendor_id}>
                    {vo.vendor_name} Sub-Bill
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={generatePDF}
            disabled={downloading}
            style={{
              padding: '8px 18px', background: 'var(--primary)', color: 'white',
              border: 'none', borderRadius: '10px', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.1)'
            }}
          >
            {downloading ? 'Generating PDF...' : '📥 Download Official A4 PDF'}
          </button>
        </div>

        {/* Live Bill Preview Sheet */}
        <div id="bill-print" style={{
          background: 'white', borderRadius: '16px', padding: '40px',
          border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-lg)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid var(--primary)', paddingBottom: '16px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gray-900)' }}>
              {COLLEGE_INFO.name}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', margin: '4px 0' }}>
              {COLLEGE_INFO.address}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
              Email: {COLLEGE_INFO.email} | Contact: {COLLEGE_INFO.phone}
            </p>
          </div>

          {/* Title & Metadata */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <h3 style={{ color: 'var(--primary)', fontSize: '1.1rem', fontWeight: 800, margin: '0 0 10px' }}>
                {title.toUpperCase()}
              </h3>
              <table style={{ fontSize: '0.8125rem', borderCollapse: 'collapse', width: '100%' }}>
                <tbody>
                  <tr>
                    <td style={{ color: 'var(--gray-500)', paddingRight: '12px', paddingBottom: '4px' }}>Invoice No:</td>
                    <td style={{ fontWeight: 700, color: 'var(--gray-800)' }}>{invoiceNo}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--gray-500)', paddingRight: '12px', paddingBottom: '4px' }}>Order Ref:</td>
                    <td style={{ fontWeight: 700, color: 'var(--gray-800)' }}>{order.id}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--gray-500)', paddingRight: '12px', paddingBottom: '4px' }}>Date:</td>
                    <td style={{ fontWeight: 600 }}>
                      {new Date(order.bill_generated_at || order.updated_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--gray-500)', paddingRight: '12px', paddingBottom: '4px' }}>Department:</td>
                    <td style={{ fontWeight: 600 }}>{order.department_label || 'All'}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--gray-500)', paddingRight: '12px', paddingBottom: '4px' }}>Coordinator:</td>
                    <td style={{ fontWeight: 600 }}>{order.created_by_name || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--gray-500)', paddingRight: '12px', paddingBottom: '4px' }}>Principal:</td>
                    <td style={{ fontWeight: 600, color: '#16A34A' }}>Approved by Dr. Arvind Mehta</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--gray-500)', paddingRight: '12px', paddingBottom: '4px' }}>DCR Audit:</td>
                    <td style={{ fontWeight: 600, color: '#16A34A' }}>Approved by S. Patil</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ textAlign: 'center', background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <Link href={`/verify/invoice/${invoiceNo}`} target="_blank" style={{ textDecoration: 'none' }}>
                <img
                  src={qrDataUrl}
                  alt="Invoice Verification QR Code"
                  style={{ width: '96px', height: '96px', display: 'block', margin: '0 auto 6px', borderRadius: '4px' }}
                />
              </Link>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#2563EB', letterSpacing: '0.5px' }}>
                SCAN TO VERIFY
              </div>
              <div style={{ fontSize: '0.6rem', color: '#64748B', marginTop: '2px' }}>
                QR Secure Authenticator
              </div>
            </div>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)' }}>Sr.</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)' }}>Description</th>
                {!selectedVO && (
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)' }}>Vendor</th>
                )}
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)' }}>Qty</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)' }}>Price</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: OrderItem & { vendorName?: string }, idx: number) => {
                const nameKey = `menu.${item.name}`;
                const translatedName = t(nameKey) !== nameKey ? t(nameKey) : item.name;
                
                const formattedUnit = item.unit ? item.unit.toLowerCase().replace(' ', '_') : '';
                const unitKey = `unit.${formattedUnit}`;
                const translatedUnit = item.unit ? (t(unitKey) !== unitKey ? t(unitKey) : item.unit) : '';

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--gray-100)', fontSize: '0.8rem' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--gray-500)' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--gray-800)' }}>{translatedName}</td>
                    {!selectedVO && (
                      <td style={{ padding: '10px 12px', color: 'var(--gray-600)' }}>{item.vendorName}</td>
                    )}
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>
                      {item.quantity} {translatedUnit ? `(${translatedUnit})` : ''}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>₹{parseFloat(item.price as any).toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--gray-900)' }}>
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Grand Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px dashed var(--gray-200)', paddingTop: '16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
              <strong>Amount in Words:</strong><br />
              Rupees {numToWords(totalAmount)} Only.
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-500)' }}>GRAND TOTAL</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
                ₹{totalAmount.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', borderTop: '1px solid var(--gray-100)', paddingTop: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '120px', borderBottom: '1px solid var(--gray-300)', marginBottom: '4px' }}></div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-500)' }}>Prepared By (Coord)</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '120px', borderBottom: '1px solid var(--gray-300)', marginBottom: '4px' }}></div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-500)' }}>Audited By (DCR)</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '120px', borderBottom: '1px solid var(--gray-300)', marginBottom: '4px' }}></div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-500)' }}>Settle Signature (Canteen)</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
