'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { login, getSession } from '@/lib/auth';
import { api } from '@/lib/api';
import { useI18n, LangCode } from '@/lib/i18n';
import { LANGUAGES, DEPARTMENTS } from '@/lib/constants';
import BrandLogo from '@/components/BrandLogo';
import UiverseButton from '@/components/ui/UiverseButton';
import styles from './login.module.css';

const ROLES_LIST = [
  { id: 'coordinator', label: 'Coordinator', icon: '👤', desc: 'Draft department requests' },
  { id: 'principal', label: 'Principal', icon: '🎓', desc: 'Oversee & approve department bills' },
  { id: 'dcr', label: 'DCR Auditor', icon: '📋', desc: 'Audit budgets & settle accounts' },
  { id: 'vendor', label: 'Canteen Vendor', icon: '🍽️', desc: 'Update prices & settle kitchen orders' },
  { id: 'admin', label: 'System Admin', icon: '⚙️', desc: 'Configure users & system baseline' },
];

const DEMO_ACCOUNTS = [
  { label: 'System Admin', email: 'admin@aharsetu.edu.in', password: 'Admin@123', role: 'admin', department_id: null, icon: '⚙️' },
  { label: 'DCR Auditor', email: 'dcr@aharsetu.edu.in', password: 'DCR@123', role: 'dcr', department_id: null, icon: '📋' },
  { label: 'Principal (DD)', email: 'principal.dd@aharsetu.edu.in', password: 'Principal@123', role: 'principal', department_id: 'diploma', icon: '🎓' },
  { label: 'Principal (Pharma)', email: 'principal.pharma@aharsetu.edu.in', password: 'Principal@123', role: 'principal', department_id: 'pharmacy', icon: '🎓' },
  { label: 'Coordinator (Diploma)', email: 'coord.diploma@aharsetu.edu.in', password: 'Coord@123', role: 'coordinator', department_id: 'diploma', icon: '👤' },
  { label: 'Coordinator (Degree)', email: 'coord.degree@aharsetu.edu.in', password: 'Coord@123', role: 'coordinator', department_id: 'degree', icon: '👤' },
  { label: 'Sharma Canteen', email: 'vendor1@aharsetu.edu.in', password: 'Vendor@123', role: 'vendor', department_id: null, icon: '🍽️' },
  { label: 'Fresh Bites Canteen', email: 'vendor2@aharsetu.edu.in', password: 'Vendor@123', role: 'vendor', department_id: null, icon: '🍽️' },
];

