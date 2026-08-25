import { api } from './api';
import { updateVendorStatus } from './vendors';
import { PRINCIPAL_DEPT_MAP } from './constants';

const SESSION_KEY = 'aharsetu_session';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  department_id: string | null;
  vendor_id: string | null;
  preferred_language: string;
  avatar_url?: string | null;
  avatar_version?: number;
  mobile_number?: string | null;
  profile_setup_completed?: boolean;
  profile_setup_skipped?: boolean;
  active: boolean;
  principal_depts: string[];
  created_at: string;
}

const DEMO_USERS: UserProfile[] = [
  { id: 1, name: 'Rajesh Gupta', email: 'admin@aharsetu.edu.in', role: 'admin', department_id: null, vendor_id: null, preferred_language: 'en', active: true, principal_depts: [], created_at: new Date().toISOString() },
  { id: 2, name: 'S. Patil', email: 'dcr@aharsetu.edu.in', role: 'dcr', department_id: null, vendor_id: null, preferred_language: 'en', active: true, principal_depts: [], created_at: new Date().toISOString() },
  
  // Principals
  { id: 3, name: 'Dr. Arvind Mehta', email: 'principal.dd@aharsetu.edu.in', role: 'principal', department_id: null, vendor_id: null, preferred_language: 'en', active: true, principal_depts: ['diploma', 'degree'], created_at: new Date().toISOString() },
  { id: 4, name: 'Dr. Rekha Sharma', email: 'principal.pharma@aharsetu.edu.in', role: 'principal', department_id: null, vendor_id: null, preferred_language: 'hi', active: true, principal_depts: ['pharmacy'], created_at: new Date().toISOString() },
  { id: 5, name: 'Dr. Sarita Rao', email: 'principal.nursing@aharsetu.edu.in', role: 'principal', department_id: null, vendor_id: null, preferred_language: 'en', active: true, principal_depts: ['nursing'], created_at: new Date().toISOString() },
  { id: 6, name: 'Dr. J. P. Vyas', email: 'principal.physio@aharsetu.edu.in', role: 'principal', department_id: null, vendor_id: null, preferred_language: 'gu', active: true, principal_depts: ['physiotherapy'], created_at: new Date().toISOString() },
  { id: 7, name: 'Dr. B. K. Bansal', email: 'principal.bsc@aharsetu.edu.in', role: 'principal', department_id: null, vendor_id: null, preferred_language: 'en', active: true, principal_depts: ['bsc'], created_at: new Date().toISOString() },
  
  // Coordinators
  { id: 8, name: 'Priya Sharma', email: 'coord.diploma@aharsetu.edu.in', role: 'coordinator', department_id: 'diploma', vendor_id: null, preferred_language: 'en', active: true, principal_depts: [], created_at: new Date().toISOString() },
  { id: 9, name: 'Ravi Kumar', email: 'coord.degree@aharsetu.edu.in', role: 'coordinator', department_id: 'degree', vendor_id: null, preferred_language: 'en', active: true, principal_depts: [], created_at: new Date().toISOString() },
  { id: 10, name: 'Anita Desai', email: 'coord.pharmacy@aharsetu.edu.in', role: 'coordinator', department_id: 'pharmacy', vendor_id: null, preferred_language: 'en', active: true, principal_depts: [], created_at: new Date().toISOString() },
  { id: 11, name: 'Kavita Patel', email: 'coord.nursing@aharsetu.edu.in', role: 'coordinator', department_id: 'nursing', vendor_id: null, preferred_language: 'gu', active: true, principal_depts: [], created_at: new Date().toISOString() },
  { id: 12, name: 'Sanjay Shah', email: 'coord.physio@aharsetu.edu.in', role: 'coordinator', department_id: 'physiotherapy', vendor_id: null, preferred_language: 'gu', active: true, principal_depts: [], created_at: new Date().toISOString() },
  { id: 13, name: 'Amit Verma', email: 'coord.bsc@aharsetu.edu.in', role: 'coordinator', department_id: 'bsc', vendor_id: null, preferred_language: 'en', active: true, principal_depts: [], created_at: new Date().toISOString() },
  
  // Vendors
  { id: 14, name: 'Sharma Canteen Manager', email: 'vendor1@aharsetu.edu.in', role: 'vendor', department_id: null, vendor_id: 'v1', preferred_language: 'en', active: true, principal_depts: [], created_at: new Date().toISOString() },
  { id: 15, name: 'Fresh Bites Manager', email: 'vendor2@aharsetu.edu.in', role: 'vendor', department_id: null, vendor_id: 'v2', preferred_language: 'en', active: true, principal_depts: [], created_at: new Date().toISOString() },
  { id: 16, name: 'Hot Meals Manager', email: 'vendor3@aharsetu.edu.in', role: 'vendor', department_id: null, vendor_id: 'v3', preferred_language: 'hi', active: true, principal_depts: [], created_at: new Date().toISOString() },
  { id: 17, name: 'Quick Snacks Manager', email: 'vendor4@aharsetu.edu.in', role: 'vendor', department_id: null, vendor_id: 'v4', preferred_language: 'gu', active: true, principal_depts: [], created_at: new Date().toISOString() },
];

