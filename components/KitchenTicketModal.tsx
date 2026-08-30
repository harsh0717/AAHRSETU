'use client';
import React, { useState, useEffect } from 'react';
import { MasterOrder, VendorOrder } from '@/lib/store';
import { getMenuItemName } from '@/lib/vendors';
import { COLLEGE_INFO } from '@/lib/constants';

interface KitchenTicketModalProps {
  order: MasterOrder;
  vendorOrder?: VendorOrder | null;
  canteenName?: string;
  onClose: () => void;
}

export default function KitchenTicketModal({
  order,
  vendorOrder,
  canteenName,
  onClose,
}: KitchenTicketModalProps) {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [showPrices, setShowPrices] = useState<boolean>(false);
  const [printDate, setPrintDate] = useState<string>('');

  useEffect(() => {
    setPrintDate(new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Determine items to display: either specific vendor order items or all items from all vendor orders
  const items = vendorOrder
    ? vendorOrder.items || []
    : (order.vendor_orders || []).flatMap((vo) => vo.items || []);

  const effectiveCanteen =
    canteenName ||
    vendorOrder?.vendor_name ||
    order.vendor_orders?.[0]?.vendor_name ||
    'Campus Authorized Kitchen';

  const orderTotal = vendorOrder
    ? vendorOrder.bill_amount || items.reduce((sum, it) => sum + (it.price || 0) * it.quantity, 0)
    : order.total_bill_amount || items.reduce((sum, it) => sum + (it.price || 0) * it.quantity, 0);

  const totalQuantity = items.reduce((sum, it) => sum + (it.quantity || 0), 0);

  const verificationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/order/${order.id}`
    : `https://aharsetu.edu.in/order/${order.id}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=0&data=${encodeURIComponent(
    verificationUrl
  )}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface-0, #FFFFFF)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1px solid var(--gray-200, #E2E8F0)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Controls Header (Screen Only) */}
        <div
          className="no-print"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--gray-200, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-1, #F8FAFC)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.3rem' }}>🖨️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)' }}>
                Kitchen Order Ticket (KOT)
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-500, #64748B)' }}>
                Thermal POS Receipt Preview
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer',
              color: 'var(--gray-400, #94A3B8)',
              padding: '4px 8px',
              borderRadius: '8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Print Options Toolbar (Screen Only) */}
        <div
          className="no-print"
          style={{
            padding: '10px 20px',
            background: 'var(--surface-0, #FFFFFF)',
            borderBottom: '1px solid var(--gray-200, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            fontSize: '0.8rem',
          }}
        >
          {/* Paper Size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: 'var(--gray-700, #334155)' }}>Paper Width:</span>
            <div style={{ display: 'inline-flex', background: 'var(--gray-100, #F1F5F9)', padding: '2px', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: paperWidth === '80mm' ? '#2563EB' : 'transparent',
                  color: paperWidth === '80mm' ? '#FFFFFF' : 'var(--gray-600, #475569)',
                }}
              >
                80mm (Standard POS)
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: paperWidth === '58mm' ? '#2563EB' : 'transparent',
                  color: paperWidth === '58mm' ? '#FFFFFF' : 'var(--gray-600, #475569)',
                }}
              >
                58mm (Compact)
              </button>
            </div>
          </div>

          {/* Show Prices Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600, color: 'var(--gray-700, #334155)' }}>
            <input
              type="checkbox"
              checked={showPrices}
              onChange={(e) => setShowPrices(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#2563EB' }}
            />
            <span>Include Prices / Total</span>
          </label>
        </div>

        {/* Scrollable Receipt Body Preview */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 16px',
            background: 'var(--surface-2, #E2E8F0)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          {/* Thermal Receipt Paper Layout */}
          <div
            id="kot-thermal-receipt"
            style={{
              width: paperWidth === '58mm' ? '240px' : '320px',
              background: '#FFFFFF',
              color: '#000000',
              padding: paperWidth === '58mm' ? '14px 10px' : '20px 14px',
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: paperWidth === '58mm' ? '11px' : '12px',
              lineHeight: '1.35',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              borderRadius: '2px',
              borderTop: '3px dashed #94A3B8',
              borderBottom: '3px dashed #94A3B8',
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '0.5px' }}>
                *** KITCHEN ORDER TICKET ***
              </div>
              <div style={{ fontSize: '14px', fontWeight: '900', marginTop: '2px' }}>
                {effectiveCanteen.toUpperCase()}
              </div>
              <div style={{ fontSize: '10px', color: '#333333', marginTop: '1px' }}>
                {COLLEGE_INFO.shortName || 'AharSetu Campus Catering'}
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #000000', margin: '6px 0' }} />

            {/* Token & Order ID Highlight */}
            <div style={{ textAlign: 'center', margin: '8px 0' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold' }}>ORDER TOKEN</div>
              <div style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '1px' }}>
                #{order.id.slice(-8).toUpperCase()}
              </div>
              <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '2px' }}>
                Status: {order.status.toUpperCase()}
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #000000', margin: '6px 0' }} />

            {/* Event & Department Info */}
            <div style={{ fontSize: '11px', margin: '6px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold' }}>Dept:</span>
                <span>{order.department_label || order.department_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span style={{ fontWeight: 'bold' }}>Event / Title:</span>
                <span style={{ textAlign: 'right', maxWidth: '65%', wordBreak: 'break-word' }}>{order.title}</span>
              </div>
              {order.purpose && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span style={{ fontWeight: 'bold' }}>Purpose:</span>
                  <span style={{ textAlign: 'right', maxWidth: '65%', wordBreak: 'break-word' }}>{order.purpose}</span>
                </div>
              )}
              {order.created_by_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span style={{ fontWeight: 'bold' }}>Coordinator:</span>
                  <span>{order.created_by_name}</span>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px dashed #000000', margin: '6px 0' }} />

            {/* Items Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '11px', margin: '4px 0' }}>
              <span style={{ width: '25%' }}>QTY</span>
              <span style={{ width: showPrices ? '50%' : '75%' }}>ITEM DESCRIPTION</span>
              {showPrices && <span style={{ width: '25%', textAlign: 'right' }}>AMT</span>}
            </div>

            <div style={{ borderTop: '1px solid #000000', margin: '4px 0' }} />

            {/* Items List */}
            <div style={{ margin: '6px 0' }}>
              {items.map((item, idx) => {
                const displayName = getMenuItemName(item.menu_item_id, item.name);
                const itemTotal = (item.price || 0) * item.quantity;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      margin: '5px 0',
                      fontSize: paperWidth === '58mm' ? '11px' : '12px',
                    }}
                  >
                    <div style={{ width: '25%', fontWeight: '900', fontSize: '13px' }}>
                      {item.quantity}x
                    </div>
                    <div style={{ width: showPrices ? '50%' : '75%', fontWeight: 'bold' }}>
                      <div>{displayName}</div>
                      {item.unit && (
                        <div style={{ fontSize: '9px', fontStyle: 'italic', fontWeight: 'normal', color: '#444' }}>
                          ({item.unit})
                        </div>
                      )}
                    </div>
                    {showPrices && (
                      <div style={{ width: '25%', textAlign: 'right', fontWeight: 'bold' }}>
                        ₹{itemTotal.toFixed(2)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop: '1px solid #000000', margin: '6px 0' }} />

            {/* Quantity Summary & Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '12px' }}>
              <span>TOTAL ITEMS:</span>
              <span>{totalQuantity} Qty</span>
            </div>

            {showPrices && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '13px', marginTop: '4px' }}>
                <span>GRAND TOTAL:</span>
                <span>₹{orderTotal.toFixed(2)}</span>
              </div>
            )}

            <div style={{ borderTop: '1px dashed #000000', margin: '8px 0' }} />

            {/* Verification QR Code & Footer */}
            <div style={{ textAlign: 'center', marginTop: '6px' }}>
              <img
                src={qrCodeUrl}
                alt="QR Code Verification"
                style={{ width: '80px', height: '80px', display: 'inline-block', margin: '4px 0' }}
              />
              <div style={{ fontSize: '9px', fontWeight: 'bold' }}>SCAN TO VERIFY ORDER</div>
              <div style={{ fontSize: '8px', color: '#555555', marginTop: '4px' }}>
                Printed: {printDate}
              </div>
              <div style={{ fontSize: '8px', color: '#777777', marginTop: '2px' }}>
                AharSetu Institutional Food Protocol
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer (Screen Only) */}
        <div
          className="no-print"
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--gray-200, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-0, #FFFFFF)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '8px 18px', borderRadius: '10px', fontWeight: 600 }}
          >
            Close
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-primary"
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#16A34A',
              borderColor: '#16A34A',
            }}
          >
            <span>🖨️</span> Print KOT Ticket ({paperWidth})
          </button>
        </div>
      </div>

      {/* Global Print Media Styles */}
      <style jsx global>{`
        @media print {
          /* Hide everything except the thermal receipt */
          body * {
            visibility: hidden !important;
          }
          .no-print,
          .no-print * {
            display: none !important;
          }
          #kot-thermal-receipt,
          #kot-thermal-receipt * {
            visibility: visible !important;
          }
          #kot-thermal-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${paperWidth === '58mm' ? '58mm' : '80mm'} !important;
            margin: 0 !important;
            padding: 2mm 3mm !important;
            box-shadow: none !important;
            border: none !important;
            background: #FFFFFF !important;
            color: #000000 !important;
            font-size: ${paperWidth === '58mm' ? '10px' : '12px'} !important;
          }
          @page {
            margin: 0;
            size: ${paperWidth === '58mm' ? '58mm auto' : '80mm auto'};
          }
        }
      `}</style>
    </div>
  );
}
