// ── AharSetu Enterprise Order Store Service ──────────────────────────────────
import { api } from './api';
import { getSession } from './auth';
import { pushNotification } from './notifications';
import { getMenuItemName } from './vendors';

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
  order_reference?: string;
  order_source?: 'COORDINATOR' | 'PRINCIPAL' | 'ADMIN';
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

function sanitizeOrderItems(orders: MasterOrder[]): MasterOrder[] {
  return orders.map(o => ({
    ...o,
    order_reference: o.order_reference || `AS-2026-${o.id.replace(/[^0-9]/g, '').slice(-4) || '0101'}`,
    vendor_orders: o.vendor_orders.map(vo => ({
      ...vo,
      items: vo.items.map(it => {
        const resolvedName = getMenuItemName(it.name) !== it.name ? getMenuItemName(it.name) : getMenuItemName(it.menu_item_id);
        return {
          ...it,
          name: resolvedName
        };
      })
    }))
  }));
}

function getLocalOrders(): MasterOrder[] {
  if (typeof window === 'undefined') return sanitizeOrderItems(FALLBACK_ORDERS);
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(FALLBACK_ORDERS));
      return sanitizeOrderItems(FALLBACK_ORDERS);
    }
    const list = JSON.parse(raw);
    return sanitizeOrderItems(Array.isArray(list) ? list : FALLBACK_ORDERS);
  } catch {
    return sanitizeOrderItems(FALLBACK_ORDERS);
  }
}

