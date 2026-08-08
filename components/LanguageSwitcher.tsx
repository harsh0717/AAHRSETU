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
    <div style={{ display: 'flex', gap: '2px', background: 'var(--gray-100)', borderRadius: '20px', padding: '3px' }}>
      {LANGUAGES.map(l => (
        <button
          key={l.code}
          title={l.nativeLabel}
          onClick={() => handleChange(l.code)}
          style={{
            padding: '4px 10px',
            borderRadius: '16px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: lang === l.code ? 'white' : 'transparent',
            color: lang === l.code ? 'var(--gray-900)' : 'var(--gray-500)',
            transition: 'all 0.2s',
            boxShadow: lang === l.code ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