// ── User Management (Admin APIs) ──────────────────────────────────────────────

const CUSTOM_USERS_KEY = 'aharsetu_custom_users';
const DELETED_USERS_KEY = 'aharsetu_deleted_user_ids';
const USERS_TIMESTAMP_KEY = 'aharsetu_users_timestamp';

function getDeletedUserIds(): (number | string)[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function notifyUsersChanged() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USERS_TIMESTAMP_KEY, Date.now().toString());
    window.dispatchEvent(new CustomEvent('aharsetu_user_changed', { detail: { timestamp: Date.now() } }));
  } catch {}
}

export function getSavedUsers(): UserProfile[] {
  if (typeof window === 'undefined') return DEMO_USERS;
  try {
    const deletedIds = new Set(getDeletedUserIds().map(id => String(id).toLowerCase()));
    const raw = localStorage.getItem(CUSTOM_USERS_KEY);
    const custom: UserProfile[] = raw ? JSON.parse(raw) : [];

    // Map by email so custom accounts override demo accounts
    const userMap = new Map<string, UserProfile>();

    // Add demo users first (unless deleted)
    DEMO_USERS.forEach(u => {
      if (!deletedIds.has(String(u.id).toLowerCase()) && !deletedIds.has(u.email.toLowerCase())) {
        userMap.set(u.email.toLowerCase(), { ...u });
      }
    });

    // Merge custom users (unless deleted)
    if (Array.isArray(custom)) {
      custom.forEach(u => {
        if (!deletedIds.has(String(u.id).toLowerCase()) && !deletedIds.has(u.email.toLowerCase())) {
          const existing = userMap.get(u.email.toLowerCase());
          userMap.set(u.email.toLowerCase(), {
            ...(existing || {}),
            ...u,
          });
        }
      });
    }

    return Array.from(userMap.values());
  } catch (e) {
    return DEMO_USERS;
  }
}

