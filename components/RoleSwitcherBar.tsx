'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSession, login, UserProfile } from '@/lib/auth';

interface PersonaItem {
  id: string;
  name: string;
  role: string;
  label: string;
  subLabel: string;
  email: string;
  deptId?: string | null;
  vendorId?: string | null;
  icon: string;
  color: string;
  badgeBg: string;
}

const DEMO_PERSONAS: PersonaItem[] = [
  {
    id: 'coord_diploma',
    name: 'Priya Sharma',
    role: 'coordinator',
    label: 'Coordinator',
    subLabel: 'Diploma Dept',
    email: 'coord.diploma@aharsetu.edu.in',
    deptId: 'diploma',
    icon: '👤',
    color: '#2563EB',
    badgeBg: '#EFF6FF',
  },
  {
    id: 'coord_degree',
    name: 'Ravi Kumar',
    role: 'coordinator',
    label: 'Coordinator',
    subLabel: 'Degree Dept',
    email: 'coord.degree@aharsetu.edu.in',
    deptId: 'degree',
    icon: '👤',
    color: '#0284C7',
    badgeBg: '#F0F9FF',
  },
  {
    id: 'principal_dd',
    name: 'Dr. Arvind Mehta',
    role: 'principal',
    label: 'Principal',
    subLabel: 'Diploma & Degree',
    email: 'principal.dd@aharsetu.edu.in',
    deptId: 'diploma',
    icon: '🎓',
    color: '#4F46E5',
    badgeBg: '#EEF2FF',
  },
  {
    id: 'principal_pharma',
    name: 'Dr. Rekha Sharma',
    role: 'principal',
    label: 'Principal',
    subLabel: 'Pharmacy College',
    email: 'principal.pharma@aharsetu.edu.in',
    deptId: 'pharmacy',
    icon: '🎓',
    color: '#7C3AED',
    badgeBg: '#F5F3FF',
  },
  {
    id: 'dcr_auditor',
    name: 'S. Patil',
    role: 'dcr',
    label: 'DCR Auditor',
    subLabel: 'Accounts Clearance',
    email: 'dcr@aharsetu.edu.in',
    icon: '📋',
    color: '#0D9488',
    badgeBg: '#CCFBF1',
  },
  {
    id: 'vendor_sharma',
    name: 'Sharma Canteen',
    role: 'vendor',
    label: 'Canteen v1',
    subLabel: 'Tea & Snacks',
    email: 'vendor1@aharsetu.edu.in',
    vendorId: 'v1',
    icon: '🍽️',
    color: '#059669',
    badgeBg: '#ECFDF5',
  },
  {
    id: 'vendor_fresh',
    name: 'Fresh Bites',
    role: 'vendor',
    label: 'Canteen v2',
    subLabel: 'Fast Food & Bowls',
    email: 'vendor2@aharsetu.edu.in',
    vendorId: 'v2',
    icon: '🍕',
    color: '#D97706',
    badgeBg: '#FEF3C7',
  },
  {
    id: 'admin_rajesh',
    name: 'Rajesh Gupta',
    role: 'admin',
    label: 'System Admin',
    subLabel: 'Institutional IT',
    email: 'admin@aharsetu.edu.in',
    icon: '⚙️',
    color: '#9333EA',
    badgeBg: '#FAF5FF',
  },
];

