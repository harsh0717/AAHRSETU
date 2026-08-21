// ── AharSetu Enterprise Offline Phone Data Persistence Engine ────────────────
// Stores application catalogs, orders, draft requisitions & bills directly on phone local storage

export interface QueuedOfflineOrder {
  id: string;
  departmentId: string;
  vendorId: string;
  items: Array<{ id: string; name: string; quantity: number; price: number }>;
  remarks?: string;
  queuedAt: string;
}

const KEYS = {
  ORDERS: "aharsetu_offline_orders_cache",
  MENUS: "aharsetu_offline_menus_cache",
  BILLS: "aharsetu_offline_bills_cache",
  QUEUE: "aharsetu_offline_order_queue",
};

// ── Cache Getters & Setters ──────────────────────────────────────────────────

export function saveOfflineOrders(orders: any[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  } catch (err) {
    console.warn("[OFFLINE_STORAGE] Failed to cache orders locally:", err);
  }
}

export function getOfflineOrders(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.ORDERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineMenus(menus: any[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEYS.MENUS, JSON.stringify(menus));
  } catch (err) {
    console.warn("[OFFLINE_STORAGE] Failed to cache menus locally:", err);
  }
}

export function getOfflineMenus(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.MENUS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineBills(bills: any[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEYS.BILLS, JSON.stringify(bills));
  } catch (err) {
    console.warn("[OFFLINE_STORAGE] Failed to cache bills locally:", err);
  }
}

export function getOfflineBills(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.BILLS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── Offline Requisition Queue ────────────────────────────────────────────────

export function queueOfflineRequisition(order: QueuedOfflineOrder): void {
  if (typeof window === "undefined") return;
  try {
    const currentQueue = getQueuedRequisitions();
    currentQueue.push(order);
    localStorage.setItem(KEYS.QUEUE, JSON.stringify(currentQueue));
    window.dispatchEvent(new CustomEvent("aharsetu_offline_queue_updated", { detail: currentQueue }));
  } catch (err) {
    console.error("[OFFLINE_STORAGE] Failed to queue offline requisition:", err);
  }
}

export function getQueuedRequisitions(): QueuedOfflineOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearQueuedRequisitions(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEYS.QUEUE);
    window.dispatchEvent(new CustomEvent("aharsetu_offline_queue_updated", { detail: [] }));
  } catch (err) {
    console.error("[OFFLINE_STORAGE] Failed to clear offline queue:", err);
  }
}

// ── Network Listener for Automatic Re-sync ───────────────────────────────────

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    const queue = getQueuedRequisitions();
    if (queue.length > 0) {
      console.log("[OFFLINE_STORAGE] Device is back ONLINE. Syncing " + queue.length + " queued orders...");
      window.dispatchEvent(new CustomEvent("aharsetu_sync_required", { detail: queue }));
    }
  });
}
