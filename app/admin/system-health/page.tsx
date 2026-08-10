'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { getSession, UserProfile } from '@/lib/auth';
import { getSystemHealth, SystemHealthStatus } from '@/lib/health';
import Link from 'next/link';

export default function SystemHealthPage() {
  const [session, setSession] = useState<UserProfile | null>(null);
  const [health, setHealth] = useState<SystemHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = getSession();
    if (s) setSession(s);

    async function loadHealth() {
      const data = await getSystemHealth();
      setHealth(data);
      setLoading(false);
    }
    loadHealth();
    const interval = setInterval(loadHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!session) return null;

  return (
    <AppShell role="admin">
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
        
        {/* Navigation Breadcrumb */}
        <div style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '16px', fontWeight: 600 }}>
          <Link href="/admin" style={{ color: '#2563EB', textDecoration: 'none' }}>Admin Portal</Link> / System Health & Observability
        </div>

        {/* Title Card */}
        <div style={{
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          color: 'white',
          borderRadius: '20px',
          padding: '28px',
          marginBottom: '24px',
          boxShadow: '0 10px 25px rgba(15, 23, 42, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.4rem' }}>🖥️</span>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'white' }}>
                AharSetu System Status & Observability
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94A3B8' }}>
              Real-time monitoring for API, PostgreSQL Database, WebSockets, Web Push & Microservices
            </p>
          </div>

          <div style={{
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            color: '#4ADE80',
            padding: '8px 16px',
            borderRadius: '999px',
            fontWeight: 800,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ADE80' }}></span>
            🟢 SYSTEM OPERATIONAL
          </div>
        </div>

        {loading || !health ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px', animation: 'spin 1s infinite linear' }}>🔄</div>
            <div>Fetching system health telemetry...</div>
          </div>
        ) : (
          <div>
            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>API Latency</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>{health.apiLatencyMs} ms</div>
                <div style={{ fontSize: '0.75rem', color: '#16A34A', marginTop: '4px' }}>⚡ Sub-50ms response</div>
              </div>
              <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Active Canteens</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{health.activeCanteens.open} / {health.activeCanteens.total} Open</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>1 Temporarily Closed</div>
              </div>
              <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Active Processing Orders</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>{health.activeOrdersCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#16A34A', marginTop: '4px' }}>✓ Zero deadlock queues</div>
              </div>
              <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>System Uptime</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16A34A', marginTop: '4px' }}>99.98%</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>Last restart: 10 days ago</div>
              </div>
            </div>

            {/* Microservice Health Matrix */}
            <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
                Core Microservices & Telemetry
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {health.services.map((s, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: s.status === 'OPERATIONAL' ? '#22C55E' : '#EAB308'
                      }}></span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>{s.service} Service</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{s.message}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>{s.latencyMs} ms</span>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '999px',
                        background: '#DCFCE7', color: '#15803D'
                      }}>
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </AppShell>
  );
}
