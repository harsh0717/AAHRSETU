'use client';
import { LANGUAGES } from '@/lib/constants';
import { useI18n, LangCode } from '@/lib/i18n';
import { updateSessionLanguage } from '@/lib/auth';

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  function handleChange(code: string) {
    setLang(code as LangCode);
    updateSessionLanguage(code);
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        background: 'var(--surface-2, rgba(255, 255, 255, 0.08))',
        border: '1px solid var(--gray-200, rgba(255, 255, 255, 0.15))',
        borderRadius: '20px',
        padding: '3px',
        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.08)'
      }}
    >
      {LANGUAGES.map((l) => {
        const isActive = lang === l.code;
        return (
          <button
            key={l.code}
            type="button"
            title={l.nativeLabel}
            aria-label={`Change language to ${l.label}`}
            onClick={() => handleChange(l.code)}
            style={{
              padding: '4px 10px',
              borderRadius: '16px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.74rem',
              fontWeight: isActive ? 800 : 600,
              background: isActive ? 'var(--primary, #2563EB)' : 'transparent',
              color: isActive ? '#FFFFFF' : 'var(--gray-500, #94A3B8)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isActive ? '0 2px 6px rgba(37, 99, 235, 0.35)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1.2
            }}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
