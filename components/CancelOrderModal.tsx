'use client';
import { useState } from 'react';
import { MasterOrder, cancelMasterOrder } from '@/lib/store';
import { showToast } from '@/components/Toast';

interface CancelOrderModalProps {
  order: MasterOrder;
  isOpen: boolean;
  onClose: () => void;
  onCancelled: (updatedOrder: MasterOrder) => void;
}

export default function CancelOrderModal({ order, isOpen, onClose, onCancelled }: CancelOrderModalProps) {
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  if (!isOpen) return null;

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setCancelling(true);
    try {
      const updated = await cancelMasterOrder(order.id, reason.trim() || 'Cancelled by coordinator prior to DCR review');
      showToast(`Requisition ${order.id} has been cancelled`, 'warning');
      onCancelled(updated);
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to cancel requisition', 'error');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '480px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #FEE2E2', background: '#FEF2F2', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#FEE2E2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', color: '#DC2626' }}>
            ⚠️
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#991B1B', margin: 0 }}>
              Cancel Requisition
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#B91C1C', margin: '2px 0 0' }}>
              Order ID: {order.id} ({order.title})
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirm}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0, lineHeight: 1.5 }}>
              Are you sure you want to cancel this requisition? This will withdraw the requisition before DCR approval and notify supervisors.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                Reason for Cancellation (Optional)
              </label>
              <textarea
                className="form-input"
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Meeting rescheduled, placed by mistake..."
                style={{ width: '100%', borderRadius: '10px', padding: '10px 12px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              disabled={cancelling}
              style={{ borderRadius: '10px', padding: '9px 16px' }}
            >
              Keep Order
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={cancelling}
              style={{
                borderRadius: '10px',
                padding: '9px 18px',
                fontWeight: 800,
                background: '#DC2626',
                color: 'white',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
