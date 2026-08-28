'use client';
import { useState } from 'react';
import { getCustomFoodImage } from '@/lib/vendors';

export interface FoodMenuCardProps {
  id: string;
  name: string;
  price: number | string;
  vendorName: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  available: boolean;
  unit?: string;
  onAddToCart?: (qty: number) => void;
}

export default function FoodMenuCard({
  id,
  name,
  price,
  vendorName,
  category = 'General',
  description,
  imageUrl,
  available,
  unit = 'per plate',
  onAddToCart
}: FoodMenuCardProps) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const activeImage = imageUrl || (id ? getCustomFoodImage(id) : null);

  // Default food emoji placeholder if no custom image is uploaded
  const defaultEmoji = name.toLowerCase().includes('tea') || name.toLowerCase().includes('coffee')
    ? '☕' : name.toLowerCase().includes('lunch') || name.toLowerCase().includes('thali')
    ? '🍱' : name.toLowerCase().includes('sandwich') || name.toLowerCase().includes('burger')
    ? '🥪' : name.toLowerCase().includes('samosa') || name.toLowerCase().includes('snack')
    ? '🥟' : '🍽️';

  const handleAdd = () => {
    if (onAddToCart) onAddToCart(qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div style={{
      background: 'var(--surface-0)',
      border: '1px solid var(--gray-200, #E2E8F0)',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: 'pointer'
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 10px 20px -3px rgba(37, 99, 235, 0.1)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
    }}
    >
      {/* Food Visual Header */}
      <div style={{
        height: '130px',
        background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        fontSize: '3.5rem'
      }}>
        {activeImage ? (
          <img src={activeImage} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span>{defaultEmoji}</span>
        )}
        
        {/* Availability Badge */}
        <span style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          fontSize: '0.7rem',
          fontWeight: 800,
          padding: '4px 10px',
          borderRadius: '999px',
          background: available ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
          color: 'white',
          backdropFilter: 'blur(4px)'
        }}>
          {available ? '● Available' : '○ Unavailable'}
        </span>

        {/* Category Tag */}
        <span style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          fontSize: '0.68rem',
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: '6px',
          background: 'rgba(15, 23, 42, 0.65)',
          color: 'white',
          backdropFilter: 'blur(4px)'
        }}>
          {category}
        </span>
      </div>

      {/* Card Content */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Name & Price beside item name */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)', margin: 0, lineHeight: 1.3 }}>
            {name}
          </h3>
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#2563EB', whiteSpace: 'nowrap' }}>
            ₹{price}
          </div>
        </div>

        {/* Vendor Name */}
        <div style={{ fontSize: '0.78rem', color: 'var(--gray-500, #64748B)', fontWeight: 600, marginBottom: '8px' }}>
          🏪 {vendorName} <span style={{ color: '#94A3B8' }}>• {unit}</span>
        </div>

        {/* Description */}
        {description && (
          <p style={{ fontSize: '0.78rem', color: 'var(--gray-500, #64748B)', margin: '0 0 14px 0', flex: 1, lineHeight: 1.4 }}>
            {description}
          </p>
        )}

        {/* Quantity Stepper & Add Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-1)', border: '1px solid var(--gray-200, #E2E8F0)', borderRadius: '8px' }}>
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              disabled={!available}
              style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', fontWeight: 800, color: 'var(--gray-600, #475569)', cursor: 'pointer' }}
            >
              -
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, padding: '0 8px', color: 'var(--gray-900, #0F172A)' }}>{qty}</span>
            <button
              onClick={() => setQty(qty + 1)}
              disabled={!available}
              style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', fontWeight: 800, color: 'var(--gray-600, #475569)', cursor: 'pointer' }}
            >
              +
            </button>
          </div>

          <button
            onClick={handleAdd}
            disabled={!available}
            style={{
              background: added ? '#10B981' : available ? '#2563EB' : '#94A3B8',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: available ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s ease'
            }}
          >
            {added ? '✓ Added' : 'Add +'}
          </button>
        </div>
      </div>
    </div>
  );
}
