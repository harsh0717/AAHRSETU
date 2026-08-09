// ── AharSetu Enterprise Order Store Service ──────────────────────────────────
import { api } from './api';

export interface OrderItem {
  id?: number;
  name: string;
  quantity: number;
  price: number;
  unit?: string | null;
  menu_item_id: string | null;
}

export interface VendorOrder {
  id: string;
  master_order_id: string;
  vendor_id: string;
  vendor_name?: string;
  status: string;
  bill_amount: number;
  invoice_number: string | null;
  items: OrderItem[];
  modification?: {
    id: number;
    vendor_order_id: string;
    reason: string;
    type: string;
    requested_at: string;
    status: string;
  } | null;
}

export interface ApprovalHistory {
  id?: number;
  master_order_id: string;
  action: string;
  role: string;
  user_name?: string;
  remarks: string;
  timestamp: string;
}

export interface MasterOrder {
  id: string;
  title: string;
  purpose: string;
  department_id: string | null;
  department_label?: string;
  created_by_id: number;
  created_by_name?: string;
  status: string;
  total_bill_amount: number;
  bill_generated_at: string | null;
  created_at: string;
  updated_at: string;
  vendor_orders: VendorOrder[];
  history: ApprovalHistory[];
}

const LOCAL_ORDERS_KEY = 'aharsetu_orders_v3';

