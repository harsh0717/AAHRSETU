'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { login, getSession } from '@/lib/auth';
import { api } from '@/lib/api';
import { useI18n, LangCode } from '@/lib/i18n';
import { LANGUAGES, DEPARTMENTS } from '@/lib/constants';
import BrandLogo from '@/components/BrandLogo';
import UiverseButton from '@/components/ui/UiverseButton';
import AppIcon from '@/components/ui/AppIcon';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import { isDemoAccountsEnabled } from '@/lib/systemSettings';
import styles from './login.module.css';

const ROLES_LIST = [
  { id: 'coordinator', label: 'Coordinator', icon: 'coordinator', desc: 'Draft department requests' },
  { id: 'principal', label: 'Principal', icon: 'principal', desc: 'Oversee & approve department bills' },
  { id: 'dcr', label: 'DCR Auditor', icon: 'dcr', desc: 'Audit budgets & settle accounts' },
  { id: 'vendor', label: 'Canteen Vendor', icon: 'vendor', desc: 'Update prices & settle kitchen orders' },
  { id: 'admin', label: 'System Admin', icon: 'admin', desc: 'Configure users & system baseline' },
];

const DEMO_ACCOUNTS = [
  { label: 'System Admin', email: 'admin@aharsetu.edu.in', password: 'Admin@123', role: 'admin', department_id: null, icon: 'admin' },
  { label: 'DCR Auditor', email: 'dcr@aharsetu.edu.in', password: 'DCR@123', role: 'dcr', department_id: null, icon: 'dcr' },
  { label: 'Principal (DD)', email: 'principal.dd@aharsetu.edu.in', password: 'Principal@123', role: 'principal', department_id: 'diploma', icon: 'principal' },
  { label: 'Principal (Pharma)', email: 'principal.pharma@aharsetu.edu.in', password: 'Principal@123', role: 'principal', department_id: 'pharmacy', icon: 'principal' },
  { label: 'Coordinator (Diploma)', email: 'coord.diploma@aharsetu.edu.in', password: 'Coord@123', role: 'coordinator', department_id: 'diploma', icon: 'coordinator' },
  { label: 'Coordinator (Degree)', email: 'coord.degree@aharsetu.edu.in', password: 'Coord@123', role: 'coordinator', department_id: 'degree', icon: 'coordinator' },
  { label: 'Sharma Canteen', email: 'vendor1@aharsetu.edu.in', password: 'Vendor@123', role: 'vendor', department_id: null, icon: 'vendor' },
  { label: 'Fresh Bites Canteen', email: 'vendor2@aharsetu.edu.in', password: 'Vendor@123', role: 'vendor', department_id: null, icon: 'vendor' },
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

export default function LoginPage() {
  const router = useRouter();
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
    setDemoAccountsEnabled(isDemoAccountsEnabled());

    const handleSettingsChange = (e: any) => {
      if (e.detail && typeof e.detail.demo_accounts_enabled === 'boolean') {
        setDemoAccountsEnabled(e.detail.demo_accounts_enabled);
      } else {
        setDemoAccountsEnabled(isDemoAccountsEnabled());
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('aharsetu_settings_changed', handleSettingsChange);
      window.addEventListener('storage', handleSettingsChange);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('aharsetu_settings_changed', handleSettingsChange);
        window.removeEventListener('storage', handleSettingsChange);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ret = params.get('returnTo');
      const session = getSession();
      if (session?.role) {
        if (ret && ret.startsWith('/')) {
          router.replace(ret);
        } else {
          router.replace('/' + session.role);
        }
      }
    }
  }, [router]);

  const deptRequired = ['coordinator', 'principal'].includes(role);

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

    let returnTo: string | null = null;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      returnTo = params.get('returnTo');
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
      
      <section className={styles.hero}>
        <Image
          src="/images/campus_dining_hero_v3.webp"
          alt="Campus Food Platform"
          fill
          priority
          fetchPriority="high"
          quality={80}
          sizes="(max-width: 992px) 1px, 45vw"
          className={styles.heroBgImage}
        />
        <div className={styles.heroOverlay} />

        <div className={styles.heroHeader}>
          <div className={styles.heroLogoGlassWrapper}>
            <BrandLogo size={56} />
          </div>
          
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
        </div>

        <div className={styles.heroFooter}>
          © 2026 {formatBrandText('AharSetu', lang)}. All rights reserved.
        </div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.formCard}>
          
          <div className={styles.stepsHeader}>
            <div className={styles.stepItem}>
              <div className={`${styles.stepNumber} ${activeStep >= 1 ? styles.stepActive : ''}`}>
                {activeStep > 1 ? '✓' : '1'}
              </div>
              <span className={styles.stepLabel}>{t('login.step_role', 'Select Role')}</span>
            </div>
            <div className={`${styles.stepDivider} ${activeStep >= 2 ? styles.dividerActive : ''}`} />
            <div className={styles.stepItem}>
              <div className={`${styles.stepNumber} ${activeStep >= 2 ? styles.stepActive : ''}`}>
                {activeStep > 2 ? '✓' : '2'}
              </div>
              <span className={styles.stepLabel}>
                {deptRequired ? t('login.step_dept', 'Department') : t('login.step_auth', 'Authenticate')}
              </span>
            </div>
            <div className={`${styles.stepDivider} ${activeStep >= 3 ? styles.dividerActive : ''}`} />
            <div className={styles.stepItem}>
              <div className={`${styles.stepNumber} ${activeStep >= 3 ? styles.stepActive : ''}`}>
                3
              </div>
              <span className={styles.stepLabel}>
                {deptRequired ? t('login.step_auth', 'Authenticate') : t('login.step_ready', 'Access')}
              </span>
            </div>
          </div>

          <div className={styles.formTitleGroup}>
            <h1 className={styles.title}>{t('auth.welcome_back', 'Welcome Back')}</h1>
            <p className={styles.subtitle}>{t('auth.sign_in_desc', 'Authenticate using your institutional profile credentials')}</p>
          </div>

          {error && (
            <div className={styles.alertError}>
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>{t('login.choose_role', '1. Select Your Portal Role')}</label>
              <div className={styles.roleGrid}>
                {ROLES_LIST.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setRole(r.id);
                      setError('');
                      if (!['coordinator', 'principal'].includes(r.id)) {
                        setDepartmentId('');
                      }
                    }}
                    className={`${styles.roleCard} ${role === r.id ? styles.roleActive : ''}`}
                  >
                    <div className={styles.roleCardIcon}>
                      <AppIcon name={r.icon as any} size={20} />
                    </div>
                    <div className={styles.roleCardText}>
                      <div className={styles.roleCardTitle}>{t(`roles.${r.id}`, r.label)}</div>
                      <div className={styles.roleCardDesc}>{r.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {deptRequired && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="dept-select">
                  {t('login.select_dept', '2. Select Department')}
                </label>
                <div className={styles.selectWrapper}>
                  <select
                    id="dept-select"
                    value={departmentId}
                    onChange={(e) => {
                      setDepartmentId(e.target.value);
                      setError('');
                    }}
                    className={styles.select}
                  >
                    <option value="">{t('login.choose_department_placeholder', '-- Choose Department --')}</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.icon} {t(`departments.${d.id}`, d.name)} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

              {/* Email */}
              <div className={styles.inputField}>
                <div className={styles.inputBox}>
                  <span className={styles.inputIcon} style={{ display: 'flex', alignItems: 'center' }}>
                    <AppIcon name="profile" size={18} color="#94A3B8" />
                  </span>
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
                  <span className={styles.inputIcon} style={{ display: 'flex', alignItems: 'center' }}>
                    <AppIcon name="settings" size={18} color="#94A3B8" />
                  </span>
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
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <AppIcon name={showPass ? 'eye_off' : 'eye'} size={18} color="#64748B" />
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
                <span>{t('login.remember_device', 'Remember this device')}</span>
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
                      <span className={styles.demoIcon} style={{ display: 'flex', alignItems: 'center' }}>
                        <AppIcon name={acc.icon} size={20} color="#2563EB" />
                      </span>
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

      <PwaInstallPrompt />
    </div>
  );
}
