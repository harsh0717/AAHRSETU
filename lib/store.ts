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
  id: number;
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

// ── API Operations ────────────────────────────────────────────────────────────

export async function getOrders(): Promise<MasterOrder[]> {
  try {
    return await api.get<MasterOrder[]>('/orders/');
  } catch (err) {
    console.error('Error fetching orders:', err);
    return [];
  }
}

export async function getOrderById(id: string): Promise<MasterOrder | null> {
  try {
    return await api.get<MasterOrder>(`/orders/${id}`);
  } catch (err) {
    console.error(`Error fetching order ${id}:`, err);
    return null;
  }
}

export async function createMasterOrder(orderData: {
  title: string;
  purpose: string;
  items: { menu_item_id: string; quantity: number }[];
}): Promise<MasterOrder> {
  return await api.post<MasterOrder>('/orders/', orderData);
}

export async function submitForApproval(id: string): Promise<MasterOrder> {
  return await api.post<MasterOrder>(`/orders/${id}/submit`);
}

export async function principalReview(
  id: string,
  action: 'approve' | 'reject',
  remarks: string
): Promise<MasterOrder> {
  return await api.post<MasterOrder>(
    `/orders/${id}/principal-review?action=${action}`,
    { remarks }
  );
}

export async function dcrReview(
  id: string,
  action: 'approve' | 'reject',
  remarks: string
): Promise<MasterOrder> {
  return await api.post<MasterOrder>(
    `/orders/${id}/dcr-review?action=${action}`,
    { remarks }
  );
}

export async function setVendorPrices(
  vendorOrderId: string,
  prices: Record<string, number>
): Promise<MasterOrder> {
  return await api.post<MasterOrder>(
    `/orders/vendor-order/${vendorOrderId}/pricing`,
    prices
  );
}

export async function requestVendorModification(
  vendorOrderId: string,
  reason: string,
  type: 'minor' | 'major'
): Promise<MasterOrder> {
  return await api.post<MasterOrder>(
    `/orders/vendor-order/${vendorOrderId}/modification`,
    { reason, type }
  );
}

export async function resolveModification(
  vendorOrderId: string,
  resolution: 'accept' | 'reject'
): Promise<MasterOrder> {
  return await api.post<MasterOrder>(
    `/orders/vendor-order/${vendorOrderId}/resolve-mod?resolution=${resolution}`
  );
}

export async function completeOrder(id: string): Promise<MasterOrder> {
  return await api.post<MasterOrder>(`/orders/${id}/complete`);
}

export async function resetAllData(): Promise<void> {
  await api.post<any>('/orders/system/reset');
}

export function initSeedData(): void {
  // Database auto-seeds in backend main.py if empty, so client-side initialization is deprecated.
  return;
}
