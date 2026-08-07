'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, getSession } from '@/lib/auth';
import { initSeedData } from '@/lib/store';
import { initUsersIfNeeded } from '@/lib/auth';
import { initVendorsIfNeeded } from '@/lib/vendors';
import { useI18n } from '@/lib/i18n';
import { LANGUAGES } from '@/lib/constants';
import styles from './login.module.css';

const DEMO_ACCOUNTS = [
  { label: 'System Admin',         email: 'admin@aharsetu.edu.in',          password: 'Admin@123',     role: 'admin',       icon: '⚙️' },
  { label: 'DCR',                  email: 'dcr@aharsetu.edu.in',            password: 'DCR@123',       role: 'dcr',         icon: '📋' },
  { label: 'Principal (Diploma & Degree)', email: 'principal.dd@aharsetu.edu.in', password: 'Principal@123', role: 'principal', icon: '🎓' },
  { label: 'Principal (Pharmacy)', email: 'principal.pharma@aharsetu.edu.in', password: 'Principal@123', role: 'principal', icon: '🎓' },
  { label: 'Coordinator (Diploma)',email: 'coord.diploma@aharsetu.edu.in',  password: 'Coord@123',     role: 'coordinator', icon: '👤' },
  { label: 'Coordinator (Degree)', email: 'coord.degree@aharsetu.edu.in',   password: 'Coord@123',     role: 'coordinator', icon: '👤' },
  { label: 'Vendor 1 (Sharma Canteen)', email: 'vendor1@aharsetu.edu.in',   password: 'Vendor@123',   role: 'vendor',      icon: '🍽️' },
  { label: 'Vendor 2 (Fresh Bites)', email: 'vendor2@aharsetu.edu.in',      password: 'Vendor@123',   role: 'vendor',      icon: '🍽️' },
];

export default function LoginPage() {
  const router = useRouter();
  const { t, lang, setLang } = useI18n();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    initSeedData();
    initUsersIfNeeded();
    initVendorsIfNeeded();
    const session = getSession();
    if (session?.role) router.replace('/' + session.role);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError(t('auth.required_email')); return; }
    if (!password.trim()) { setError(t('auth.required_password')); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 300)); // small delay for UX
    const result = login(email, password);
    setLoading(false);
    if (!result.success) { setError(t(result.error)); return; }
    router.push('/' + result.user.role);
  }

  function fillDemo(account) {
    setEmail(account.email);
    setPassword(account.password);
    setShowDemo(false);
    setError('');
  }

  const ROLE_COLORS_MAP = { admin: '#DC2626', dcr: '#D97706', principal: '#7C3AED', coordinator: '#2563EB', vendor: '#059669' };

  return (
    <div className={styles.page}>
      {/* Left panel */}
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroLogo}>🍱</div>
          <h1 className={styles.heroTitle}>AharSetu</h1>
          <p className={styles.heroSub}>Canteen Order Management ERP for Modern Educational Institutions</p>

          <div className={styles.heroFeatures}>
            {[
              ['🔐', 'Secure role-based access for 5 roles'],
              ['📋', 'Multi-step approval workflow'],
              ['🏪', 'Multi-vendor order management'],
              ['🌐', 'Multilingual — EN / हिं / ગુ'],
            ].map(([icon, text]) => (
              <div key={text} className={styles.heroFeature}>
                <span>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Language switcher */}
          <div className={styles.langRow}>
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setLang(l.code)} className={styles.langBtn}
                style={{ background: lang === l.code ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)', color: lang === l.code ? '#1E3A8A' : 'white' }}>
                {l.nativeLabel}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className={styles.formPanel}>
        <div className={styles.formCard}>
          {/* Card header */}
          <div className={styles.cardHeader}>
            <div className={styles.cardLogo}>🍱</div>
            <h2 className={styles.cardTitle}>{t('auth.login')}</h2>
            <p className={styles.cardSub}>{t('auth.subtitle')}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>{t('auth.email')}</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}>✉️</span>
                <input
                  type="email"
                  id="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('auth.email_placeholder')}
                  className={styles.input}
                  disabled={loading}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t('auth.password')}</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}>🔒</span>
                <input
                  type={showPass ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('auth.password_placeholder')}
                  className={styles.input}
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowPass(p => !p)} className={styles.togglePass}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div className={styles.errorBanner}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? (
                <span className={styles.spinner}>⏳ {t('auth.logging_in')}</span>
              ) : (
                `→ ${t('auth.sign_in')}`
              )}
            </button>

            <button type="button" onClick={() => setShowDemo(d => !d)} className={styles.demoToggle}>
              🔑 {t('auth.demo_accounts')}
            </button>
          </form>

          {/* Demo Accounts */}
          {showDemo && (
            <div className={styles.demoList}>
              <div className={styles.demoTitle}>{t('auth.demo_accounts')}</div>
              {DEMO_ACCOUNTS.map(acc => (
                <button key={acc.email} onClick={() => fillDemo(acc)} className={styles.demoItem}>
                  <span style={{ fontSize: '1.1rem' }}>{acc.icon}</span>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{acc.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{acc.email}</div>
                  </div>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                    background: ROLE_COLORS_MAP[acc.role] + '22',
                    color: ROLE_COLORS_MAP[acc.role],
                  }}>
                    {acc.role}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
