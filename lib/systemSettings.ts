// ── AharSetu Centralized System Settings Manager ─────────────────────────────

import { api } from '@/lib/api';

export interface SystemSettings {
  demo_switcher_enabled: boolean;
  demo_accounts_enabled: boolean;
}

const SETTINGS_KEY = "aharsetu_system_settings_v1";

const DEFAULT_SETTINGS: SystemSettings = {
  demo_switcher_enabled: true,
  demo_accounts_enabled: true,
};

export function getSystemSettings(): SystemSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.error("[SYSTEM_SETTINGS] Error parsing settings:", err);
    return DEFAULT_SETTINGS;
  }
}

export function updateSystemSettings(partial: Partial<SystemSettings>): SystemSettings {
  const current = getSystemSettings();
  const updated: SystemSettings = { ...current, ...partial };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("aharsetu_settings_changed", { detail: updated }));
    } catch (err) {
      console.error("[SYSTEM_SETTINGS] Error saving settings:", err);
    }
  }
  return updated;
}

export async function saveSystemSettings(partial: Partial<SystemSettings>): Promise<SystemSettings> {
  const updated = updateSystemSettings(partial);
  try {
    const res = await api.put<{ demo_accounts_enabled: boolean; demo_switcher_enabled: boolean }>('/settings', {
      ...(typeof partial.demo_accounts_enabled === 'boolean' ? { demo_accounts_enabled: partial.demo_accounts_enabled } : {}),
      ...(typeof partial.demo_switcher_enabled === 'boolean' ? { demo_switcher_enabled: partial.demo_switcher_enabled } : {}),
    });
    if (res) {
      return updateSystemSettings({
        demo_accounts_enabled: res.demo_accounts_enabled,
        demo_switcher_enabled: res.demo_switcher_enabled,
      });
    }
  } catch (err) {
    console.warn("[SYSTEM_SETTINGS] Backend settings sync failed:", err);
  }
  return updated;
}

export async function fetchPublicSettings(): Promise<SystemSettings> {
  try {
    const res = await api.get<{ demo_accounts_enabled: boolean; demo_switcher_enabled?: boolean }>('/settings/public');
    if (res && typeof res.demo_accounts_enabled === 'boolean') {
      const swEnabled = typeof res.demo_switcher_enabled === 'boolean' ? res.demo_switcher_enabled : res.demo_accounts_enabled;
      return updateSystemSettings({
        demo_accounts_enabled: res.demo_accounts_enabled,
        demo_switcher_enabled: swEnabled,
      });
    }
  } catch (err) {
    // Return local cache on network error
  }
  return getSystemSettings();
}

export function isDemoSwitcherEnabled(): boolean {
  return getSystemSettings().demo_switcher_enabled;
}

export function isDemoAccountsEnabled(): boolean {
  return getSystemSettings().demo_accounts_enabled;
}
