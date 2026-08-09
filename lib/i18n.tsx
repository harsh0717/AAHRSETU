'use client';
// ── AharSetu i18n Context ─────────────────────────────────────────────────────
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import en from './translations/en';
import hi from './translations/hi';
import gu from './translations/gu';

export type LangCode = 'en' | 'hi' | 'gu';

const TRANSLATIONS: Record<LangCode, Record<string, string>> = { en, hi, gu };
const LANG_KEY = 'aharsetu_lang';

interface I18nContextType {
  lang: LangCode;
  t: (key: string, params?: Record<string, string | number> | string) => string;
  setLang: (newLang: LangCode) => void;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  t: (key: string) => key,
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>('en');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = (localStorage.getItem(LANG_KEY) || 'en') as LangCode;
      if (['en', 'hi', 'gu'].includes(stored)) {
        setLangState(stored);
      }
    }
  }, []);

  const setLang = useCallback((newLang: LangCode) => {
    if (!TRANSLATIONS[newLang]) return;
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANG_KEY, newLang);
    }
  }, []);

  const t = useCallback((key: string, paramsOrFallback?: Record<string, string | number> | string) => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    let str = dict[key] ?? TRANSLATIONS.en[key];
    if (str === undefined) {
      if (typeof paramsOrFallback === 'string') {
        str = paramsOrFallback;
      } else {
        str = key;
      }
    }
    const params = typeof paramsOrFallback === 'object' ? paramsOrFallback : {};
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
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

export function getLangSync(): LangCode {
  if (typeof window === 'undefined') return 'en';
  return (localStorage.getItem(LANG_KEY) || 'en') as LangCode;
}
