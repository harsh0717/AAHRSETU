// ── AharSetu Complaint & Issue Management Service ────────────────────────────
import { api } from './api';
import { pushNotification } from './notifications';

export type ComplaintCategory =
  | 'WRONG_ITEM'
  | 'MISSING_ITEM'
  | 'FOOD_QUALITY'
  | 'LATE_DELIVERY'
  | 'BILLING_ISSUE'
  | 'VENDOR_SERVICE'
  | 'OTHER';

export type ComplaintStatus = 'OPEN' | 'UNDER_REVIEW' | 'VENDOR_RESPONSE' | 'RESOLVED' | 'REJECTED';

export interface ComplaintRecord {
  id: string;
  order_id: string;
  order_reference: string;
  vendor_id: string;
  vendor_name: string;
  department_id: string;
  created_by_id: number;
  created_by_name: string;
  category: ComplaintCategory;
  description: string;
  status: ComplaintStatus;
  vendor_response?: string | null;
  admin_response?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

const LOCAL_COMPLAINTS_KEY = 'aharsetu_complaints_v4';

const INITIAL_COMPLAINTS: ComplaintRecord[] = [
  {
    id: 'CMP-001',
    order_id: 'ORD-003',
    order_reference: 'AS-2026-0003',
    vendor_id: 'v1',
    vendor_name: 'Sharma Canteen',
    department_id: 'diploma',
    created_by_id: 8,
    created_by_name: 'Ravi Kumar',
    category: 'FOOD_QUALITY',
    description: 'Samosas were not freshly prepared for afternoon meeting.',
    status: 'RESOLVED',
    vendor_response: 'Apologies. Replacement tea & fresh snacks provided at zero extra charge.',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    resolved_at: new Date(Date.now() - 43200000).toISOString()
  }
];

function getLocalComplaints(): ComplaintRecord[] {
  if (typeof window === 'undefined') return INITIAL_COMPLAINTS;
  try {
    const raw = localStorage.getItem(LOCAL_COMPLAINTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_COMPLAINTS_KEY, JSON.stringify(INITIAL_COMPLAINTS));
      return INITIAL_COMPLAINTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_COMPLAINTS;
  }
}

function saveLocalComplaints(list: ComplaintRecord[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_COMPLAINTS_KEY, JSON.stringify(list));
}

export async function getComplaints(): Promise<ComplaintRecord[]> {
  try {
    const res = await api.get<ComplaintRecord[]>('/complaints/');
    if (res && Array.isArray(res)) return res;
  } catch {}
  return getLocalComplaints();
}

export async function createComplaint(data: {
  order_id: string;
  order_reference?: string;
  vendor_id: string;
  vendor_name: string;
  department_id: string;
  created_by_id: number;
  created_by_name: string;
  category: ComplaintCategory;
  description: string;
}): Promise<ComplaintRecord> {
  const newCmp: ComplaintRecord = {
    id: `CMP-${String(Date.now()).slice(-4)}`,
    order_id: data.order_id,
    order_reference: data.order_reference || `AS-2026-${data.order_id.replace(/[^0-9]/g, '')}`,
    vendor_id: data.vendor_id,
    vendor_name: data.vendor_name,
    department_id: data.department_id,
    created_by_id: data.created_by_id,
    created_by_name: data.created_by_name,
    category: data.category,
    description: data.description,
    status: 'OPEN',
    created_at: new Date().toISOString()
  };

  const list = getLocalComplaints();
  list.unshift(newCmp);
  saveLocalComplaints(list);

  pushNotification(`New complaint filed for Order ${newCmp.order_reference}: ${data.category}`, 'vendor', newCmp.order_id, { vendor_id: data.vendor_id, type: 'SYSTEM_ALERT' });
  return newCmp;
}

export async function updateComplaintStatus(
  id: string,
  status: ComplaintStatus,
  response?: string
): Promise<ComplaintRecord> {
  const list = getLocalComplaints();
  const target = list.find(c => c.id === id);
  if (target) {
    target.status = status;
    if (response) target.vendor_response = response;
    if (status === 'RESOLVED') target.resolved_at = new Date().toISOString();
    saveLocalComplaints(list);
    return target;
  }
  throw new Error('Complaint record not found');
}
