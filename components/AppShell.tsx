'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getSession, logout, UserProfile } from '@/lib/auth';
import { ROLE_COLORS, ROLE_LABELS, ROLE_ICONS, DEPARTMENTS } from '@/lib/constants';
import { NAVIGATION_CONFIG } from '@/lib/navigationConfig';
import { useI18n } from '@/lib/i18n';
import NotificationBell from './NotificationBell';
import LanguageSwitcher from './LanguageSwitcher';
import PushPrompt from './PushPrompt';
import CommandPalette from './CommandPalette';
import ToastContainer from './Toast';
import BrandLogo from './BrandLogo';
import FirstTimeOnboardingModal from './FirstTimeOnboardingModal';
import AvatarImage from './AvatarImage';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: React.ReactNode;
  role: string;
  currentPath?: string;
}

export default function AppShell({ children, role }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const [session, setSession] = useState<UserProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.push('/login');
      return;
    }
    setSession(s);

    const handleOpenCmd = () => setShowCmdPalette(true);
    window.addEventListener('open_command_palette', handleOpenCmd);

    // Re-read session whenever profile is updated (from any device via WS or same-device)
    const handleProfileChange = () => {
      const updated = getSession();
      if (updated) setSession(updated);
    };
    window.addEventListener('aharsetu_profile_changed', handleProfileChange);
    window.addEventListener('focus', handleProfileChange);

    return () => {
      window.removeEventListener('open_command_palette', handleOpenCmd);
      window.removeEventListener('aharsetu_profile_changed', handleProfileChange);
      window.removeEventListener('focus', handleProfileChange);
    };
  }, [router]);

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  const colors = ROLE_COLORS[role] || ROLE_COLORS.coordinator;
  const navItems = NAVIGATION_CONFIG[role] || [];

  const deptLabel = session?.department_id
    ? DEPARTMENTS.find((d) => d.id === session.department_id)?.name || session.department_id
    : null;

  return (
    <div
      className={styles.shell}
      style={
        {
          '--role-accent': colors.accent,
          '--sidebar-bg': colors.sidebar,
          '--sidebar-text': colors.sidebarText,
          '--sidebar-text-muted': colors.sidebarTextMuted,
          '--sidebar-hover-bg': colors.sidebarHoverBg,
          '--sidebar-active-bg': colors.sidebarActiveBg,
          '--sidebar-border': colors.sidebarBorder,
        } as React.CSSProperties
      }
    >
      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}
        style={{ background: colors.sidebar }}
      >
        {/* Logo */}
        <div className={styles.logo} style={{ padding: '16px 20px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
          <BrandLogo size={46} />
        </div>

        {/* User card */}
        {session && (
          <div className={styles.userCard}>
            <AvatarImage userId={session.id} name={session.name} size={36} />
            <div className={styles.userInfo}>
              <div className={styles.userName}>{session.name}</div>
              <div className={styles.userRole}>
                {ROLE_LABELS[role]}
                {deptLabel && <span className={styles.userDept}> · {deptLabel}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Nav with Real Next.js Routes */}
        <nav className={styles.nav}>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== `/${role}` && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navActive : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={styles.sidebarFooter}>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <span>🚪</span> {t('auth.logout')}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <div className={styles.main}>
        {/* Header */}
        <header className={styles.header} style={{ borderBottomColor: colors.accent + '30' }}>
          <div className={styles.headerLeft}>
            <button className={styles.menuBtn} onClick={() => setSidebarOpen((o) => !o)}>
              ☰
            </button>
            <div className={styles.pageTitle}>
              <span style={{ color: colors.accent }}>{ROLE_ICONS[role]}</span>
              <span>{ROLE_LABELS[role]}</span>
              {deptLabel && (
                <span className={styles.headerDeptLabel} style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}> — {deptLabel}</span>
              )}
            </div>
          </div>
          <div className={styles.headerRight}>
            <button
              onClick={() => setShowCmdPalette(true)}
              className={styles.cmdSearchBtn}
            >
              <span>🔍</span>
              <span className={styles.cmdSearchLabel}>Search (Cmd + K)</span>
            </button>
            <LanguageSwitcher />
            {session && <NotificationBell userId={session.id} role={session.role} />}
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setProfileMenuOpen(o => !o)}
                className={styles.headerUser}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <AvatarImage userId={session?.id} name={session?.name} size={32} />
                <div className={styles.headerUserInfo}>
                  <div className={styles.headerUserName}>{session?.name}</div>
                  <div className={styles.headerUserRole}>{ROLE_LABELS[role]}</div>
                </div>
              </div>

              {profileMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '46px',
                  right: 0,
                  width: '180px',
                  background: 'white',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                  zIndex: 1000,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '6px'
                }}>
                  <Link
                    href={`/${role}/profile`}
                    onClick={() => setProfileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#334155',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    ⚙️ Settings & Profile
                  </Link>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      handleLogout();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#DC2626',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    🚪 Fast Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className={styles.content}>{children}</main>
      </div>
      <CommandPalette isOpen={showCmdPalette} onClose={() => setShowCmdPalette(false)} />
      <ToastContainer />
      <PushPrompt />
      <FirstTimeOnboardingModal />
    </div>
  );
}
