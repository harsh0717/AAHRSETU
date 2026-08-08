'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, logout, UserProfile } from '@/lib/auth';
import { ROLE_COLORS, ROLE_LABELS, ROLE_ICONS, DEPARTMENTS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';
import NotificationBell from './NotificationBell';
import LanguageSwitcher from './LanguageSwitcher';
import styles from './AppShell.module.css';

const NAV_ITEMS: Record<string, { labelKey: string; href: string; icon: string }[]> = {
  coordinator: [
    { labelKey: 'nav.dashboard',    href: '/coordinator',        icon: '🏠' },
    { labelKey: 'nav.create_order', href: '/coordinator#create', icon: '➕' },
    { labelKey: 'nav.my_orders',    href: '/coordinator#orders', icon: '📦' },
  ],
  principal: [
    { labelKey: 'nav.dashboard',    href: '/principal',          icon: '🏠' },
    { labelKey: 'nav.pending',      href: '/principal#pending',  icon: '⏳' },
    { labelKey: 'nav.history',      href: '/principal#history',  icon: '📜' },
  ],
  dcr: [
    { labelKey: 'nav.dashboard',    href: '/dcr',                icon: '🏠' },
    { labelKey: 'nav.pending',      href: '/dcr#pending',        icon: '⏳' },
    { labelKey: 'nav.history',      href: '/dcr#history',        icon: '📜' },
  ],
  vendor: [
    { labelKey: 'nav.dashboard',    href: '/vendor',             icon: '🏠' },
    { labelKey: 'nav.orders_queue', href: '/vendor#orders',      icon: '📋' },
    { labelKey: 'nav.manage_menu',  href: '/vendor#menu',        icon: '🍽️' },
    { labelKey: 'nav.revenue',      href: '/vendor#revenue',     icon: '💰' },
  ],
  admin: [
    { labelKey: 'nav.dashboard',    href: '/admin',              icon: '🏠' },
    { labelKey: 'nav.reports',      href: '/admin#reports',      icon: '📊' },
    { labelKey: 'nav.all_orders',   href: '/admin#orders',       icon: '📦' },
    { labelKey: 'nav.users',        href: '/admin#users',        icon: '👥' },
    { labelKey: 'nav.vendors',      href: '/admin#vendors',      icon: '🏪' },
  ],
};

interface AppShellProps {
  children: React.ReactNode;
  role: string;
  currentPath?: string;
}

export default function AppShell({ children, role, currentPath }: AppShellProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<UserProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.push('/login');
      return;
    }
    setSession(s);
  }, [router]);

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  const colors = ROLE_COLORS[role] || ROLE_COLORS.coordinator;
  const navItems = NAV_ITEMS[role] || [];
  
  const deptLabel = session?.department_id
    ? DEPARTMENTS.find(d => d.id === session.department_id)?.name || session.department_id
    : null;

  return (
    <div className={styles.shell} style={{ 
      '--role-accent': colors.accent, 
      '--sidebar-bg': colors.sidebar 
    } as React.CSSProperties}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}
        style={{ background: colors.sidebar }}>

        {/* Logo */}
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🍱</span>
          <div>
            <div className={styles.logoTitle}>AharSetu</div>
            <div className={styles.logoSub}>ERP Portal</div>
          </div>
        </div>

        {/* User card */}
        {session && (
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>
              {ROLE_ICONS[role] || '👤'}
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{session.name}</div>
              <div className={styles.userRole}>
                {ROLE_LABELS[role]}
                {deptLabel && <span className={styles.userDept}> · {deptLabel}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className={styles.nav}>
          {navItems.map(item => {
            const isActive = currentPath === item.href || currentPath?.startsWith(item.href.split('#')[0] + '/');
            return (
              <Link key={item.href} href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navActive : ''}`}
                onClick={() => setSidebarOpen(false)}>
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
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className={styles.main}>
        {/* Header */}
        <header className={styles.header} style={{ borderBottomColor: colors.accent + '30' }}>
          <div className={styles.headerLeft}>
            <button className={styles.menuBtn} onClick={() => setSidebarOpen(o => !o)}>☰</button>
            <div className={styles.pageTitle}>
              <span style={{ color: colors.accent }}>{ROLE_ICONS[role]}</span>
              {ROLE_LABELS[role]}
              {deptLabel && <span style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}> — {deptLabel}</span>}
            </div>
          </div>
          <div className={styles.headerRight}>
            <LanguageSwitcher />
            {session && (
              <NotificationBell userId={session.id} role={session.role} />
            )}
            <div className={styles.headerUser}>
              <div className={styles.headerAvatar} style={{ background: colors.accent }}>
                {session?.name?.[0] || '?'}
              </div>
              <div className={styles.headerUserInfo}>
                <div className={styles.headerUserName}>{session?.name}</div>
                <div className={styles.headerUserRole}>{ROLE_LABELS[role]}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
