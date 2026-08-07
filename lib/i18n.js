'use client';
// ── AharSetu i18n Context ─────────────────────────────────────────────────────
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import en from './translations/en';
import hi from './translations/hi';
import gu from './translations/gu';

const TRANSLATIONS = { en, hi, gu };
const LANG_KEY = 'aharsetu_lang';

const I18nContext = createContext({
  lang: 'en',
  t: (key) => key,
  setLang: () => {},
});

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState('en');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LANG_KEY) || 'en';
      setLangState(stored);
    }
  }, []);

  const setLang = useCallback((newLang) => {
    if (!TRANSLATIONS[newLang]) return;
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANG_KEY, newLang);
    }
  }, []);

  const t = useCallback((key, params = {}) => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    let str = dict[key] ?? TRANSLATIONS.en[key] ?? key;
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, v),
      str
    );
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, t, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

// Standalone helper to get language outside React (for non-component usage)
export function getLangSync() {
  if (typeof window === 'undefined') return 'en';
  return localStorage.getItem(LANG_KEY) || 'en';
}
