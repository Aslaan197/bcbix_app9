import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppTheme = 'light' | 'dark' | 'system';

export interface AppColors {
  // Backgrounds
  appBg:        string;
  sideBg:       string;
  navBg:        string;
  surface:      string;
  surfaceHover: string;
  // Borders
  border:       string;
  divider:      string;
  // Text
  t0: string; t1: string; t2: string; t3: string;
  // Inputs
  inputBg:      string;
  inputBorder:  string;
  inputFocus:   string;
  // Nav
  navActive:    string;
  navHover:     string;
  // Toggle
  toggleOn:     string;
  toggleOff:    string;
  toggleThumb:  string;
  // Buttons
  btnPrimBg:    string;
  btnPrimText:  string;
  btnSecBg:     string;
  btnSecText:   string;
  btnSecBorder: string;
  // Misc
  danger:       string;
  dangerHover:  string;
  badgeBg:      string;
  badgeText:    string;
  // Accent
  accent:       string;
  accentMuted:  string;
}

interface ThemeContextValue {
  theme:      AppTheme;
  setTheme:   (t: AppTheme) => void;
  accent:     string;
  setAccent:  (a: string) => void;
  isDark:     boolean;
  colors:     AppColors;
}

// ─── Color builder ────────────────────────────────────────────────────────────

function resolveIsDark(theme: AppTheme): boolean {
  if (theme === 'dark')  return true;
  if (theme === 'light') return false;
  return typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

export function buildColors(isDark: boolean, accent: string): AppColors {
  if (isDark) {
    return {
      appBg:        '#18181b',
      sideBg:       '#111113',
      navBg:        '#1a1a1d',
      surface:      '#232327',
      surfaceHover: '#2a2a2e',
      border:       'rgba(255,255,255,0.07)',
      divider:      'rgba(255,255,255,0.06)',
      t0: '#f5f5f5',
      t1: 'rgba(255,255,255,0.82)',
      t2: 'rgba(255,255,255,0.48)',
      t3: 'rgba(255,255,255,0.28)',
      inputBg:      'rgba(255,255,255,0.06)',
      inputBorder:  'rgba(255,255,255,0.10)',
      inputFocus:   accent,
      navActive:    'rgba(255,255,255,0.09)',
      navHover:     'rgba(255,255,255,0.05)',
      toggleOn:     accent,
      toggleOff:    'rgba(255,255,255,0.15)',
      toggleThumb:  '#fff',
      btnPrimBg:    accent,
      btnPrimText:  '#ffffff',
      btnSecBg:     'transparent',
      btnSecText:   'rgba(255,255,255,0.7)',
      btnSecBorder: 'rgba(255,255,255,0.12)',
      danger:       '#f87171',
      dangerHover:  'rgba(248,113,113,0.10)',
      badgeBg:      'rgba(255,255,255,0.10)',
      badgeText:    'rgba(255,255,255,0.60)',
      accent,
      accentMuted:  `${accent}28`,
    };
  }
  return {
    appBg:        '#ffffff',
    sideBg:       '#FAFAF7',
    navBg:        '#ffffff',
    surface:      '#ffffff',
    surfaceHover: 'rgba(0,0,0,0.03)',
    border:       'rgba(0,0,0,0.06)',
    divider:      'rgba(0,0,0,0.06)',
    t0: '#111111',
    t1: '#333333',
    t2: '#666666',
    t3: '#999999',
    inputBg:      'rgba(0,0,0,0.03)',
    inputBorder:  'rgba(0,0,0,0.10)',
    inputFocus:   accent,
    navActive:    'rgba(0,0,0,0.07)',
    navHover:     'rgba(0,0,0,0.04)',
    toggleOn:     accent,
    toggleOff:    'rgba(0,0,0,0.14)',
    toggleThumb:  '#fff',
    btnPrimBg:    accent,
    btnPrimText:  '#ffffff',
    btnSecBg:     'transparent',
    btnSecText:   '#555555',
    btnSecBorder: 'rgba(0,0,0,0.12)',
    danger:       '#c0392b',
    dangerHover:  'rgba(192,57,43,0.06)',
    badgeBg:      'rgba(0,0,0,0.06)',
    badgeText:    '#666666',
    accent,
    accentMuted:  `${accent}18`,
  };
}

// ─── Context ─────────────────────────────────────���────────────────────────────

// Persist the context reference on globalThis so that React Fast Refresh
// hot-module-replacement doesn't create a new context object on each reload.
// Without this, HMR re-evaluates the module, createContext() produces a NEW
// reference, and the existing ThemeProvider (holding the OLD ref) becomes
// invisible to any useTheme() call that now uses the NEW ref → throws.
declare global {
  // eslint-disable-next-line no-var
  var __therapyCal_themeCtx: ReturnType<typeof createContext<ThemeContextValue | null>> | undefined;
}

const ThemeContext: ReturnType<typeof createContext<ThemeContextValue | null>> =
  globalThis.__therapyCal_themeCtx ??
  (globalThis.__therapyCal_themeCtx = createContext<ThemeContextValue | null>(null));

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme,   setThemeState]  = useState<AppTheme>('light');
  const [accent,  setAccentState] = useState<string>('#111111');
  const [isDark,  setIsDark]      = useState(() => resolveIsDark('light'));

  const setTheme = (t: AppTheme) => {
    setThemeState(t);
    setIsDark(resolveIsDark(t));
  };

  const setAccent = (a: string) => setAccentState(a);

  // Follow system preference when theme === 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // Sync .dark class on <html> so shadcn CSS variables & Tailwind dark: prefix work
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const colors = useMemo(() => buildColors(isDark, accent), [isDark, accent]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accent, setAccent, isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}