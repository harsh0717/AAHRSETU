'use client';
import React from 'react';

export function CardSkeleton() {
  return (
    <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ width: '40%', height: '14px', background: 'var(--gray-200)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
      <div style={{ width: '70%', height: '24px', background: 'var(--gray-300)', borderRadius: '6px', animation: 'pulse 1.5s infinite ease-in-out' }} />
      <div style={{ width: '50%', height: '12px', background: 'var(--gray-200)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="table-wrapper" style={{ border: '1px solid var(--gray-200)', borderRadius: '10px', padding: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '80px', height: '16px', background: 'var(--gray-200)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
            <div style={{ flex: 1, height: '16px', background: 'var(--gray-200)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
            <div style={{ width: '100px', height: '16px', background: 'var(--gray-200)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
            <div style={{ width: '60px', height: '16px', background: 'var(--gray-200)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
