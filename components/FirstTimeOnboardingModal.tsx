'use client';
import { useState, useEffect } from 'react';
import { getSession, UserProfile } from '@/lib/auth';

export default function FirstTimeOnboardingModal() {
  const [showModal, setShowModal] = useState(false);
  const [session, setSession] = useState<UserProfile | null>(null);
  const [phone, setPhone] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) return;
    
    // Check if user has verified profile
    const verifiedStore = typeof window !== 'undefined' ? localStorage.getItem(`aharsetu_verified_${s.id}`) : 'true';
    if (!verifiedStore) {
      setSession(s);
      setShowModal(true);
    }
  }, []);

  const handleVerifyComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    if (avatarPreview && typeof window !== 'undefined') {
      localStorage.setItem(`aharsetu_avatar_${session.id}`, avatarPreview);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(`aharsetu_verified_${session.id}`, 'true');
    }
    setShowModal(false);
    alert('Profile verification completed successfully!');
    window.location.reload();
  };

  if (!showModal || !session) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        maxWidth: '480px',
        width: '100%',
        padding: '32px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        border: '1px solid #E2E8F0'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>👋</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Welcome, {session.name}!
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '6px 0 0 0' }}>
            Please complete and verify your institutional account profile before accessing your campus canteen dashboard.
          </p>
        </div>

        <form onSubmit={handleVerifyComplete} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Avatar Upload */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '2rem',
              fontWeight: 800,
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                session.name[0]
              )}
            </div>

            <label style={{
              cursor: 'pointer',
              background: '#EFF6FF',
              color: '#2563EB',
              border: '1px solid #BFDBFE',
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: 800
            }}>
              📷 Upload Profile Photo
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => setAvatarPreview(evt.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Verify Contact Phone Number
            </label>
            <input
              type="tel"
              required
              placeholder="+91 98765 43210"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '0.8rem', color: '#475569' }}>
            <div>🏢 <strong>Assigned Role:</strong> {session.role.toUpperCase()}</div>
            <div>📧 <strong>Registered Email:</strong> {session.email}</div>
          </div>

          <button
            type="submit"
            style={{
              background: '#2563EB',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: 'pointer',
              marginTop: '8px',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
            }}
          >
            ✓ Verify & Enter Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
