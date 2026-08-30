'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, getSession, UserProfile } from '@/lib/auth';
import { useI18n, LangCode } from '@/lib/i18n';
import { LANGUAGES, DEPARTMENTS } from '@/lib/constants';
import BrandLogo from '@/components/BrandLogo';
import ThemeToggle from '@/components/ThemeToggle';
import UiverseButton from '@/components/ui/UiverseButton';
import AppIcon from '@/components/ui/AppIcon';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import styles from './login.module.css';

const ROLES_LIST = [
  { id: 'coordinator', label: 'Coordinator', icon: 'coordinator', desc: 'Draft department requests' },
  { id: 'principal', label: 'Principal', icon: 'principal', desc: 'Oversee & approve department bills' },
  { id: 'dcr', label: 'Administration', icon: 'dcr', desc: 'Audit budgets & settle accounts' },
  { id: 'vendor', label: 'Canteen Vendor', icon: 'vendor', desc: 'Update prices & settle kitchen orders' },
  { id: 'admin', label: 'System Admin', icon: 'admin', desc: 'Configure users & system baseline' },
];

const QUICK_TEST_ACCOUNTS = [
  { label: 'System Admin', name: 'Vin Sir', email: 'admin@aharsetu.edu.in', password: 'Admin@123', role: 'admin', department_id: null, icon: 'admin' },
  { label: 'Administration', name: 'Neha Mam', email: 'dcr@aharsetu.edu.in', password: 'DCR@123', role: 'dcr', department_id: null, icon: 'dcr' },
  { label: 'Principal (DD)', name: 'Pranav Sir', email: 'principal.dd@aharsetu.edu.in', password: 'Principal@123', role: 'principal', department_id: 'diploma', icon: 'principal' },
  { label: 'Principal (Pharma)', name: 'Sachin Sir', email: 'principal.pharma@aharsetu.edu.in', password: 'Principal@123', role: 'principal', department_id: 'pharmacy', icon: 'principal' },
  { label: 'Coordinator (Diploma)', name: 'Nandini Mam', email: 'coord.diploma@aharsetu.edu.in', password: 'Coord@123', role: 'coordinator', department_id: 'diploma', icon: 'coordinator' },
  { label: 'Coordinator (Degree)', name: 'Piyush Sir', email: 'coord.degree@aharsetu.edu.in', password: 'Coord@123', role: 'coordinator', department_id: 'degree', icon: 'coordinator' },
  { label: 'Sharma Canteen', name: 'Gadhvi Bhai', email: 'vendor1@aharsetu.edu.in', password: 'Vendor@123', role: 'vendor', department_id: null, icon: 'vendor' },
  { label: 'Fresh Bites Canteen', name: 'Mitesh Bhai', email: 'vendor2@aharsetu.edu.in', password: 'Vendor@123', role: 'vendor', department_id: null, icon: 'vendor' },
];

