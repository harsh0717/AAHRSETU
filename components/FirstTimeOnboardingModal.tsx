'use client';
import { useState, useEffect } from 'react';
import { getSession, uploadAvatar, updateUserProfile, UserProfile } from '@/lib/auth';

export default function FirstTimeOnboardingModal() {
  const [showModal, setShowModal] = useState(false);
  const [session, setSession] = useState<UserProfile | null>(null);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const s = getSession();
    if (!s) return;

    // Check backend-sourced profile_setup_completed flag
    // If false (or undefined for legacy users), show the modal
    if (s.profile_setup_completed === false || s.profile_setup_completed === undefined) {
      setSession(s);
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

  const handleSkip = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    const digits = phone.replace(/\D/g, '');
    if (phone && !validatePhone(phone)) return;

    setSaving(true);
    setError('');

    try {
      // Upload avatar if selected
      if (avatarFile) {
        await uploadAvatar(avatarFile);
      }

      // Save mobile number and mark profile setup as complete
      await updateUserProfile({
        mobile_number: digits || null,
        profile_setup_completed: true,
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
        border: '1px solid #E2E8F0',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '6px' }}>👋</div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Welcome, {session.name}!
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '4px 0 0 0' }}>
              Set up your profile to get started. You can update these details anytime.
            </p>
          </div>
          <button
            onClick={handleSkip}
            style={{
              background: 'none',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#64748B',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              marginLeft: '12px'
            }}
          >
            Skip for Now
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Avatar Upload */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '2.2rem',
              fontWeight: 800,
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              border: '3px solid white',
              outline: '2px solid #BFDBFE'
            }}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                session.name[0]?.toUpperCase()
              )}
            </div>

            <label style={{
              cursor: 'pointer',
              background: '#EFF6FF',
              color: '#2563EB',
              border: '1px solid #BFDBFE',
              padding: '7px 16px',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              📷 {avatarFile ? 'Change Photo' : 'Upload Profile Photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      setError('Image must be less than 5MB');
                      return;
                    }
                    setAvatarFile(file);
                    const reader = new FileReader();
                    reader.onload = (evt) => setAvatarPreview(evt.target?.result as string);
                    reader.readAsDataURL(file);
                    setError('');
                  }
                }}
              />
            </label>
            <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: 0 }}>JPEG, PNG or WEBP • Max 5MB</p>
          </div>

          {/* Phone */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Mobile Number <span style={{ color: '#94A3B8', fontWeight: 500 }}>(optional)</span>
            </label>
            <input
              type="tel"
              placeholder="9876543210"
              value={phone}
              onChange={e => {
                setPhone(e.target.value);
                setPhoneError('');
              }}
              onBlur={() => phone && validatePhone(phone)}
              maxLength={14}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: `1px solid ${phoneError ? '#EF4444' : '#CBD5E1'}`,
                fontSize: '0.9rem',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
            {phoneError && <p style={{ fontSize: '0.76rem', color: '#EF4444', marginTop: '4px' }}>{phoneError}</p>}
            <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '4px' }}>Enter exactly 10 digits</p>
          </div>

          {/* Account info */}
          <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '0.8rem', color: '#475569' }}>
            <div>🏢 <strong>Role:</strong> {session.role.charAt(0).toUpperCase() + session.role.slice(1)}</div>
            <div style={{ marginTop: '4px' }}>📧 <strong>Email:</strong> {session.email}</div>
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', padding: '10px 14px', fontSize: '0.8rem', color: '#DC2626' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
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
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 2,
                background: saving ? '#93C5FD' : '#2563EB',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '11px',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                fontFamily: 'inherit'
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
