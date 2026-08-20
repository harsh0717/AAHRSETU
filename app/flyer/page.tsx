'use client';

import React from 'react';
import Link from 'next/link';

export default function FlyerPage() {
  const teamMembers = [
    { num: '1', name: 'Shubh Soni', role: 'Lead Architect & Core ERP', initials: 'SS', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
    { num: '2', name: 'Gohil Harsh', role: 'Full-Stack Developer & API', initials: 'GH', gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' },
    { num: '3', name: 'Manan Dabgar', role: 'System & UI/UX Engineer', initials: 'MD', gradient: 'linear-gradient(135deg, #10B981, #059669)' },
    { num: '4', name: 'Atharva Chitale', role: 'Backend & Workflow Engine', initials: 'AC', gradient: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }
  ];

  const roles = [
    {
      title: 'Coordinator',
      icon: '👤',
      desc: 'Instant meal drafting & department budget quota check',
      bg: '#FEF3C7',
      color: '#B45309'
    },
    {
      title: 'Principal / Dean',
      icon: '🎓',
      desc: 'One-tap digital sanction & multi-department oversight',
      bg: '#EFF6FF',
      color: '#1D4ED8'
    },
    {
      title: 'Canteen Vendor',
      icon: '👨‍🍳',
      desc: 'Live KOD kitchen queue & batch food dispatch',
      bg: '#DCFCE7',
      color: '#15803D'
    },
    {
      title: 'DCR Auditor',
      icon: '📋',
      desc: 'Instant QR invoice verification & auto-settlement',
      bg: '#F3E8FF',
      color: '#7E22CE'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B132B',
      padding: '24px 12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      
      {/* Web Preview Top Bar */}
      <div style={{
        width: '100%',
        maxWidth: '900px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(16px)',
        padding: '10px 20px',
        borderRadius: '100px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        color: '#FFFFFF'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/login" style={{ color: '#FCD34D', textDecoration: 'none', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            ← Back to App
          </Link>
          <span style={{ color: 'rgba(255, 255, 255, 0.25)' }}>|</span>
          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#E2E8F0' }}>
            🚀 <strong>AaharSetu</strong> App Launch Flyer
          </span>
        </div>

        <button
          onClick={() => window.print()}
          style={{
            background: 'linear-gradient(135deg, #F59E0B, #D97706)',
            color: 'white',
            border: 'none',
            padding: '8px 22px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(217, 119, 6, 0.4)'
          }}
        >
          🖨️ Print / Save as PDF
        </button>
      </div>

      {/* Main Flyer Sheet */}
      <div id="print-sheet" style={{
        width: '100%',
        maxWidth: '900px',
        background: '#FFFFFF',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5)',
        position: 'relative'
      }}>
        
        {/* 1. Header Banner with Website Logo */}
        <header style={{
          background: 'linear-gradient(135deg, #0B132B 0%, #1C2541 60%, #1E3A8A 100%)',
          padding: '26px 36px 22px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            {/* Exact Website Logo Badge */}
            <img
              src="/images/logo.png"
              alt="AaharSetu Official Logo"
              style={{
                height: '52px',
                width: 'auto',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '4px 10px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
              }}
            />

            <div style={{
              background: 'rgba(245, 158, 11, 0.16)',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              color: '#FCD34D',
              padding: '6px 16px',
              borderRadius: '100px',
              fontSize: '0.76rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }}></span>
              <span>Official App Launch · Live on Campus</span>
            </div>
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0 }}>
            Smart Campus Dining is Now Live: <span style={{ background: 'linear-gradient(90deg, #FCD34D 0%, #F59E0B 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AaharSetu ERP</span>
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#CBD5E1', marginTop: '6px', fontWeight: 500, maxWidth: '650px' }}>
            The unified digital platform bridging Coordinators, Principals, Canteen Kitchens & Accounts with real-time approvals, live KOD displays and instant QR invoice settlement.
          </p>
        </header>

        {/* 2. Realistic Product UI Showcase (No Cartoon) */}
        <section style={{ padding: '22px 36px 14px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '18px', alignItems: 'stretch' }}>
            
            {/* Desktop Window Mockup */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #CBD5E1', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: '#0F172A', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#EF4444' }}></div>
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#F59E0B' }}></div>
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#10B981' }}></div>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94A3B8', background: 'rgba(255, 255, 255, 0.1)', padding: '2px 12px', borderRadius: '6px', fontFamily: 'monospace' }}>
                  https://aaharsetu.edu.in/dashboard
                </div>
                <div style={{ fontSize: '0.65rem', color: '#FCD34D', fontWeight: 700 }}>LIVE PORTAL</div>
              </div>

              <div style={{ padding: '14px', background: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Active Orders</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#2563EB', marginTop: '1px' }}>18 Live</div>
                  </div>
                  <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Avg Approval</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#059669', marginTop: '1px' }}>42 Sec</div>
                  </div>
                  <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Budget Used</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#D97706', marginTop: '1px' }}>68% Quota</div>
                  </div>
                </div>

                <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', color: '#2563EB', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                      ☕
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>Faculty Seminar Refreshments</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748B' }}>Computer Eng. · 45 Guests · Sharma Canteen</div>
                    </div>
                  </div>
                  <span style={{ background: '#DCFCE7', color: '#166534', fontSize: '0.65rem', fontWeight: 800, padding: '4px 8px', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                    ✓ Sanctioned
                  </span>
                </div>

                <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', color: '#2563EB', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                      🍱
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>Annual Tech Fest Lunch Packs</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748B' }}>Student Council · 120 Units · Fresh Bites</div>
                    </div>
                  </div>
                  <span style={{ background: '#FEF3C7', color: '#B45309', fontSize: '0.65rem', fontWeight: 800, padding: '4px 8px', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                    👨‍🍳 Cooking in KOD
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile App Frame Mockup */}
            <div style={{ background: '#0B132B', borderRadius: '22px', padding: '10px', boxShadow: '0 12px 30px rgba(0, 0, 0, 0.2)', border: '2px solid #334155', display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: '#FFFFFF', borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#1E3A8A' }}>🍱 AaharSetu Mobile</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#059669' }}>ONLINE</span>
                </div>

                <div style={{ background: 'linear-gradient(135deg, #1E293B, #0F172A)', color: 'white', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#FCD34D', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Instant Digital Pass</div>
                  
                  {/* Clean Vector QR Code */}
                  <svg style={{ width: '72px', height: '72px', margin: '6px auto 4px', background: 'white', padding: '4px', borderRadius: '6px', display: 'block' }} viewBox="0 0 100 100" fill="none">
                    <rect width="100" height="100" fill="white"/>
                    <rect x="10" y="10" width="26" height="26" fill="#0F172A"/>
                    <rect x="14" y="14" width="18" height="18" fill="white"/>
                    <rect x="18" y="18" width="10" height="10" fill="#0F172A"/>

                    <rect x="64" y="10" width="26" height="26" fill="#0F172A"/>
                    <rect x="68" y="14" width="18" height="18" fill="white"/>
                    <rect x="72" y="18" width="10" height="10" fill="#0F172A"/>

                    <rect x="10" y="64" width="26" height="26" fill="#0F172A"/>
                    <rect x="14" y="68" width="18" height="18" fill="white"/>
                    <rect x="18" y="72" width="10" height="10" fill="#0F172A"/>

                    <rect x="42" y="14" width="6" height="6" fill="#D97706"/>
                    <rect x="52" y="20" width="6" height="14" fill="#0F172A"/>
                    <rect x="42" y="32" width="8" height="6" fill="#0F172A"/>
                    <rect x="14" y="44" width="20" height="6" fill="#0F172A"/>
                    <rect x="42" y="44" width="16" height="16" fill="#D97706"/>
                    <rect x="64" y="44" width="12" height="6" fill="#0F172A"/>
                    <rect x="80" y="44" width="10" height="16" fill="#0F172A"/>
                    <rect x="64" y="64" width="16" height="8" fill="#0F172A"/>
                    <rect x="42" y="68" width="12" height="14" fill="#0F172A"/>
                    <rect x="64" y="80" width="26" height="10" fill="#D97706"/>
                  </svg>
                  
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.1em', fontFamily: 'monospace' }}>#AST-8942-VERIFIED</div>
                </div>

                <div style={{ fontSize: '0.65rem', color: '#475569', textAlign: 'center', fontWeight: 600 }}>
                  Scan at canteen counter for zero-wait instant serving
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* 3. Multi-Tier Roles */}
        <section style={{ padding: '18px 36px 14px', background: '#FFFFFF' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#D97706', marginBottom: '12px', textAlign: 'center' }}>
            Designed for Every Campus Stakeholder
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {roles.map((r, idx) => (
              <div key={idx} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '14px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: r.bg, color: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', marginBottom: '8px' }}>
                  {r.icon}
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0B132B', marginBottom: '2px' }}>{r.title}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 500, lineHeight: 1.3 }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Features */}
        <section style={{ padding: '14px 36px 16px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '1.3rem', width: '34px', height: '34px', borderRadius: '8px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>⚡</div>
              <div>
                <h5 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0B132B', margin: '0 0 2px 0' }}>Zero Waiting Queues</h5>
                <p style={{ fontSize: '0.68rem', color: '#64748B', margin: 0, lineHeight: 1.3 }}>Direct digital order routing from event desks to the kitchen prep line.</p>
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '1.3rem', width: '34px', height: '34px', borderRadius: '8px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🔒</div>
              <div>
                <h5 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0B132B', margin: '0 0 2px 0' }}>Tamper-Proof QR Bills</h5>
                <p style={{ fontSize: '0.68rem', color: '#64748B', margin: 0, lineHeight: 1.3 }}>Cryptographically verifiable invoices prevent double-billing and fraud.</p>
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '1.3rem', width: '34px', height: '34px', borderRadius: '8px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🌐</div>
              <div>
                <h5 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0B132B', margin: '0 0 2px 0' }}>Tri-Lingual Interface</h5>
                <p style={{ fontSize: '0.68rem', color: '#64748B', margin: 0, lineHeight: 1.3 }}>Full native support for English, हिन्दी (Hindi) and ગુજરાતી (Gujarati).</p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Metrics Strip */}
        <div style={{ padding: '12px 36px', background: '#FFFFFF', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', textAlign: 'center' }}>
          <div style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', border: '1px solid #FDE68A', borderRadius: '10px', padding: '8px 4px' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#B45309', lineHeight: 1 }}>100%</div>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#78350F', textTransform: 'uppercase', marginTop: '3px' }}>Paperless Bills</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', border: '1px solid #FDE68A', borderRadius: '10px', padding: '8px 4px' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#B45309', lineHeight: 1 }}>&lt; 60s</div>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#78350F', textTransform: 'uppercase', marginTop: '3px' }}>Sanction Time</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', border: '1px solid #FDE68A', borderRadius: '10px', padding: '8px 4px' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#B45309', lineHeight: 1 }}>0%</div>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#78350F', textTransform: 'uppercase', marginTop: '3px' }}>Food Wastage</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', border: '1px solid #FDE68A', borderRadius: '10px', padding: '8px 4px' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#B45309', lineHeight: 1 }}>4-Tier</div>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#78350F', textTransform: 'uppercase', marginTop: '3px' }}>Audit Security</div>
          </div>
        </div>

        {/* 6. Footer & Development Team */}
        <footer style={{ background: '#0B132B', color: 'white', padding: '20px 36px 22px', borderTop: '3px solid #F59E0B' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#FCD34D', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>👥</span> Project Development Team
            </div>
            <span style={{ background: 'rgba(255, 255, 255, 0.1)', fontSize: '0.65rem', padding: '3px 10px', borderRadius: '100px', color: '#CBD5E1' }}>
              B.Tech Engineering Project
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {teamMembers.map((member, idx) => (
              <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.07)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: member.gradient, color: 'white', fontWeight: 800, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {member.initials}
                </div>
                <div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {member.num}. {member.name}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#94A3B8' }}>{member.role}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: '#64748B' }}>
            <div><strong style={{ color: '#CBD5E1' }}>AaharSetu</strong> — Campus Canteen Management & Dining ERP</div>
            <div>Official Launch · 2026</div>
          </div>
        </footer>

      </div>

      {/* Print Specific CSS override */}
      <style jsx global>{`
        @media print {
          body {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #print-sheet {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          header, nav, button {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 0.6cm;
          }
        }
      `}</style>

    </div>
  );
}
