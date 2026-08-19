export type ClipPresetId = string;

/**
 * A preset is a named size target and nothing else.
 *
 * Resolution, frame rate, audio bitrate and encoder used to live here, and that
 * was the bug: each one competed with the size the app promises to hit. They
 * are derived from the target in Rust now (`quality.rs`).
 */
export type ClipPreset = {
  id: ClipPresetId;
  label: string;
  targetMiB: number;
  visible: boolean;
  description: string;
};

export type OutputFormat = 'original' | 'landscape' | 'vertical';

export const DEFAULT_PRESETS: ClipPreset[] = [
  { id: 'discord-free', label: '10 MB', targetMiB: 10, visible: true, description: 'Discord Free' },
  { id: 'discord-free-20', label: '20 MB', targetMiB: 20, visible: true, description: 'Discord Free' },
  { id: 'discord-nitro', label: '50 MB', targetMiB: 50, visible: true, description: 'Nitro Basic' },
  { id: 'discord-nitro-max', label: '500 MB', targetMiB: 500, visible: true, description: 'Nitro' },
];

export const PRESETS = Object.fromEntries(DEFAULT_PRESETS.map((preset) => [preset.id, preset])) as Record<string, ClipPreset>;

export const createPresetId = () => `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** Presets saved by older versions carry quality fields that no longer exist. */
export function normalizePreset(preset: ClipPreset): ClipPreset {
  const targetMiB = Number.isFinite(preset.targetMiB) ? Math.min(Math.max(preset.targetMiB, 1), 20000) : 10;
  return {
    id: preset.id,
    label: preset.label?.trim() || `${Math.round(targetMiB)} MB`,
    targetMiB,
    visible: preset.visible ?? true,
    description: preset.description ?? '',
  };
}
