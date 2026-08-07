// ── AharSetu Seed Data ────────────────────────────────────────────────────────

const d = (daysAgo, hoursAgo = 0) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  dt.setHours(dt.getHours() - hoursAgo);
  return dt.toISOString();
};

export const SEED_ORDERS = [
  // ── ORD-001: Waiting for Principal Approval ───────────────────────────────
  {
    id: 'ORD-001',
    title: 'Tea for Morning Meeting',
    purpose: 'Weekly staff coordination meeting',
    items: [
      { name: 'Tea',     quantity: 15, price: 0 },
      { name: 'Biscuits', quantity: 15, price: 0 },
    ],
    createdBy: { name: 'Priya Sharma', role: 'coordinator' },
    status: 'Sent for Approval',
    createdAt: d(1, 3),
    updatedAt: d(1, 2),
    principalApproval: { status: null,       remarks: '',                   reviewedAt: '' },
    dcrApproval:       { status: null,       remarks: '',                   reviewedAt: '' },
    billAmount: 0,
    billGeneratedAt: '',
    notified: { coordinator: false, principal: false, dcr: false },
    history: [
      { action: 'Order Created',        role: 'coordinator', user: 'Priya Sharma', timestamp: d(1, 3), remarks: '' },
      { action: 'Submitted for Approval', role: 'coordinator', user: 'Priya Sharma', timestamp: d(1, 2), remarks: '' },
    ],
  },

  // ── ORD-002: Waiting for DCR Approval ────────────────────────────────────
  {
    id: 'ORD-002',
    title: 'Lunch for Board Meeting',
    purpose: 'Annual board review session with guests',
    items: [
      { name: 'Lunch',       quantity: 12, price: 0 },
      { name: 'Cold Drinks', quantity: 12, price: 0 },
      { name: 'Water',       quantity: 20, price: 0 },
    ],
    createdBy: { name: 'Ravi Kumar', role: 'coordinator' },
    status: 'Principal Approved',
    createdAt: d(3, 5),
    updatedAt: d(2, 1),
    principalApproval: { status: 'approved', remarks: 'Approved. Ensure quality food.',    reviewedAt: d(2, 4) },
    dcrApproval:       { status: null,       remarks: '',                                  reviewedAt: '' },
    billAmount: 0,
    billGeneratedAt: '',
    notified: { coordinator: false, principal: false, dcr: false },
    history: [
      { action: 'Order Created',          role: 'coordinator', user: 'Ravi Kumar',    timestamp: d(3, 5),  remarks: '' },
      { action: 'Submitted for Approval', role: 'coordinator', user: 'Ravi Kumar',    timestamp: d(3, 3),  remarks: '' },
      { action: 'Principal Reviewed',     role: 'principal',   user: 'Dr. A. Mehta',  timestamp: d(2, 4),  remarks: 'Ensure quality food.' },
      { action: 'Principal Approved',     role: 'principal',   user: 'Dr. A. Mehta',  timestamp: d(2, 4),  remarks: 'Approved. Ensure quality food.' },
    ],
  },

  // ── ORD-003: Waiting for Vendor (DCR Approved) ────────────────────────────
  {
    id: 'ORD-003',
    title: 'Snacks for Training Session',
    purpose: 'New employee orientation & training',
    items: [
      { name: 'Tea',    quantity: 30, price: 0 },
      { name: 'Coffee', quantity: 20, price: 0 },
      { name: 'Snacks', quantity: 30, price: 0 },
    ],
    createdBy: { name: 'Anita Desai', role: 'coordinator' },
    status: 'DCR Approved',
    createdAt: d(5, 2),
    updatedAt: d(4, 1),
    principalApproval: { status: 'approved', remarks: 'Good. Proceed.',                     reviewedAt: d(4, 6) },
    dcrApproval:       { status: 'approved', remarks: 'Budget verified. Approved.',          reviewedAt: d(4, 1) },
    billAmount: 0,
    billGeneratedAt: '',
    notified: { coordinator: false, principal: false, dcr: false },
    history: [
      { action: 'Order Created',          role: 'coordinator', user: 'Anita Desai',   timestamp: d(5, 2),  remarks: '' },
      { action: 'Submitted for Approval', role: 'coordinator', user: 'Anita Desai',   timestamp: d(5, 1),  remarks: '' },
      { action: 'Principal Approved',     role: 'principal',   user: 'Dr. A. Mehta',  timestamp: d(4, 6),  remarks: 'Good. Proceed.' },
      { action: 'DCR Approved',           role: 'dcr',         user: 'S. Patil (DCR)', timestamp: d(4, 1), remarks: 'Budget verified. Approved.' },
    ],
  },

  // ── ORD-004: Completed with Bill ─────────────────────────────────────────
  {
    id: 'ORD-004',
    title: 'Tea & Coffee for Visitor Day',
    purpose: 'Welcome tea for industry partner delegation',
    items: [
      { name: 'Tea',    quantity: 25, price: 10 },
      { name: 'Coffee', quantity: 20, price: 15 },
      { name: 'Snacks', quantity: 25, price: 30 },
    ],
    createdBy: { name: 'Priya Sharma', role: 'coordinator' },
    status: 'Completed',
    createdAt: d(10, 2),
    updatedAt: d(7, 0),
    principalApproval: { status: 'approved', remarks: 'Approved for visitor day.',     reviewedAt: d(9, 4) },
    dcrApproval:       { status: 'approved', remarks: 'Verified. Proceed.',            reviewedAt: d(8, 6) },
    billAmount: 1300,
    billGeneratedAt: d(7, 2),
    notified: { coordinator: true, principal: true, dcr: true },
    history: [
      { action: 'Order Created',           role: 'coordinator', user: 'Priya Sharma',  timestamp: d(10, 2), remarks: '' },
      { action: 'Submitted for Approval',  role: 'coordinator', user: 'Priya Sharma',  timestamp: d(10, 1), remarks: '' },
      { action: 'Principal Approved',      role: 'principal',   user: 'Dr. A. Mehta',  timestamp: d(9, 4),  remarks: 'Approved for visitor day.' },
      { action: 'DCR Approved',            role: 'dcr',         user: 'S. Patil (DCR)', timestamp: d(8, 6), remarks: 'Verified. Proceed.' },
      { action: 'Prices Updated by Vendor', role: 'vendor',     user: 'M. Khan (Vendor)', timestamp: d(7, 4), remarks: 'Tea ₹10, Coffee ₹15, Snacks ₹30' },
      { action: 'Order Confirmed',         role: 'vendor',      user: 'M. Khan (Vendor)', timestamp: d(7, 3), remarks: 'Order prepared and served.' },
      { action: 'Bill Generated',          role: 'admin',       user: 'System',         timestamp: d(7, 2),  remarks: 'Total: ₹1300' },
      { action: 'Order Completed',         role: 'admin',       user: 'System',         timestamp: d(7, 0),  remarks: 'Notified all parties.' },
    ],
  },

  // ── ORD-005: Rejected then Resubmitted scenario ───────────────────────────
  {
    id: 'ORD-005',
    title: 'Breakfast for Workshop',
    purpose: 'All-day faculty development workshop',
    items: [
      { name: 'Breakfast',  quantity: 40, price: 0 },
      { name: 'Tea',        quantity: 80, price: 0 },
      { name: 'Lunch',      quantity: 40, price: 0 },
    ],
    createdBy: { name: 'Ravi Kumar', role: 'coordinator' },
    status: 'Sent for Approval',
    createdAt: d(0, 4),
    updatedAt: d(0, 1),
    principalApproval: { status: null, remarks: '', reviewedAt: '' },
    dcrApproval:       { status: null, remarks: '', reviewedAt: '' },
    billAmount: 0,
    billGeneratedAt: '',
    notified: { coordinator: false, principal: false, dcr: false },
    history: [
      { action: 'Order Created (Resubmission)', role: 'coordinator', user: 'Ravi Kumar', timestamp: d(0, 4), remarks: 'Resubmitted after adding more details.' },
      { action: 'Previously Rejected by Principal', role: 'principal', user: 'Dr. A. Mehta', timestamp: d(1, 6), remarks: 'Budget seems high. Please justify quantities.' },
      { action: 'Submitted for Approval',       role: 'coordinator', user: 'Ravi Kumar', timestamp: d(0, 1), remarks: '' },
    ],
  },
];
