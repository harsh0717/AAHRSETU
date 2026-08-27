'use client';

import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import AppIcon from '@/components/ui/AppIcon';

export default function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(155deg, #0F172A 0%, #0C1E36 40%, #06281E 85%, #041B14 100%)',
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
          top: '-80px',
          left: '20%',
          width: '420px',
          height: '420px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, rgba(16, 185, 129, 0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-60px',
          right: '20%',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.22) 0%, rgba(37, 99, 235, 0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '560px',
          width: '100%',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1.5px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '24px',
          padding: '40px 36px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'inline-flex', marginBottom: '16px' }}>
          <BrandLogo size={52} />
        </div>

        {/* 404 Visual Icon */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: 'rgba(234, 88, 12, 0.15)',
            border: '1.5px solid rgba(234, 88, 12, 0.35)',
            fontSize: '2.2rem',
            margin: '0 auto 18px',
            boxShadow: '0 8px 24px rgba(234, 88, 12, 0.25)',
          }}
        >
          🍱
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(234, 88, 12, 0.15)',
            color: '#FB923C',
            border: '1px solid rgba(234, 88, 12, 0.3)',
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '0.74rem',
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          404 · Item Not On Today's Menu
        </span>

        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#F8FAFC', margin: '0 0 8px', letterSpacing: '-0.03em' }}>
          Page Not Found
        </h1>

        <p style={{ fontSize: '0.9rem', color: '#94A3B8', lineHeight: 1.6, margin: '0 0 24px' }}>
          The requested URL or campus requisition link does not exist or may have been archived. Please verify the address or jump back to your authorized dashboard.
        </p>

        {/* Quick Portal Jump Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
            marginBottom: '24px',
            textAlign: 'left',
          }}
        >
          <Link
            href="/coordinator"
            style={{
              padding: '10px 12px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textDecoration: 'none',
              color: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              transition: 'all 0.2s',
            }}
          >
            <span>📝</span> Coordinator Orders
          </Link>

          <Link
            href="/principal"
            style={{
              padding: '10px 12px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textDecoration: 'none',
              color: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              transition: 'all 0.2s',
            }}
          >
            <span>🛡️</span> Principal Approvals
          </Link>

          <Link
            href="/vendor"
            style={{
              padding: '10px 12px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textDecoration: 'none',
              color: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              transition: 'all 0.2s',
            }}
          >
            <span>👨‍🍳</span> Canteen Hub
          </Link>

          <Link
            href="/dcr"
            style={{
              padding: '10px 12px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textDecoration: 'none',
              color: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              transition: 'all 0.2s',
            }}
          >
            <span>🏛️</span> DCR Audit & Bills
          </Link>
        </div>

        {/* Primary Action */}
        <div>
          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 28px',
              borderRadius: '12px',
              background: '#16A34A',
              color: 'white',
              fontWeight: 800,
              fontSize: '0.92rem',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)',
              transition: 'all 0.2s',
            }}
          >
            <span>🏠</span> Return to Login Screen
          </Link>
        </div>

        {/* Footer Legal Links */}
        <div style={{ marginTop: '28px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px', display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '0.75rem', color: '#64748B' }}>
          <Link href="/privacy" style={{ color: '#94A3B8', textDecoration: 'none' }}>Privacy Policy</Link>
          <span>·</span>
          <Link href="/terms" style={{ color: '#94A3B8', textDecoration: 'none' }}>Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
