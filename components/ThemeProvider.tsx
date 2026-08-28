'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('aharsetu_theme') as Theme | null;
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        setThemeState(stored);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const calculateResolved = (currentTheme: Theme): ResolvedTheme => {
      if (currentTheme === 'system') {
        return mediaQuery.matches ? 'dark' : 'light';
      }
      return currentTheme;
    };

    const nextResolved = calculateResolved(theme);
    setResolvedTheme(nextResolved);

    const root = document.documentElement;
    root.setAttribute('data-theme', nextResolved);
    if (nextResolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const handleChange = () => {
      if (theme === 'system') {
        const sysResolved = mediaQuery.matches ? 'dark' : 'light';
        setResolvedTheme(sysResolved);
        root.setAttribute('data-theme', sysResolved);
        if (sysResolved === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('aharsetu_theme', newTheme);
    } catch {}
  };

  const toggleTheme = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'light' as Theme,
      resolvedTheme: 'light' as ResolvedTheme,
      setTheme: () => {},
      toggleTheme: () => {}
    };
  }
  return context;
}