function saveLocalOrders(orders: MasterOrder[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
  // Notify same-tab listeners that orders changed
  window.dispatchEvent(new CustomEvent('aharsetu_order_changed', { detail: { source: 'local' } }));
}

// ── API Operations ────────────────────────────────────────────────────────────

export async function getOrders(): Promise<MasterOrder[]> {
  let orders: MasterOrder[] = [];
  try {
    const apiOrders = await api.get<MasterOrder[]>('/orders');
    if (apiOrders && Array.isArray(apiOrders) && apiOrders.length > 0) {
      // Merge: keep API orders as base, then add any locally-created orders not in API response
      const localOrders = getLocalOrders();
      const apiIds = new Set(apiOrders.map(o => o.id));
      const localOnly = localOrders.filter(o => !apiIds.has(o.id));
      const merged = [...apiOrders, ...localOnly];
      saveLocalOrders(merged);
      orders = merged;
    } else {
      orders = getLocalOrders();
    }
  } catch (err) {
    orders = getLocalOrders();
  }

  orders = sanitizeOrderItems(orders);

  const session = getSession();
  if (!session) return orders;

  if (session.role === 'coordinator') {
    // Match by id, name, or same department
    return orders.filter(o =>
      o.created_by_id === session.id ||
      o.created_by_name === session.name ||
      (session.department_id && o.department_id === session.department_id)
    );
  } else if (session.role === 'principal') {
    // Principals see all orders in their departments
    return orders;
  } else if (session.role === 'vendor') {
    return orders.filter(o => o.vendor_orders.some(v => v.vendor_id === session.vendor_id || (session.name && v.vendor_name?.toLowerCase().includes(session.name.toLowerCase()))));
  }

  return orders;
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
  department_id?: string;
}): Promise<MasterOrder> {
  const session = getSession();

  // Validate target vendor open status
  const targetMenuItemId = orderData.items[0]?.menu_item_id || 'v1m1';
  const targetVendorId = targetMenuItemId.startsWith('v2') ? 'v2' : targetMenuItemId.startsWith('v3') ? 'v3' : targetMenuItemId.startsWith('v4') ? 'v4' : 'v1';
  
  if (typeof window !== 'undefined') {
    const rawVendors = localStorage.getItem('aharsetu_vendors_v3');
    if (rawVendors) {
      try {
        const vendorList = JSON.parse(rawVendors);
        const targetV = vendorList.find((v: any) => v.id === targetVendorId);
        if (targetV && targetV.status !== 'open') {
          throw new Error('Vendor is currently unavailable for new orders.');
        }
      } catch (err: any) {
        if (err.message?.includes('unavailable')) throw err;
      }
    }
  }

  const now = new Date().toISOString();
  const newId = 'ORD-' + String(Date.now()).slice(-4);
  const deptId = orderData.department_id || session?.department_id || 'diploma';
  const deptLabel = deptId === 'diploma' ? 'Diploma Department' : deptId === 'degree' ? 'Degree Department' : `${deptId.toUpperCase()} Department`;

  // Calculate bill total and group items snapshot by vendor ID
  const vendorNameMap: Record<string, string> = {
    v1: 'Sharma Canteen',
    v2: 'Fresh Bites',
    v3: 'Hot Meals',
    v4: 'Quick Snacks'
  };

  const itemsByVendor: Record<string, any[]> = {};
  let totalCalculated = 0;

  orderData.items.forEach((it, idx) => {
    let vId = 'v1';
    if (it.menu_item_id.startsWith('v2')) vId = 'v2';
    else if (it.menu_item_id.startsWith('v3')) vId = 'v3';
    else if (it.menu_item_id.startsWith('v4')) vId = 'v4';

    // Lookup actual menu price snapshot
    let unitPrice = 15.0;
    const readableName = getMenuItemName(it.menu_item_id);
    if (readableName.includes('Tea')) unitPrice = 10.0;
    else if (readableName.includes('Samosa')) unitPrice = 15.0;
    else if (readableName.includes('Kachori')) unitPrice = 18.0;
    else if (readableName.includes('Coffee')) unitPrice = 15.0;
    else if (readableName.includes('Veg Lunch')) unitPrice = 80.0;
    else if (readableName.includes('Idli')) unitPrice = 40.0;
    else if (readableName.includes('Thali')) unitPrice = 100.0;
    else if (readableName.includes('Sandwich')) unitPrice = 35.0;

    const itemSubtotal = unitPrice * it.quantity;
    totalCalculated += itemSubtotal;

    if (!itemsByVendor[vId]) itemsByVendor[vId] = [];
    itemsByVendor[vId].push({
      id: idx + 100,
      name: readableName,
      quantity: it.quantity,
      price: unitPrice,
      menu_item_id: it.menu_item_id
    });
  });

  const vendorOrdersSnapshot = Object.keys(itemsByVendor).map((vId, idx) => {
    const vItems = itemsByVendor[vId];
    const vTotal = vItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    return {
      id: `VORD-${newId}-${idx + 1}`,
      master_order_id: newId,
      vendor_id: vId,
      vendor_name: vendorNameMap[vId] || `Vendor ${vId.toUpperCase()}`,
      status: 'Pending',
      bill_amount: vTotal,
      invoice_number: null,
      items: vItems
    };
  });

  const isPrincipal = session?.role === 'principal';
  const initialStatus = isPrincipal ? 'Principal Approved' : 'Sent for Approval';
  const orderSource = isPrincipal ? 'PRINCIPAL' : 'COORDINATOR';
  const refNo = `AS-2026-${String(Date.now()).slice(-4)}`;

  const newOrder: MasterOrder = {
    id: newId,
    order_reference: refNo,
    order_source: orderSource,
    title: orderData.title,
    purpose: orderData.purpose,
    department_id: deptId,
    department_label: deptLabel,
    created_by_id: session?.id || (isPrincipal ? 3 : 8),
    created_by_name: session?.name || (isPrincipal ? 'Dr. Arvind Mehta' : 'Priya Sharma'),
    status: initialStatus,
    total_bill_amount: totalCalculated,
    bill_generated_at: null,
    created_at: now,
    updated_at: now,
    vendor_orders: vendorOrdersSnapshot,
    history: [
      { action: 'Order Created', role: session?.role || 'coordinator', user_name: session?.name || 'User', remarks: `Requisition created (${refNo})`, timestamp: now, master_order_id: newId },
      { action: isPrincipal ? 'Submitted directly for DCR Audit' : 'Submitted for Principal Approval', role: session?.role || 'coordinator', user_name: session?.name || 'User', remarks: isPrincipal ? 'Forwarded to DCR for budget clearance' : 'Sent to Principal for review', timestamp: now, master_order_id: newId }
    ]
  };

  try {
    const res = await api.post<MasterOrder>('/orders', {
      title: orderData.title,
      purpose: orderData.purpose,
      items: orderData.items,
      department_id: orderData.department_id
    });
    if (res) {
      // Auto-submit: advance status from 'Created' → 'Sent for Approval' (or 'Principal Approved' for principals)
      let finalOrder = res;
      try {
        const submitted = await api.post<MasterOrder>(`/orders/${res.id}/submit`);
        if (submitted) finalOrder = submitted;
      } catch (submitErr) {
        console.warn('[STORE] Submit call failed after create, keeping Created status');
      }
      const localList = getLocalOrders();
      const idx = localList.findIndex(o => o.id === finalOrder.id);
      if (idx >= 0) localList[idx] = finalOrder;
      else localList.unshift(finalOrder);
      saveLocalOrders(localList);
      if (isPrincipal) {
        pushNotification(`New requisition ${finalOrder.id} created by Principal requiring DCR audit.`, 'dcr', finalOrder.id, { type: 'ORDER_SUBMITTED_FOR_DCR' });
      } else {
        pushNotification(`New requisition ${finalOrder.id} submitted for approval.`, 'principal', finalOrder.id, { type: 'ORDER_SUBMITTED_FOR_PRINCIPAL' });
      }
      return finalOrder;
    }
  } catch (err) {
    // Backend offline, fallback creation
  }

  // Offline fallback: create locally and mark as submitted
  newOrder.status = isPrincipal ? 'Principal Approved' : 'Sent for Approval';
  const localList = getLocalOrders();
  localList.unshift(newOrder);
  saveLocalOrders(localList);
  if (isPrincipal) {
    pushNotification(`New requisition ${newOrder.id} created by Principal requiring DCR audit.`, 'dcr', newOrder.id, { type: 'ORDER_SUBMITTED_FOR_DCR' });
  } else {
    pushNotification(`New requisition ${newOrder.id} submitted for approval.`, 'principal', newOrder.id, { type: 'ORDER_SUBMITTED_FOR_PRINCIPAL' });
  }
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

    if (action === 'approve') {
      pushNotification(`Requisition ${id} was approved by Principal.`, 'coordinator', id);
      pushNotification(`New requisition ${id} requires DCR budget audit.`, 'dcr', id);
    } else {
      pushNotification(`Requisition ${id} was rejected by Principal. Remarks: ${remarks || 'None'}`, 'coordinator', id);
    }
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

    if (action === 'approve') {
      pushNotification(`Requisition ${id} cleared DCR audit and dispatched to vendor.`, 'coordinator', id);
      pushNotification(`New kitchen order ${id} available for canteen processing.`, 'vendor', id);
    } else {
      pushNotification(`Requisition ${id} was rejected during DCR audit. Remarks: ${remarks || 'None'}`, 'coordinator', id);
    }
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

      // Master order is ONLY completed when ALL active non-rejected vendors have confirmed
      const activeVOs = o.vendor_orders.filter(v => v.status !== 'Vendor Rejected');
      const allActiveConfirmed = activeVOs.length > 0 && activeVOs.every(v => v.status === 'Vendor Confirmed');

      if (allActiveConfirmed) {
        o.status = 'Completed';
        o.bill_generated_at = new Date().toISOString();
        const confirmedVOs = o.vendor_orders.filter(v => v.status === 'Vendor Confirmed');
        o.total_bill_amount = confirmedVOs.reduce((sum, v) => sum + v.bill_amount, 0);
        pushNotification(`Requisition ${o.id} automatically completed after all vendor confirmations. Invoice ${vo.invoice_number} generated.`, 'coordinator', o.id);
        pushNotification(`Order ${o.id} completed after vendor confirmations. Invoice ${vo.invoice_number} generated.`, 'principal', o.id);
        pushNotification(`Order ${o.id} completed after vendor confirmations. Invoice ${vo.invoice_number} generated.`, 'dcr', o.id);
      } else {
        o.status = 'Vendor Processing';
        pushNotification(`Vendor ${vo.vendor_name} confirmed sub-order ${vo.id}. Awaiting remaining canteen confirmations.`, 'coordinator', o.id);
      }

      o.history.push({
        action: allActiveConfirmed ? 'Order Automatically Completed' : 'Vendor Confirmed Sub-Order',
        role: 'vendor',
        user_name: vo.vendor_name || 'Vendor',
        remarks: `Invoice ${vo.invoice_number} generated. Subtotal ₹${total}`,
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

export async function rejectVendorOrder(
  vendorOrderId: string,
  reason: string
): Promise<MasterOrder> {
  const localList = getLocalOrders();
  let updatedMaster: MasterOrder | null = null;
  for (const o of localList) {
    const vo = o.vendor_orders.find(v => v.id === vendorOrderId);
    if (vo) {
      vo.status = 'Vendor Rejected';
      vo.bill_amount = 0;

      const activeVOs = o.vendor_orders.filter(v => v.status !== 'Vendor Rejected');
      const confirmedVOs = o.vendor_orders.filter(v => v.status === 'Vendor Confirmed');

      if (activeVOs.length === 0) {
        o.status = 'Vendor Rejected';
        pushNotification(`Requisition ${o.id} was rejected by all canteen vendors. Reason: ${reason}`, 'coordinator', o.id);
      } else if (confirmedVOs.length > 0 && activeVOs.every(v => v.status === 'Vendor Confirmed')) {
        o.status = 'Completed';
        o.bill_generated_at = new Date().toISOString();
        o.total_bill_amount = confirmedVOs.reduce((sum, v) => sum + v.bill_amount, 0);
        pushNotification(`Requisition ${o.id} completed with ${confirmedVOs.length} confirmed canteen bill(s). Sub-order ${vo.id} rejected by ${vo.vendor_name}.`, 'coordinator', o.id);
      } else {
        o.status = 'Vendor Processing';
        pushNotification(`Vendor ${vo.vendor_name} rejected sub-order ${vo.id}. Reason: ${reason}`, 'coordinator', o.id);
      }

      o.history.push({
        action: 'Vendor Rejected Sub-Order',
        role: 'vendor',
        user_name: vo.vendor_name || 'Vendor',
        remarks: `Sub-order rejected. Reason: ${reason}`,
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
