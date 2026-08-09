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
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🍱</span>
          <div>
            <div className={styles.logoTitle}>{t('app.title', 'AharSetu')}</div>
            <div className={styles.logoSub}>{t('app.subtitle', 'ERP Portal')}</div>
          </div>
        </div>

        {/* User card */}
        {session && (
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>{ROLE_ICONS[role] || '👤'}</div>
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
              {ROLE_LABELS[role]}
              {deptLabel && (
                <span style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}> — {deptLabel}</span>
              )}
            </div>
          </div>
          <div className={styles.headerRight}>
            <LanguageSwitcher />
            {session && <NotificationBell userId={session.id} role={session.role} />}
            <Link href={`/${role}/profile`} className={styles.headerUser} style={{ textDecoration: 'none', cursor: 'pointer' }}>
              <div className={styles.headerAvatar} style={{ background: colors.accent }}>
                {session?.name?.[0] || '?'}
              </div>
              <div className={styles.headerUserInfo}>
                <div className={styles.headerUserName}>{session?.name}</div>
                <div className={styles.headerUserRole}>{ROLE_LABELS[role]}</div>
              </div>
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
