// ── AharSetu Enterprise Order Store Service ──────────────────────────────────
import { api } from './api';
import { getSession } from './auth';
import { pushNotification } from './notifications';
import { getMenuItemName, getMenuItem } from './vendors';

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
  vendor_owner_name?: string | null;
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
  order_type?: 'IMMEDIATE' | 'SCHEDULED';
  scheduled_for?: string | null;
  timezone?: string;
  created_at: string;
  updated_at: string;
  vendor_orders: VendorOrder[];
  history: ApprovalHistory[];
}

export const LOCAL_ORDERS_KEY = 'aharsetu_orders_v8';

// Automatic client purge of legacy cache keys to guarantee a 100% fresh start
if (typeof window !== 'undefined') {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('aharsetu_order') ||
        key.startsWith('aharsetu_bill') ||
        key.startsWith('aharsetu_settle') ||
        key.startsWith('aharsetu_audit') ||
        key.startsWith('aharsetu_notif') ||
        key.startsWith('aharsetu_offline') ||
        key.startsWith('aharsetu_custom_order')
      ) && key !== LOCAL_ORDERS_KEY) {
        toRemove.push(key);
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch {}
}

const FALLBACK_ORDERS: MasterOrder[] = [];


function sanitizeOrderItems(orders: MasterOrder[]): MasterOrder[] {
  return orders.map(o => {
    let orderCalculatedTotal = 0;
    const sanitizedVOs = (o.vendor_orders || []).map(vo => {
      const sanitizedItems = (vo.items || []).map(it => {
        const resolvedName = getMenuItemName(it.name) !== it.name ? getMenuItemName(it.name) : getMenuItemName(it.menu_item_id);
        const itemObj = getMenuItem(it.menu_item_id) || getMenuItem(it.name);
        const resolvedPrice = (typeof it.price === 'number' && it.price > 0) 
          ? it.price 
          : ((itemObj && typeof itemObj.price === 'number' && itemObj.price > 0) ? itemObj.price : 15.0);
        return {
          ...it,
          name: resolvedName,
          price: resolvedPrice
        };
      });

      const voItemsTotal = sanitizedItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
      const finalVoBillAmount = (typeof vo.bill_amount === 'number' && vo.bill_amount > 0) ? vo.bill_amount : voItemsTotal;
      orderCalculatedTotal += finalVoBillAmount;

      return {
        ...vo,
        bill_amount: finalVoBillAmount,
        items: sanitizedItems
      };
    });

    const finalMasterTotal = (typeof o.total_bill_amount === 'number' && o.total_bill_amount > 0) 
      ? o.total_bill_amount 
      : orderCalculatedTotal;

    return {
      ...o,
      order_reference: o.order_reference || `AS-2026-${o.id.replace(/[^0-9]/g, '').slice(-4) || '0101'}`,
      total_bill_amount: finalMasterTotal,
      vendor_orders: sanitizedVOs
    };
  });
}

function getLocalOrders(): MasterOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify([]));
      return [];
    }
    const list = JSON.parse(raw);
    return sanitizeOrderItems(Array.isArray(list) ? list : []);
  } catch {
    return [];
  }
}

function saveLocalOrders(orders: MasterOrder[]) {
  if (typeof window === 'undefined') return;

  const sortedOrders = [...orders].sort((a, b) => a.id.localeCompare(b.id)).map(o => {
    const sortedVOs = [...o.vendor_orders].sort((a, b) => a.id.localeCompare(b.id)).map(vo => {
      const sortedItems = [...vo.items].sort((a, b) => {
        const idA = a.id ?? 0;
        const idB = b.id ?? 0;
        if (idA !== idB) return idA - idB;
        return a.name.localeCompare(b.name);
      });
      return { ...vo, items: sortedItems };
    });

    const sortedHistory = [...o.history].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return (a.action || '').localeCompare(b.action || '');
    });

    return { ...o, vendor_orders: sortedVOs, history: sortedHistory };
  });

  const current = localStorage.getItem(LOCAL_ORDERS_KEY);
  const next = JSON.stringify(sortedOrders);
  if (current === next) return;
  localStorage.setItem(LOCAL_ORDERS_KEY, next);
  try {
    window.dispatchEvent(new CustomEvent('aharsetu_order_changed', { detail: { source: 'local_save', orders: sortedOrders } }));
  } catch {}
}

// ── API Operations ────────────────────────────────────────────────────────────

