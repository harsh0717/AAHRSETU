'use client';

import React, { useState } from 'react';
import { changeUserPassword } from '@/lib/auth';

export default function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match. Please re-type accurately.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password cannot be identical to your current password.');
      return;
    }

    setLoading(true);
    try {
      const res = await changeUserPassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      if (res.success) {
        setSuccess('✓ Password updated successfully! Your new password is now active.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(res.message || 'Failed to change password.');
      }
    } catch (err: any) {
      setError(err?.message || 'Current password entered is incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: '24px', padding: '24px', background: 'var(--surface-0)', borderRadius: '20px', border: '1px solid var(--gray-200)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--gray-200)' }}>
        <div style={{ fontSize: '1.25rem' }}>🔐</div>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: 'var(--gray-900)' }}>Security & Password</h4>
          <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--gray-500)' }}>Update your account password for secure portal access</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚠️</span> {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '10px 14px', background: '#F0FDF4', border: '1px solid #86EFAC', color: '#16A34A', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✓</span> {success}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Current Password */}
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Current Password</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type={showCurrent ? 'text' : 'password'}
              className="form-input"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              placeholder="Enter your current password"
              style={{ width: '100%', paddingRight: '42px' }}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--gray-500)' }}
              title={showCurrent ? 'Hide password' : 'Show password'}
            >
              {showCurrent ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>New Password</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type={showNew ? 'text' : 'password'}
              className="form-input"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              placeholder="Min 6 characters (e.g. Pass@123)"
              style={{ width: '100%', paddingRight: '42px' }}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--gray-500)' }}
              title={showNew ? 'Hide password' : 'Show password'}
            >
              {showNew ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Confirm New Password</label>
          <input
            type={showNew ? 'text' : 'password'}
            className="form-input"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            placeholder="Re-enter new password"
            style={{ width: '100%' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !currentPassword || !newPassword || !confirmPassword}
          className="btn btn-primary"
          style={{
            marginTop: '8px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: 800,
            fontSize: '0.84rem',
            borderRadius: '10px'
          }}
        >
          {loading ? 'Updating Password...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}
