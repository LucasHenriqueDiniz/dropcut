import { useCallback, useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { compareVersions, releaseNotesSince, type ReleaseNote } from './releaseNotes';

const ONBOARDING_KEY = 'dropcut.onboarding.v1';
const LAST_VERSION_KEY = 'dropcut.lastVersion.v1';

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — the intro simply shows again next launch.
  }
}

/**
 * Decides what to greet the user with on launch: the first-run tour for a fresh
 * install, or the release notes when the app was updated since the last run.
 * Never both.
 */
export function useAppIntro() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [whatsNewNotes, setWhatsNewNotes] = useState<ReleaseNote[]>([]);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getVersion()
      .then((version) => {
        if (cancelled) return;
        setCurrentVersion(version);

        if (readStorage(ONBOARDING_KEY) !== 'done') {
          setShowOnboarding(true);
          return;
        }

        const lastVersion = readStorage(LAST_VERSION_KEY);
        if (lastVersion && compareVersions(lastVersion, version) < 0) {
          setWhatsNewNotes(releaseNotesSince(lastVersion, version));
        }
        writeStorage(LAST_VERSION_KEY, version);
      })
      .catch((error) => console.error('Failed to resolve app version', error));

    return () => {
      cancelled = true;
    };
  }, []);

  const completeOnboarding = useCallback(() => {
    writeStorage(ONBOARDING_KEY, 'done');
    if (currentVersion) writeStorage(LAST_VERSION_KEY, currentVersion);
    setShowOnboarding(false);
  }, [currentVersion]);

  const dismissWhatsNew = useCallback(() => setWhatsNewNotes([]), []);

  return { showOnboarding, completeOnboarding, whatsNewNotes, dismissWhatsNew };
}