export async function getOrders(): Promise<MasterOrder[]> {
  let orders: MasterOrder[] = [];
  try {
    const apiOrders = await api.get<MasterOrder[]>('/orders');
    if (apiOrders && Array.isArray(apiOrders)) {
      // Backend is authoritative source of truth
      saveLocalOrders(apiOrders);
      orders = apiOrders;
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
    if (apiOrder) {
      const sanitized = sanitizeOrderItems([apiOrder]);
      return sanitized[0] || apiOrder;
    }
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
  order_type?: 'IMMEDIATE' | 'SCHEDULED';
  scheduled_for?: string | null;
  timezone?: string;
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

    // Lookup actual updated menu item snapshot
    const itemObj = getMenuItem(it.menu_item_id);
    const readableName = itemObj?.name || getMenuItemName(it.menu_item_id);
    const unitPrice = (itemObj && typeof itemObj.price === 'number' && itemObj.price > 0) ? itemObj.price : 15.0;
    const itemUnit = itemObj?.unit || 'per serving';

    const itemSubtotal = unitPrice * it.quantity;
    totalCalculated += itemSubtotal;

    if (!itemsByVendor[vId]) itemsByVendor[vId] = [];
    itemsByVendor[vId].push({
      id: idx + 100,
      name: readableName,
      quantity: it.quantity,
      price: unitPrice,
      unit: itemUnit,
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
    order_type: orderData.order_type || 'IMMEDIATE',
    scheduled_for: orderData.scheduled_for || null,
    timezone: orderData.timezone || 'Asia/Kolkata',
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
      items: orderData.items.map(it => ({
        menu_item_id: it.menu_item_id,
        quantity: it.quantity,
        name: getMenuItemName(it.menu_item_id)
      })),
      department_id: orderData.department_id || deptId,
      order_type: orderData.order_type || 'IMMEDIATE',
      scheduled_for: orderData.scheduled_for || null,
      timezone: orderData.timezone || 'Asia/Kolkata'
    });
    if (res) {
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
    throw new Error('No response from backend');
  } catch (err: any) {
    console.error('[STORE] Database order creation failed:', err);
    throw new Error(err?.response?.data?.detail || err?.message || 'Failed to create requisition in database');
  }
}

export async function updateMasterOrder(
  id: string,
  orderData: {
    title: string;
    purpose: string;
    items: { menu_item_id: string; quantity: number }[];
    department_id?: string;
  }
): Promise<MasterOrder> {
  const session = getSession();

  try {
    const res = await api.put<MasterOrder>(`/orders/${id}`, {
      title: orderData.title,
      purpose: orderData.purpose,
      items: orderData.items.map(it => ({
        menu_item_id: it.menu_item_id,
        quantity: it.quantity,
        name: getMenuItemName(it.menu_item_id)
      })),
      department_id: orderData.department_id
    });
    if (res) {
      const localList = getLocalOrders();
      const idx = localList.findIndex(o => o.id === res.id);
      if (idx >= 0) localList[idx] = res;
      else localList.unshift(res);
      saveLocalOrders(localList);
      pushNotification(`Requisition ${id} was updated.`, 'principal', id, { type: 'ORDER_UPDATED' });
      return res;
    }
  } catch (err) {
    console.warn('[STORE] Backend offline or error updating order, falling back locally', err);
  }

  const localList = getLocalOrders();
  const target = localList.find(o => o.id === id);
  if (target) {
    target.title = orderData.title;
    target.purpose = orderData.purpose;
    if (orderData.department_id) target.department_id = orderData.department_id;

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

      const itemObj = getMenuItem(it.menu_item_id);
      const readableName = itemObj?.name || getMenuItemName(it.menu_item_id);
      const unitPrice = (itemObj && typeof itemObj.price === 'number' && itemObj.price > 0) ? itemObj.price : 15.0;
      const itemUnit = itemObj?.unit || 'per serving';

      const itemSubtotal = unitPrice * it.quantity;
      totalCalculated += itemSubtotal;

      if (!itemsByVendor[vId]) itemsByVendor[vId] = [];
      itemsByVendor[vId].push({
        id: idx + 100,
        name: readableName,
        quantity: it.quantity,
        price: unitPrice,
        unit: itemUnit,
        menu_item_id: it.menu_item_id
      });
    });

    target.vendor_orders = Object.keys(itemsByVendor).map((vId, idx) => {
      const vItems = itemsByVendor[vId];
      const vTotal = vItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      return {
        id: `VORD-${id}-${idx + 1}`,
        master_order_id: id,
        vendor_id: vId,
        vendor_name: vendorNameMap[vId] || `Vendor ${vId.toUpperCase()}`,
        status: 'Pending',
        bill_amount: vTotal,
        invoice_number: null,
        items: vItems
      };
    });

    target.total_bill_amount = totalCalculated;
    if (target.status === 'Principal Rejected') {
      target.status = 'Sent for Approval';
    }
    target.updated_at = new Date().toISOString();
    target.history.push({
      action: 'Order Modified by Coordinator',
      role: session?.role || 'coordinator',
      user_name: session?.name || 'Coordinator',
      remarks: `Requisition modified with ${orderData.items.length} items`,
      timestamp: new Date().toISOString(),
      master_order_id: id
    });

    saveLocalOrders(localList);
    pushNotification(`Requisition ${id} was updated.`, 'principal', id, { type: 'ORDER_UPDATED' });
    return target;
  }
  throw new Error('Order not found');
}

