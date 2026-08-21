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
    { id: 'dashboard',    labelKey: 'nav.dashboard',        href: '/coordinator',                icon: 'dashboard', role: 'coordinator' },
    { id: 'create',       labelKey: 'nav.create_order',     href: '/coordinator/orders/create',   icon: 'create', role: 'coordinator' },
    { id: 'orders',       labelKey: 'nav.my_orders',        href: '/coordinator/orders',          icon: 'orders', role: 'coordinator' },
    { id: 'pending',      labelKey: 'nav.pending_orders',   href: '/coordinator/orders/pending',  icon: 'pending', role: 'coordinator' },
    { id: 'completed',    labelKey: 'nav.completed_orders', href: '/coordinator/orders/completed',icon: 'completed', role: 'coordinator' },
    { id: 'rejected',     labelKey: 'nav.rejected_orders',  href: '/coordinator/orders/rejected', icon: 'rejected', role: 'coordinator' },
    { id: 'bills',        labelKey: 'nav.bills',            href: '/coordinator/bills',           icon: 'bills', role: 'coordinator' },
    { id: 'notifications',labelKey: 'nav.notifications',    href: '/coordinator/notifications',   icon: 'notifications', role: 'coordinator' },
    { id: 'profile',      labelKey: 'nav.profile',          href: '/coordinator/profile',         icon: 'profile', role: 'coordinator' },
    { id: 'settings',     labelKey: 'nav.settings',         href: '/coordinator/settings',        icon: 'settings', role: 'coordinator' },
  ],
  principal: [
    { id: 'dashboard',    labelKey: 'nav.dashboard',        href: '/principal',                   icon: 'dashboard', role: 'principal' },
    { id: 'create',       labelKey: 'nav.create_order',     href: '/coordinator/orders/create',   icon: 'create', role: 'principal' },
    { id: 'queue',        labelKey: 'nav.approval_queue',   href: '/principal/approvals',         icon: 'queue', role: 'principal' },
    { id: 'approved',     labelKey: 'nav.approved_orders',  href: '/principal/approved',          icon: 'approved', role: 'principal' },
    { id: 'rejected',     labelKey: 'nav.rejected_orders',  href: '/principal/rejected',          icon: 'rejected', role: 'principal' },
    { id: 'history',      labelKey: 'nav.order_history',    href: '/principal/history',           icon: 'history', role: 'principal' },
    { id: 'bills',        labelKey: 'nav.bills',            href: '/principal/bills',             icon: 'bills', role: 'principal' },
    { id: 'notifications',labelKey: 'nav.notifications',    href: '/principal/notifications',     icon: 'notifications', role: 'principal' },
    { id: 'profile',      labelKey: 'nav.profile',          href: '/principal/profile',           icon: 'profile', role: 'principal' },
    { id: 'settings',     labelKey: 'nav.settings',         href: '/principal/settings',          icon: 'settings', role: 'principal' },
  ],
  dcr: [
    { id: 'dashboard',    labelKey: 'nav.dashboard',        href: '/dcr',                         icon: 'dashboard', role: 'dcr' },
    { id: 'queue',        labelKey: 'nav.approval_queue',   href: '/dcr/approvals',               icon: 'queue', role: 'dcr' },
    { id: 'approved',     labelKey: 'nav.approved_orders',  href: '/dcr/approved',                icon: 'approved', role: 'dcr' },
    { id: 'rejected',     labelKey: 'nav.rejected_orders',  href: '/dcr/rejected',                icon: 'rejected', role: 'dcr' },
    { id: 'history',      labelKey: 'nav.audit_history',    href: '/dcr/history',                 icon: 'history', role: 'dcr' },
    { id: 'reports',      labelKey: 'nav.reports',          href: '/dcr/reports',                 icon: 'reports', role: 'dcr' },
    { id: 'bills',        labelKey: 'nav.bills',            href: '/dcr/bills',                   icon: 'bills', role: 'dcr' },
    { id: 'notifications',labelKey: 'nav.notifications',    href: '/dcr/notifications',           icon: 'notifications', role: 'dcr' },
    { id: 'profile',      labelKey: 'nav.profile',          href: '/dcr/profile',                 icon: 'profile', role: 'dcr' },
    { id: 'settings',     labelKey: 'nav.settings',         href: '/dcr/settings',                icon: 'settings', role: 'dcr' },
  ],
  vendor: [
    { id: 'dashboard',    labelKey: 'nav.dashboard',        href: '/vendor',                      icon: 'dashboard', role: 'vendor' },
    { id: 'incoming',     labelKey: 'nav.incoming_orders',  href: '/vendor/orders/incoming',      icon: 'incoming', role: 'vendor' },
    { id: 'active',       labelKey: 'nav.active_orders',    href: '/vendor/orders/active',        icon: 'active', role: 'vendor' },
    { id: 'completed',    labelKey: 'nav.completed_orders', href: '/vendor/orders/completed',     icon: 'completed', role: 'vendor' },
    { id: 'modifications',labelKey: 'nav.mod_requests',     href: '/vendor/modifications',        icon: 'modifications', role: 'vendor' },
    { id: 'menu',         labelKey: 'nav.menu_mgmt',        href: '/vendor/menu',                 icon: 'menu', role: 'vendor' },
    { id: 'availability', labelKey: 'nav.availability',     href: '/vendor/availability',         icon: 'availability', role: 'vendor' },
    { id: 'revenue',      labelKey: 'nav.revenue',          href: '/vendor/revenue',              icon: 'revenue', role: 'vendor' },
    { id: 'bills',        labelKey: 'nav.bills',            href: '/vendor/bills',                icon: 'bills', role: 'vendor' },
    { id: 'notifications',labelKey: 'nav.notifications',    href: '/vendor/notifications',        icon: 'notifications', role: 'vendor' },
    { id: 'profile',      labelKey: 'nav.profile',          href: '/vendor/profile',              icon: 'profile', role: 'vendor' },
    { id: 'settings',     labelKey: 'nav.settings',         href: '/vendor/settings',             icon: 'settings', role: 'vendor' },
  ],
  admin: [
    { id: 'dashboard',    labelKey: 'nav.dashboard',        href: '/admin',                       icon: 'dashboard', role: 'admin' },
    { id: 'users',        labelKey: 'nav.users',            href: '/admin/users',                 icon: 'users', role: 'admin' },
    { id: 'departments',  labelKey: 'nav.departments',      href: '/admin/departments',           icon: 'departments', role: 'admin' },
    { id: 'vendors',      labelKey: 'nav.vendors',          href: '/admin/vendors',               icon: 'vendors', role: 'admin' },
    { id: 'orders',       labelKey: 'nav.all_orders',       href: '/admin/orders',                icon: 'orders', role: 'admin' },
    { id: 'bills',        labelKey: 'nav.bills',            href: '/admin/bills',                 icon: 'bills', role: 'admin' },
    { id: 'reports',      labelKey: 'nav.reports',          href: '/admin/reports',               icon: 'reports', role: 'admin' },
    { id: 'analytics',    labelKey: 'nav.analytics',        href: '/admin/analytics',             icon: 'analytics', role: 'admin' },
    { id: 'notifications',labelKey: 'nav.notifications',    href: '/admin/notifications',         icon: 'notifications', role: 'admin' },
    { id: 'audit',        labelKey: 'nav.audit_logs',       href: '/admin/audit-logs',            icon: 'audit', role: 'admin' },
    { id: 'settings',     labelKey: 'nav.settings',         href: '/admin/settings',              icon: 'settings', role: 'admin' },
    { id: 'health',       labelKey: 'nav.system_health',    href: '/admin/system-health',         icon: 'health', role: 'admin' },
    { id: 'profile',      labelKey: 'nav.profile',          href: '/admin/profile',               icon: 'profile', role: 'admin' },
  ]
};