// Baseline fallback seed orders for Version 1 parity
const FALLBACK_ORDERS: MasterOrder[] = [
  {
    id: 'ORD-001',
    title: 'Tea for Morning Meeting',
    purpose: 'Staff meeting in main conference room',
    department_id: 'diploma',
    department_label: 'Diploma Department',
    created_by_id: 8,
    created_by_name: 'Priya Sharma',
    status: 'Sent for Approval',
    total_bill_amount: 0,
    bill_generated_at: null,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    vendor_orders: [
      {
        id: 'VORD-001-1',
        master_order_id: 'ORD-001',
        vendor_id: 'v1',
        vendor_name: 'Sharma Canteen',
        status: 'Pending',
        bill_amount: 0,
        invoice_number: null,
        items: [{ id: 1, name: 'Tea', quantity: 15, price: 10.0, unit: 'per cup', menu_item_id: 'v1m1' }]
      }
    ],
    history: [
      { action: 'Order Created', role: 'coordinator', user_name: 'Priya Sharma', remarks: 'Created Order draft', timestamp: new Date(Date.now() - 7200000).toISOString(), master_order_id: 'ORD-001' },
      { action: 'Submitted for Approval', role: 'coordinator', user_name: 'Priya Sharma', remarks: 'Sent to Principal for review', timestamp: new Date(Date.now() - 3600000).toISOString(), master_order_id: 'ORD-001' }
    ]
  },
  {
    id: 'ORD-002',
    title: 'Lunch for Board Meeting',
    purpose: 'Admissions Board Annual Meet',
    department_id: 'degree',
    department_label: 'Degree Department',
    created_by_id: 9,
    created_by_name: 'Ravi Kumar',
    status: 'Principal Approved',
    total_bill_amount: 0,
    bill_generated_at: null,
    created_at: new Date(Date.now() - 18000000).toISOString(),
    updated_at: new Date(Date.now() - 10800000).toISOString(),
    vendor_orders: [
      {
        id: 'VORD-002-1',
        master_order_id: 'ORD-002',
        vendor_id: 'v2',
        vendor_name: 'Fresh Bites',
        status: 'Pending',
        bill_amount: 0,
        invoice_number: null,
        items: [{ id: 2, name: 'Veg Lunch', quantity: 12, price: 80.0, unit: 'per plate', menu_item_id: 'v2m1' }]
      }
    ],
    history: [
      { action: 'Order Created', role: 'coordinator', user_name: 'Ravi Kumar', remarks: 'Created Order draft', timestamp: new Date(Date.now() - 18000000).toISOString(), master_order_id: 'ORD-002' },
      { action: 'Submitted for Approval', role: 'coordinator', user_name: 'Ravi Kumar', remarks: 'Sent to Principal', timestamp: new Date(Date.now() - 14400000).toISOString(), master_order_id: 'ORD-002' },
      { action: 'Principal Approved', role: 'principal', user_name: 'Dr. Arvind Mehta', remarks: 'Approved lunch count', timestamp: new Date(Date.now() - 10800000).toISOString(), master_order_id: 'ORD-002' }
    ]
  },
  {
    id: 'ORD-003',
    title: 'Snacks for Training Session',
    purpose: '3-day orientation program',
    department_id: 'degree',
    department_label: 'Degree Department',
    created_by_id: 9,
    created_by_name: 'Ravi Kumar',
    status: 'Vendor Processing',
    total_bill_amount: 0,
    bill_generated_at: null,
    created_at: new Date(Date.now() - 36000000).toISOString(),
    updated_at: new Date(Date.now() - 25200000).toISOString(),
    vendor_orders: [
      {
        id: 'VORD-003-1',
        master_order_id: 'ORD-003',
        vendor_id: 'v1',
        vendor_name: 'Sharma Canteen',
        status: 'Pending',
        bill_amount: 0,
        invoice_number: null,
        items: [{ id: 3, name: 'Kachori', quantity: 25, price: 18.0, unit: 'per piece', menu_item_id: 'v1m3' }]
      }
    ],
    history: [
      { action: 'Order Created', role: 'coordinator', user_name: 'Ravi Kumar', remarks: 'Created Order draft', timestamp: new Date(Date.now() - 36000000).toISOString(), master_order_id: 'ORD-003' },
      { action: 'Submitted for Approval', role: 'coordinator', user_name: 'Ravi Kumar', remarks: 'Sent to Principal', timestamp: new Date(Date.now() - 32400000).toISOString(), master_order_id: 'ORD-003' },
      { action: 'Principal Approved', role: 'principal', user_name: 'Dr. Arvind Mehta', remarks: 'Approved', timestamp: new Date(Date.now() - 28800000).toISOString(), master_order_id: 'ORD-003' },
      { action: 'DCR Approved & Forwarded', role: 'dcr', user_name: 'S. Patil', remarks: 'Budget looks fine', timestamp: new Date(Date.now() - 25200000).toISOString(), master_order_id: 'ORD-003' }
    ]
  },
  {
    id: 'ORD-004',
    title: 'Tea & Coffee for Visitor Day',
    purpose: 'VIP visits from partner colleges',
    department_id: 'diploma',
    department_label: 'Diploma Department',
    created_by_id: 8,
    created_by_name: 'Priya Sharma',
    status: 'Completed',
    total_bill_amount: 600,
    bill_generated_at: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
    vendor_orders: [
      {
        id: 'VORD-004-1',
        master_order_id: 'ORD-004',
        vendor_id: 'v1',
        vendor_name: 'Sharma Canteen',
        status: 'Vendor Confirmed',
        bill_amount: 150,
        invoice_number: 'INV-ORD-004-V1',
        items: [{ id: 4, name: 'Tea', quantity: 15, price: 10.0, unit: 'per cup', menu_item_id: 'v1m1' }]
      },
      {
        id: 'VORD-004-2',
        master_order_id: 'ORD-004',
        vendor_id: 'v2',
        vendor_name: 'Fresh Bites',
        status: 'Vendor Confirmed',
        bill_amount: 450,
        invoice_number: 'INV-ORD-004-V2',
        items: [{ id: 5, name: 'Fruit Bowl', quantity: 9, price: 50.0, unit: 'per bowl', menu_item_id: 'v2m4' }]
      }
    ],
    history: [
      { action: 'Order Completed', role: 'admin', user_name: 'Rajesh Gupta', remarks: 'Order finalized successfully', timestamp: new Date(Date.now() - 1800000).toISOString(), master_order_id: 'ORD-004' }
    ]
  }
];

