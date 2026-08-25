'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getSession, logout, initializeApplication, UserProfile } from '@/lib/auth';
import { ROLE_COLORS, ROLE_LABELS, ROLE_ICONS, DEPARTMENTS } from '@/lib/constants';
import { NAVIGATION_CONFIG } from '@/lib/navigationConfig';
import { useI18n } from '@/lib/i18n';
import NotificationBell from './NotificationBell';
import LanguageSwitcher from './LanguageSwitcher';
import PushPrompt from './PushPrompt';
import PwaInstallPrompt from './PwaInstallPrompt';
import ToastContainer from './Toast';
import BrandLogo from './BrandLogo';
import FirstTimeOnboardingModal from './FirstTimeOnboardingModal';
import AvatarImage from './AvatarImage';
import AppIcon, { getIconTheme } from './ui/AppIcon';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: React.ReactNode;
  role: string;
  currentPath?: string;
}

const BOTTOM_NAV_CONFIG: Record<string, { label: string; href: string; icon: string; id: string }[]> = {
  coordinator: [
    { id: 'home', label: 'Home', href: '/coordinator', icon: 'home' },
    { id: 'create', label: 'New Order', href: '/coordinator/orders/create', icon: 'create' },
    { id: 'orders', label: 'Orders', href: '/coordinator/orders', icon: 'orders' },
    { id: 'notifications', label: 'Alerts', href: '/coordinator/notifications', icon: 'notifications' },
    { id: 'profile', label: 'Profile', href: '/coordinator/profile', icon: 'profile' },
  ],
  vendor: [
    { id: 'home', label: 'Home', href: '/vendor', icon: 'home' },
    { id: 'incoming', label: 'Incoming', href: '/vendor/orders/incoming', icon: 'incoming' },
    { id: 'menu', label: 'Menu', href: '/vendor/menu', icon: 'menu' },
    { id: 'notifications', label: 'Alerts', href: '/vendor/notifications', icon: 'notifications' },
    { id: 'profile', label: 'Profile', href: '/vendor/profile', icon: 'profile' },
  ],
  principal: [
    { id: 'home', label: 'Home', href: '/principal', icon: 'home' },
    { id: 'approvals', label: 'Approvals', href: '/principal/approvals', icon: 'queue' },
    { id: 'my_orders', label: 'Requisitions', href: '/principal/my-orders', icon: 'file_edit' },
    { id: 'notifications', label: 'Alerts', href: '/principal/notifications', icon: 'notifications' },
    { id: 'more', label: 'More', href: '#more', icon: 'menu_btn' },
  ],
  dcr: [
    { id: 'home',          label: 'Home',        href: '/dcr',               icon: 'home' },
    { id: 'approvals',     label: 'Audit',       href: '/dcr/approvals',     icon: 'active' },
    { id: 'bills',         label: 'Bills',       href: '/dcr/bills',         icon: 'bills' },
    { id: 'settlements',   label: 'Settlements', href: '/dcr/settlements',   icon: 'settlements' },
    { id: 'more',          label: 'More',        href: '#more',              icon: 'menu_btn' },
  ],
  administration: [
    { id: 'home',          label: 'Home',        href: '/dcr',               icon: 'home' },
    { id: 'approvals',     label: 'Audit',       href: '/dcr/approvals',     icon: 'active' },
    { id: 'bills',         label: 'Bills',       href: '/dcr/bills',         icon: 'bills' },
    { id: 'settlements',   label: 'Settlements', href: '/dcr/settlements',   icon: 'settlements' },
    { id: 'more',          label: 'More',        href: '#more',              icon: 'menu_btn' },
  ],
  admin: [
    { id: 'home', label: 'Home', href: '/admin', icon: 'home' },
    { id: 'users', label: 'Users', href: '/admin/users', icon: 'users' },
    { id: 'orders', label: 'Orders', href: '/admin/orders', icon: 'orders' },
    { id: 'reports', label: 'Reports', href: '/admin/reports', icon: 'reports' },
    { id: 'more', label: 'More', href: '#more', icon: 'menu_btn' },
  ]
};

