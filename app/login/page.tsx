'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, getSession } from '@/lib/auth';
import { useI18n, LangCode } from '@/lib/i18n';
import { LANGUAGES, DEPARTMENTS } from '@/lib/constants';
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

export default function LoginPage() {
  const router = useRouter();
  const { t, lang, setLang } = useI18n();

  // Multi-step form states
  const [role, setRole] = useState('coordinator');
  const [departmentId, setDepartmentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session?.role) {
      router.replace('/' + session.role);
    }
  }, [router]);

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
    });
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Invalid credentials or validation parameters.');
      return;
    }

    router.push('/' + result.user?.role);
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
          <div className={styles.heroLogo}>
            <span className={styles.heroLogoIcon}>🍱</span>
            <span>AharSetu ERP</span>
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
          <span className={styles.heroBadge}>Institutional ERP v2.0</span>
          <h2 className={styles.heroTitle}>
            Unified Portal for <span>Campus Canteens</span>
          </h2>
          <p className={styles.heroSub}>
            A centralized ERP connecting department coordinators, principals, auditors, and vendors for paperless approvals, automated splits, and instant settlements.
          </p>

          <div className={styles.featuresGrid}>
            {[
              { icon: '📋', title: 'Multi-Vendor Splits', desc: 'Coordinator requests are auto-grouped by canteens' },
              { icon: '🛡️', title: 'Supervisor Pipelines', desc: 'Approved orders are validated against department budgets' },
              { icon: '⚡', title: 'Real-Time Alerts', desc: 'WebSockets push status modifications immediately' },
            ].map((f, idx) => (
              <div key={idx} className={styles.featureCard}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <div className={styles.featureText}>
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.heroFooter}>
          © 2026 AharSetu. All rights reserved.
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
              <span className={`${styles.stepLabel} ${activeStep === 1 ? styles.stepActiveLabel : ''}`}>Role</span>
            </div>
            <div className={styles.stepNode}>
              <div className={`${styles.stepCircle} ${activeStep >= 2 ? styles.stepActiveCircle : ''} ${activeStep > 2 ? styles.stepDoneCircle : ''}`}>
                {activeStep > 2 ? '✓' : '2'}
              </div>
              <span className={`${styles.stepLabel} ${activeStep === 2 ? styles.stepActiveLabel : ''}`}>Dept</span>
            </div>
            <div className={styles.stepNode}>
              <div className={`${styles.stepCircle} ${activeStep >= 3 ? styles.stepActiveCircle : ''}`}>
                3
              </div>
              <span className={`${styles.stepLabel} ${activeStep === 3 ? styles.stepActiveLabel : ''}`}>Verify</span>
            </div>
          </div>

          <div className={styles.formHeader}>
            <h3 className={styles.formTitle}>Welcome to AharSetu</h3>
            <p className={styles.formSub}>Authenticate using your institutional profile credentials</p>
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
              <label className={styles.inputLabel}>Step 1: Choose Your Role</label>
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
                    <div className={styles.roleName}>{r.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Department Selection Chips */}
            {deptRequired && (
              <div style={{ marginBottom: '20px', animation: 'slideDown 0.2s ease-out' }}>
                <label className={styles.inputLabel}>Step 2: Choose Department</label>
                <div className={styles.deptGrid}>
                  {DEPARTMENTS.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => setDepartmentId(d.id)}
                      className={`${styles.deptChip} ${departmentId === d.id ? styles.deptSelected : ''}`}
                    >
                      {d.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Credentials fields */}
            <div style={{ marginBottom: '24px' }}>
              <label className={styles.inputLabel}>
                {deptRequired ? 'Step 3: Enter Credentials' : 'Step 2: Enter Credentials'}
              </label>

              {/* Email */}
              <div className={styles.inputField}>
                <div className={styles.inputBox}>
                  <span className={styles.inputIcon}>👤</span>
                  <input
                    type="email"
                    placeholder="Institutional Email (e.g. name@aharsetu.edu.in)"
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
                    placeholder="Verification Password"
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.submitBtn}
            >
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Verifying Identity...
                </>
              ) : (
                'Secure Log In'
              )}
            </button>
          </form>

          {/* Quick-Access Demo Accounts Selector */}
          <div className={styles.demoSection}>
            <button
              type="button"
              onClick={() => setShowDemo(!showDemo)}
              className={styles.demoTrigger}
            >
              {showDemo ? '✕ Close Demo Board' : '🔑 Quick Access Demo Accounts'}
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

        </div>
      </section>
      
    </div>
  );
}