function getLocalOrders(): MasterOrder[] {
  if (typeof window === 'undefined') return FALLBACK_ORDERS;
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(FALLBACK_ORDERS));
      return FALLBACK_ORDERS;
    }
    return JSON.parse(raw);
  } catch {
    return FALLBACK_ORDERS;
  }
}

function saveLocalOrders(orders: MasterOrder[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
}

// ── API Operations ────────────────────────────────────────────────────────────

export async function getOrders(): Promise<MasterOrder[]> {
  try {
    const apiOrders = await api.get<MasterOrder[]>('/orders/');
    if (apiOrders && Array.isArray(apiOrders) && apiOrders.length > 0) {
      saveLocalOrders(apiOrders);
      return apiOrders;
    }
  } catch (err) {
    // Return local state store silently
  }
  return getLocalOrders();
}

export async function getOrderById(id: string): Promise<MasterOrder | null> {
  try {
    const apiOrder = await api.get<MasterOrder>(`/orders/${id}`);
    if (apiOrder) return apiOrder;
  } catch (err) {
    console.warn(`[STORE] API fetch for ${id} failed, checking local store`);
  }
  return getLocalOrders().find(o => o.id === id) || null;
}

export async function createMasterOrder(orderData: {
  title: string;
  purpose: string;
  items: { menu_item_id: string; quantity: number }[];
}): Promise<MasterOrder> {
  try {
    const res = await api.post<MasterOrder>('/orders/', orderData);
    if (res) {
      const localList = getLocalOrders();
      const idx = localList.findIndex(o => o.id === res.id);
      if (idx >= 0) localList[idx] = res;
      else localList.unshift(res);
      saveLocalOrders(localList);
      return res;
    }
  } catch (err) {
    // Backend offline, fallback creation
  }
  
  // Local fallback creation
  const now = new Date().toISOString();
  const newId = 'ORD-' + String(Date.now()).slice(-4);
  const newOrder: MasterOrder = {
    id: newId,
    title: orderData.title,
    purpose: orderData.purpose,
    department_id: 'diploma',
    department_label: 'Diploma Department',
    created_by_id: 8,
    created_by_name: 'Priya Sharma',
    status: 'Sent for Approval',
    total_bill_amount: 0,
    bill_generated_at: null,
    created_at: now,
    updated_at: now,
    vendor_orders: [
      {
        id: `VORD-${newId}-1`,
        master_order_id: newId,
        vendor_id: 'v1',
        vendor_name: 'Sharma Canteen',
        status: 'Pending',
        bill_amount: 0,
        invoice_number: null,
        items: orderData.items.map((it, idx) => ({ id: idx + 100, name: 'Requested Item', quantity: it.quantity, price: 15.0, menu_item_id: it.menu_item_id }))
      }
    ],
    history: [
      { action: 'Order Created', role: 'coordinator', user_name: 'Priya Sharma', remarks: 'Created requisition draft', timestamp: now, master_order_id: newId },
      { action: 'Submitted for Approval', role: 'coordinator', user_name: 'Priya Sharma', remarks: 'Sent to Principal for review', timestamp: now, master_order_id: newId }
    ]
  };

  const localList = getLocalOrders();
  localList.unshift(newOrder);
  saveLocalOrders(localList);
  return newOrder;
}

export async function submitForApproval(id: string): Promise<MasterOrder> {
  try {
    const res = await api.post<MasterOrder>(`/orders/${id}/submit`);
    if (res) return res;
  } catch (err) {
    console.warn('[STORE] Backend offline, updating status locally');
  }

  const localList = getLocalOrders();
  const target = localList.find(o => o.id === id);
  if (target) {
    target.status = 'Sent for Approval';
    target.updated_at = new Date().toISOString();
    target.history.push({
      action: 'Submitted for Approval',
      role: 'coordinator',
      user_name: 'Coordinator',
      remarks: 'Sent for Principal review',
      timestamp: new Date().toISOString(),
      master_order_id: id
    });
    saveLocalOrders(localList);
    return target;
  }
  throw new Error('Order not found');
}

export async function principalReview(
  id: string,
  action: 'approve' | 'reject',
  remarks: string
): Promise<MasterOrder> {
  try {
    const res = await api.post<MasterOrder>(
      `/orders/${id}/principal-review?action=${action}`,
      { remarks }
    );
    if (res) return res;
  } catch (err) {
    console.warn('[STORE] Backend offline, processing principal review locally');
  }

  const localList = getLocalOrders();
  const target = localList.find(o => o.id === id);
  if (target) {
    target.status = action === 'approve' ? 'Principal Approved' : 'Principal Rejected';
    target.updated_at = new Date().toISOString();
    target.history.push({
      action: action === 'approve' ? 'Principal Approved' : 'Principal Rejected',
      role: 'principal',
      user_name: 'Dr. Arvind Mehta',
      remarks: remarks || 'Reviewed by Principal',
      timestamp: new Date().toISOString(),
      master_order_id: id
    });
    saveLocalOrders(localList);
    return target;
  }
  throw new Error('Order not found');
}

export async function dcrReview(
  id: string,
  action: 'approve' | 'reject',
  remarks: string
): Promise<MasterOrder> {
  try {
    const res = await api.post<MasterOrder>(
      `/orders/${id}/dcr-review?action=${action}`,
      { remarks }
    );
    if (res) return res;
  } catch (err) {
    console.warn('[STORE] Backend offline, processing DCR review locally');
  }

  const localList = getLocalOrders();
  const target = localList.find(o => o.id === id);
  if (target) {
    target.status = action === 'approve' ? 'Vendor Processing' : 'DCR Rejected';
    target.updated_at = new Date().toISOString();
    target.history.push({
      action: action === 'approve' ? 'DCR Approved & Forwarded' : 'DCR Rejected',
      role: 'dcr',
      user_name: 'S. Patil',
      remarks: remarks || 'Budget reviewed by DCR',
      timestamp: new Date().toISOString(),
      master_order_id: id
    });
    saveLocalOrders(localList);
    return target;
  }
  throw new Error('Order not found');
}

export async function setVendorPrices(
  vendorOrderId: string,
  prices: Record<string, number>
): Promise<MasterOrder> {
  try {
    const res = await api.post<MasterOrder>(
      `/orders/vendor-order/${vendorOrderId}/pricing`,
      prices
    );
    if (res) return res;
  } catch (err) {
    console.warn('[STORE] Backend offline, confirming pricing locally');
  }

  const localList = getLocalOrders();
  let updatedMaster: MasterOrder | null = null;
  for (const o of localList) {
    const vo = o.vendor_orders.find(v => v.id === vendorOrderId);
    if (vo) {
      vo.status = 'Vendor Confirmed';
      vo.invoice_number = `INV-${o.id}-${vo.vendor_id.toUpperCase()}`;
      let total = 0;
      vo.items.forEach(it => {
        if (prices[it.name] !== undefined) it.price = prices[it.name];
        total += it.price * it.quantity;
      });
      vo.bill_amount = total;

      const allConfirmed = o.vendor_orders.every(v => v.status === 'Vendor Confirmed');
      if (allConfirmed) {
        o.status = 'Bill Generated';
        o.bill_generated_at = new Date().toISOString();
        o.total_bill_amount = o.vendor_orders.reduce((sum, v) => sum + v.bill_amount, 0);
      }
      o.history.push({
        action: 'Vendor Confirmed Pricing',
        role: 'vendor',
        user_name: vo.vendor_name || 'Vendor',
        remarks: 'Pricing finalized and bill generated',
        timestamp: new Date().toISOString(),
        master_order_id: o.id
      });
      updatedMaster = o;
      break;
    }
  }
  if (updatedMaster) {
    saveLocalOrders(localList);
    return updatedMaster;
  }
  throw new Error('Vendor order not found');
}

export async function requestVendorModification(
  vendorOrderId: string,
  reason: string,
  type: 'minor' | 'major'
): Promise<MasterOrder> {
  try {
    const res = await api.post<MasterOrder>(
      `/orders/vendor-order/${vendorOrderId}/request-modification`,
      { reason, type }
    );
    if (res) return res;
  } catch (err) {
    console.warn('[STORE] Backend offline, requesting modification locally');
  }

  const localList = getLocalOrders();
  let updatedMaster: MasterOrder | null = null;
  for (const o of localList) {
    const vo = o.vendor_orders.find(v => v.id === vendorOrderId);
    if (vo) {
      o.status = 'Vendor Clarification Required';
      vo.modification = {
        id: Date.now(),
        vendor_order_id: vendorOrderId,
        reason,
        type,
        requested_at: new Date().toISOString(),
        status: 'Pending'
      };
      o.history.push({
        action: 'Vendor Clarification Requested',
        role: 'vendor',
        user_name: vo.vendor_name || 'Vendor',
        remarks: `Requested ${type} modification: ${reason}`,
        timestamp: new Date().toISOString(),
        master_order_id: o.id
      });
      updatedMaster = o;
      break;
    }
  }
  if (updatedMaster) {
    saveLocalOrders(localList);
    return updatedMaster;
  }
  throw new Error('Vendor order not found');
}

export async function completeMasterOrder(id: string): Promise<MasterOrder> {
  try {
    const res = await api.post<MasterOrder>(`/orders/${id}/complete`);
    if (res) return res;
  } catch (err) {
    console.warn('[STORE] Backend offline, completing order locally');
  }

  const localList = getLocalOrders();
  const target = localList.find(o => o.id === id);
  if (target) {
    target.status = 'Completed';
    target.updated_at = new Date().toISOString();
    target.history.push({
      action: 'Order Completed & Settled',
      role: 'admin',
      user_name: 'Admin',
      remarks: 'Order finalized and settled',
      timestamp: new Date().toISOString(),
      master_order_id: id
    });
    saveLocalOrders(localList);
    return target;
  }
  throw new Error('Order not found');
}

export async function completeOrder(id: string): Promise<MasterOrder> {
  return await completeMasterOrder(id);
}

export async function resolveModification(
  modId: number | string,
  action: 'accept' | 'reject',
  resolutionNote?: string
): Promise<MasterOrder> {
  try {
    const res = await api.post<MasterOrder>(
      `/orders/modification/${modId}/resolve?action=${action}`,
      { resolution_note: resolutionNote }
    );
    if (res) return res;
  } catch (err) {
    console.warn('[STORE] Backend offline, resolving modification locally');
  }

  const localList = getLocalOrders();
  let updatedMaster: MasterOrder | null = null;
  for (const o of localList) {
    for (const vo of o.vendor_orders) {
      if (vo.modification && vo.modification.id === modId) {
        vo.modification.status = action === 'accept' ? 'Accepted' : 'Rejected';
        o.status = action === 'accept' ? 'Vendor Processing' : 'Pending';
        o.history.push({
          action: `Modification ${action === 'accept' ? 'Accepted' : 'Rejected'}`,
          role: 'coordinator',
          user_name: 'Coordinator',
          remarks: resolutionNote || `Modification request ${action}ed`,
          timestamp: new Date().toISOString(),
          master_order_id: o.id
        });
        updatedMaster = o;
        break;
      }
    }
    if (updatedMaster) break;
  }
  if (updatedMaster) {
    saveLocalOrders(localList);
    return updatedMaster;
  }
  throw new Error('Modification request not found');
}

export function resetAllData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCAL_ORDERS_KEY);
}
