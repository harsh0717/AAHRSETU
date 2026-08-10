'use client';

export default function SkeletonLoader({ rows = 3, type = 'card' }: { rows?: number; type?: 'card' | 'table' | 'text' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} style={{
          height: type === 'card' ? '110px' : type === 'table' ? '48px' : '20px',
          background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
          backgroundSize: '200% 100%',
          borderRadius: '12px',
          animation: 'pulseSkeleton 1.5s infinite ease-in-out'
        }} />
      ))}
    </div>
  );
}
