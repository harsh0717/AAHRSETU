// ── AharSetu Centralized System Settings Manager ─────────────────────────────

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

import { api } from '@/lib/api';

export async function fetchPublicSettings(): Promise<SystemSettings> {
  try {
    const res = await api.get<{ demo_accounts_enabled: boolean }>('/settings/public');
    if (res && typeof res.demo_accounts_enabled === 'boolean') {
      return updateSystemSettings({
        demo_accounts_enabled: res.demo_accounts_enabled,
        demo_switcher_enabled: res.demo_accounts_enabled,
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
