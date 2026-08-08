'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default function RootIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (session?.role) {
      router.replace('/' + session.role);
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#F9FAFB', fontFamily: 'sans-serif'
    }}>
      <div style={{ textAlign: 'center', color: '#6B7280' }}>
        <div style={{ fontSize: '2rem', marginBottom: '8px', animation: 'spin 1s infinite linear' }}>🔄</div>
        <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading AharSetu ERP session...</p>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
