import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'app-theme';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function isPublicPath(pathname: string): boolean {
  return !pathname.startsWith('/personal') && !pathname.startsWith('/heena');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    getInitialTheme() === 'dark' || (getInitialTheme() === 'system' && systemPrefersDark()) ? 'dark' : 'light'
  );

  useEffect(() => {
    const apply = () => {
      const onPublic = isPublicPath(location.pathname);
      const resolved: 'light' | 'dark' = onPublic
        ? 'light'
        : theme === 'system'
          ? (systemPrefersDark() ? 'dark' : 'light')
          : theme;
      const root = document.documentElement;
      root.classList.toggle('dark', resolved === 'dark');
      setResolvedTheme(resolved);
    };
    apply();

    if (theme === 'system' && !isPublicPath(location.pathname)) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme, location.pathname]);

  const setTheme = (t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
