// ── AharSetu v2.0 Seed Orders ─────────────────────────────────────────────────
// Uses the new MasterOrder + VendorOrders data model

const d = (daysAgo, hoursAgo = 0) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  dt.setHours(dt.getHours() - hoursAgo);
  return dt.toISOString();
};

export const SEED_ORDERS = [
  // ── ORD-001: Diploma — Waiting for Principal ──────────────────────────────
  {
    id: 'ORD-001',
    title: 'Tea for Morning Meeting',
    purpose: 'Weekly staff coordination meeting',
    department: 'diploma',
    departmentLabel: 'Diploma Department',
    createdBy: { id: 'u-coord-diploma', name: 'Priya Sharma', role: 'coordinator', department: 'diploma' },
    status: 'Sent for Approval',
    vendorOrders: [
      {
        id: 'VORD-001-1',
        masterOrderId: 'ORD-001',
        vendorId: 'v1',
        vendorName: 'Sharma Canteen',
        items: [
          { name: 'Tea',      quantity: 15, price: 0, vendorId: 'v1', vendorName: 'Sharma Canteen' },
          { name: 'Biscuits', quantity: 15, price: 0, vendorId: 'v1', vendorName: 'Sharma Canteen' },
        ],
        status: 'Pending',
        billAmount: 0,
        invoiceNumber: null,
        modification: null,
      },
    ],
    principalApproval: { status: null, remarks: '', reviewedAt: '', reviewedBy: '' },
    dcrApproval:       { status: null, remarks: '', reviewedAt: '', reviewedBy: '' },
    totalBillAmount: 0,
    billGeneratedAt: '',
    history: [
      { action: 'Order Created',          role: 'coordinator', user: 'Priya Sharma', timestamp: d(1, 3), remarks: '2 items from 1 vendor' },
      { action: 'Submitted for Approval', role: 'coordinator', user: 'Priya Sharma', timestamp: d(1, 2), remarks: '' },
    ],
    createdAt: d(1, 3),
    updatedAt: d(1, 2),
  },

  // ── ORD-002: Degree — Principal Approved, waiting for DCR ─────────────────
  {
    id: 'ORD-002',
    title: 'Lunch for Board Meeting',
    purpose: 'Annual board review session with guests',
    department: 'degree',
    departmentLabel: 'Degree Department',
    createdBy: { id: 'u-coord-degree', name: 'Ravi Kumar', role: 'coordinator', department: 'degree' },
    status: 'Principal Approved',
    vendorOrders: [
      {
        id: 'VORD-002-1',
        masterOrderId: 'ORD-002',
        vendorId: 'v2',
        vendorName: 'Fresh Bites',
        items: [
          { name: 'Lunch (Veg)', quantity: 12, price: 0, vendorId: 'v2', vendorName: 'Fresh Bites' },
          { name: 'Juice',       quantity: 12, price: 0, vendorId: 'v2', vendorName: 'Fresh Bites' },
        ],
        status: 'Pending',
        billAmount: 0,
        invoiceNumber: null,
        modification: null,
      },
    ],
    principalApproval: { status: 'approved', remarks: 'Approved. Ensure quality food.', reviewedAt: d(2, 4), reviewedBy: 'Dr. Arvind Mehta' },
    dcrApproval:       { status: null, remarks: '', reviewedAt: '', reviewedBy: '' },
    totalBillAmount: 0,
    billGeneratedAt: '',
    history: [
      { action: 'Order Created',          role: 'coordinator', user: 'Ravi Kumar',       timestamp: d(3, 5), remarks: '2 items from 1 vendor' },
      { action: 'Submitted for Approval', role: 'coordinator', user: 'Ravi Kumar',       timestamp: d(3, 3), remarks: '' },
      { action: 'Principal Approved',     role: 'principal',   user: 'Dr. Arvind Mehta', timestamp: d(2, 4), remarks: 'Approved. Ensure quality food.' },
    ],
    createdAt: d(3, 5),
    updatedAt: d(2, 4),
  },

  // ── ORD-003: Pharmacy — DCR Approved, waiting for Vendors ─────────────────
  {
    id: 'ORD-003',
    title: 'Snacks for Training Session',
    purpose: 'New employee orientation & training',
    department: 'pharmacy',
    departmentLabel: 'Pharmacy Department',
    createdBy: { id: 'u-coord-pharmacy', name: 'Anita Desai', role: 'coordinator', department: 'pharmacy' },
    status: 'DCR Approved',
    vendorOrders: [
      {
        id: 'VORD-003-1',
        masterOrderId: 'ORD-003',
        vendorId: 'v1',
        vendorName: 'Sharma Canteen',
        items: [
          { name: 'Tea',    quantity: 30, price: 0, vendorId: 'v1', vendorName: 'Sharma Canteen' },
          { name: 'Coffee', quantity: 20, price: 0, vendorId: 'v1', vendorName: 'Sharma Canteen' },
        ],
        status: 'Pending',
        billAmount: 0,
        invoiceNumber: null,
        modification: null,
      },
      {
        id: 'VORD-003-2',
        masterOrderId: 'ORD-003',
        vendorId: 'v3',
        vendorName: 'Hot Meals',
        items: [
          { name: 'Snacks', quantity: 30, price: 0, vendorId: 'v3', vendorName: 'Hot Meals' },
        ],
        status: 'Pending',
        billAmount: 0,
        invoiceNumber: null,
        modification: null,
      },
    ],
    principalApproval: { status: 'approved', remarks: 'Good. Proceed.', reviewedAt: d(4, 6), reviewedBy: 'Dr. Rekha Sharma' },
    dcrApproval:       { status: 'approved', remarks: 'Budget verified. Approved.', reviewedAt: d(4, 1), reviewedBy: 'S. Patil' },
    totalBillAmount: 0,
    billGeneratedAt: '',
    history: [
      { action: 'Order Created',          role: 'coordinator', user: 'Anita Desai',   timestamp: d(5, 2), remarks: '3 items from 2 vendors' },
      { action: 'Submitted for Approval', role: 'coordinator', user: 'Anita Desai',   timestamp: d(5, 1), remarks: '' },
      { action: 'Principal Approved',     role: 'principal',   user: 'Dr. Rekha Sharma', timestamp: d(4, 6), remarks: 'Good. Proceed.' },
      { action: 'DCR Approved',           role: 'dcr',         user: 'S. Patil',      timestamp: d(4, 1), remarks: 'Budget verified.' },
    ],
    createdAt: d(5, 2),
    updatedAt: d(4, 1),
  },

  // ── ORD-004: Diploma — Completed with Bill ────────────────────────────────
  {
    id: 'ORD-004',
    title: 'Tea & Coffee for Visitor Day',
    purpose: 'Welcome tea for industry partner delegation',
    department: 'diploma',
    departmentLabel: 'Diploma Department',
    createdBy: { id: 'u-coord-diploma', name: 'Priya Sharma', role: 'coordinator', department: 'diploma' },
    status: 'Completed',
    vendorOrders: [
      {
        id: 'VORD-004-1',
        masterOrderId: 'ORD-004',
        vendorId: 'v1',
        vendorName: 'Sharma Canteen',
        items: [
          { name: 'Tea',    quantity: 25, price: 10, vendorId: 'v1', vendorName: 'Sharma Canteen' },
          { name: 'Coffee', quantity: 20, price: 15, vendorId: 'v1', vendorName: 'Sharma Canteen' },
        ],
        status: 'Completed',
        billAmount: 550,
        invoiceNumber: 'INV-2024-001',
        modification: null,
      },
      {
        id: 'VORD-004-2',
        masterOrderId: 'ORD-004',
        vendorId: 'v3',
        vendorName: 'Hot Meals',
        items: [
          { name: 'Snacks', quantity: 25, price: 30, vendorId: 'v3', vendorName: 'Hot Meals' },
        ],
        status: 'Completed',
        billAmount: 750,
        invoiceNumber: 'INV-2024-002',
        modification: null,
      },
    ],
    principalApproval: { status: 'approved', remarks: 'Approved for visitor day.', reviewedAt: d(9, 4), reviewedBy: 'Dr. Arvind Mehta' },
    dcrApproval:       { status: 'approved', remarks: 'Verified. Proceed.',         reviewedAt: d(8, 6), reviewedBy: 'S. Patil' },
    totalBillAmount: 1300,
    billGeneratedAt: d(7, 2),
    history: [
      { action: 'Order Created',          role: 'coordinator', user: 'Priya Sharma',     timestamp: d(10, 2), remarks: '3 items from 2 vendors' },
      { action: 'Submitted for Approval', role: 'coordinator', user: 'Priya Sharma',     timestamp: d(10, 1), remarks: '' },
      { action: 'Principal Approved',     role: 'principal',   user: 'Dr. Arvind Mehta', timestamp: d(9, 4),  remarks: 'Approved for visitor day.' },
      { action: 'DCR Approved',           role: 'dcr',         user: 'S. Patil',         timestamp: d(8, 6),  remarks: 'Verified. Proceed.' },
      { action: 'Vendor Processing',      role: 'vendor',      user: 'M. Khan (V1)',      timestamp: d(7, 5),  remarks: 'Sharma Canteen started processing' },
      { action: 'Vendor Processing',      role: 'vendor',      user: 'S. Shah (V3)',      timestamp: d(7, 5),  remarks: 'Hot Meals started processing' },
      { action: 'Vendor Confirmed',       role: 'vendor',      user: 'M. Khan (V1)',      timestamp: d(7, 3),  remarks: 'Tea ₹10, Coffee ₹15 — Total ₹550' },
      { action: 'Vendor Confirmed',       role: 'vendor',      user: 'S. Shah (V3)',      timestamp: d(7, 3),  remarks: 'Snacks ₹30 — Total ₹750' },
      { action: 'Bill Generated',         role: 'admin',       user: 'System',            timestamp: d(7, 2),  remarks: 'Master Bill: ₹1300 (V1: ₹550, V3: ₹750)' },
      { action: 'Order Completed',        role: 'admin',       user: 'System',            timestamp: d(7, 0),  remarks: 'All parties notified.' },
    ],
    createdAt: d(10, 2),
    updatedAt: d(7, 0),
  },

  // ── ORD-005: Nursing — Rejected, resubmitted ──────────────────────────────
  {
    id: 'ORD-005',
    title: 'Breakfast for Workshop',
    purpose: 'All-day faculty development workshop',
    department: 'nursing',
    departmentLabel: 'Nursing Department',
    createdBy: { id: 'u-coord-nursing', name: 'Kavita Patel', role: 'coordinator', department: 'nursing' },
    status: 'Sent for Approval',
    vendorOrders: [
      {
        id: 'VORD-005-1',
        masterOrderId: 'ORD-005',
        vendorId: 'v2',
        vendorName: 'Fresh Bites',
        items: [
          { name: 'Breakfast', quantity: 40, price: 0, vendorId: 'v2', vendorName: 'Fresh Bites' },
          { name: 'Lunch (Veg)', quantity: 40, price: 0, vendorId: 'v2', vendorName: 'Fresh Bites' },
        ],
        status: 'Pending',
        billAmount: 0,
        invoiceNumber: null,
        modification: null,
      },
      {
        id: 'VORD-005-2',
        masterOrderId: 'ORD-005',
        vendorId: 'v1',
        vendorName: 'Sharma Canteen',
        items: [
          { name: 'Tea', quantity: 80, price: 0, vendorId: 'v1', vendorName: 'Sharma Canteen' },
        ],
        status: 'Pending',
        billAmount: 0,
        invoiceNumber: null,
        modification: null,
      },
    ],
    principalApproval: { status: null, remarks: '', reviewedAt: '', reviewedBy: '' },
    dcrApproval:       { status: null, remarks: '', reviewedAt: '', reviewedBy: '' },
    totalBillAmount: 0,
    billGeneratedAt: '',
    history: [
      { action: 'Order Created',            role: 'coordinator', user: 'Kavita Patel',    timestamp: d(2, 8), remarks: '3 items from 2 vendors' },
      { action: 'Submitted for Approval',   role: 'coordinator', user: 'Kavita Patel',    timestamp: d(2, 7), remarks: '' },
      { action: 'Principal Rejected',       role: 'principal',   user: 'Dr. Sarita Rao',  timestamp: d(1, 6), remarks: 'Quantities seem high. Please revise.' },
      { action: 'Order Edited by Coordinator', role: 'coordinator', user: 'Kavita Patel', timestamp: d(0, 4), remarks: 'Revised quantities as per Principal remarks' },
      { action: 'Re-submitted for Approval', role: 'coordinator', user: 'Kavita Patel',   timestamp: d(0, 3), remarks: '' },
    ],
    createdAt: d(2, 8),
    updatedAt: d(0, 3),
  },
];