export function saveCustomUser(user: UserProfile) {
  if (typeof window === 'undefined') return;
  try {
    // Un-delete if previously marked deleted
    const deleted = getDeletedUserIds().filter(
      id => String(id).toLowerCase() !== String(user.id).toLowerCase() && String(id).toLowerCase() !== user.email.toLowerCase()
    );
    localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(deleted));

    const raw = localStorage.getItem(CUSTOM_USERS_KEY);
    let custom: UserProfile[] = raw ? JSON.parse(raw) : [];
    const idx = custom.findIndex(u => String(u.id) === String(user.id) || u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) custom[idx] = { ...custom[idx], ...user };
    else custom.unshift(user);
    localStorage.setItem(CUSTOM_USERS_KEY, JSON.stringify(custom));

    // Update active session if it matches this user
    try {
      const activeRaw = sessionStorage.getItem(SESSION_KEY);
      if (activeRaw) {
        const active = JSON.parse(activeRaw);
        if (String(active.id) === String(user.id) || active.email?.toLowerCase() === user.email?.toLowerCase()) {
          const updatedActive = { ...active, ...user };
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedActive));
          localStorage.setItem('aharsetu_persistent_session', JSON.stringify(updatedActive));
          if (updatedActive.role) {
            localStorage.setItem(`aharsetu_remember_${updatedActive.role}`, JSON.stringify(updatedActive));
          }
        }
      }
    } catch {}

    notifyUsersChanged();
    window.dispatchEvent(new CustomEvent('aharsetu_profile_changed', { detail: user }));
  } catch (e) {}
}

export async function getUsers(): Promise<UserProfile[]> {
  let baseUsers: UserProfile[] = [];
  try {
    const res = await api.get<UserProfile[]>('/users');
    if (res && Array.isArray(res) && res.length > 0) {
      baseUsers = res;
    }
  } catch (err) {
    // Serve local users directory
  }

  if (baseUsers.length === 0) {
    return getSavedUsers();
  }

  // Merge custom user overrides (names, roles, depts) over backend baseUsers
  try {
    const deletedIds = new Set(getDeletedUserIds().map(id => String(id).toLowerCase()));
    const raw = typeof window !== 'undefined' ? localStorage.getItem(CUSTOM_USERS_KEY) : null;
    const custom: UserProfile[] = raw ? JSON.parse(raw) : [];
    
    const userMap = new Map<string, UserProfile>();
    
    // 1. Add base users from backend
    baseUsers.forEach(u => {
      if (!deletedIds.has(String(u.id).toLowerCase()) && !deletedIds.has(u.email.toLowerCase())) {
        userMap.set(u.email.toLowerCase(), u);
      }
    });

    // 2. Custom users ALWAYS override base users (preserving user updates forever)
    if (Array.isArray(custom)) {
      custom.forEach(u => {
        if (!deletedIds.has(String(u.id).toLowerCase()) && !deletedIds.has(u.email.toLowerCase())) {
          const existing = userMap.get(u.email.toLowerCase());
          userMap.set(u.email.toLowerCase(), {
            ...(existing || {}),
            ...u,
          });
        }
      });
    }

    return Array.from(userMap.values());
  } catch (e) {
    return baseUsers;
  }
}

export async function createUser(userData: any): Promise<UserProfile> {
  const newUser: UserProfile = {
    id: userData.id || Date.now(),
    name: userData.name,
    email: userData.email,
    role: userData.role,
    department_id: userData.department_id || (userData.role === 'coordinator' ? 'diploma' : null),
    vendor_id: userData.vendor_id || (userData.role === 'vendor' ? 'v1' : null),
    preferred_language: userData.preferred_language || 'en',
    active: userData.active !== undefined ? userData.active : true,
    principal_depts: userData.principal_depts || (userData.role === 'principal' ? (PRINCIPAL_DEPT_MAP[userData.email?.split('@')[0]?.replace('.', '-') as keyof typeof PRINCIPAL_DEPT_MAP] || (userData.department_id ? [userData.department_id] : ['diploma', 'degree'])) : []),
    created_at: new Date().toISOString()
  };

  try {
    const res = await api.post<UserProfile>('/users', userData);
    if (res) {
      saveCustomUser(res);
      return res;
    }
  } catch (err) {
    // Save locally
  }
  saveCustomUser(newUser);
  return newUser;
}

