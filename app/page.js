'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLE_LABELS, ROLE_ICONS, ROLE_COLORS } from '@/lib/constants';
import { setSession, getSession, initSeedData } from '@/lib/store';

const ROLE_DESCRIPTIONS = {
  coordinator: 'Create and submit canteen orders for meetings & events',
  principal:   'Review and approve/reject order requests',
  dcr:         'Financial verification and budget approval',
  vendor:      'Manage menu, pricing, and order fulfillment',
  admin:       'System reports, billing, and complete order oversight',
};

const ROLE_NAMES = {
  coordinator: 'Priya Sharma',
  principal:   'Dr. A. Mehta',
  dcr:         'S. Patil',
  vendor:      'M. Khan',
  admin:       'System Admin',
};

const ROLE_ROUTES = {
  coordinator: '/coordinator',
  principal:   '/principal',
  dcr:         '/dcr',
  vendor:      '/vendor',
  admin:       '/admin',
};

const ALL_ROLES = ['coordinator', 'principal', 'dcr', 'vendor', 'admin'];

export default function LoginPage() {
  const router = useRouter();
  const [hoveredRole, setHoveredRole] = useState(null);

  useEffect(() => {
    initSeedData();
    const session = getSession();
    if (session?.role) router.push(ROLE_ROUTES[session.role]);
  }, []);

  function handleLogin(role) {
    const session = {
      role,
      name: ROLE_NAMES[role],
      loginAt: new Date().toISOString(),
    };
    setSession(session);
    router.push(ROLE_ROUTES[role]);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 40%, #1E3A8A 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)`,
            width: `${200 + i * 100}px`,
            height: `${200 + i * 100}px`,
            top: `${[10, 60, 20, 70, 5, 80][i]}%`,
            left: `${[80, 10, 50, 90, 20, 60][i]}%`,
            transform: 'translate(-50%,-50%)',
            animation: `pulse ${3 + i}s ease-in-out infinite`,
          }} />
        ))}
      </div>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '48px', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: '80px', height: '80px',
          background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
          borderRadius: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.5rem',
          margin: '0 auto 20px',
          boxShadow: '0 20px 40px rgba(37,99,235,0.4)',
        }}>
          🍱
        </div>
        <h1 style={{ color: '#fff', margin: 0, fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.03em' }}>
          AharSetu
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', margin: '8px 0 0', fontSize: '1rem' }}>
          Canteen Order Management ERP
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          marginTop: '12px', padding: '4px 12px',
          background: 'rgba(255,255,255,0.1)', borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.15)',
          fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)',
        }}>
          🔓 Demo Mode — Select your role to continue
        </div>
      </div>

      {/* Role cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        width: '100%',
        maxWidth: '1100px',
        position: 'relative',
        zIndex: 1,
      }}>
        {ALL_ROLES.map(role => {
          const colors = ROLE_COLORS[role];
          const isHovered = hoveredRole === role;
          return (
            <button
              key={role}
              onClick={() => handleLogin(role)}
              onMouseEnter={() => setHoveredRole(role)}
              onMouseLeave={() => setHoveredRole(null)}
              style={{
                background: isHovered
                  ? `linear-gradient(135deg, ${colors.sidebar}, ${colors.accent})`
                  : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${isHovered ? colors.accent : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '16px',
                padding: '28px 20px',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                transform: isHovered ? 'translateY(-6px) scale(1.02)' : 'translateY(0) scale(1)',
                boxShadow: isHovered ? `0 20px 40px ${colors.accent}50` : 'none',
                textAlign: 'center',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{
                width: '64px', height: '64px',
                borderRadius: '16px',
                background: isHovered ? 'rgba(255,255,255,0.2)' : `linear-gradient(135deg, ${colors.sidebar}80, ${colors.accent}60)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem',
                margin: '0 auto 16px',
                border: `1px solid ${isHovered ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                transition: 'all 0.25s ease',
              }}>
                {ROLE_ICONS[role]}
              </div>
              <div style={{
                fontSize: '1rem', fontWeight: 700, color: '#fff',
                marginBottom: '8px',
              }}>
                {ROLE_LABELS[role]}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: isHovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
                lineHeight: 1.5,
                transition: 'color 0.2s',
              }}>
                {ROLE_DESCRIPTIONS[role]}
              </div>
              <div style={{
                marginTop: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                fontSize: '0.75rem',
                color: isHovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                fontWeight: 600,
              }}>
                <span>{ROLE_NAMES[role]}</span>
              </div>
              {isHovered && (
                <div style={{
                  marginTop: '12px',
                  padding: '6px 14px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#fff',
                  display: 'inline-block',
                }}>
                  Login as {ROLE_LABELS[role]} →
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer note */}
      <div style={{
        marginTop: '40px', textAlign: 'center', position: 'relative', zIndex: 1,
        fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)',
      }}>
        Prototype v1.0 · No real authentication · State persists in localStorage
      </div>
    </div>
  );
}
