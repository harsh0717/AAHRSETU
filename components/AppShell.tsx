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

const BOTTOM_NAV_CONFIG: Record<string, { label: string; href: string; icon: string; id: string }[]> = {
  coordinator: [
    { id: 'home', label: 'Home', href: '/coordinator', icon: '🏠' },
    { id: 'create', label: 'New Order', href: '/coordinator/orders/create', icon: '➕' },
    { id: 'orders', label: 'Orders', href: '/coordinator/orders', icon: '📦' },
    { id: 'notifications', label: 'Alerts', href: '/coordinator/notifications', icon: '🔔' },
    { id: 'profile', label: 'Profile', href: '/coordinator/profile', icon: '👤' },
  ],
  vendor: [
    { id: 'home', label: 'Home', href: '/vendor', icon: '🏠' },
    { id: 'incoming', label: 'Incoming', href: '/vendor/orders/incoming', icon: '📥' },
    { id: 'menu', label: 'Menu', href: '/vendor/menu', icon: '🍽️' },
    { id: 'notifications', label: 'Alerts', href: '/vendor/notifications', icon: '🔔' },
    { id: 'profile', label: 'Profile', href: '/vendor/profile', icon: '👤' },
  ],
  principal: [
    { id: 'home', label: 'Home', href: '/principal', icon: '🏠' },
    { id: 'approvals', label: 'Approvals', href: '/principal/approvals', icon: '⏳' },
    { id: 'history', label: 'Orders', href: '/principal/history', icon: '📜' },
    { id: 'notifications', label: 'Alerts', href: '/principal/notifications', icon: '🔔' },
    { id: 'profile', label: 'Profile', href: '/principal/profile', icon: '👤' },
  ],
  dcr: [
    { id: 'home', label: 'Home', href: '/dcr', icon: '🏠' },
    { id: 'approvals', label: 'Audit', href: '/dcr/approvals', icon: '📋' },
    { id: 'history', label: 'Orders', href: '/dcr/history', icon: '📜' },
    { id: 'notifications', label: 'Alerts', href: '/dcr/notifications', icon: '🔔' },
    { id: 'profile', label: 'Profile', href: '/dcr/profile', icon: '👤' },
  ],
  admin: [
    { id: 'home', label: 'Home', href: '/admin', icon: '🏠' },
    { id: 'users', label: 'Users', href: '/admin/users', icon: '👥' },
    { id: 'orders', label: 'Orders', href: '/admin/orders', icon: '📦' },
    { id: 'reports', label: 'Reports', href: '/admin/reports', icon: '📊' },
    { id: 'more', label: 'More', href: '#more', icon: '☰' },
  ]
};

export default function AppShell({ children, role }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const [session, setSession] = useState<UserProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => setIsMobileDevice(window.innerWidth <= 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

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
            {isMobileDevice && pathname && pathname !== `/${role}` && pathname !== `/${role}/` ? (
              <button
                onClick={() => router.back()}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--role-accent)',
                  marginRight: '8px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                ←
              </button>
            ) : (
              <button className={styles.menuBtn} onClick={() => setSidebarOpen((o) => !o)}>
                ☰
              </button>
            )}
            <div className={styles.pageTitle}>
              <span style={{ color: colors.accent }}>{ROLE_ICONS[role]}</span>
              <span>{ROLE_LABELS[role]}</span>
              {deptLabel && (
                <span className={styles.headerDeptLabel} style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}> — {deptLabel}</span>
              )}
            </div>
          </div>
          <div className={styles.headerRight}>
            {!isMobileDevice && (
              <>
                <button
                  onClick={() => setShowCmdPalette(true)}
                  className={styles.cmdSearchBtn}
                >
                  <span>🔍</span>
                  <span className={styles.cmdSearchLabel}>Search (Cmd + K)</span>
                </button>
                <LanguageSwitcher />
                {session && <NotificationBell userId={session.id} role={session.role} />}
              </>
            )}
            
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => {
                  if (isMobileDevice) {
                    setMoreDrawerOpen(true);
                  } else {
                    setProfileMenuOpen((o) => !o);
                  }
                }}
                className={styles.headerUser}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <AvatarImage userId={session?.id} name={session?.name} size={32} />
                <div className={styles.headerUserInfo}>
                  <div className={styles.headerUserName}>{session?.name}</div>
                  <div className={styles.headerUserRole}>{ROLE_LABELS[role]}</div>
                </div>
              </div>

              {!isMobileDevice && profileMenuOpen && (
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

      {/* Mobile Bottom Navigation Bar */}
      {isMobileDevice && session && (
        <div className={styles.bottomNav}>
          {(BOTTOM_NAV_CONFIG[role] || []).map((item) => {
            const isItemActive =
              item.id === 'more'
                ? moreDrawerOpen
                : pathname === item.href || (item.href !== `/${role}` && pathname?.startsWith(item.href));

            if (item.id === 'more') {
              return (
                <button
                  key={item.id}
                  onClick={() => setMoreDrawerOpen((o) => !o)}
                  className={`${styles.bottomNavItem} ${isItemActive ? styles.bottomNavItemActive : ''}`}
                >
                  <span className={styles.bottomNavIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.bottomNavItem} ${isItemActive ? styles.bottomNavItemActive : ''}`}
              >
                <span className={styles.bottomNavIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Mobile "More" Bottom Sheet Drawer */}
      {isMobileDevice && session && (
        <>
          <div
            className={`${styles.moreDrawerOverlay} ${moreDrawerOpen ? styles.open : ''}`}
            onClick={() => setMoreDrawerOpen(false)}
          />
          <div className={`${styles.moreDrawer} ${moreDrawerOpen ? styles.open : ''}`}>
            {/* Grab handle for sliding feel */}
            <div style={{ width: '40px', height: '4px', background: '#CBD5E1', borderRadius: '2px', margin: '0 auto 20px auto' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <AvatarImage userId={session.id} name={session.name} size={44} />
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>{session.name}</h4>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--role-accent)', marginTop: '2px' }}>
                  {ROLE_ICONS[role]} {ROLE_LABELS[role]}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link
                href={`/${role}/profile`}
                onClick={() => setMoreDrawerOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: '#F8FAFC',
                  color: '#334155',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}
              >
                ⚙️ Settings & Languages
              </Link>

              {role !== 'admin' && (
                <Link
                  href={`/${role}/bills`}
                  onClick={() => setMoreDrawerOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: '#F8FAFC',
                    color: '#334155',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '0.9rem'
                  }}
                >
                  🧾 Institutional Bills
                </Link>
              )}

              {role === 'admin' && (
                <Link
                  href="/admin/system-health"
                  onClick={() => setMoreDrawerOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: '#F8FAFC',
                    color: '#334155',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '0.9rem'
                  }}
                >
                  ❤️ System Health Status
                </Link>
              )}

              <button
                onClick={() => {
                  setMoreDrawerOpen(false);
                  handleLogout();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  marginTop: '12px'
                }}
              >
                🚪 Sign Out of Session
              </button>
            </div>
          </div>
        </>
      )}

      <CommandPalette isOpen={showCmdPalette} onClose={() => setShowCmdPalette(false)} />
      <ToastContainer />
      <PushPrompt />
      <FirstTimeOnboardingModal />
    </div>
  );
}