export async function cancelMasterOrder(id: string, reason?: string): Promise<MasterOrder> {
  const session = getSession();
  try {
    const res = await api.post<MasterOrder>(`/orders/${id}/cancel`, { reason: reason || 'Cancelled by coordinator' });
    if (res) {
      const localList = getLocalOrders();
      const idx = localList.findIndex(o => o.id === res.id);
      if (idx >= 0) localList[idx] = res;
      saveLocalOrders(localList);
      pushNotification(`Requisition ${id} was cancelled.`, 'principal', id, { type: 'ORDER_CANCELLED' });
      return res;
    }
  } catch (err) {
    console.warn('[STORE] Backend offline or cancel failed, cancelling locally', err);
  }

  const localList = getLocalOrders();
  const target = localList.find(o => o.id === id);
  if (target) {
    target.status = 'Cancelled';
    target.updated_at = new Date().toISOString();
    target.vendor_orders.forEach(vo => { vo.status = 'Cancelled'; });
    target.history.push({
      action: 'Order Cancelled',
      role: session?.role || 'coordinator',
      user_name: session?.name || 'Coordinator',
      remarks: reason || 'Cancelled by Coordinator before DCR approval',
      timestamp: new Date().toISOString(),
      master_order_id: id
    });
    saveLocalOrders(localList);
    pushNotification(`Requisition ${id} was cancelled.`, 'principal', id, { type: 'ORDER_CANCELLED' });
    return target;
  }
  throw new Error('Order not found');
}

export async function submitForApproval(id: string): Promise<MasterOrder> {
  try {
    const res = await api.post<MasterOrder>(`/orders/${id}/submit`);
    if (res) {
      pushNotification(`Requisition ${id} submitted for Principal approval.`, 'principal', id, { type: 'ORDER_SUBMITTED_FOR_PRINCIPAL' });
      return res;
    }
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
    pushNotification(`Requisition ${id} submitted for Principal approval.`, 'principal', id, { type: 'ORDER_SUBMITTED_FOR_PRINCIPAL' });
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
    if (res) {
      const localList = getLocalOrders();
      const idx = localList.findIndex(o => o.id === res.id);
      if (idx >= 0) localList[idx] = res;
      else localList.unshift(res);
      saveLocalOrders(localList);

      if (action === 'approve') {
        pushNotification(`Requisition ${id} was approved by Principal.`, 'coordinator', id, { type: 'PRINCIPAL_APPROVED' });
        pushNotification(`New requisition ${id} requires DCR budget audit.`, 'dcr', id, { type: 'ORDER_SUBMITTED_FOR_DCR' });
      } else {
        pushNotification(`Requisition ${id} was rejected by Principal. Remarks: ${remarks || 'None'}`, 'coordinator', id, { type: 'PRINCIPAL_REJECTED' });
      }
      return res;
    }
    throw new Error('No response from server');
  } catch (err: any) {
    console.error('[STORE] Principal review failed:', err);
    throw new Error(err?.response?.data?.detail || err?.message || 'Failed to submit principal review');
  }
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
    if (res) {
      const localList = getLocalOrders();
      const idx = localList.findIndex(o => o.id === res.id);
      if (idx >= 0) localList[idx] = res;
      else localList.unshift(res);
      saveLocalOrders(localList);

      if (action === 'approve') {
        pushNotification(`Requisition ${id} cleared DCR audit and dispatched to vendor.`, 'coordinator', id, { type: 'DCR_APPROVED' });
        pushNotification(`New kitchen order ${id} available for canteen processing.`, 'vendor', id, { type: 'VENDOR_ORDER_ASSIGNED' });
      } else {
        pushNotification(`Requisition ${id} was rejected during DCR audit. Remarks: ${remarks || 'None'}`, 'coordinator', id, { type: 'DCR_REJECTED' });
      }
      return res;
    }
    throw new Error('No response from server');
  } catch (err: any) {
    console.error('[STORE] DCR review failed:', err);
    throw new Error(err?.response?.data?.detail || err?.message || 'Failed to submit DCR review');
  }
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
    if (res) {
      const localList = getLocalOrders();
      const idx = localList.findIndex(o => o.id === res.id);
      if (idx >= 0) localList[idx] = res;
      else localList.unshift(res);
      saveLocalOrders(localList);
      pushNotification(`Canteen vendor confirmed pricing for order ${res.id}.`, 'coordinator', res.id, { type: 'VENDOR_CONFIRMED' });
      return res;
    }
    throw new Error('No response from server');
  } catch (err: any) {
    console.error('[STORE] Confirm pricing failed:', err);
    throw new Error(err?.response?.data?.detail || err?.message || 'Failed to confirm vendor pricing');
  }
}

