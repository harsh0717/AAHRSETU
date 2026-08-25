'use client';
/**
 * /administration route — redirects to /dcr (same dashboard, same pages).
 * The URL /administration is the canonical URL for the Administration role.
 * The /dcr URL continues to work for backward compatibility.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default function AdministrationRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    // Both administration and dcr role users land on /dcr dashboard
    if (session.role === 'administration' || session.role === 'dcr') {
      router.replace('/dcr');
    } else {
      router.replace(`/${session.role}`);
    }
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '2rem' }}>🏛️</div>
      <div style={{ fontWeight: 700, color: '#0F172A' }}>Redirecting to Administration...</div>
    </div>
  );
}
