'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getSession, logout, logoutUser, initializeApplication, UserProfile } from '@/lib/auth';
import { ROLE_COLORS, ROLE_LABELS, ROLE_ICONS, DEPARTMENTS } from '@/lib/constants';
import { NAVIGATION_CONFIG, NavItem } from '@/lib/navigationConfig';
import { useI18n } from '@/lib/i18n';
import NotificationBell from './NotificationBell';
import LanguageSwitcher from './LanguageSwitcher';
import PushPrompt from './PushPrompt';
import PwaInstallPrompt from './PwaInstallPrompt';
import ToastContainer from './Toast';
import BrandLogo from './BrandLogo';
import FirstTimeOnboardingModal from './FirstTimeOnboardingModal';
import NetworkStatusBanner from './NetworkStatusBanner';
import AvatarImage from './AvatarImage';
import ThemeToggle from './ThemeToggle';
import { useTheme } from './ThemeProvider';
import AppIcon, { getIconTheme } from './ui/AppIcon';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: React.ReactNode;
  role: string;
  currentPath?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
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

export default function AppShell({ children, role, currentPath, activeTab, onTabChange }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const [session, setSession] = useState<UserProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isDrawerScreen, setIsDrawerScreen] = useState(false);
  const [currentHash, setCurrentHash] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateHash = () => {
      setCurrentHash(window.location.hash.replace('#', '').trim().toLowerCase());
    };
    updateHash();
    window.addEventListener('hashchange', updateHash);
    return () => window.removeEventListener('hashchange', updateHash);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkScreen = () => {
        setIsMobileDevice(window.innerWidth <= 768);
        setIsDrawerScreen(window.innerWidth <= 900);
      };
      checkScreen();
      window.addEventListener('resize', checkScreen);

      const saved = localStorage.getItem('aharsetu_sidebar_minimized');
      if (saved === 'true') {
        setSidebarMinimized(true);
      }

      return () => window.removeEventListener('resize', checkScreen);
    }
  }, []);

  const toggleSidebarMinimize = () => {
    setSidebarMinimized((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('aharsetu_sidebar_minimized', String(next));
      }
      return next;
    });
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    if (typeof window !== 'undefined' && window.innerWidth > 900) {
      setSidebarMinimized(true);
      localStorage.setItem('aharsetu_sidebar_minimized', 'true');
    }
  };

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      setSidebarOpen((prev) => !prev);
    } else {
      if (sidebarOpen) {
        setSidebarOpen(false);
      }
      toggleSidebarMinimize();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        setProfileMenuOpen(false);
        setMoreDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    await logoutUser();
    router.push('/login');
  }

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = ROLE_COLORS[role] || ROLE_COLORS.coordinator;
  const navItems = NAVIGATION_CONFIG[role] || [];

  // Resolve exactly ONE active navigation item for the sidebar
  const activeItemId = useMemo(() => {
    // 1. If explicit activeTab is provided or URL hash is present
    const effectiveTab = (activeTab || currentHash || '').toLowerCase();
    if (effectiveTab) {
      const tabMatch = navItems.find(
        (item) =>
          item.id === effectiveTab ||
          item.href.endsWith(`/${effectiveTab}`) ||
          item.href.endsWith(`#${effectiveTab}`) ||
          (effectiveTab === 'new' && item.id === 'create') ||
          (effectiveTab === 'create-order' && item.id === 'create') ||
          (effectiveTab === 'my_orders' && item.id === 'orders')
      );
      if (tabMatch) {
        return tabMatch.id;
      }
    }

    // 2. Exact pathname match
    const effectivePath = currentPath || pathname || '';
    const exactMatch = navItems.find((item) => item.href === effectivePath);
    if (exactMatch) {
      return exactMatch.id;
    }

    // 3. Most specific prefix match (longest matching item.href)
    const roleRoot = `/${role}`;
    let bestMatch: NavItem | null = null;
    let longestMatchLen = 0;

    for (const item of navItems) {
      if (item.href === roleRoot) continue; // Root is handled as fallback
      if (
        effectivePath === item.href ||
        effectivePath.startsWith(`${item.href}/`) ||
        effectivePath.startsWith(`${item.href}?`) ||
        effectivePath.startsWith(`${item.href}#`)
      ) {
        if (item.href.length > longestMatchLen) {
          longestMatchLen = item.href.length;
          bestMatch = item;
        }
      }
    }

    if (bestMatch) {
      return bestMatch.id;
    }

    // 4. Default to dashboard if on role root or empty
    if (!effectivePath || effectivePath === roleRoot || effectivePath === `${roleRoot}/`) {
      const dash = navItems.find((item) => item.id === 'dashboard' || item.href === roleRoot);
      return dash ? dash.id : (navItems[0]?.id ?? null);
    }

    return null;
  }, [activeTab, currentHash, currentPath, pathname, navItems, role]);

  const deptLabel = session?.department_id
    ? DEPARTMENTS.find((d) => d.id === session.department_id)?.name || session.department_id
    : null;

  const sidebarBg = isDark ? '#0F172A' : colors.sidebar;
  const sidebarText = isDark ? '#F8FAFC' : colors.sidebarText;
  const sidebarTextMuted = isDark ? '#94A3B8' : colors.sidebarTextMuted;
  const sidebarHoverBg = isDark ? 'rgba(255, 255, 255, 0.06)' : colors.sidebarHoverBg;
  const sidebarActiveBg = isDark ? 'rgba(37, 99, 235, 0.2)' : colors.sidebarActiveBg;
  const sidebarBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : colors.sidebarBorder;

  return (
    <div
      className={styles.shell}
      style={
        {
          '--role-accent': colors.accent,
          '--sidebar-bg': sidebarBg,
          '--sidebar-text': sidebarText,
          '--sidebar-text-muted': sidebarTextMuted,
          '--sidebar-hover-bg': sidebarHoverBg,
          '--sidebar-active-bg': sidebarActiveBg,
          '--sidebar-border': sidebarBorder,
        } as React.CSSProperties
      }
    >
      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''} ${sidebarMinimized ? styles.sidebarMinimized : ''}`}
        style={{ background: sidebarBg }}
      >
        {/* Logo */}
        <div
          className={styles.logo}
          style={{
            display: 'flex',
            justifyContent: sidebarMinimized ? 'center' : 'flex-start',
            alignItems: 'center',
            padding: sidebarMinimized ? '14px 10px' : '16px 20px',
            background: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.8)'}`,
            boxShadow: isDark ? '0 4px 30px rgba(0,0,0,0.25)' : '0 4px 30px rgba(0,0,0,0.03)'
          }}
        >
          <BrandLogo
            size={sidebarMinimized ? 38 : 46}
            variant={sidebarMinimized ? 'icon' : 'full'}
          />
        </div>

        {/* User card */}
        {session && (
          <div
            className={styles.userCard}
            title={sidebarMinimized ? `${session.name} (${ROLE_LABELS[role]})` : undefined}
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.04)' : undefined,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : undefined
            }}
          >
            <AvatarImage userId={session.id} name={session.name} size={36} />
            <div className={styles.userInfo}>
              <div className={styles.userName} style={{ color: isDark ? '#F8FAFC' : undefined }}>{session.name}</div>
              <div className={styles.userRole} style={{ color: isDark ? '#94A3B8' : undefined }}>
                {ROLE_LABELS[role]}
                {deptLabel && <span className={styles.userDept}> · {deptLabel}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Nav with Real Next.js Routes */}
        <nav className={styles.nav}>
          {navItems.map((item) => {
            const isActive = item.id === activeItemId;
            const iconTheme = getIconTheme(item.icon);
            const hashIdx = item.href.indexOf('#');
            const handleNavClick = (e: React.MouseEvent) => {
              setSidebarOpen(false);
              if (onTabChange) {
                onTabChange(item.id);
              }
              if (hashIdx !== -1) {
                e.preventDefault();
                window.location.hash = item.href.slice(hashIdx + 1);
                window.dispatchEvent(new Event('hashchange'));
              }
            };

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navActive : ''}`}
                onClick={handleNavClick}
                title={t(item.labelKey)}
                data-tooltip={t(item.labelKey)}
                style={{
                  color: isDark ? (isActive ? '#93C5FD' : '#94A3B8') : undefined,
                  background: isDark ? (isActive ? 'rgba(37, 99, 235, 0.2)' : undefined) : undefined,
                  borderColor: isDark && isActive ? 'rgba(59, 130, 246, 0.35)' : undefined
                }}
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
        <div className={styles.sidebarFooter} style={{ borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : undefined }}>
          <button
            onClick={handleLogout}
            className={styles.logoutBtn}
            title={t('auth.logout')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: isDark ? 'rgba(239, 68, 68, 0.08)' : undefined,
              borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : undefined,
              color: isDark ? '#F87171' : undefined
            }}
          >
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

          <div className={styles.footerLinks} style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '0.72rem', color: isDark ? '#64748B' : '#94A3B8' }}>
            <Link href="/privacy" style={{ color: isDark ? '#64748B' : '#94A3B8', textDecoration: 'none' }}>Privacy Policy</Link>
            <span>·</span>
            <Link href="/terms" style={{ color: isDark ? '#64748B' : '#94A3B8', textDecoration: 'none' }}>Terms of Service</Link>
          </div>
        </div>
      </aside>

      {/* Backdrop overlay */}
      {sidebarOpen && <div className={styles.overlay} onClick={closeSidebar} aria-hidden="true" />}

      {/* Main content */}
      <div className={`${styles.main} ${sidebarMinimized ? styles.mainMinimized : ''}`}>
        {/* Header */}
        <header
          className={styles.header}
          style={{
            borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.accent + '30',
            background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            left: isDrawerScreen ? 0 : (sidebarMinimized ? '76px' : '240px')
          }}
        >
          <div className={styles.headerLeft}>
            {isMobileDevice && pathname && pathname !== `/${role}` && pathname !== `/${role}/` ? (
              <button
                type="button"
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
                title="Back"
                aria-label="Back"
              >
                <AppIcon name="back" size={20} />
              </button>
            ) : (
              <button
                type="button"
                className={styles.menuBtn}
                onClick={handleToggleSidebar}
                title={isDrawerScreen ? (sidebarOpen ? 'Close Menu' : 'Open Menu') : (sidebarMinimized ? 'Expand Sidebar' : 'Collapse Sidebar')}
                aria-label={isDrawerScreen ? (sidebarOpen ? 'Close Menu' : 'Open Menu') : (sidebarMinimized ? 'Expand Sidebar' : 'Collapse Sidebar')}
              >
                <AppIcon name="menu_btn" size={20} />
              </button>
            )}
            <div className={styles.pageTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isDark ? '#F8FAFC' : undefined }}>
              <span style={{ color: colors.accent, display: 'flex', alignItems: 'center' }}>
                <AppIcon name={role} size={20} />
              </span>
              <span>{ROLE_LABELS[role]}</span>
              {deptLabel && (
                <span className={styles.headerDeptLabel} style={{ color: isDark ? '#94A3B8' : 'var(--gray-400)', fontSize: '0.85rem' }}> — {deptLabel}</span>
              )}
            </div>
          </div>
          <div className={styles.headerRight}>
            <ThemeToggle variant="icon" />
            {!isMobileDevice && (
              <>
                <LanguageSwitcher />
                {session && <NotificationBell userId={session.id} role={session.role} />}
              </>
            )}
            {isMobileDevice && session && (
              <NotificationBell userId={session.id} role={session.role} />
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
                style={{
                  cursor: 'pointer',
                  userSelect: 'none',
                  background: isDark ? 'rgba(255, 255, 255, 0.05)' : undefined,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : undefined
                }}
              >
                <AvatarImage userId={session?.id} name={session?.name} size={32} />
                <div className={styles.headerUserInfo}>
                  <div className={styles.headerUserName} style={{ color: isDark ? '#F8FAFC' : undefined }}>{session?.name}</div>
                  <div className={styles.headerUserRole} style={{ color: isDark ? '#94A3B8' : undefined }}>{ROLE_LABELS[role]}</div>
                </div>
              </div>

              {!isMobileDevice && profileMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '46px',
                  right: 0,
                  width: '180px',
                  background: isDark ? '#1E293B' : 'var(--surface-0)',
                  borderRadius: '12px',
                  border: `1px solid ${isDark ? '#334155' : 'var(--gray-200, #E2E8F0)'}`,
                  boxShadow: isDark ? '0 10px 25px -5px rgba(0,0,0,0.5)' : '0 10px 25px -5px rgba(0,0,0,0.1)',
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
                      color: isDark ? '#F8FAFC' : 'var(--gray-700, #334155)',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : '#EFF6FF'}
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
                    onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2'}
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
                : item.id === activeItemId ||
                  (item.id === 'home' && (activeItemId === 'dashboard' || !activeItemId)) ||
                  (item.id === 'my_orders' && activeItemId === 'orders') ||
                  (item.id === 'approvals' && activeItemId === 'queue');
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
            <div style={{ width: '40px', height: '4px', background: 'var(--gray-300, #CBD5E1)', borderRadius: '2px', margin: '0 auto 16px auto' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <AvatarImage userId={session.id} name={session.name} size={44} />
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)' }}>{session.name}</h4>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--role-accent)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AppIcon name={role} size={14} color="var(--role-accent)" /> {ROLE_LABELS[role]}
                </div>
              </div>
            </div>

            <div className={styles.drawerMenuContainer}>
              <ThemeToggle variant="menu" style={{ marginBottom: '4px' }} />

              <Link
                href={`/${role}/settings`}
                onClick={() => setMoreDrawerOpen(false)}
                className={styles.drawerLink}
              >
                <AppIcon name="settings" size={18} /> <span>Settings & Languages</span>
              </Link>

              {/* Role-Specific Secondary Menu Links */}
              {role === 'coordinator' && (
                <>
                  <Link
                    href="/coordinator/orders/pending"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="pending" size={18} /> <span>Pending Approvals</span>
                  </Link>

                  <Link
                    href="/coordinator/orders/completed"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="completed" size={18} /> <span>Completed Orders</span>
                  </Link>

                  <Link
                    href="/coordinator/orders/rejected"
                    onClick={() => {
                      setMoreDrawerOpen(false);
                      if (onTabChange) onTabChange('rejected');
                    }}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="rejected" size={18} /> <span>Rejected Orders</span>
                  </Link>

                  <Link
                    href="/coordinator/orders/cancelled"
                    onClick={() => {
                      setMoreDrawerOpen(false);
                      if (onTabChange) onTabChange('cancelled');
                    }}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="cancelled" size={18} /> <span>Cancelled Orders</span>
                  </Link>

                  <Link
                    href="/coordinator/bills"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="bills" size={18} /> <span>Institutional Bills</span>
                  </Link>
                </>
              )}

              {role === 'principal' && (
                <>
                  <Link
                    href="/principal/approved"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="approved" size={18} /> <span>Approved Orders</span>
                  </Link>

                  <Link
                    href="/principal/rejected"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="rejected" size={18} /> <span>Rejected Orders</span>
                  </Link>

                  <Link
                    href="/principal/bills"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="bills" size={18} /> <span>Institutional Bills</span>
                  </Link>

                  <Link
                    href="/principal/history"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="history" size={18} /> <span>Requisition History</span>
                  </Link>

                  <Link
                    href="/principal/profile"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="profile" size={18} /> <span>My Profile</span>
                  </Link>
                </>
              )}

              {(role === 'dcr' || role === 'administration') && (
                <>
                  <Link
                    href="/dcr/approved"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="approved" size={18} /> <span>Approved Orders</span>
                  </Link>

                  <Link
                    href="/dcr/rejected"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="rejected" size={18} /> <span>Rejected Orders</span>
                  </Link>

                  <Link
                    href="/dcr/history"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="history" size={18} /> <span>Audit History</span>
                  </Link>

                  <Link
                    href="/dcr/bills"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="bills" size={18} /> <span>Institutional Bills</span>
                  </Link>

                  <Link
                    href="/dcr/reports"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="reports" size={18} /> <span>Financial Reports</span>
                  </Link>

                  <Link
                    href="/dcr/profile"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="profile" size={18} /> <span>My Profile</span>
                  </Link>
                </>
              )}

              {role === 'vendor' && (
                <>
                  <Link
                    href="/vendor/orders/active"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="active" size={18} /> <span>Active Orders Pipeline</span>
                  </Link>

                  <Link
                    href="/vendor/orders/completed"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="completed" size={18} /> <span>Completed Orders</span>
                  </Link>

                  <Link
                    href="/vendor/modifications"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="modifications" size={18} /> <span>Order Modifications</span>
                  </Link>

                  <Link
                    href="/vendor/availability"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="availability" size={18} /> <span>Kitchen Availability</span>
                  </Link>

                  <Link
                    href="/vendor/revenue"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="revenue" size={18} /> <span>Revenue & Settlements</span>
                  </Link>

                  <Link
                    href="/vendor/bills"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="bills" size={18} /> <span>Invoices & Bills</span>
                  </Link>
                </>
              )}

              {role === 'admin' && (
                <>
                  <Link
                    href="/admin/departments"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="departments" size={18} /> <span>Departments Management</span>
                  </Link>

                  <Link
                    href="/admin/vendors"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="vendors" size={18} /> <span>Vendors Management</span>
                  </Link>

                  <Link
                    href="/admin/bills"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="bills" size={18} /> <span>Institutional Bills</span>
                  </Link>

                  <Link
                    href="/admin/analytics"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="analytics" size={18} /> <span>System Analytics</span>
                  </Link>

                  <Link
                    href="/admin/audit-logs"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="audit" size={18} /> <span>Audit Trails & Logs</span>
                  </Link>

                  <Link
                    href="/admin/notifications"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
                  >
                    <AppIcon name="notifications" size={18} /> <span>Notification Alerts</span>
                  </Link>

                  <Link
                    href="/admin/system-health"
                    onClick={() => setMoreDrawerOpen(false)}
                    className={styles.drawerLink}
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
                className={styles.drawerLogoutBtn}
              >
                <AppIcon name="logout" size={18} color="#EF4444" /> <span>Sign Out of Session</span>
              </button>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '16px', paddingBottom: '8px', fontSize: '0.76rem', color: 'var(--gray-500, #64748B)' }}>
                <Link href="/privacy" onClick={() => setMoreDrawerOpen(false)} style={{ color: 'var(--gray-500, #64748B)', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</Link>
                <span>·</span>
                <Link href="/terms" onClick={() => setMoreDrawerOpen(false)} style={{ color: 'var(--gray-500, #64748B)', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</Link>
              </div>
            </div>
          </div>
        </>
      )}

      <NetworkStatusBanner />
      <ToastContainer />
      <PushPrompt />
      <PwaInstallPrompt />
      <FirstTimeOnboardingModal />
    </div>
  );
}