export async function upsertUser(userData: any): Promise<UserProfile> {
  if (userData.id) {
    try {
      const res = await api.put<UserProfile>(`/users/${userData.id}`, userData);
      if (res) {
        saveCustomUser(res);
        return res;
      }
    } catch (err) {
      // Fallback to local update
    }
    // Update local object
    const existing = getSavedUsers().find(u => u.id === userData.id);
    const updated: UserProfile = {
      id: userData.id,
      name: userData.name || existing?.name || '',
      email: userData.email || existing?.email || '',
      role: userData.role || existing?.role || 'coordinator',
      department_id: userData.department_id !== undefined ? userData.department_id : (existing?.department_id || null),
      vendor_id: userData.vendor_id !== undefined ? userData.vendor_id : (existing?.vendor_id || null),
      preferred_language: userData.preferred_language || existing?.preferred_language || 'en',
      active: userData.active !== undefined ? userData.active : (existing?.active ?? true),
      principal_depts: userData.principal_depts || existing?.principal_depts || [],
      created_at: existing?.created_at || new Date().toISOString()
    };
    saveCustomUser(updated);
    return updated;
  }
  return await createUser(userData);
}

export async function deleteUser(id: number | string): Promise<void> {
  // 1. Send API DELETE to backend
  try {
    await api.delete(`/users/${id}`);
  } catch (err) {
    console.warn('[AUTH] Error deleting user on backend, recording local deletion');
  }

  // 2. Persist deletion in localStorage tombstone list & remove from custom users
  if (typeof window !== 'undefined') {
    try {
      const deleted = getDeletedUserIds();
      const idStr = String(id);
      if (!deleted.some(d => String(d) === idStr)) {
        deleted.push(id);
        localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(deleted));
      }

      const raw = localStorage.getItem(CUSTOM_USERS_KEY);
      if (raw) {
        let custom: UserProfile[] = JSON.parse(raw);
        custom = custom.filter(u => String(u.id) !== idStr);
        localStorage.setItem(CUSTOM_USERS_KEY, JSON.stringify(custom));
      }

      notifyUsersChanged();
    } catch (e) {
      console.error('[AUTH] Local storage deletion error:', e);
    }
  }
}

const DEFAULT_DEPARTMENTS = [
  { id: 'diploma', code: 'DEPT-DIP', name: 'Diploma', label: 'Diploma Department', active: true, description: 'Diploma Studies Department' },
  { id: 'degree', code: 'DEPT-DEG', name: 'Degree', label: 'Degree Department', active: true, description: 'Degree Studies Department' },
  { id: 'pharmacy', code: 'DEPT-PHA', name: 'Pharmacy', label: 'Pharmacy Department', active: true, description: 'Pharmacy & Pharmaceutical Sciences' },
  { id: 'physiotherapy', code: 'DEPT-PHY', name: 'Physiotherapy', label: 'Physiotherapy Department', active: true, description: 'Physiotherapy & Rehabilitation' },
  { id: 'nursing', code: 'DEPT-NUR', name: 'Nursing', label: 'Nursing Department', active: true, description: 'Nursing & Healthcare Studies' },
  { id: 'bsc', code: 'DEPT-BSC', name: 'B.Sc./Paramedical', label: 'B.Sc./Paramedical Department', active: true, description: 'Basic Sciences & Paramedical Studies' },
];

export async function getDepartments(): Promise<any[]> {
  if (typeof window === 'undefined') return DEFAULT_DEPARTMENTS;
  try {
    const raw = localStorage.getItem('aharsetu_departments_v3');
    if (!raw) {
      localStorage.setItem('aharsetu_departments_v3', JSON.stringify(DEFAULT_DEPARTMENTS));
      return DEFAULT_DEPARTMENTS;
    }
    const depts = JSON.parse(raw);
    return Array.isArray(depts) && depts.length > 0 ? depts : DEFAULT_DEPARTMENTS;
  } catch {
    return DEFAULT_DEPARTMENTS;
  }
}

