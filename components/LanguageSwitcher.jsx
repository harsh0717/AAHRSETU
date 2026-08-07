'use client';
import { LANGUAGES } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';
import { updateSessionLanguage } from '@/lib/auth';

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  function handleChange(code) {
    setLang(code);
    updateSessionLanguage(code);
  }

  return (
    <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2px' }}>
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
            fontSize: '0.75rem',
            fontWeight: 700,
            background: lang === l.code ? 'rgba(255,255,255,0.9)' : 'transparent',
            color: lang === l.code ? 'var(--sidebar-bg, #1E3A8A)' : 'rgba(255,255,255,0.85)',
            transition: 'all 0.2s',
            letterSpacing: '0.01em',
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
