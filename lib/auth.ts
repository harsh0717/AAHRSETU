// ── AharSetu Enterprise Authentication & User Service ─────────────────────────
import { api } from './api';

const SESSION_KEY = 'aharsetu_session';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  department_id: string | null;
  vendor_id: string | null;
  preferred_language: string;
  active: boolean;
  principal_depts: string[];
  created_at: string;
}

// ── User Management (Admin APIs) ──────────────────────────────────────────────

export async function getUsers(): Promise<UserProfile[]> {
  try {
    return await api.get<UserProfile[]>('/users/');
  } catch (err) {
    console.error('Error fetching users:', err);
    return [];
  }
}

export async function createUser(userData: any): Promise<UserProfile> {
  return await api.post<UserProfile>('/users/', userData);
}

export async function upsertUser(userData: any): Promise<UserProfile> {
  if (userData.id && !String(userData.id).startsWith('u-')) {
    // If it's an existing numeric id in the database
    return await api.put<UserProfile>(`/users/${userData.id}`, userData);
  } else {
    // Create new
    return await api.post<UserProfile>('/users/', userData);
  }
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`);
}

export async function getDepartments(): Promise<any[]> {
  return await api.get<any[]>('/users/departments');
}

// ── Authentication & Session ──────────────────────────────────────────────────

export async function login(payload: any) {
  try {
    const data = await api.post<any>('/auth/login', payload);
    
    // Set JWT tokens
    api.setTokens(data.access_token, data.refresh_token);
    
    // Save session payload in localStorage
    const sessionUser: UserProfile = data.user;
    setSession(sessionUser);
    
    // Sync preferred language
    if (typeof window !== 'undefined') {
      localStorage.setItem('aharsetu_lang', sessionUser.preferred_language || 'en');
    }
    
    return { success: true, user: sessionUser };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'auth.invalid_credentials'
    };
  }
}

export async function logout() {
  const refresh = localStorage.getItem('aharsetu_refresh_token');
  if (refresh) {
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
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(session: UserProfile) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

export async function updateSessionLanguage(lang: string) {
  const session = getSession();
  if (!session) return;
  
  // Update session object
  const updatedSession = { ...session, preferred_language: lang };
  setSession(updatedSession);
  
  // Push update to backend user profile
  try {
    await api.put<UserProfile>(`/users/${session.id}`, { preferred_language: lang });
  } catch (err) {
    console.error('Failed to sync language selection to backend:', err);
  }
}