export default function RoleSwitcherBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentSession, setCurrentSession] = useState<UserProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  const refreshSession = useCallback(() => {
    const s = getSession();
    setCurrentSession(s);
  }, []);

  useEffect(() => {
    refreshSession();
    const handleAuthChange = () => refreshSession();
    if (typeof window !== 'undefined') {
      window.addEventListener('aharsetu_profile_changed', handleAuthChange);
      window.addEventListener('storage', handleAuthChange);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('aharsetu_profile_changed', handleAuthChange);
        window.removeEventListener('storage', handleAuthChange);
      }
    };
  }, [refreshSession]);

  // Keyboard shortcut Ctrl+Shift+S to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, []);

  const handleSwitchPersona = async (persona: PersonaItem) => {
    if (switching) return;
    setSwitching(persona.id);

    try {
      // Default passwords from DEMO_USERS
      let password = 'Coord@123';
      if (persona.role === 'admin') password = 'Admin@123';
      else if (persona.role === 'dcr') password = 'DCR@123';
      else if (persona.role === 'principal') password = 'Principal@123';
      else if (persona.role === 'vendor') password = 'Vendor@123';

      const res = await login({
        email: persona.email,
        password: password,
        role: persona.role,
        department_id: persona.deptId || null,
        remember_device: true,
      });

      if (res && res.user) {
        refreshSession();
        window.dispatchEvent(new CustomEvent('aharsetu_profile_changed', { detail: res.user }));

        // Trigger toast
        window.dispatchEvent(
          new CustomEvent('aharsetu_toast', {
            detail: {
              title: `Persona Switched: ${persona.label}`,
              message: `Now viewing as ${persona.name} (${persona.subLabel})`,
              role: persona.role,
              duration: 3500,
            },
          })
        );

        // Redirect to persona dashboard
        router.push(`/${persona.role}`);
      }
    } catch (err) {
      console.error('[ROLE SWITCHER] Error switching persona:', err);
    } finally {
      setSwitching(null);
    }
  };

  // Don't show if user hid it
  if (hidden) return null;

  const currentRole = currentSession?.role || 'Guest';
  const currentEmail = currentSession?.email?.toLowerCase() || '';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99990,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        maxWidth: '96vw',
      }}
    >
      {/* Expanded Dock */}
      {isOpen && (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '20px',
            padding: '14px 18px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            animation: 'dockPop 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            color: 'white',
          }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1rem' }}>🎯</span>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '0.02em' }}>
                  Board Presentation — Live Role Switcher
                </span>
                <span style={{ marginLeft: '8px', fontSize: '0.68rem', color: '#94A3B8' }}>
                  (1-click persona simulation)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748B', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                Shortcut: ⌘ + Shift + S
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#CBD5E1',
                  borderRadius: '6px',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Collapse"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Persona Pills Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(140px, 1fr))',
              gap: '8px',
            }}
          >
            {DEMO_PERSONAS.map((p) => {
              const isActive = currentEmail === p.email.toLowerCase();
              const isBusy = switching === p.id;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSwitchPersona(p)}
                  disabled={isBusy}
                  style={{
                    background: isActive ? p.badgeBg : 'rgba(255, 255, 255, 0.08)',
                    border: isActive ? `2px solid ${p.color}` : '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '8px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    position: 'relative',
                    transition: 'all 0.18s ease',
                    boxShadow: isActive ? `0 0 14px ${p.color}40` : 'none',
                    color: isActive ? '#0F172A' : '#F8FAFC',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '1rem' }}>{p.icon}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: isActive ? p.color : '#F1F5F9' }}>
                        {p.label}
                      </span>
                    </div>

                    {isActive && (
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#10B981',
                          boxShadow: '0 0 8px #10B981',
                          animation: 'pulseDot 1.5s infinite',
                        }}
                        title="Active Persona"
                      />
                    )}
                  </div>

                  <div style={{ fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isActive ? '#1E293B' : '#E2E8F0' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '0.64rem', color: isActive ? '#64748B' : '#94A3B8' }}>
                    {p.subLabel}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapsed Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: '999px',
          padding: '8px 16px',
          color: '#F8FAFC',
          fontSize: '0.78rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.08)',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ fontSize: '0.9rem' }}>🎯</span>
        <span style={{ color: '#F1F5F9' }}>Demo Switcher:</span>
        <span
          style={{
            background: 'rgba(37, 99, 235, 0.3)',
            border: '1px solid rgba(96, 165, 250, 0.5)',
            color: '#93C5FD',
            padding: '2px 8px',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 800,
          }}
        >
          {currentSession?.name || currentRole} ({currentRole.toUpperCase()})
        </span>
        <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{isOpen ? '▼' : '▲'}</span>
      </button>

      <style>{`
        @keyframes dockPop {
          from {
            transform: translateY(12px) scale(0.96);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
