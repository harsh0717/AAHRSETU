'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getSession, getUsers, getSavedUsers, initializeApplication, UserProfile } from '@/lib/auth';
import { getOrderById, MasterOrder, VendorOrder, OrderItem } from '@/lib/store';
import { getMenuItemName } from '@/lib/vendors';
import { COLLEGE_INFO } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';

function numToWords(n: number): string {
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

export default function BillPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;
  const { t } = useI18n();

  const [order, setOrder] = useState<MasterOrder | null>(null);
  const [session, setSession] = useState<UserProfile | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState('master');
  const [downloading, setDownloading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loadError, setLoadError] = useState('');
  const [savedUsers, setSavedUsers] = useState<UserProfile[]>([]);

  const loadOrderRef = useRef<((silent?: boolean) => Promise<void>) | null>(null);

  const loadOrder = useCallback(async (silent = false) => {
    try {
      const o = await getOrderById(orderId);
      if (!o) {
        if (!silent) setLoadError(`Order "${orderId}" not found. It may have been created on another device or browser.`);
        return;
      }
      setOrder(o);
      setLoadError('');
    } catch (err: any) {
      if (!silent) setLoadError(err?.message || 'Failed to load order details.');
    }
  }, [orderId]);

  useEffect(() => {
    loadOrderRef.current = loadOrder;
  }, [loadOrder]);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.push('/login');
      return;
    }
    setSession(s);
    setSavedUsers(getSavedUsers());

    initializeApplication().then(fresh => {
      if (fresh) setSession(fresh);
    }).catch(() => {});

    getUsers().then(users => {
      if (users && users.length > 0) setSavedUsers(users);
    }).catch(() => {});

    loadOrder();

    // Cross-device sync: poll every 10 seconds silently
    const syncInterval = setInterval(() => {
      loadOrderRef.current?.(true);
    }, 10000);

    const handleOrderChanged = () => {
      loadOrderRef.current?.(true);
      getUsers().then(users => {
        if (users && users.length > 0) setSavedUsers(users);
      }).catch(() => setSavedUsers(getSavedUsers()));
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'aharsetu_orders_v3' || e.key === 'aharsetu_notifications_v3.7' || e.key === 'aharsetu_custom_users') {
        loadOrderRef.current?.(true);
        getUsers().then(users => {
          if (users && users.length > 0) setSavedUsers(users);
        }).catch(() => setSavedUsers(getSavedUsers()));
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('aharsetu_order_changed', handleOrderChanged);
      window.addEventListener('aharsetu_user_changed', handleOrderChanged);
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      clearInterval(syncInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('aharsetu_order_changed', handleOrderChanged);
        window.removeEventListener('aharsetu_user_changed', handleOrderChanged);
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, [orderId, router, loadOrder]);

  // ── Derived data — wrapped in useMemo for safety ──────────────────────────
  const allVendorOrders: VendorOrder[] = useMemo(() => {
    if (!order) return [];
    return Array.isArray(order.vendor_orders) ? order.vendor_orders : [];
  }, [order]);

  const selectedVO: VendorOrder | null = useMemo(() => {
    if (selectedVendorId === 'master') return null;
    return allVendorOrders.find(vo => vo?.vendor_id === selectedVendorId) ?? null;
  }, [selectedVendorId, allVendorOrders]);

  const invoiceNo = useMemo(() => {
    if (!order) return '';
    if (selectedVO) {
      return selectedVO.invoice_number || `INV-${order.id}-${(selectedVO.vendor_id || 'V').toUpperCase()}`;
    }
    return `INV-${order.id}-MASTER`;
  }, [order, selectedVO]);

  const title = selectedVO ? `${selectedVO.vendor_name || 'Vendor'} Sub-Invoice` : 'Master Invoice';

  // Null-safe items array
  const items: (OrderItem & { vendorName?: string })[] = useMemo(() => {
    try {
      if (selectedVO) {
        return Array.isArray(selectedVO.items) ? selectedVO.items : [];
      }
      return allVendorOrders.flatMap(vo => {
        if (!Array.isArray(vo?.items)) return [];
        return vo.items.map(item => ({ ...item, vendorName: vo.vendor_name || 'Vendor' }));
      });
    } catch {
      return [];
    }
  }, [selectedVO, allVendorOrders]);

  const computedItemTotal = useMemo(() =>
    items.reduce((acc, i) => acc + (Number(i?.price ?? 0) * Number(i?.quantity ?? 0)), 0),
    [items]
  );

  const totalAmount = useMemo(() => {
    if (!order) return 0;
    const rawTotal = selectedVO ? (selectedVO.bill_amount ?? 0) : (order.total_bill_amount ?? 0);
    if (rawTotal > 0) return rawTotal;
    if (computedItemTotal > 0) return computedItemTotal;
    return 150.0;
  }, [order, selectedVO, computedItemTotal]);

  // Load QR code asynchronously
  useEffect(() => {
    if (!invoiceNo) return;
    let cancelled = false;

    async function loadQR() {
      try {
        const QRCode = (await import('qrcode')).default;
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://aharsetu.edu.in';
        const verifyUrl = `${origin}/verify/invoice/${invoiceNo}`;
        const url = await QRCode.toDataURL(verifyUrl, {
          width: 140,
          margin: 1,
          color: { dark: '#0F172A', light: '#FFFFFF' }
        });
        if (!cancelled) setQrCodeUrl(url);
      } catch (err) {
        console.warn('QR Code generation failed, continuing without QR:', err);
      }
    }

    loadQR();
    return () => { cancelled = true; };
  }, [invoiceNo]);

  function handlePrint() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  // ── PDF Generation ────────────────────────────────────────────────────────
  async function generatePDF() {
    if (!order) return;
    setDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');

      let qrPngUrl = '';
      try {
        const { generateInvoiceQRCodePNGDataURL } = await import('@/lib/qr');
        qrPngUrl = await generateInvoiceQRCodePNGDataURL(invoiceNo, 200);
      } catch { /* QR optional */ }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

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

      // Decorative line
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(0.8);
      doc.line(10, 35, 200, 35);

      // Invoice Title
      doc.setTextColor(79, 70, 229);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(title.toUpperCase(), 10, 44);

      // Metadata
      doc.setTextColor(82, 82, 91);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(`Invoice No: ${invoiceNo}`, 10, 52);
      doc.text(`Order Ref ID: ${order.id}`, 10, 58);
      doc.text(`Date: ${new Date(order.bill_generated_at || order.updated_at || order.created_at).toLocaleDateString('en-IN')}`, 10, 64);
      doc.text(`Department: ${order.department_label || 'All'}`, 10, 70);
      doc.text(`Coordinator: ${order.created_by_name || 'N/A'}`, 90, 52);

      const principalApproval = Array.isArray(order.history) ? order.history.find(h => h.role === 'principal') : null;
      const dcrApproval = Array.isArray(order.history) ? order.history.find(h => h.role === 'dcr') : null;
      doc.text(`Principal: ${principalApproval?.user_name || 'Verified'}`, 90, 58);
      doc.text(`DCR Audit: ${dcrApproval?.user_name || 'Verified'}`, 90, 64);

      // QR Code
      if (qrPngUrl && qrPngUrl.startsWith('data:image/')) {
        try { doc.addImage(qrPngUrl, 'PNG', 168, 42, 26, 26); } catch {}
      }
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
      doc.setDrawColor(212, 212, 216);
      doc.setLineWidth(0.3);
      doc.line(10, 86, 200, 86);

      // Items
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(39, 39, 42);
      let y = 92;
      items.forEach((item, index) => {
        const name = getMenuItemName(item?.menu_item_id, item?.name) || 'Item';
        const qty = Number(item?.quantity ?? 0);
        const price = Number(item?.price ?? 0);
        const unit = item?.unit ? ` (${item.unit})` : '';
        doc.text(String(index + 1), 12, y);
        doc.text(name, 25, y);
        if (!selectedVO) doc.text(String(item?.vendorName || 'N/A'), 100, y);
        doc.text(`${qty}${unit}`, 145, y);
        doc.text(price.toFixed(2), 165, y);
        doc.text((price * qty).toFixed(2), 185, y);
        doc.line(10, y + 2, 200, y + 2);
        y += 8;
      });

      // Grand Total
      y += 2;
      doc.setFont('Helvetica', 'bold');
      doc.text('GRAND TOTAL:', 140, y);
      doc.text(`Rs. ${totalAmount.toFixed(2)}`, 180, y);

      // Amount in words
      y += 10;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(113, 113, 122);
      doc.text(`Amount in Words: Rupees ${numToWords(Math.floor(totalAmount))} Only.`, 10, y);

      // Approval Timeline
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

      doc.save(`${invoiceNo}.pdf`);
    } catch (err: any) {
      alert('Failed to generate PDF: ' + (err?.message || 'Unknown error'));
    } finally {
      setDownloading(false);
    }
  }

  // ── Loading / Error States ────────────────────────────────────────────────
  if (!session || (!order && !loadError)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--surface-1)' }}>
        <div style={{ textAlign: 'center', color: 'var(--gray-500, #64748B)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '8px', animation: 'spin 1s infinite linear' }}>🔄</div>
          <div>Loading Invoice Details...</div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--surface-1)', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '460px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📄</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)', marginBottom: '10px' }}>Invoice Not Found</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--gray-500, #64748B)', lineHeight: 1.6, marginBottom: '24px' }}>{loadError}</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '10px 20px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
            >
              🔄 Retry
            </button>
            <button
              onClick={() => router.back()}
              style={{ padding: '10px 20px', background: 'var(--surface-2, #F1F5F9)', color: 'var(--gray-900, #0F172A)', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!order || !session) return null;

  const roleBackLink = session.role === 'vendor' ? '/vendor' : (session.role === 'admin' ? '/admin' : '/order/' + order.id);
  const principalApproval = Array.isArray(order.history) ? order.history.find(h => h.role === 'principal') : null;
  const dcrApproval = Array.isArray(order.history) ? order.history.find(h => h.role === 'dcr') : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-1, #FAFAF9)', padding: '16px 12px', fontFamily: 'var(--font-sans)', transition: 'background 0.2s' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto', width: '100%' }}>

        {/* Navigation Breadcrumb */}
        <div className="no-print" style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <Link href={`/${session.role}`} style={{ color: 'var(--gray-500)', textDecoration: 'none' }}>Dashboard</Link>
          <span>/</span>
          {session.role !== 'vendor' && session.role !== 'admin' ? (
            <>
              <Link href={`/order/${order.id}`} style={{ color: 'var(--gray-500)', textDecoration: 'none' }}>Order {order.id}</Link>
              <span>/</span>
            </>
          ) : null}
          <span style={{ color: 'var(--gray-800)', fontWeight: 700 }}>Invoice {invoiceNo}</span>
        </div>

        {/* Top Control Bar */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <Link href={roleBackLink} style={{ color: 'var(--primary, #2563EB)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
            ← {session.role === 'vendor' ? 'Back to Dashboard' : (session.role === 'admin' ? 'Back to Admin Portal' : 'Back to Order Details')}
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%', justifyContent: 'flex-end' }}>
            {session.role !== 'vendor' && allVendorOrders.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '160px' }}>
                <select
                  value={selectedVendorId}
                  onChange={e => setSelectedVendorId(e.target.value)}
                  style={{
                    height: '38px',
                    padding: '0 10px',
                    border: '1px solid var(--gray-300)',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: 'var(--surface-0)',
                    color: 'var(--gray-800)',
                    width: '100%'
                  }}
                >
                  <option value="master">Master College Bill</option>
                  {allVendorOrders.map(vo => (
                    <option key={vo.vendor_id} value={vo.vendor_id}>{vo.vendor_name} Sub-Bill</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handlePrint}
              style={{
                padding: '8px 14px',
                background: 'var(--primary, #2563EB)',
                color: 'white',
                border: '1px solid var(--primary, #2563EB)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: '38px',
                boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
              }}
            >
              🖨️ <span className="hide-xs">Print Official</span> Bill
            </button>

            <button
              type="button"
              onClick={generatePDF}
              disabled={downloading}
              style={{
                padding: '8px 14px',
                background: 'var(--surface-0, #FFFFFF)',
                color: 'var(--gray-700, #334155)',
                border: '1px solid var(--gray-300, #CBD5E1)',
                borderRadius: '8px',
                cursor: downloading ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: '38px',
                opacity: downloading ? 0.7 : 1,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              {downloading ? '⏳ Exporting...' : '📥 Download PDF'}
            </button>
          </div>
        </div>

        {/* Bill Preview Sheet */}
        <div id="bill-print" className="bill-paper" style={{ padding: '24px 20px', borderRadius: '16px', border: '1px solid var(--gray-200)', background: 'var(--surface-0)', boxShadow: 'var(--shadow-md)', width: '100%', overflowX: 'hidden' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid var(--primary, #2563EB)', paddingBottom: '14px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-900)', margin: '0 0 4px', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
              {COLLEGE_INFO.name}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--gray-500)', margin: '3px 0', overflowWrap: 'break-word' }}>
              {COLLEGE_INFO.address}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', margin: 0, overflowWrap: 'break-word' }}>
              Email: {COLLEGE_INFO.email} | Contact: {COLLEGE_INFO.phone}
            </p>
          </div>

          {/* Title & Metadata Block */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ flex: 1, minWidth: '240px', width: '100%' }}>
              <h3 style={{ color: 'var(--primary, #2563EB)', fontSize: '1.05rem', fontWeight: 800, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {title}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', width: '100%' }}>
                {[
                  ['Invoice No:', invoiceNo],
                  ['Order Ref:', order.id],
                  ['Date:', new Date(order.bill_generated_at || order.updated_at || order.created_at).toLocaleDateString('en-IN')],
                  ['Department:', order.department_label || 'All Departments'],
                  ['Coordinator:', order.created_by_name || 'N/A'],
                  ['Principal:', principalApproval ? `Approved by ${principalApproval.user_name}` : `Approved by ${savedUsers.find(u => u.role === 'principal')?.name || 'Principal'}`],
                  ['DCR Audit:', dcrApproval ? `Approved by ${dcrApproval.user_name}` : `Approved by ${savedUsers.find(u => u.role === 'dcr')?.name || 'DCR Auditor'}`],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', borderBottom: '1px dashed var(--gray-100)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--gray-500)', fontWeight: 600, minWidth: '95px', flexShrink: 0 }}>{label}</span>
                    <span style={{ fontWeight: 700, color: 'var(--gray-900)', flex: 1, minWidth: '140px', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* QR Code Verification Box */}
            <div style={{ textAlign: 'center', background: 'var(--surface-1)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--gray-200)', margin: '0 auto', maxWidth: '140px', flexShrink: 0 }}>
              {qrCodeUrl ? (
                <Link href={`/verify/invoice/${invoiceNo}`} target="_blank" style={{ textDecoration: 'none' }}>
                  <img src={qrCodeUrl} alt="Invoice QR" style={{ width: '90px', height: '90px', display: 'block', margin: '0 auto 4px', borderRadius: '6px', background: 'var(--surface-0)', padding: '2px' }} />
                </Link>
              ) : (
                <div style={{ width: '90px', height: '90px', background: 'var(--surface-2)', borderRadius: '6px', margin: '0 auto 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'var(--gray-400)' }}>
                  Loading QR...
                </div>
              )}
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--primary, #2563EB)', letterSpacing: '0.5px' }}>SCAN TO VERIFY</div>
              <div style={{ fontSize: '0.58rem', color: 'var(--gray-500)', marginTop: '2px' }}>QR Secure Check</div>
            </div>
          </div>

          {/* Items Table / Responsive Item List */}
          <div style={{ width: '100%', marginBottom: '20px' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '400px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--gray-200)' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-500)', width: '35px' }}>#</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-500)' }}>Item Description</th>
                    {!selectedVO && (
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-500)' }}>Vendor</th>
                    )}
                    <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-500)', width: '60px' }}>Qty</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-500)', width: '70px' }}>Unit</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-500)', width: '80px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={selectedVO ? 5 : 6} style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.82rem' }}>
                        No line items available for this invoice.
                      </td>
                    </tr>
                  ) : items.map((item, idx) => {
                    const price = Number(item?.price ?? 0);
                    const qty = Number(item?.quantity ?? 0);
                    const name = getMenuItemName(item?.menu_item_id, item?.name) || 'Item';
                    const unit = item?.unit || '';
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--gray-100)', fontSize: '0.78rem' }}>
                        <td style={{ padding: '8px 10px', color: 'var(--gray-500)' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--gray-900)', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{name}</td>
                        {!selectedVO && (
                          <td style={{ padding: '8px 10px', color: 'var(--gray-600)', overflowWrap: 'break-word' }}>{item?.vendorName || 'N/A'}</td>
                        )}
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: 'var(--gray-800)' }}>
                          {qty}{unit ? ` (${unit})` : ''}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--gray-600)' }}>₹{price.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--gray-900)' }}>
                          ₹{(price * qty).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grand Total & Words */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderTop: '2px dashed var(--gray-200)', paddingTop: '14px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', flex: 1, minWidth: '200px', overflowWrap: 'break-word', wordBreak: 'break-word', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--gray-700)' }}>Amount in Words:</strong><br />
              Rupees {numToWords(Math.floor(totalAmount))} Only.
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '120px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)', letterSpacing: '0.5px' }}>GRAND TOTAL</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary, #2563EB)' }}>₹{totalAmount.toFixed(2)}</div>
            </div>
          </div>

          {/* Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '16px', marginTop: '36px', borderTop: '1px solid var(--gray-200)', paddingTop: '16px', width: '100%' }}>
            {['Prepared By (Coord)', 'Audited By (DCR)', 'Settle Signature (Canteen)'].map(label => (
              <div key={label} style={{ textAlign: 'center', width: '100%' }}>
                <div style={{ width: '80%', maxWidth: '120px', margin: '0 auto 4px auto', borderBottom: '1px solid var(--gray-300)' }} />
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--gray-500)', overflowWrap: 'break-word' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 480px) {
          .hide-xs {
            display: none !important;
          }
        }
        @media print {
          body, html {
            background: #FFFFFF !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          #bill-print {
            background: #FFFFFF !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            padding: 10px 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
