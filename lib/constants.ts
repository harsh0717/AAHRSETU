// ── AharSetu v2.0 Constants ───────────────────────────────────────────────────
// NOTE: 'dcr' role is being migrated to 'administration'. Both keys are kept
// here so that existing sessions continue working during the DB migration.

export const COLLEGE_INFO = {
  name: 'AaharSetu Institute of Education',
  shortName: 'AaharSetu',
  address: 'College Campus, Education District',
  phone: '+91 79 1234 5678',
  email: 'info@aaharsetu.edu.in',
  logo: '🍱',
};

export const DEPARTMENTS = [
  { id: 'diploma',        name: 'Diploma',           label: 'Diploma Department' },
  { id: 'degree',         name: 'Degree',            label: 'Degree Department' },
  { id: 'pharmacy',       name: 'Pharmacy',          label: 'Pharmacy Department' },
  { id: 'physiotherapy',  name: 'Physiotherapy',     label: 'Physiotherapy Department' },
  { id: 'nursing',        name: 'Nursing',           label: 'Nursing Department' },
  { id: 'bsc',            name: 'B.Sc./Paramedical', label: 'B.Sc./Paramedical Department' },
];

// Which departments each principal type oversees
export const PRINCIPAL_DEPT_MAP = {
  'principal-dd':     ['diploma', 'degree'],
  'principal-pharma': ['pharmacy'],
  'principal-physio': ['physiotherapy'],
  'principal-nursing':['nursing'],
  'principal-bsc':    ['bsc'],
};

export const ROLES = {
  COORDINATOR:    'coordinator',
  PRINCIPAL:      'principal',
  DCR:            'dcr',            // Legacy — aliased to ADMINISTRATION
  ADMINISTRATION: 'administration', // Canonical role name for DCR
  VENDOR:         'vendor',
  ADMIN:          'admin',
};

export const ROLE_OPTIONS = [
  { key: 'coordinator', label: 'Coordinator', icon: '👤' },
  { key: 'principal', label: 'Principal', icon: '🎓' },
  { key: 'administration', label: 'Administration', icon: '🏛️' },
  { key: 'vendor', label: 'Canteen Vendor', icon: '🍽️' },
  { key: 'admin', label: 'System Admin', icon: '⚙️' },
];

export const ROLE_LABELS: Record<string, string> = {
  coordinator:    'Coordinator',
  principal:      'Principal',
  dcr:            'Administration',
  administration: 'Administration',
  vendor:         'Canteen Vendor',
  admin:          'System Admin',
};

export const ROLE_COLORS: Record<string, { 
  accent: string; 
  sidebar: string; 
  sidebarText: string;
  sidebarTextMuted: string;
  sidebarHoverBg: string;
  sidebarActiveBg: string;
  sidebarBorder: string;
  light: string; 
  text: string;
}> = {
  coordinator: { 
    accent: '#2563EB',
    sidebar: '#EFF6FF',
    sidebarText: '#1E3A8A',
    sidebarTextMuted: '#3B82F6',
    sidebarHoverBg: '#DBEAFE',
    sidebarActiveBg: '#DBEAFE',
    sidebarBorder: '#BFDBFE',
    light: '#EFF6FF', 
    text: '#1E3A8A' 
  },
  principal: { 
    accent: '#2563EB',
    sidebar: '#EFF6FF',
    sidebarText: '#1E3A8A',
    sidebarTextMuted: '#3B82F6',
    sidebarHoverBg: '#DBEAFE',
    sidebarActiveBg: '#DBEAFE',
    sidebarBorder: '#BFDBFE',
    light: '#EFF6FF', 
    text: '#1E3A8A' 
  },
  dcr: { 
    accent: '#0D9488',
    sidebar: '#F0FDFA',
    sidebarText: '#0F766E',
    sidebarTextMuted: '#14B8A6',
    sidebarHoverBg: '#CCFBF1',
    sidebarActiveBg: '#CCFBF1',
    sidebarBorder: '#99F6E4',
    light: '#F0FDFA', 
    text: '#0F766E' 
  },
  administration: { 
    accent: '#0D9488',
    sidebar: '#F0FDFA',
    sidebarText: '#0F766E',
    sidebarTextMuted: '#14B8A6',
    sidebarHoverBg: '#CCFBF1',
    sidebarActiveBg: '#CCFBF1',
    sidebarBorder: '#99F6E4',
    light: '#F0FDFA', 
    text: '#0F766E' 
  },
  vendor: { 
    accent: '#2563EB',
    sidebar: '#EFF6FF',
    sidebarText: '#1E3A8A',
    sidebarTextMuted: '#3B82F6',
    sidebarHoverBg: '#DBEAFE',
    sidebarActiveBg: '#DBEAFE',
    sidebarBorder: '#BFDBFE',
    light: '#EFF6FF', 
    text: '#1E3A8A' 
  },
  admin: { 
    accent: '#2563EB',
    sidebar: '#EFF6FF',
    sidebarText: '#1E3A8A',
    sidebarTextMuted: '#3B82F6',
    sidebarHoverBg: '#DBEAFE',
    sidebarActiveBg: '#DBEAFE',
    sidebarBorder: '#BFDBFE',
    light: '#EFF6FF', 
    text: '#1E3A8A' 
  },
};

export const ROLE_ICONS: Record<string, string> = {
  coordinator:    '👤',
  principal:      '🎓',
  dcr:            '🏛️',  // Legacy — shown as Administration
  administration: '🏛️',
  vendor:         '🍽️',
  admin:          '⚙️',
};