export default function AppShell({ children, role }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const [session, setSession] = useState<UserProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

    // Refresh user profile asynchronously from backend on mount so names/avatars are fresh
    initializeApplication().then((fresh) => {
      if (fresh) setSession(fresh);
    }).catch(() => {});

    // Re-read session whenever profile is updated (from any device via WS or same-device)
    const handleProfileChange = (e?: any) => {
      if (e?.detail && typeof e.detail === 'object' && e.detail.name) {
        setSession(e.detail);
      } else {
        const updated = getSession();
        if (updated) setSession(updated);
      }
    };

    window.addEventListener('aharsetu_profile_changed', handleProfileChange);
    window.addEventListener('aharsetu_session_changed', handleProfileChange);
    window.addEventListener('aharsetu_user_changed', handleProfileChange);
    window.addEventListener('focus', handleProfileChange);

    return () => {
      window.removeEventListener('aharsetu_profile_changed', handleProfileChange);
      window.removeEventListener('aharsetu_session_changed', handleProfileChange);
      window.removeEventListener('aharsetu_user_changed', handleProfileChange);
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
        <div className={styles.logo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', boxShadow: '0 4px 30px rgba(0,0,0,0.03)' }}>
          <BrandLogo size={46} />
          {isMobileDevice && (
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.4rem',
                cursor: 'pointer',
                color: '#64748B',
                padding: '4px 8px',
                lineHeight: 1
              }}
            >
              ✕
            </button>
          )}
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
            const iconTheme = getIconTheme(item.icon);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navActive : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <div
                  className={styles.navIconBadge}
                  style={{
                    background: iconTheme.bg,
                    color: iconTheme.color,
                    boxShadow: isActive ? `0 2px 10px ${iconTheme.glow}` : undefined,
                  }}
                >
                  <AppIcon name={item.icon} size={16} color={iconTheme.color} strokeWidth={2.2} />
                </div>
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={styles.sidebarFooter}>
          <button onClick={handleLogout} className={styles.logoutBtn} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <AppIcon name="logout" size={14} color="#EF4444" strokeWidth={2.2} />
            </div>
            <span>{t('auth.logout')}</span>
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
                <AppIcon name="back" size={20} />
              </button>
            ) : (
              <button className={styles.menuBtn} onClick={() => setSidebarOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AppIcon name="menu_btn" size={20} />
              </button>
            )}
            <div className={styles.pageTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: colors.accent, display: 'flex', alignItems: 'center' }}>
                <AppIcon name={role} size={20} />
              </span>
              <span>{ROLE_LABELS[role]}</span>
              {deptLabel && (
                <span className={styles.headerDeptLabel} style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}> — {deptLabel}</span>
              )}
            </div>
          </div>
          <div className={styles.headerRight}>
            {!isMobileDevice && (
              <>
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
                    <AppIcon name="settings" size={16} /> <span>Settings & Profile</span>
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
                    <AppIcon name="logout" size={16} color="#DC2626" /> <span>Fast Logout</span>
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
            const iconTheme = getIconTheme(item.icon);

            if (item.id === 'more') {
              return (
                <button
                  key={item.id}
                  onClick={() => setMoreDrawerOpen((o) => !o)}
                  className={`${styles.bottomNavItem} ${isItemActive ? styles.bottomNavItemActive : ''}`}
                >
                  <span className={styles.bottomNavIcon}>
                    <AppIcon name={item.icon} size={20} color={isItemActive ? iconTheme.color : '#64748B'} />
                  </span>
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
                <span className={styles.bottomNavIcon}>
                  <AppIcon name={item.icon} size={20} color={isItemActive ? iconTheme.color : '#64748B'} />
                </span>
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
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--role-accent)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AppIcon name={role} size={14} color="var(--role-accent)" /> {ROLE_LABELS[role]}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link
                href={`/${role}/settings`}
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
                <AppIcon name="settings" size={18} /> <span>Settings & Languages</span>
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
                  <AppIcon name="bills" size={18} /> <span>Institutional Bills</span>
                </Link>
              )}

              {role === 'principal' && (
                <>
                  <Link
                    href="/principal/history"
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
                    <AppIcon name="history" size={18} /> <span>Requisition History</span>
                  </Link>

                  <Link
                    href="/principal/profile"
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
                    <AppIcon name="profile" size={18} /> <span>My Profile</span>
                  </Link>
                </>
              )}

              {role === 'admin' && (
                <>
                  <Link
                    href="/admin/departments"
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
                    <AppIcon name="departments" size={18} /> <span>Departments Management</span>
                  </Link>

                  <Link
                    href="/admin/vendors"
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
                    <AppIcon name="vendors" size={18} /> <span>Vendors Management</span>
                  </Link>

                  <Link
                    href="/admin/bills"
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
                    <AppIcon name="bills" size={18} /> <span>Institutional Bills</span>
                  </Link>

                  <Link
                    href="/admin/analytics"
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
                    <AppIcon name="analytics" size={18} /> <span>System Analytics</span>
                  </Link>

                  <Link
                    href="/admin/audit-logs"
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
                    <AppIcon name="audit" size={18} /> <span>Audit Trails & Logs</span>
                  </Link>

                  <Link
                    href="/admin/notifications"
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
                    <AppIcon name="notifications" size={18} /> <span>Notification Alerts</span>
                  </Link>

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
                    <AppIcon name="health" size={18} /> <span>System Health Status</span>
                  </Link>
                </>
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
                <AppIcon name="logout" size={18} color="#DC2626" /> <span>Sign Out of Session</span>
              </button>
            </div>
          </div>
        </>
      )}

      <ToastContainer />
      <PushPrompt />
      <PwaInstallPrompt />
      <FirstTimeOnboardingModal />
    </div>
  );
}
