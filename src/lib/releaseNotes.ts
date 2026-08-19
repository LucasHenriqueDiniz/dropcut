import type { TranslationKey } from './i18n';

/**
 * Release notes shown in the "what's new" modal after the app is updated.
 *
 * Add a new entry at the top for every released version. `version` must match
 * the version in `src-tauri/tauri.conf.json`, and each highlight is a
 * translation key so the notes follow the user's language.
 */
export type ReleaseNote = {
  version: string;
  highlights: TranslationKey[];
};

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '0.1.2',
    highlights: [
      'releaseNotes.v0_1_2_languages',
      'releaseNotes.v0_1_2_contextMenu',
      'releaseNotes.v0_1_2_upgradeDataLoss',
      'releaseNotes.v0_1_2_dropNotice',
      'releaseNotes.v0_1_2_aspectRatio',
    ],
  },
];

/** Parses "1.2.3" or "v1.2.3" into comparable numbers. Invalid parts become 0. */
function parseVersion(version: string): number[] {
  return version
    .trim()
    .replace(/^v/i, '')
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
}

/** Returns a negative number when `a` is older than `b`, 0 when equal. */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

/**
 * Notes for every version newer than `previousVersion` up to and including
 * `currentVersion`, newest first. Returns nothing when the user is not coming
 * from an older build.
 */
export function releaseNotesSince(previousVersion: string, currentVersion: string): ReleaseNote[] {
  return RELEASE_NOTES.filter(
    (note) =>
      compareVersions(note.version, previousVersion) > 0 &&
      compareVersions(note.version, currentVersion) <= 0
  ).sort((a, b) => compareVersions(b.version, a.version));
}
