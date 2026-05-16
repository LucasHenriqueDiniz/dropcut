export type ClipPresetId = string;

export type ClipPreset = {
  id: ClipPresetId;
  label: string;
  targetMiB: number;
  visible: boolean;
  description: string;
  outputFormat: OutputFormat;
  speedQuality: number;
  maxResolution: number;
  maxFps: number;
  audioKbps: number;
  defaultEncoder: EncoderMode;
};

export type OutputFormat = 'original' | 'landscape' | 'vertical';
export type EncoderMode = 'auto' | 'cpu_quality' | 'gpu_fast';

export const DEFAULT_PRESETS: ClipPreset[] = [
  {
    id: 'discord-free',
    label: '10 MB',
    targetMiB: 9.75,
    visible: true,
    description: 'Discord Free',
    outputFormat: 'original',
    speedQuality: 72,
    maxResolution: 720,
    maxFps: 30,
    audioKbps: 48,
    defaultEncoder: 'cpu_quality',
  },
  {
    id: 'discord-nitro',
    label: '50 MB',
    targetMiB: 48,
    visible: true,
    description: 'Discord Nitro',
    outputFormat: 'original',
    speedQuality: 62,
    maxResolution: 1080,
    maxFps: 60,
    audioKbps: 96,
    defaultEncoder: 'auto',
  },
];

export const PRESETS = Object.fromEntries(DEFAULT_PRESETS.map((preset) => [preset.id, preset])) as Record<string, ClipPreset>;

export const createPresetId = () => `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function normalizePreset(preset: ClipPreset): ClipPreset {
  return {
    ...preset,
    outputFormat: preset.outputFormat ?? 'original',
    speedQuality: preset.speedQuality ?? 60,
  };
}