export async function addDepartment(dept: { name: string; code: string; description?: string; active?: boolean }): Promise<any> {
  const depts = await getDepartments();
  const id = dept.code.toLowerCase().replace(/[^a-z0-9]/g, '-') || `dept-${Date.now()}`;
  const newDept = {
    id,
    code: dept.code.toUpperCase(),
    name: dept.name,
    label: `${dept.name} Department`,
    description: dept.description || `${dept.name} Department`,
    active: dept.active !== false
  };
  const idx = depts.findIndex(d => d.id === id || d.code === newDept.code);
  if (idx >= 0) depts[idx] = newDept;
  else depts.push(newDept);
  if (typeof window !== 'undefined') {
    localStorage.setItem('aharsetu_departments_v3', JSON.stringify(depts));
  }
  return newDept;
}

export async function updateDepartment(id: string, updates: Partial<{ name: string; code: string; description: string; active: boolean }>): Promise<any> {
  const depts = await getDepartments();
  const target = depts.find(d => d.id === id);
  if (target) {
    if (updates.name) target.name = updates.name;
    if (updates.code) target.code = updates.code.toUpperCase();
    if (updates.description !== undefined) target.description = updates.description;
    if (updates.active !== undefined) target.active = updates.active;
    if (typeof window !== 'undefined') {
      localStorage.setItem('aharsetu_departments_v3', JSON.stringify(depts));
    }
    return target;
  }
  throw new Error('Department not found');
}

export async function toggleDepartmentStatus(id: string, active: boolean): Promise<any> {
  return await updateDepartment(id, { active });
}

// ── Authentication & Session ──────────────────────────────────────────────────

export async function login(payload: any): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const rememberDevice = Boolean(payload.remember_device);

  // ── 1. Try real backend authentication ────────────────────────────────────────
  try {
    const data = await api.post<any>('/auth/login', payload);
    if (data && data.access_token && data.user) {
      api.setTokens(data.access_token, data.refresh_token);
      const sessionUser: UserProfile = data.user;
      setSession(sessionUser, rememberDevice);
      if (typeof window !== 'undefined') {
        localStorage.setItem('aharsetu_lang', sessionUser.preferred_language || 'en');
        localStorage.removeItem('aharsetu_offline_session');
      }
      return { success: true, user: sessionUser };
    }
  } catch (err: any) {
    // 4xx = credentials rejected by server — do NOT fall through to offline mode
    if (err?.status && err.status >= 400 && err.status < 500) {
      return { success: false, error: err.message || 'Incorrect email or password.' };
    }
    // Network / backend-down error — fall through to offline session
    console.warn('[AUTH] Backend unreachable — offline session mode:', err?.message);
  }

  // ── 2. Offline fallback (backend unreachable only) ───────────────────────
  // Uses 'offline-session' tokens. api.ts will NOT send these to the backend,
  // preventing the false "Session expired" loop caused by mock tokens.
  const allUsers = getSavedUsers();
  const matched = allUsers.find(u => u.email.toLowerCase() === payload.email?.toLowerCase());
  if (matched) {
    const userToUse = { ...matched };
    if (payload.department_id) userToUse.department_id = payload.department_id;
    const offlineToken = `offline-session-${userToUse.id}-${Date.now()}`;
    api.setTokens(offlineToken, offlineToken);
    setSession(userToUse, rememberDevice);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aharsetu_lang', userToUse.preferred_language || 'en');
      localStorage.setItem('aharsetu_offline_session', 'true');
    }
    return { success: true, user: userToUse };
  }

  return { success: false, error: 'Unable to connect to the server. Please check your connection and try again.' };
}

export async function logout() {
  const session = getSession();
  if (session && session.role === 'vendor') {
    const vendorId = session.vendor_id || 'v1';
    try {
      await updateVendorStatus(vendorId, 'closed');
    } catch (e) {
      console.warn('[AUTH] Automated vendor status close on logout failed:', e);
    }
  }

  const refresh = typeof window !== 'undefined' ? localStorage.getItem('aharsetu_refresh_token') : null;
  const isOfflineToken = refresh && (refresh.startsWith('mock-token') || refresh.startsWith('offline-session'));
  if (refresh && !isOfflineToken) {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh })
      });
    } catch (e) {
      // Ignored for smooth client logout
    }
  }
  api.clearTokens();
  clearSession();
}

