// ── AharSetu Constants ────────────────────────────────────────────────────────

export const ROLES = {
  COORDINATOR: 'coordinator',
  PRINCIPAL: 'principal',
  DCR: 'dcr',
  VENDOR: 'vendor',
  ADMIN: 'admin',
};

export const ROLE_LABELS = {
  coordinator: 'Coordinator',
  principal: 'Principal',
  dcr: 'DCR',
  vendor: 'Canteen Vendor',
  admin: 'System / Admin',
};

export const ROLE_COLORS = {
  coordinator: { accent: '#2563EB', sidebar: '#1E3A8A', light: '#EFF6FF', text: '#1D4ED8' },
  principal:   { accent: '#7C3AED', sidebar: '#4C1D95', light: '#F5F3FF', text: '#6D28D9' },
  dcr:         { accent: '#D97706', sidebar: '#92400E', light: '#FFFBEB', text: '#B45309' },
  vendor:      { accent: '#059669', sidebar: '#064E3B', light: '#ECFDF5', text: '#047857' },
  admin:       { accent: '#DC2626', sidebar: '#7F1D1D', light: '#FEF2F2', text: '#B91C1C' },
};

export const ROLE_ICONS = {
  coordinator: '👤',
  principal:   '🎓',
  dcr:         '📋',
  vendor:      '🍽️',
  admin:       '⚙️',
};

export const STATUS = {
  CREATED:              'Created',
  SENT_FOR_APPROVAL:    'Sent for Approval',
  PRINCIPAL_REVIEWING:  'Principal Reviewing',
  PRINCIPAL_APPROVED:   'Principal Approved',
  PRINCIPAL_REJECTED:   'Principal Rejected',
  DCR_REVIEWING:        'DCR Reviewing',
  DCR_APPROVED:         'DCR Approved',
  DCR_REJECTED:         'DCR Rejected',
  VENDOR_PROCESSING:    'Vendor Processing',
  ORDER_DONE:           'Order Done/Confirmed',
  BILL_GENERATED:       'Bill Generated',
  COMPLETED:            'Completed',
};

export const STATUS_COLORS = {
  'Created':              { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' },
  'Sent for Approval':    { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' },
  'Principal Reviewing':  { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  'Principal Approved':   { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
  'Principal Rejected':   { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  'DCR Reviewing':        { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
  'DCR Approved':         { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  'DCR Rejected':         { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  'Vendor Processing':    { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
  'Order Done/Confirmed': { bg: '#ECFDF5', text: '#047857', border: '#6EE7B7' },
  'Bill Generated':       { bg: '#F0FDFA', text: '#0D9488', border: '#99F6E4' },
  'Completed':            { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' },
};

// Pipeline stages for the stepper
export const PIPELINE_STAGES = [
  { key: 'coordinator', label: 'Order Created', icon: '📝', role: 'coordinator' },
  { key: 'sent',        label: 'Sent for Approval', icon: '📤', role: 'coordinator' },
  { key: 'principal',   label: 'Principal Review', icon: '🎓', role: 'principal' },
  { key: 'dcr',         label: 'DCR Review', icon: '📋', role: 'dcr' },
  { key: 'vendor',      label: 'Vendor Processing', icon: '🍽️', role: 'vendor' },
  { key: 'bill',        label: 'Bill Generated', icon: '🧾', role: 'admin' },
  { key: 'completed',   label: 'Completed', icon: '✅', role: 'admin' },
];

export const STATUS_TO_STAGE = {
  'Created':              0,
  'Sent for Approval':    1,
  'Principal Reviewing':  2,
  'Principal Approved':   2,
  'Principal Rejected':   2,
  'DCR Reviewing':        3,
  'DCR Approved':         3,
  'DCR Rejected':         3,
  'Vendor Processing':    4,
  'Order Done/Confirmed': 4,
  'Bill Generated':       5,
  'Completed':            6,
};

// Default menu items for vendor
export const DEFAULT_MENU_ITEMS = [
  { id: 'm1', name: 'Tea',         price: 10,  unit: 'per cup' },
  { id: 'm2', name: 'Coffee',      price: 15,  unit: 'per cup' },
  { id: 'm3', name: 'Lunch',       price: 80,  unit: 'per plate' },
  { id: 'm4', name: 'Snacks',      price: 30,  unit: 'per plate' },
  { id: 'm5', name: 'Cold Drinks', price: 25,  unit: 'per bottle' },
  { id: 'm6', name: 'Water',       price: 5,   unit: 'per bottle' },
  { id: 'm7', name: 'Breakfast',   price: 50,  unit: 'per plate' },
  { id: 'm8', name: 'Biscuits',    price: 20,  unit: 'per pack' },
];

export const COORDINATOR_NAV = [
  { label: 'Dashboard',    href: '/coordinator',       icon: '🏠' },
  { label: 'Create Order', href: '/coordinator#create', icon: '➕' },
  { label: 'My Orders',    href: '/coordinator#orders', icon: '📦' },
];

export const PRINCIPAL_NAV = [
  { label: 'Dashboard',   href: '/principal',          icon: '🏠' },
  { label: 'Pending',     href: '/principal#pending',  icon: '⏳' },
  { label: 'History',     href: '/principal#history',  icon: '📜' },
];

export const DCR_NAV = [
  { label: 'Dashboard',  href: '/dcr',          icon: '🏠' },
  { label: 'Pending',    href: '/dcr#pending',  icon: '⏳' },
  { label: 'History',    href: '/dcr#history',  icon: '📜' },
];

export const VENDOR_NAV = [
  { label: 'Dashboard',    href: '/vendor',           icon: '🏠' },
  { label: 'Orders Queue', href: '/vendor#orders',    icon: '📋' },
  { label: 'Manage Menu',  href: '/vendor#menu',      icon: '🍽️' },
];

export const ADMIN_NAV = [
  { label: 'Dashboard',   href: '/admin',          icon: '🏠' },
  { label: 'Reports',     href: '/admin#reports',  icon: '📊' },
  { label: 'All Orders',  href: '/admin#orders',   icon: '📦' },
];