export const VENDOR_STATUS = {
  OPEN:                   'open',
  CLOSED:                 'closed',
  TEMPORARILY_UNAVAILABLE:'temporarily_unavailable',
};

export const VENDOR_STATUS_LABELS: Record<string, string> = {
  open:                    'Opened',
  closed:                  'Closed',
  temporarily_unavailable: 'Temporarily Unavailable',
};

export const VENDOR_STATUS_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  open:                    { bg: '#DCFCE7', text: '#166534', border: '#86EFAC', dot: '#22C55E' },
  closed:                  { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', dot: '#EF4444' },
  temporarily_unavailable: { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A', dot: '#F59E0B' },
};

export const STATUS = {
  CREATED:                   'Created',
  SENT_FOR_APPROVAL:         'Sent for Approval',
  PRINCIPAL_REVIEWING:       'Principal Reviewing',
  PRINCIPAL_APPROVED:        'Principal Approved',
  PRINCIPAL_REJECTED:        'Principal Rejected',
  DCR_REVIEWING:             'DCR Reviewing',
  DCR_APPROVED:              'DCR Approved',
  DCR_REJECTED:              'DCR Rejected',
  VENDOR_PROCESSING:         'Vendor Processing',
  VENDOR_CLARIFICATION:      'Vendor Clarification Required',
  COORDINATOR_UPDATED:       'Coordinator Updated',
  VENDOR_CONFIRMED:          'Vendor Confirmed',
  BILL_GENERATED:            'Bill Generated',
  COMPLETED:                 'Completed',
  VENDOR_REJECTED:           'Vendor Rejected',
  PENDING:                   'Pending',
  CANCELLED:                 'Cancelled',
  DRAFT:                     'Draft',
};

export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Draft':                         { bg: '#F8FAFC', text: '#64748B',  border: '#CBD5E1' },
  'Pending':                       { bg: '#F8FAFC', text: '#64748B',  border: '#CBD5E1' },
  'Created':                       { bg: '#F3F4F6', text: '#6B7280',  border: '#D1D5DB' },
  'Sent for Approval':             { bg: '#F3F4F6', text: '#4B5563',  border: '#D1D5DB' },
  'Principal Reviewing':           { bg: '#EFF6FF', text: '#2563EB',  border: '#BFDBFE' },
  'Principal Approved':            { bg: '#F5F3FF', text: '#7C3AED',  border: '#DDD6FE' },
  'Principal Rejected':            { bg: '#FEF2F2', text: '#DC2626',  border: '#FECACA' },
  'DCR Reviewing':                 { bg: '#FFFBEB', text: '#D97706',  border: '#FDE68A' },
  'DCR Approved':                  { bg: '#FFFBEB', text: '#B45309',  border: '#FDE68A' },
  'DCR Rejected':                  { bg: '#FEF2F2', text: '#DC2626',  border: '#FECACA' },
  'Vendor Processing':             { bg: '#ECFDF5', text: '#059669',  border: '#A7F3D0' },
  'Vendor Clarification Required': { bg: '#FFF7ED', text: '#C2410C',  border: '#FDBA74' },
  'Coordinator Updated':           { bg: '#EFF6FF', text: '#1D4ED8',  border: '#93C5FD' },
  'Vendor Confirmed':              { bg: '#ECFDF5', text: '#047857',  border: '#6EE7B7' },
  'Vendor Rejected':               { bg: '#FEF2F2', text: '#DC2626',  border: '#FECACA' },
  'Bill Generated':                { bg: '#F0FDFA', text: '#0D9488',  border: '#99F6E4' },
  'Completed':                     { bg: '#DCFCE7', text: '#166534',  border: '#86EFAC' },
  'Cancelled':                     { bg: '#FEF2F2', text: '#991B1B',  border: '#FCA5A5' },
};

export const PIPELINE_STAGES = [
  { key: 'coordinator', label: 'Order Created',         icon: '📝', role: 'coordinator'    },
  { key: 'sent',        label: 'Sent for Approval',     icon: '📤', role: 'coordinator'    },
  { key: 'principal',   label: 'Principal Review',      icon: '🎓', role: 'principal'      },
  { key: 'dcr',         label: 'Administration Review', icon: '🏛️', role: 'administration' },
  { key: 'vendor',      label: 'Vendor Processing',     icon: '🍽️', role: 'vendor'        },
  { key: 'confirmed',   label: 'Vendor Confirmed',      icon: '✔️', role: 'vendor'        },
  { key: 'bill',        label: 'Bill Generated',        icon: '🧾', role: 'admin'         },
  { key: 'completed',   label: 'Completed',             icon: '✅', role: 'admin'         },
];

export const STATUS_TO_STAGE: Record<string, number> = {
  'Created':                       0,
  'Sent for Approval':             1,
  'Principal Reviewing':           2,
  'Principal Approved':            2,
  'Principal Rejected':            2,
  'DCR Reviewing':                 3,
  'DCR Approved':                  3,
  'DCR Rejected':                  3,
  'Vendor Processing':             4,
  'Vendor Clarification Required': 4,
  'Coordinator Updated':           4,
  'Vendor Confirmed':              5,
  'Bill Generated':                6,
  'Completed':                     7,
};

export const LANGUAGES = [
  { code: 'en', label: 'EN',  nativeLabel: 'English' },
  { code: 'hi', label: 'हिं', nativeLabel: 'हिन्दी' },
  { code: 'gu', label: 'ગુ',  nativeLabel: 'ગુજરાતી' },
];
