import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { detectInitialLocale, isSupportedLocale, translate, type Locale } from './i18n';
import { getSettings, saveSettings } from './tauri';
import {
  LocaleContext,
  LOCALE_STORAGE_KEY,
  loadStoredLocale,
  type LocaleContextValue,
} from './locale';

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
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
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