function formatBrandText(text: string, currentLang: string = 'en') {
  if (!text) return null;

  // Language-aware suffix:
  // If language is Gujarati ('gu') -> 'સેતુ'
  // If language is Hindi ('hi') or English ('en') -> 'सेતુ' (English defaults to Hindi 'सेતુ' as requested)
  const setuSuffix = currentLang === 'gu' ? 'સેતુ' : 'सेતુ';
  const fontFamily = currentLang === 'gu'
    ? "'Noto Sans Gujarati', 'Gujarati Sangam MN', sans-serif"
    : "'Noto Serif Devanagari', 'Noto Sans Devanagari', 'Mukta', 'Inter', sans-serif";

  const brandRegex = /(AaharSetu|AharSetu|Aaharसेતુ|Aharसेતુ|Aaharસેતુ|Aharસેતુ|Setu|સેતુ|सेतु)/g;

  if (brandRegex.test(text)) {
    const parts = text.split(brandRegex);
    return (
      <>
        {parts.map((part, idx) => {
          if (part.match(/^(AaharSetu|AharSetu|Aaharसेતુ|Aharसेતુ|Aaharસેતુ|Aharસેતુ)$/)) {
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
  const [directoryUsers, setDirectoryUsers] = useState<UserProfile[]>([]);

  function fillDemo(account: any) {
    setRole(account.role === 'administration' ? 'dcr' : account.role);
    setDepartmentId(account.department_id || '');
    setEmail(account.email);
    setPassword(account.password);
    setShowDemo(false);
    setError('');
  }

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
      
      // Load live users from DB directory to reflect updated names on all devices
      import('@/lib/auth').then(({ getUsers }) => {
        getUsers().then(users => {
          if (Array.isArray(users) && users.length > 0) {
            setDirectoryUsers(users);
          }
        }).catch(() => {});
      });
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

  return (
    <div className={styles.page}>
      
      <section className={styles.hero}>
        {/* Subtle ambient backdrop glows with Emerald Green and Navy Blue */}
        <div className={styles.heroGlowTop} aria-hidden="true" />
        <div className={styles.heroGlowBottom} aria-hidden="true" />

        {/* Decorative rotating background geometry */}
        <div className={styles.heroRing1} aria-hidden="true" />
        <div className={styles.heroRing2} aria-hidden="true" />

        {/* ── Brand Logo Header & Quick Navigation ── */}
        <div className={styles.heroHeader}>
          <div className={styles.heroLogoGlassWrapper}>
            <BrandLogo size={46} />
          </div>
          
          <div className={styles.heroHeaderRight}>
            <div className={styles.legalTopRow}>
              <Link href="/privacy" className={styles.legalTopLink} title="View Privacy Policy">
                <span>🔒</span> Privacy Policy
              </Link>
              <Link href="/terms" className={styles.legalTopLink} title="View Terms of Service">
                <span>⚖️</span> Terms
              </Link>
            </div>

            <div className={styles.controlsRow}>
              <ThemeToggle variant="icon" />
              <div className={styles.langRow}>
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    aria-label={`Select ${l.label} language`}
                    onClick={() => setLang(l.code as LangCode)}
                    className={`${styles.langBtn} ${lang === l.code ? styles.langActive : ''}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Hero Center Content ── */}
        <div className={styles.heroContent}>
          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span className={styles.heroBadge}>
              <span className={styles.heroBadgeDot} />
              {t('login.hero_badge', '100% Pure Veg · Institutional Dining')}
            </span>
          </div>

          <h2 className={styles.heroTitle}>
            {t('login.hero_title', 'Good Food.')}<br />
            <span>{t('login.hero_title_span', 'Better Campus.')}</span>
          </h2>

          <p className={styles.heroSub}>
            {t('login.hero_sub', 'Connecting Academic Departments, Principals, Administration & Campus Canteens in One Live Digital Ecosystem.')}
          </p>

          {/* ── Centerpiece 3D Showcase Card (Clean, Sharp & Contained) ── */}
          <div className={styles.showcaseWrapper}>
            <div className={styles.mainShowcaseCard}>
              <div className={styles.showcaseTopRow}>
                <span className={styles.showcaseSpecialTag}>
                  <span>🌟</span> TODAY'S EXECUTIVE SPECIAL
                </span>
                <span className={styles.showcaseRatingTag}>
                  <span>✓</span> Requisition Approved
                </span>
              </div>

              <div className={styles.showcaseDishBody}>
                <div className={styles.showcaseDishIcon}>
                  🍱
                </div>
                <div className={styles.showcaseDishInfo}>
                  <h4 className={styles.showcaseDishTitle}>Executive Pure-Veg Campus Thali</h4>
                  <div className={styles.showcaseDishPills}>
                    <span className={styles.dishItemChip}>4 Butter Phulkas</span>
                    <span className={styles.dishItemChip}>Paneer Makhani</span>
                    <span className={styles.dishItemChip}>Dal Tadka</span>
                    <span className={styles.dishItemChip}>Jeera Rice</span>
                    <span className={styles.dishItemChip}>Gulab Jamun</span>
                    <span className={styles.dishItemChip}>Masala Chaas</span>
                  </div>
                </div>
              </div>

              <div className={styles.showcaseFooterRow}>
                <div className={styles.showcasePrice}>
                  ₹90 <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#94A3B8' }}>/ plate</span>
                </div>
                <div className={styles.showcaseVendorName}>
                  <span>🌿</span> 100% Pure Veg · Authorized Canteen
                </div>
              </div>
            </div>
          </div>

          {/* ── 4 Scalable 3D Platform Feature Cards ── */}
          <div className={styles.bentoChipsGrid}>
            <div className={styles.bentoChip}>
              <div className={styles.bentoChipIcon}>🏢</div>
              <div className={styles.bentoChipText}>
                <h5>Multi-Kitchen Network</h5>
                <p>Live menus across all canteens</p>
              </div>
            </div>

            <div className={styles.bentoChip}>
              <div className={styles.bentoChipIcon}>⚡</div>
              <div className={styles.bentoChipText}>
                <h5>1-Click Approvals</h5>
                <p>Principal & DCR compliance</p>
              </div>
            </div>

            <div className={styles.bentoChip}>
              <div className={styles.bentoChipIcon}>🧾</div>
              <div className={styles.bentoChipText}>
                <h5>Paperless GST Billing</h5>
                <p>Automated digital invoices</p>
              </div>
            </div>

            <div className={styles.bentoChip}>
              <div className={styles.bentoChipIcon}>🌿</div>
              <div className={styles.bentoChipText}>
                <h5>100% Pure Veg Verified</h5>
                <p>Strictly vegetarian campus food</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer Copyright & Legal ── */}
        <div className={styles.heroFooter}>
          <div className={styles.heroFooterText}>
            © 2026 {formatBrandText('AharSetu', lang)} · Institutional Protocol
          </div>
          <div className={styles.heroFooterLinks}>
            <Link href="/privacy" className={styles.footerLink}>
              <span>🔒</span> Privacy Policy
            </Link>
            <span className={styles.footerDot}>·</span>
            <Link href="/terms" className={styles.footerLink}>
              <span>📜</span> Terms of Service
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Right Panel - Form Interface */}
      <section className={styles.formPanel}>
        <div className={styles.formCard}>
          
          {/* Stepper Progress */}
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
              <span className={`${styles.stepLabel} ${activeStep === 3 ? styles.stepActiveLabel : ''}`}>{t('common.verify', 'Verify')}</span>
            </div>
          </div>

          <div className={styles.formHeader} style={{ textAlign: 'left', marginBottom: '24px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0D9488', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '10px' }}>
              AHARSETU ENTERPRISE AUTHENTICATION
            </div>
            <h3 className={styles.formTitle} style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--gray-900, #0F172A)', letterSpacing: '-0.5px', margin: '0 0 6px' }}>
              {formatBrandText(t('login.welcome_title', 'Welcome to AharSetu'), lang)}
            </h3>
            <p className={styles.formSub} style={{ fontSize: '0.85rem', color: 'var(--gray-500, #64748B)', margin: 0 }}>{t('login.welcome_sub', 'Authenticate using your institutional profile credentials')}</p>
          </div>

          {error && (
            <div className={styles.errorBanner} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AppIcon name="rejected" size={18} color="#DC2626" />
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
                      setError('');
                    }}
                    className={`${styles.roleCard} ${role === r.id ? styles.roleSelected : ''}`}
                  >
                    {role === r.id && <span className={styles.roleSelectedIcon}>✓</span>}
                    <div className={styles.roleIcon} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AppIcon name={r.icon as any} size={26} color={role === r.id ? '#FFFFFF' : 'var(--gray-500, #94A3B8)'} />
                    </div>
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
                      onClick={() => {
                        setDepartmentId(d.id);
                        setError('');
                      }}
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
                  <span className={styles.inputIcon} style={{ display: 'flex', alignItems: 'center' }}>
                    <AppIcon name="profile" size={18} color="#94A3B8" />
                  </span>
                  <input
                    type="email"
                    placeholder={t('login.email_ph', 'Institutional Email (e.g. name@aharsetu.edu.in)')}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
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
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    className={styles.input}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPass(!showPass)}
                    className={styles.togglePassBtn}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <AppIcon name={showPass ? 'eye_off' : 'eye'} size={18} color="#64748B" />
                  </button>
                </div>
              </div>

              {/* Remember this device */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--gray-600, #475569)', cursor: 'pointer', marginTop: '12px' }}>
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
              {loading ? t('login.verifying_btn', 'Verifying Identity...') : t('login.secure_btn', 'Secure Log In')}
            </UiverseButton>
          </form>

          {/* Quick Demo / Test Switcher on Login Page */}
          <div className={styles.demoSection}>
            <button
              type="button"
              onClick={() => setShowDemo(!showDemo)}
              className={styles.demoTrigger}
            >
              <span>{showDemo ? '✕ Close Test Switcher' : '🔑 Quick Test Switcher (Demo Accounts)'}</span>
            </button>

            {showDemo && (
              <div className={styles.demoGrid}>
                {QUICK_TEST_ACCOUNTS.map((acc, idx) => {
                  const liveUser = directoryUsers.find(u => u.email.toLowerCase() === acc.email.toLowerCase());
                  const displayName = liveUser?.name || acc.name || acc.label;
                  return (
                    <div
                      key={idx}
                      onClick={() => fillDemo(acc)}
                      className={styles.demoCard}
                    >
                      <span className={styles.demoIcon} style={{ display: 'flex', alignItems: 'center' }}>
                        <AppIcon name={acc.icon as any} size={20} color="#2563EB" />
                      </span>
                      <div className={styles.demoMeta}>
                        <h5>{displayName}</h5>
                        <p>{acc.email}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form Footer Legal Links */}
          <div className={styles.formLegalRow}>
            <span>Institutional Compliance:</span>
            <Link href="/privacy" className={styles.formLegalLink}>Privacy Policy</Link>
            <span>•</span>
            <Link href="/terms" className={styles.formLegalLink}>Terms of Service</Link>
          </div>

        </div>
      </section>

      <PwaInstallPrompt />
    </div>
  );
}