export async function rejectVendorOrder(
  vendorOrderId: string,
  reason: string
): Promise<MasterOrder> {
  try {
    const res = await api.post<MasterOrder>(
      `/orders/vendor-order/${vendorOrderId}/reject`,
      { reason: reason || 'Vendor unable to fulfill kitchen order.' }
    );
    if (res) {
      const localList = getLocalOrders();
      const idx = localList.findIndex(o => o.id === res.id);
      if (idx >= 0) localList[idx] = res;
      else localList.unshift(res);
      saveLocalOrders(localList);
      pushNotification(`Vendor rejected sub-order in requisition ${res.id}. Reason: ${reason}`, 'coordinator', res.id, { type: 'VENDOR_REJECTED' });
      return res;
    }
    throw new Error('No response from server');
  } catch (err: any) {
    console.error('[STORE] Reject vendor order failed:', err);
    throw new Error(err?.response?.data?.detail || err?.message || 'Failed to reject vendor order');
  }
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
    if (res) {
      const localList = getLocalOrders();
      const idx = localList.findIndex(o => o.id === res.id);
      if (idx >= 0) localList[idx] = res;
      else localList.unshift(res);
      saveLocalOrders(localList);
      return res;
    }
    throw new Error('No response from server');
  } catch (err: any) {
    console.error('[STORE] Request modification failed:', err);
    throw new Error(err?.response?.data?.detail || err?.message || 'Failed to request modification');
  }
}

export async function completeMasterOrder(id: string): Promise<MasterOrder> {
  try {
    const res = await api.post<MasterOrder>(`/orders/${id}/complete`);
    if (res) {
      const localList = getLocalOrders();
      const idx = localList.findIndex(o => o.id === res.id);
      if (idx >= 0) localList[idx] = res;
      else localList.unshift(res);
      saveLocalOrders(localList);
      return res;
    }
    throw new Error('No response from server');
  } catch (err: any) {
    console.error('[STORE] Complete order failed:', err);
    throw new Error(err?.response?.data?.detail || err?.message || 'Failed to complete order');
  }
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
    if (res) {
      const localList = getLocalOrders();
      const idx = localList.findIndex(o => o.id === res.id);
      if (idx >= 0) localList[idx] = res;
      else localList.unshift(res);
      saveLocalOrders(localList);
      return res;
    }
    throw new Error('No response from server');
  } catch (err: any) {
    console.error('[STORE] Resolve modification failed:', err);
    throw new Error(err?.response?.data?.detail || err?.message || 'Failed to resolve modification');
  }
}

export async function resetAllData(): Promise<void> {
  try {
    await api.post('/orders/clear-all', {});
  } catch {}
  try {
    await api.post('/orders/system/reset', {});
  } catch {}
  if (typeof window !== 'undefined') {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('aharsetu_order') ||
        key.startsWith('aharsetu_bill') ||
        key.startsWith('aharsetu_settle') ||
        key.startsWith('aharsetu_audit') ||
        key.startsWith('aharsetu_notif') ||
        key.startsWith('aharsetu_offline') ||
        key.startsWith('aharsetu_custom_order')
      )) {
        toRemove.push(key);
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k));
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify([]));
    try {
      window.dispatchEvent(new CustomEvent('aharsetu_order_changed', { detail: { source: 'reset', orders: [] } }));
      window.dispatchEvent(new CustomEvent('aharsetu_notification_changed', { detail: { count: 0 } }));
      window.dispatchEvent(new CustomEvent('aharsetu_settlement_updated', { detail: [] }));
      window.dispatchEvent(new CustomEvent('aharsetu_user_changed'));
    } catch {}
  }
}