export function getSession(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
    
    // Determine path role context if available
    const path = window.location.pathname;
    const pathRole = path.split('/')[1];

    if (pathRole && ['coordinator', 'principal', 'dcr', 'administration', 'vendor', 'admin'].includes(pathRole)) {
      const roleRaw = localStorage.getItem(`aharsetu_remember_${pathRole}`);
      if (roleRaw) {
        const roleUser = JSON.parse(roleRaw);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(roleUser));
        return roleUser;
      }
    }

    // Check fallback persistent device session
    const isRemembered = localStorage.getItem('aharsetu_remember_device') === 'true';
    if (isRemembered) {
      const pRaw = localStorage.getItem('aharsetu_persistent_session');
      if (pRaw) {
        const pUser = JSON.parse(pRaw);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(pUser));
        return pUser;
      }
    }
    return null;
  } catch { return null; }
}

export function setSession(session: UserProfile, rememberDevice = false) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(`aharsetu_remember_${session.role}`, JSON.stringify(session));

  if (rememberDevice) {
    try {
      localStorage.setItem('aharsetu_remember_device', 'true');
      localStorage.setItem('aharsetu_persistent_session', JSON.stringify(session));
    } catch {}
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('aharsetu_remember_device');
    localStorage.removeItem('aharsetu_persistent_session');
    localStorage.removeItem('aharsetu_access_token');
    localStorage.removeItem('aharsetu_refresh_token');
    localStorage.removeItem('aharsetu_offline_session');
  } catch {}
}

export async function updateSessionLanguage(lang: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('aharsetu_lang', lang);
  }
  const session = getSession();
  if (session) {
    const updatedSession = { ...session, preferred_language: lang };
    setSession(updatedSession);
    try {
      await api.put<UserProfile>(`/users/${session.id}`, { preferred_language: lang });
    } catch (err) {
      // Offline fallback
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('aharsetu_lang_change'));
  }
}

export async function updateUserProfile(payload: {
  name?: string;
  mobile_number?: string | null;
  profile_setup_completed?: boolean;
  profile_setup_skipped?: boolean;
  avatar_url?: string;
}): Promise<UserProfile> {
  const session = getSession();
  if (!session) throw new Error('No active session');

  let res: UserProfile | null = null;
  try {
    res = await api.put<UserProfile>(`/users/${session.id}`, payload);
  } catch (e) {
    console.warn('[AUTH] Backend update failed, saving locally:', e);
  }
  const updated = res || { ...session, ...payload };

  saveCustomUser(updated);
  setSession(updated, true);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aharsetu_profile_changed', { detail: updated }));
  }
  return updated;
}

export async function uploadAvatar(file: File): Promise<UserProfile> {
  const session = getSession();
  if (!session) throw new Error('No active session');

  const formData = new FormData();
  formData.append('file', file);

  const res = await api.request<UserProfile>(`/users/${session.id}/avatar`, {
    method: 'POST',
    body: formData,
  });

  const updated = res || session;
  setSession(updated, true);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aharsetu_profile_changed', { detail: updated }));
  }
  return updated;
}

export async function initializeApplication(): Promise<UserProfile | null> {
  const session = getSession();
  if (!session) {
    return null;
  }
  
  try {
    const freshUser = await api.get<UserProfile>('/auth/me');
    if (freshUser) {
      setSession(freshUser, true);
      if (freshUser.preferred_language) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('aharsetu_lang', freshUser.preferred_language);
        }
      }
      return freshUser;
    }
  } catch (err: any) {
    if (err?.status === 401) {
      clearSession();
      return null;
    }
    console.warn('[INIT] Backend validation failed, using cached session fallback:', err);
    return session;
  }
  return null;
}
