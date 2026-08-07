// ── AharSetu v2.0 Constants ───────────────────────────────────────────────────

export const COLLEGE_INFO = {
  name: 'AharSetu Institute of Education',
  shortName: 'AharSetu',
  address: 'College Campus, Education District',
  phone: '+91 79 1234 5678',
  email: 'info@aharsetu.edu.in',
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
  COORDINATOR: 'coordinator',
  PRINCIPAL:   'principal',
  DCR:         'dcr',
  VENDOR:      'vendor',
  ADMIN:       'admin',
};

export const ROLE_LABELS = {
  coordinator: 'Coordinator',
  principal:   'Principal',
  dcr:         'DCR',
  vendor:      'Canteen Vendor',
  admin:       'System / Admin',
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

export const VENDOR_STATUS = {
  OPEN:                   'open',
  CLOSED:                 'closed',
  TEMPORARILY_UNAVAILABLE:'temporarily_unavailable',
};

export const VENDOR_STATUS_LABELS = {
  open:                    'Open',
  closed:                  'Closed',
  temporarily_unavailable: 'Temporarily Unavailable',
};

export const VENDOR_STATUS_COLORS = {
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
};

export const STATUS_COLORS = {
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
  'Bill Generated':                { bg: '#F0FDFA', text: '#0D9488',  border: '#99F6E4' },
  'Completed':                     { bg: '#DCFCE7', text: '#166534',  border: '#86EFAC' },
};

export const PIPELINE_STAGES = [
  { key: 'coordinator', label: 'Order Created',     icon: '📝', role: 'coordinator' },
  { key: 'sent',        label: 'Sent for Approval', icon: '📤', role: 'coordinator' },
  { key: 'principal',   label: 'Principal Review',  icon: '🎓', role: 'principal'   },
  { key: 'dcr',         label: 'DCR Review',        icon: '📋', role: 'dcr'         },
  { key: 'vendor',      label: 'Vendor Processing', icon: '🍽️', role: 'vendor'      },
  { key: 'confirmed',   label: 'Vendor Confirmed',  icon: '✔️', role: 'vendor'      },
  { key: 'bill',        label: 'Bill Generated',    icon: '🧾', role: 'admin'       },
  { key: 'completed',   label: 'Completed',         icon: '✅', role: 'admin'       },
];

export const STATUS_TO_STAGE = {
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
