'use client';
import BrandLogo from '@/components/BrandLogo';

export default function GlobalLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0F172A 0%, #0C1E36 50%, #06281E 100%)',
        color: '#F8FAFC',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background ambient lighting */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '30%',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          right: '30%',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.2) 0%, rgba(37, 99, 235, 0) 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Center card */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '18px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '24px',
          padding: '36px 44px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
          textAlign: 'center',
        }}
      >
        <div style={{ transform: 'scale(1.1)' }}>
          <BrandLogo size={56} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
            AharSetu Protocol
          </h3>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#94A3B8', fontWeight: 500 }}>
            Synchronizing Campus Hospitality Network...
          </p>
        </div>

        {/* Pulse loading bar */}
        <div
          style={{
            width: '180px',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            overflow: 'hidden',
            position: 'relative',
            marginTop: '8px',
          }}
        >
          <div
            style={{
              width: '50%',
              height: '100%',
              background: 'linear-gradient(90deg, #10B981, #3B82F6, #F59E0B)',
              borderRadius: '10px',
              animation: 'loadingSweep 1.4s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes loadingSweep {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}