function formatBrandText(text: string, currentLang: string = 'en') {
  if (!text) return null;

  // Language-aware suffix:
  // If language is Gujarati ('gu') -> 'સેતુ'
  // If language is Hindi ('hi') or English ('en') -> 'सेतु' (English defaults to Hindi 'सेतु' as requested)
  const setuSuffix = currentLang === 'gu' ? 'સેતુ' : 'सेतु';
  const fontFamily = currentLang === 'gu'
    ? "'Noto Sans Gujarati', 'Gujarati Sangam MN', sans-serif"
    : "'Noto Serif Devanagari', 'Noto Sans Devanagari', 'Mukta', 'Inter', sans-serif";

  const brandRegex = /(AaharSetu|AharSetu|Aaharसेतु|Aharसेतु|Aaharસેતુ|Aharસેતુ|Setu|સેતુ|सेतु)/g;

  if (brandRegex.test(text)) {
    const parts = text.split(brandRegex);
    return (
      <>
        {parts.map((part, idx) => {
          if (part.match(/^(AaharSetu|AharSetu|Aaharसेतु|Aharसेतु|Aaharસેતુ|Aharસેતુ)$/)) {
            return (
              <span key={idx} style={{ display: 'inline-flex', alignItems: 'baseline' }}>
                Aahar
                <span
                  style={{
                    fontSize: '0.86em',
                    color: '#EA580C',
                    fontFamily,
                    fontWeight: 900,
                    marginLeft: '2px',
                    verticalAlign: 'baseline',
                    display: 'inline-block'
                  }}
                >
                  {setuSuffix}
                </span>
              </span>
            );
          }
          if (part.match(/^(Setu|સેતુ|सेतु)$/)) {
            return (
              <span
                key={idx}
                style={{
                  fontSize: '0.86em',
                  color: '#D97706',
                  fontFamily,
                  fontWeight: 900,
                  marginLeft: '2px',
                  verticalAlign: 'baseline',
                  display: 'inline-block'
                }}
              >
                {setuSuffix}
              </span>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </>
    );
  }

  return text;
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams ? searchParams.get('returnTo') : null;
  const { t, lang, setLang } = useI18n();

  // Multi-step form states
  const [role, setRole] = useState('coordinator');
  const [departmentId, setDepartmentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [demoAccountsEnabled, setDemoAccountsEnabled] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get<{ demo_accounts_enabled: boolean }>('/settings/public');
        setDemoAccountsEnabled(res.demo_accounts_enabled);
        if (typeof window !== 'undefined') {
          localStorage.setItem('aharsetu_demo_enabled', res.demo_accounts_enabled ? 'true' : 'false');
        }
      } catch (e) {
        console.warn('[LOGIN] Offline or system settings error:', e);
      }
    }
    loadSettings();
  }, []);

  useEffect(() => {
    const session = getSession();
    if (session?.role) {
      if (returnTo && returnTo.startsWith('/')) {
        router.replace(returnTo);
      } else {
        router.replace('/' + session.role);
      }
    }
  }, [router, returnTo]);

  const deptRequired = ['coordinator', 'principal'].includes(role);

  // Compute active step index for progress tracker header
  let activeStep = 1;
  if (role) {
    if (deptRequired) {
      if (departmentId) activeStep = 3;
      else activeStep = 2;
    } else {
      activeStep = 3;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (deptRequired && !departmentId) {
      setError('Department selection is required for coordinators and principals.');
      return;
    }
    if (!email.trim()) {
      setError(t('auth.required_email'));
      return;
    }
    if (!password.trim()) {
      setError(t('auth.required_password'));
      return;
    }

    setLoading(true);
    const result = await login({
      role,
      department_id: deptRequired ? departmentId : null,
      email: email.trim(),
      password: password.trim(),
      remember_device: rememberDevice,
    });
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Invalid credentials or validation parameters.');
      return;
    }

    if (returnTo && returnTo.startsWith('/')) {
      router.push(returnTo);
    } else {
      router.push('/' + result.user?.role);
    }
  }

  function fillDemo(account: any) {
    setRole(account.role);
    setDepartmentId(account.department_id || '');
    setEmail(account.email);
    setPassword(account.password);
    setShowDemo(false);
    setError('');
  }

  return (
    <div className={styles.page}>
      
      {/* 1. Left Panel - Creative Hero */}
      <section className={styles.hero}>
        <div className={styles.heroHeader}>
          <BrandLogo size={64} />
          
          <div className={styles.langRow}>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code as LangCode)}
                className={`${styles.langBtn} ${lang === l.code ? styles.langActive : ''}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>{t('login.hero_badge', '🍱 Campus Food Platform')}</span>
          <h2 className={styles.heroTitle}>
            {t('login.hero_title', 'Good Food.')}<br />
            <span>{t('login.hero_title_span', 'Better Campus.')}</span>
          </h2>
          <p className={styles.heroSub}>
            {t('login.hero_sub', 'Connecting People Through Better Food.')}
          </p>

          <div className={styles.featuresGrid}>
            {[
              { icon: '🍕', tag: 'CHEF\'S SPECIAL', title: 'Artisanal Pepperoni Pizza', price: '₹120', vendor: 'Fresh Bites Canteen' },
              { icon: '🍔', tag: 'POPULAR TODAY', title: 'Gourmet Cheeseburger & Fries', price: '₹95', vendor: 'Fresh Bites Canteen' },
              { icon: '🍵', tag: 'MORNING REFRESHMENT', title: 'Masala Tea & Samosa', price: '₹25', vendor: 'Sharma Canteen' },
            ].map((f, idx) => (
              <div key={idx} className={styles.featureCard} style={{
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '16px',
                padding: '14px 18px',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap', width: '100%' }}>
                  <div style={{ fontSize: '2rem', background: 'rgba(255, 255, 255, 0.2)', padding: '8px', borderRadius: '12px', flexShrink: 0 }}>{f.icon}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#F59E0B', letterSpacing: '0.05em' }}>{f.tag}</div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>🏪 {f.vendor}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.heroFooter}>
          © 2026 {formatBrandText('AharSetu', lang)}. All rights reserved.
        </div>
      </section>

      {/* 2. Right Panel - Form Interface */}
      <section className={styles.formPanel}>
        <div className={styles.formCard}>
          
          {/* Progress Steps Header */}
          <div className={styles.stepsHeader}>
            <div className={styles.stepNode}>
              <div className={`${styles.stepCircle} ${activeStep >= 1 ? styles.stepActiveCircle : ''} ${activeStep > 1 ? styles.stepDoneCircle : ''}`}>
                {activeStep > 1 ? '✓' : '1'}
              </div>
              <span className={`${styles.stepLabel} ${activeStep === 1 ? styles.stepActiveLabel : ''}`}>{t('common.role', 'Role')}</span>
            </div>
            <div className={styles.stepNode}>
              <div className={`${styles.stepCircle} ${activeStep >= 2 ? styles.stepActiveCircle : ''} ${activeStep > 2 ? styles.stepDoneCircle : ''}`}>
                {activeStep > 2 ? '✓' : '2'}
              </div>
              <span className={`${styles.stepLabel} ${activeStep === 2 ? styles.stepActiveLabel : ''}`}>{t('common.department', 'Dept')}</span>
            </div>
            <div className={styles.stepNode}>
              <div className={`${styles.stepCircle} ${activeStep >= 3 ? styles.stepActiveCircle : ''}`}>
                3
              </div>
              <span className={`${styles.stepLabel} ${activeStep === 3 ? styles.stepActiveLabel : ''}`}>Verify</span>
            </div>
          </div>

          <div className={styles.formHeader}>
            <h3 className={styles.formTitle}>
              {formatBrandText(t('login.welcome_title', 'Welcome to AharSetu'), lang)}
            </h3>
            <p className={styles.formSub}>{t('login.welcome_sub', 'Authenticate using your institutional profile credentials')}</p>
          </div>

          {error && (
            <div className={styles.errorBanner}>
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Role Selection Grid */}
            <div style={{ marginBottom: '20px' }}>
              <label className={styles.inputLabel}>{t('login.step1_title', 'Step 1: Choose Your Role')}</label>
              <div className={styles.roleGrid}>
                {ROLES_LIST.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      setRole(r.id);
                      setDepartmentId('');
                    }}
                    className={`${styles.roleCard} ${role === r.id ? styles.roleSelected : ''}`}
                  >
                    {role === r.id && <span className={styles.roleSelectedIcon}>✓</span>}
                    <div className={styles.roleIcon}>{r.icon}</div>
                    <div className={styles.roleName}>{t(`role.${r.id}`, r.label)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Department Selection Chips */}
            {deptRequired && (
              <div style={{ marginBottom: '20px', animation: 'slideDown 0.2s ease-out' }}>
                <label className={styles.inputLabel}>{t('login.step2_title', 'Step 2: Choose Department')}</label>
                <div className={styles.deptGrid}>
                  {DEPARTMENTS.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => setDepartmentId(d.id)}
                      className={`${styles.deptChip} ${departmentId === d.id ? styles.deptSelected : ''}`}
                    >
                      {t(`dept.${d.id}`, d.name)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Credentials fields */}
            <div style={{ marginBottom: '24px' }}>
              <label className={styles.inputLabel}>
                {deptRequired ? t('login.step3_title', 'Step 3: Enter Credentials') : t('login.step2_cred_title', 'Step 2: Enter Credentials')}
              </label>

              {/* Email */}
              <div className={styles.inputField}>
                <div className={styles.inputBox}>
                  <span className={styles.inputIcon}>👤</span>
                  <input
                    type="email"
                    placeholder={t('login.email_ph', 'Institutional Email (e.g. name@aharsetu.edu.in)')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className={styles.inputField} style={{ marginBottom: 0 }}>
                <div className={styles.inputBox}>
                  <span className={styles.inputIcon}>🔑</span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder={t('login.pass_ph', 'Verification Password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.input}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className={styles.togglePassBtn}
                  >
                    {showPass ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {/* Remember this device */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#475569', cursor: 'pointer', marginTop: '12px' }}>
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  style={{ width: '16px', height: '16px', borderRadius: '4px', accentColor: '#2563EB' }}
                />
                <span>Remember this device</span>
              </label>
            </div>

            <UiverseButton
              type="submit"
              size="lg"
              isLoading={loading}
              variant="primary"
              style={{ width: '100%', marginTop: '8px' }}
            >
              {t('login.secure_btn', 'Secure Log In')}
            </UiverseButton>
          </form>

          {/* Quick-Access Demo Accounts Selector */}
          {demoAccountsEnabled && (
            <div className={styles.demoSection}>
              <button
                type="button"
                onClick={() => setShowDemo(!showDemo)}
                className={styles.demoTrigger}
              >
                {showDemo ? t('login.demo_btn_close', '✕ Close Demo Board') : t('login.demo_btn_open', '🔑 Quick Access Demo Accounts')}
              </button>

              {showDemo && (
                <div className={styles.demoGrid}>
                  {DEMO_ACCOUNTS.map((acc, idx) => (
                    <div
                      key={idx}
                      onClick={() => fillDemo(acc)}
                      className={styles.demoCard}
                    >
                      <span className={styles.demoIcon}>{acc.icon}</span>
                      <div className={styles.demoMeta}>
                        <h5>{acc.label}</h5>
                        <p>{acc.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </section>
      
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FAFAF9' }}>
        <div style={{ textAlign: 'center', color: 'var(--gray-500)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '8px', animation: 'spin 1s infinite linear' }}>🔄</div>
          <div>Loading AaharSetu Portal...</div>
        </div>
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}
