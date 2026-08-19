import { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { compareVersions } from './releaseNotes';

const RELEASES_ENDPOINT = 'https://api.github.com/repos/LucasHenriqueDiniz/dropcut/releases/latest';
const CACHE_KEY = 'dropcut.updateCheck.v1';
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

type CachedCheck = {
  checkedAt: number;
  latestVersion: string;
};

function readCache(): CachedCheck | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCheck;
    return typeof parsed?.latestVersion === 'string' && typeof parsed?.checkedAt === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(value: CachedCheck) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // Storage unavailable — we just re-check on the next launch.
  }
}

async function fetchLatestVersion(): Promise<string | null> {
  const response = await fetch(RELEASES_ENDPOINT, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) return null;

  const release = (await response.json()) as { tag_name?: string };
  return typeof release.tag_name === 'string' ? release.tag_name.replace(/^v/i, '') : null;
}

/**
 * Checks GitHub releases for a newer build, at most once every few hours.
 * Returns the newer version string, or null when the app is up to date or the
 * check could not be made (offline, rate limited, no releases yet).
 */
export function useUpdateCheck(): string | null {
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const currentVersion = await getVersion();
        const cached = readCache();
        const isFresh = cached !== null && Date.now() - cached.checkedAt < CHECK_INTERVAL_MS;

        const latestVersion = isFresh ? cached.latestVersion : await fetchLatestVersion();
        if (cancelled || !latestVersion) return;

        if (!isFresh) writeCache({ checkedAt: Date.now(), latestVersion });
        if (compareVersions(latestVersion, currentVersion) > 0) {
          setAvailableVersion(latestVersion);
        }
      } catch (error) {
        console.error('Update check failed', error);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return availableVersion;
}
