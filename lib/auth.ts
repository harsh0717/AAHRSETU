import { api } from './api';
import { updateVendorStatus } from './vendors';

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
  { id: 3, name: 'Dr. Arvind Mehta', email: 'principal.dd@aharsetu.edu.in', role: 'principal', department_id: null, vendor_id: null, preferred_language: 'en', active: true, principal_depts: ['diploma', 'degree'], created_at: new Date().toISOString() },
  { id: 8, name: 'Priya Sharma', email: 'coord.diploma@aharsetu.edu.in', role: 'coordinator', department_id: 'diploma', vendor_id: null, preferred_language: 'en', active: true, principal_depts: [], created_at: new Date().toISOString() },
  { id: 14, name: 'Sharma Canteen Manager', email: 'vendor1@aharsetu.edu.in', role: 'vendor', department_id: null, vendor_id: 'v1', preferred_language: 'en', active: true, principal_depts: [], created_at: new Date().toISOString() },
];

// ── User Management (Admin APIs) ──────────────────────────────────────────────

export function getSavedUsers(): UserProfile[] {
  if (typeof window === 'undefined') return DEMO_USERS;
  try {
    const raw = localStorage.getItem('aharsetu_custom_users');
    if (raw) {
      const custom = JSON.parse(raw);
      if (Array.isArray(custom)) {
        return [...custom, ...DEMO_USERS];
      }
    }
  } catch (e) {}
  return DEMO_USERS;
}

export function saveCustomUser(user: UserProfile) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('aharsetu_custom_users');
    let custom: UserProfile[] = raw ? JSON.parse(raw) : [];
    const idx = custom.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) custom[idx] = user;
    else custom.unshift(user);
    localStorage.setItem('aharsetu_custom_users', JSON.stringify(custom));
  } catch (e) {}
}

export async function getUsers(): Promise<UserProfile[]> {
  try {
    const res = await api.get<UserProfile[]>('/users/');
    if (res && Array.isArray(res) && res.length > 0) return res;
  } catch (err) {
    // Serve local users directory
  }
  return getSavedUsers();
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
    principal_depts: userData.principal_depts || (userData.role === 'principal' ? ['diploma', 'degree'] : []),
    created_at: new Date().toISOString()
  };

  try {
    const res = await api.post<UserProfile>('/users/', userData);
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
  return await createUser(userData);
}

export async function deleteUser(id: number): Promise<void> {
  try {
    await api.delete(`/users/${id}`);
  } catch (err) {
    console.warn('[AUTH] Error deleting user on backend');
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
  try {
    const data = await api.post<any>('/auth/login', payload);
    if (data && data.access_token && data.user) {
      api.setTokens(data.access_token, data.refresh_token);
      const sessionUser: UserProfile = data.user;
      setSession(sessionUser, rememberDevice);
      if (typeof window !== 'undefined') {
        localStorage.setItem('aharsetu_lang', sessionUser.preferred_language || 'en');
      }
      return { success: true, user: sessionUser };
    }
  } catch (err: any) {
    // Fallback to local accounts lookup
  }

  const allUsers = getSavedUsers();
  const matched = allUsers.find(u => u.email.toLowerCase() === payload.email?.toLowerCase());
  if (matched) {
    const userToUse = { ...matched };
    if (payload.role) userToUse.role = payload.role;
    if (payload.department_id) userToUse.department_id = payload.department_id;
    
    const mockToken = `mock-token-${userToUse.id}-${Date.now()}`;
    api.setTokens(mockToken, mockToken);
    setSession(userToUse, rememberDevice);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aharsetu_lang', userToUse.preferred_language || 'en');
    }
    return { success: true, user: userToUse };
  }

  // Dynamic session for new test login email
  const role = payload.role || 'coordinator';
  const demoSession: UserProfile = {
    id: Date.now(),
    name: payload.email?.split('@')[0] || 'Institutional User',
    email: payload.email || 'user@aharsetu.edu.in',
    role,
    department_id: role === 'coordinator' ? (payload.department_id || 'diploma') : null,
    vendor_id: role === 'vendor' ? 'v1' : null,
    preferred_language: 'en',
    active: true,
    principal_depts: role === 'principal' ? ['diploma', 'degree'] : [],
    created_at: new Date().toISOString()
  };

  const mockToken = `mock-token-${demoSession.id}-${Date.now()}`;
  api.setTokens(mockToken, mockToken);
  setSession(demoSession, rememberDevice);
  return { success: true, user: demoSession };
}

export async function logout() {
  const session = getSession();
  if (session && session.role === 'vendor') {
    const vendorId = session.vendor_id || 'v1';
    try {
      updateVendorStatus(vendorId, 'closed');
    } catch (e) {
      console.warn('[AUTH] Automated vendor status close on logout failed:', e);
    }
  }

  const refresh = typeof window !== 'undefined' ? localStorage.getItem('aharsetu_refresh_token') : null;
  if (refresh && !refresh.startsWith('mock-token')) {
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

    if (pathRole && ['coordinator', 'principal', 'dcr', 'vendor', 'admin'].includes(pathRole)) {
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

  // Call backend API - this is the source of truth
  const res = await api.put<UserProfile>(`/users/${session.id}`, payload);
  const updated = res || { ...session, ...payload };

  // Update session cache with backend response
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
