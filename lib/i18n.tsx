'use client';
// ── AharSetu i18n Context ─────────────────────────────────────────────────────
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import en from './translations/en';

export type LangCode = 'en' | 'hi' | 'gu';

const TRANSLATIONS: Record<LangCode, Record<string, string>> = {
  en,
  hi: en,
  gu: en,
};

const loaders: Record<LangCode, () => Promise<{ default: Record<string, string> }>> = {
  en: () => Promise.resolve({ default: en }),
  hi: () => import('./translations/hi'),
  gu: () => import('./translations/gu'),
};

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
  const [, setVersion] = useState(0);

  const loadLang = useCallback(async (code: LangCode) => {
    if (code === 'en') {
      setLangState('en');
      return;
    }
    if (TRANSLATIONS[code] !== en) {
      setLangState(code);
      return;
    }
    try {
      const mod = await loaders[code]();
      TRANSLATIONS[code] = mod.default;
      setLangState(code);
      setVersion((v) => v + 1);
    } catch {
      setLangState(code);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const syncLang = () => {
        const stored = (localStorage.getItem(LANG_KEY) || 'en') as LangCode;
        if (['en', 'hi', 'gu'].includes(stored)) {
          loadLang(stored);
        }
      };
      syncLang();
      window.addEventListener('aharsetu_lang_change', syncLang);
      return () => window.removeEventListener('aharsetu_lang_change', syncLang);
    }
  }, [loadLang]);

  const setLang = useCallback((newLang: LangCode) => {
    if (!['en', 'hi', 'gu'].includes(newLang)) return;
    loadLang(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANG_KEY, newLang);
      window.dispatchEvent(new Event('aharsetu_lang_change'));
    }
  }, [loadLang]);

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
