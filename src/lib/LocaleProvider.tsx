import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import {
  detectInitialLocale,
  isSupportedLocale,
  translate,
  type Locale,
  type TranslateFn,
} from './i18n';
import { getSettings, saveSettings } from './tauri';

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
};

const STORAGE_KEY = 'dropcut.locale.v1';
const LocaleContext = createContext<LocaleContextValue | null>(null);

function loadStoredLocale(): Locale | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isSupportedLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function LocaleProvider({ children }: PropsWithChildren) {
  const [locale, setLocale] = useState<Locale>(() => loadStoredLocale() ?? detectInitialLocale());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const hasStoredLocale = loadStoredLocale() !== null;

    getSettings().then((settings) => {
      if (cancelled) return;
      if (!hasStoredLocale && isSupportedLocale(settings.locale)) {
        setLocale(settings.locale);
      }
      setHydrated(true);
    }).catch((error) => {
      console.error('Failed to load locale from Rust config', error);
      if (!cancelled) setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch (error) {
      console.error('Failed to persist locale locally', error);
    }

    if (!hydrated) return;
    getSettings()
      .then((settings) => saveSettings({ ...settings, locale }))
      .catch((error) => console.error('Failed to save locale to Rust config', error));
  }, [hydrated, locale]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    t: (key, vars) => translate(locale, key, vars),
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used inside LocaleProvider');
  return value;
}

export function useTranslation(): TranslateFn {
  return useLocale().t;
}
