// ── AharSetu Authentication Library ──────────────────────────────────────────
import { SEED_USERS } from './seedUsers';

const USERS_KEY   = 'aharsetu_users';
const SESSION_KEY = 'aharsetu_session';

// ── User CRUD ─────────────────────────────────────────────────────────────────

export function getUsers() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveUsers(users) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getUserById(id) {
  return getUsers().find(u => u.id === id) || null;
}

export function getUserByEmail(email) {
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase().trim()) || null;
}

export function upsertUser(user) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  saveUsers(users);
  return user;
}

export function deleteUser(id) {
  const users = getUsers().filter(u => u.id !== id);
  saveUsers(users);
}

export function createUser({ name, email, password, role, department, principalDepts, vendorId, preferredLanguage }) {
  const id = 'u-' + Date.now().toString(36);
  const user = {
    id,
    name,
    email,
    password,
    role,
    department: department || null,
    principalDepts: principalDepts || [],
    vendorId: vendorId || null,
    preferredLanguage: preferredLanguage || 'en',
    active: true,
    createdAt: new Date().toISOString(),
  };
  upsertUser(user);
  return user;
}

// ── Authentication ────────────────────────────────────────────────────────────

/**
 * Attempt login with email + password.
 * Returns { success, user, error }
 */
export function login(email, password) {
  const users = getUsers();
  if (!users.length) {
    // Auto-init if somehow empty
    saveUsers(SEED_USERS);
    return login(email, password);
  }

  const user = users.find(
    u => u.email.toLowerCase() === email.toLowerCase().trim()
      && u.password === password.trim()
      && u.active !== false
  );

  if (!user) {
    return { success: false, error: 'auth.invalid_credentials' };
  }

  // Build session (exclude password)
  const { password: _pw, ...sessionUser } = user;
  const session = {
    ...sessionUser,
    loginAt: new Date().toISOString(),
  };

  setSession(session);
  // Persist user's preferred language
  if (typeof window !== 'undefined') {
    localStorage.setItem('aharsetu_lang', user.preferredLanguage || 'en');
  }

  return { success: true, user: session };
}

export function logout() {
  clearSession();
}

// ── Session ───────────────────────────────────────────────────────────────────

export function getSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setSession(session) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

export function updateSessionLanguage(lang) {
  const session = getSession();
  if (!session) return;
  setSession({ ...session, preferredLanguage: lang });
  // Also update the user record
  const user = getUserById(session.id);
  if (user) upsertUser({ ...user, preferredLanguage: lang });
}

// ── Seed users on first visit ─────────────────────────────────────────────────

export function initUsersIfNeeded() {
  if (typeof window === 'undefined') return;
  const existing = getUsers();
  if (!existing.length) {
    saveUsers(SEED_USERS);
  }
}
