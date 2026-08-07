'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { initSeedData } from '@/lib/store';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    initSeedData();
    const session = getSession();
    if (session?.role) {
      router.replace('/' + session.role);
    } else {
      router.replace('/login');
    }
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-main)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🍱</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gray-700)' }}>AharSetu</div>
        <div style={{ marginTop: '16px', fontSize: '0.875rem', color: 'var(--gray-400)' }}>Loading...</div>
      </div>
    </div>
  );
}
