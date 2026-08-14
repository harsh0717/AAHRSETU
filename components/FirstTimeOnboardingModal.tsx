'use client';
import { useState, useEffect, useCallback } from 'react';
import { getSession, uploadAvatar, updateUserProfile, UserProfile } from '@/lib/auth';

export default function FirstTimeOnboardingModal() {
  const [showModal, setShowModal] = useState(false);
  const [session, setSession] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const s = getSession();
    if (!s) return;

    // Show modal ONLY when:
    //  1. Profile setup not yet completed (profile_setup_completed = false)
    //  2. User has NOT previously clicked Skip (profile_setup_skipped = false)
    const shouldShow = s.profile_setup_completed !== true && s.profile_setup_skipped !== true;
    if (shouldShow) {
      setSession(s);
      setName(s.name || '');
      setPhone(s.mobile_number || '');
      setShowModal(true);
    }
  }, []);

  const validatePhone = (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 10) {
      setPhoneError('Mobile number must be exactly 10 digits');
      return false;
    }
    setPhoneError('');
    return true;
  };

  // Skip = mark skipped on the server so this modal never appears again
  // (unless user explicitly comes back via Profile Settings)
  const handleSkip = useCallback(async () => {
    if (skipping) return;
    setSkipping(true);
    setShowModal(false); // close immediately for snappy UX
    try {
      // Persist skip decision to PostgreSQL so it survives navigation, refresh, logout/login
      await updateUserProfile({ profile_setup_skipped: true });
    } catch {
      // Silently ignore — modal is already closed, not critical
    } finally {
      setSkipping(false);
    }
  }, [skipping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (phone && !validatePhone(phone)) return;

    setSaving(true);
    setError('');

    try {
      if (avatarFile) {
        await uploadAvatar(avatarFile);
      }
      const digits = phone.replace(/\D/g, '');
      await updateUserProfile({
        name: name.trim() || session.name,
        mobile_number: digits || null,
        profile_setup_completed: true,
        profile_setup_skipped: false,
      });
      setShowModal(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!showModal || !session) return null;

  return (
    /* Backdrop */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Modal shell — flex column so header/footer are fixed, body scrolls */}
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '460px',
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -12px rgba(0,0,0,0.30)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}
      >
        {/* ── Fixed Header ─────────────────────────────────────────────── */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: '1.6rem', lineHeight: 1, marginBottom: '6px' }}>👋</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Welcome, {session.name.split(' ')[0]}!
            </h2>
            <p style={{ fontSize: '0.79rem', color: '#64748B', margin: '4px 0 0 0', lineHeight: 1.4 }}>
              Complete your profile now or set it up later from Profile Settings.
            </p>
          </div>
          <button
            onClick={handleSkip}
            aria-label="Skip profile setup"
            style={{
              background: 'none',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '5px 12px',
              fontSize: '0.76rem',
              fontWeight: 700,
              color: '#64748B',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              marginLeft: '12px',
            }}
          >
            Skip
          </button>
        </div>

        {/* ── Scrollable Body + Footer wrapped in a single form ──── */}
        <form
          onSubmit={handleSubmit}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          {/* Scrollable body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '88px',
                height: '88px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '2.2rem',
                fontWeight: 800,
                overflow: 'hidden',
                boxShadow: '0 4px 14px rgba(37,99,235,0.28)',
                border: '3px solid white',
                outline: '2px solid #BFDBFE',
              }}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                session.name[0]?.toUpperCase()
              )}
            </div>
            <label
              style={{
                cursor: 'pointer',
                background: '#EFF6FF',
                color: '#2563EB',
                border: '1px solid #BFDBFE',
                padding: '6px 16px',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              📷 {avatarFile ? 'Change Photo' : 'Upload Profile Photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    setError('Image must be less than 5MB');
                    return;
                  }
                  setAvatarFile(file);
                  const reader = new FileReader();
                  reader.onload = (evt) => setAvatarPreview(evt.target?.result as string);
                  reader.readAsDataURL(file);
                  setError('');
                }}
              />
            </label>
            <p style={{ fontSize: '0.71rem', color: '#94A3B8', margin: 0 }}>JPEG, PNG or WEBP · Max 5MB</p>
          </div>

          {/* Full Name */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Full Name
            </label>
            <input
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '0.9rem',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Mobile */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Mobile Number <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="tel"
              placeholder="9876543210"
              value={phone}
              maxLength={14}
              onChange={e => { setPhone(e.target.value); setPhoneError(''); }}
              onBlur={() => phone && validatePhone(phone)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: `1px solid ${phoneError ? '#EF4444' : '#CBD5E1'}`,
                fontSize: '0.9rem',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            {phoneError && <p style={{ fontSize: '0.74rem', color: '#EF4444', marginTop: '4px', marginBottom: 0 }}>{phoneError}</p>}
            <p style={{ fontSize: '0.71rem', color: '#94A3B8', marginTop: '4px', marginBottom: 0 }}>Exactly 10 digits</p>
          </div>

          {/* Account info */}
          <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '0.79rem', color: '#475569' }}>
            <div>🏢 <strong>Role:</strong> {session.role.charAt(0).toUpperCase() + session.role.slice(1)}</div>
            <div style={{ marginTop: '4px' }}>📧 <strong>Email:</strong> {session.email}</div>
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', padding: '10px 14px', fontSize: '0.8rem', color: '#DC2626' }}>
              {error}
            </div>
          )}
          </div>

          {/* ── Fixed Footer ─────────────────────────────────────────────── */}
          <div
            style={{
              padding: '14px 24px 20px',
              borderTop: '1px solid #F1F5F9',
              display: 'flex',
              gap: '10px',
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={handleSkip}
              style={{
                flex: 1,
                background: 'white',
                color: '#64748B',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                padding: '11px',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Do It Later
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 2,
                background: saving ? '#93C5FD' : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '11px',
                fontSize: '0.86rem',
                fontWeight: 800,
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: saving ? 'none' : '0 4px 14px rgba(37,99,235,0.22)',
                fontFamily: 'inherit',
              }}
            >
              {saving ? '⏳ Saving...' : '✓ Save & Enter Dashboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
