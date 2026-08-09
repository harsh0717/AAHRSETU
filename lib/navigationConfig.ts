// ── AharSetu Centralized Navigation Registry ─────────────────────────────────

export interface NavItem {
  id: string;
  labelKey: string;
  href: string;
  icon: string;
  role: 'coordinator' | 'principal' | 'dcr' | 'vendor' | 'admin';
}

export const NAVIGATION_CONFIG: Record<string, NavItem[]> = {
  coordinator: [
    { id: 'dashboard',    labelKey: 'nav.dashboard',        href: '/coordinator',                icon: '🏠', role: 'coordinator' },
    { id: 'create',       labelKey: 'nav.create_order',     href: '/coordinator/orders/create',   icon: '➕', role: 'coordinator' },
    { id: 'orders',       labelKey: 'nav.my_orders',        href: '/coordinator/orders',          icon: '📦', role: 'coordinator' },
    { id: 'pending',      labelKey: 'nav.pending_orders',   href: '/coordinator/orders/pending',  icon: '⏳', role: 'coordinator' },
    { id: 'completed',    labelKey: 'nav.completed_orders', href: '/coordinator/orders/completed',icon: '✅', role: 'coordinator' },
    { id: 'rejected',     labelKey: 'nav.rejected_orders',  href: '/coordinator/orders/rejected', icon: '❌', role: 'coordinator' },
    { id: 'bills',        labelKey: 'nav.bills',            href: '/coordinator/bills',           icon: '🧾', role: 'coordinator' },
    { id: 'notifications',labelKey: 'nav.notifications',    href: '/coordinator/notifications',   icon: '🔔', role: 'coordinator' },
    { id: 'profile',      labelKey: 'nav.profile',          href: '/coordinator/profile',         icon: '👤', role: 'coordinator' },
    { id: 'settings',     labelKey: 'nav.settings',         href: '/coordinator/settings',        icon: '⚙️', role: 'coordinator' },
  ],
  principal: [
    { id: 'dashboard',    labelKey: 'nav.dashboard',        href: '/principal',                   icon: '🏠', role: 'principal' },
    { id: 'queue',        labelKey: 'nav.approval_queue',   href: '/principal/approvals',         icon: '⏳', role: 'principal' },
    { id: 'approved',     labelKey: 'nav.approved_orders',  href: '/principal/approved',          icon: '✅', role: 'principal' },
    { id: 'rejected',     labelKey: 'nav.rejected_orders',  href: '/principal/rejected',          icon: '❌', role: 'principal' },
    { id: 'history',      labelKey: 'nav.order_history',    href: '/principal/history',           icon: '📜', role: 'principal' },
    { id: 'bills',        labelKey: 'nav.bills',            href: '/principal/bills',             icon: '🧾', role: 'principal' },
    { id: 'notifications',labelKey: 'nav.notifications',    href: '/principal/notifications',     icon: '🔔', role: 'principal' },
    { id: 'profile',      labelKey: 'nav.profile',          href: '/principal/profile',           icon: '👤', role: 'principal' },
    { id: 'settings',     labelKey: 'nav.settings',         href: '/principal/settings',          icon: '⚙️', role: 'principal' },
  ],
  dcr: [
    { id: 'dashboard',    labelKey: 'nav.dashboard',        href: '/dcr',                         icon: '🏠', role: 'dcr' },
    { id: 'queue',        labelKey: 'nav.approval_queue',   href: '/dcr/approvals',               icon: '⏳', role: 'dcr' },
    { id: 'approved',     labelKey: 'nav.approved_orders',  href: '/dcr/approved',                icon: '✅', role: 'dcr' },
    { id: 'rejected',     labelKey: 'nav.rejected_orders',  href: '/dcr/rejected',                icon: '❌', role: 'dcr' },
    { id: 'history',      labelKey: 'nav.audit_history',    href: '/dcr/history',                 icon: '📜', role: 'dcr' },
    { id: 'reports',      labelKey: 'nav.reports',          href: '/dcr/reports',                 icon: '📊', role: 'dcr' },
    { id: 'bills',        labelKey: 'nav.bills',            href: '/dcr/bills',                   icon: '🧾', role: 'dcr' },
    { id: 'notifications',labelKey: 'nav.notifications',    href: '/dcr/notifications',           icon: '🔔', role: 'dcr' },
    { id: 'profile',      labelKey: 'nav.profile',          href: '/dcr/profile',                 icon: '👤', role: 'dcr' },
    { id: 'settings',     labelKey: 'nav.settings',         href: '/dcr/settings',                icon: '⚙️', role: 'dcr' },
  ],
  vendor: [
    { id: 'dashboard',    labelKey: 'nav.dashboard',        href: '/vendor',                      icon: '🏠', role: 'vendor' },
    { id: 'incoming',     labelKey: 'nav.incoming_orders',  href: '/vendor/orders/incoming',      icon: '📥', role: 'vendor' },
    { id: 'active',       labelKey: 'nav.active_orders',    href: '/vendor/orders/active',        icon: '📋', role: 'vendor' },
    { id: 'completed',    labelKey: 'nav.completed_orders', href: '/vendor/orders/completed',     icon: '✅', role: 'vendor' },
    { id: 'modifications',labelKey: 'nav.mod_requests',     href: '/vendor/modifications',        icon: '🔄', role: 'vendor' },
    { id: 'menu',         labelKey: 'nav.menu_mgmt',        href: '/vendor/menu',                 icon: '🍽️', role: 'vendor' },
    { id: 'availability', labelKey: 'nav.availability',     href: '/vendor/availability',         icon: '⚡', role: 'vendor' },
    { id: 'revenue',      labelKey: 'nav.revenue',          href: '/vendor/revenue',              icon: '💰', role: 'vendor' },
    { id: 'bills',        labelKey: 'nav.bills',            href: '/vendor/bills',                icon: '🧾', role: 'vendor' },
    { id: 'notifications',labelKey: 'nav.notifications',    href: '/vendor/notifications',        icon: '🔔', role: 'vendor' },
    { id: 'profile',      labelKey: 'nav.profile',          href: '/vendor/profile',              icon: '👤', role: 'vendor' },
    { id: 'settings',     labelKey: 'nav.settings',         href: '/vendor/settings',             icon: '⚙️', role: 'vendor' },
  ],
  admin: [
    { id: 'dashboard',    labelKey: 'nav.dashboard',        href: '/admin',                       icon: '🏠', role: 'admin' },
    { id: 'users',        labelKey: 'nav.users',            href: '/admin/users',                 icon: '👥', role: 'admin' },
    { id: 'departments',  labelKey: 'nav.departments',      href: '/admin/departments',           icon: '🏢', role: 'admin' },
    { id: 'vendors',      labelKey: 'nav.vendors',          href: '/admin/vendors',               icon: '🏪', role: 'admin' },
    { id: 'orders',       labelKey: 'nav.all_orders',       href: '/admin/orders',                icon: '📦', role: 'admin' },
    { id: 'bills',        labelKey: 'nav.bills',            href: '/admin/bills',                 icon: '🧾', role: 'admin' },
    { id: 'reports',      labelKey: 'nav.reports',          href: '/admin/reports',               icon: '📊', role: 'admin' },
    { id: 'analytics',    labelKey: 'nav.analytics',        href: '/admin/analytics',             icon: '📈', role: 'admin' },
    { id: 'notifications',labelKey: 'nav.notifications',    href: '/admin/notifications',         icon: '🔔', role: 'admin' },
    { id: 'audit',        labelKey: 'nav.audit_logs',       href: '/admin/audit-logs',            icon: '📜', role: 'admin' },
    { id: 'settings',     labelKey: 'nav.settings',         href: '/admin/settings',              icon: '⚙️', role: 'admin' },
    { id: 'health',       labelKey: 'nav.system_health',    href: '/admin/system-health',         icon: '❤️', role: 'admin' },
    { id: 'profile',      labelKey: 'nav.profile',          href: '/admin/profile',               icon: '👤', role: 'admin' },
  ]
};
