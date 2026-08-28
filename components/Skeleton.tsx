'use client';
import React from 'react';

export function CardSkeleton() {
  return (
    <div className="card uiverse-skeleton-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', borderRadius: '16px', background: 'var(--surface-0)', border: '1px solid var(--gray-200, #E2E8F0)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      <div className="uiverse-shimmer-box" style={{ width: '38%', height: '14px', borderRadius: '6px' }} />
      <div className="uiverse-shimmer-box" style={{ width: '65%', height: '28px', borderRadius: '8px' }} />
      <div className="uiverse-shimmer-box" style={{ width: '48%', height: '12px', borderRadius: '6px' }} />
      <style>{`
        .uiverse-shimmer-box {
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 200% 100%;
          animation: uiverseShimmerWave 1.8s ease-in-out infinite;
        }
        @keyframes uiverseShimmerWave {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="table-wrapper uiverse-skeleton-table" style={{ border: '1px solid var(--gray-200, #E2E8F0)', borderRadius: '16px', padding: '20px', background: 'var(--surface-0)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className="uiverse-shimmer-box" style={{ width: '80px', height: '16px', borderRadius: '6px' }} />
            <div className="uiverse-shimmer-box" style={{ flex: 1, height: '16px', borderRadius: '6px' }} />
            <div className="uiverse-shimmer-box" style={{ width: '110px', height: '16px', borderRadius: '6px' }} />
            <div className="uiverse-shimmer-box" style={{ width: '70px', height: '16px', borderRadius: '6px' }} />
          </div>
        ))}
      </div>
      <style>{`
        .uiverse-shimmer-box {
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 200% 100%;
          animation: uiverseShimmerWave 1.8s ease-in-out infinite;
        }
        @keyframes uiverseShimmerWave {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
