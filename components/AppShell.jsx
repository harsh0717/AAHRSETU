'use client';
import { useRouter } from 'next/navigation';
import { ROLE_COLORS, ROLE_LABELS, ROLE_ICONS } from '@/lib/constants';
import { clearSession, setSession } from '@/lib/store';
import styles from './AppShell.module.css';

const ROLE_NAV = {
  coordinator: [
    { label: 'Dashboard',    href: '/coordinator', icon: '🏠' },
    { label: 'Create Order', href: '/coordinator?tab=create', icon: '➕' },
    { label: 'My Orders',    href: '/coordinator?tab=orders', icon: '📦' },
  ],
  principal: [
    { label: 'Dashboard',  href: '/principal',              icon: '🏠' },
    { label: 'Pending',    href: '/principal?tab=pending',  icon: '⏳' },
    { label: 'History',    href: '/principal?tab=history',  icon: '📜' },
  ],
  dcr: [
    { label: 'Dashboard',  href: '/dcr',              icon: '🏠' },
    { label: 'Pending',    href: '/dcr?tab=pending',  icon: '⏳' },
    { label: 'History',    href: '/dcr?tab=history',  icon: '📜' },
  ],
  vendor: [
    { label: 'Dashboard',    href: '/vendor',             icon: '🏠' },
    { label: 'Orders Queue', href: '/vendor?tab=orders',  icon: '📋' },
    { label: 'Manage Menu',  href: '/vendor?tab=menu',    icon: '🍽️' },
  ],
  admin: [
    { label: 'Dashboard',  href: '/admin',             icon: '🏠' },
    { label: 'Reports',    href: '/admin?tab=reports', icon: '📊' },
    { label: 'All Orders', href: '/admin?tab=orders',  icon: '📦' },
  ],
};

const ROLE_NAMES = {
  coordinator: 'Priya Sharma',
  principal:   'Dr. A. Mehta',
  dcr:         'S. Patil',
  vendor:      'M. Khan',
  admin:       'System Admin',
};

const ALL_ROLES = ['coordinator', 'principal', 'dcr', 'vendor', 'admin'];

export default function AppShell({ role, children, currentPath = '' }) {
  const router = useRouter();
  const colors = ROLE_COLORS[role] || ROLE_COLORS.coordinator;
  const navItems = ROLE_NAV[role] || [];

  function handleSwitchRole(newRole) {
    const session = { role: newRole, name: ROLE_NAMES[newRole], loginAt: new Date().toISOString() };
    setSession(session);
    const roleRoutes = { coordinator: '/coordinator', principal: '/principal', dcr: '/dcr', vendor: '/vendor', admin: '/admin' };
    router.push(roleRoutes[newRole]);
  }

  function handleLogout() {
    clearSession();
    router.push('/');
  }

  return (
    <div className={styles.shell} style={{ '--role-accent': colors.accent, '--role-sidebar': colors.sidebar, '--role-light': colors.light }}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.brandLogo}>
            <span>🍱</span>
          </div>
          <div>
            <div className={styles.brandName}>AharSetu</div>
            <div className={styles.brandSub}>Canteen ERP</div>
          </div>
        </div>

        <div className={styles.sidebarRole}>
          <div className={styles.roleAvatar}>{ROLE_ICONS[role]}</div>
          <div>
            <div className={styles.roleName}>{ROLE_NAMES[role]}</div>
            <div className={styles.roleLabel}>{ROLE_LABELS[role]}</div>
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map(item => {
            const isActive = currentPath === item.href || (currentPath.startsWith(item.href.split('?')[0]) && item.href.includes(currentPath.split('?')[1]));
            return (
              <button
                key={item.href}
                className={`${styles.navItem} ${currentPath === item.href.split('?')[0] && !item.href.includes('?') ? styles.active : ''}`}
                onClick={() => router.push(item.href)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.footerLabel}>Switch Role</div>
          <div className={styles.roleGrid}>
            {ALL_ROLES.map(r => (
              <button
                key={r}
                onClick={() => handleSwitchRole(r)}
                className={`${styles.roleChip} ${r === role ? styles.roleChipActive : ''}`}
                style={r === role ? { background: colors.accent, color: '#fff' } : {}}
                title={ROLE_LABELS[r]}
              >
                {ROLE_ICONS[r]}
              </button>
            ))}
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerTitle}>{ROLE_LABELS[role]} Dashboard</div>
          </div>
          <div className={styles.headerRight}>
            {/* Quick Role Switch Buttons */}
            <div className={styles.quickSwitch}>
              {ALL_ROLES.map(r => (
                <button
                  key={r}
                  onClick={() => handleSwitchRole(r)}
                  className={`${styles.quickRoleBtn} ${r === role ? styles.quickRoleBtnActive : ''}`}
                  style={r === role ? { background: ROLE_COLORS[r].accent, color: '#fff', borderColor: ROLE_COLORS[r].accent } : {}}
                  title={`Switch to ${ROLE_LABELS[r]}`}
                >
                  {ROLE_ICONS[r]} {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
            <div className={styles.headerUser}>
              <div className={styles.userDot} style={{ background: colors.accent }} />
              <span className={styles.userName}>{ROLE_NAMES[role]}</span>
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
