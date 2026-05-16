import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { DEFAULT_PRESETS, normalizePreset, type ClipPreset, type ClipPresetId } from './presets';
import { loadPresets as loadPresetsFromRust, savePresets as savePresetsToRust } from './tauri';

type PresetContextValue = {
  presets: ClipPreset[];
  addPreset: (preset: ClipPreset) => void;
  updatePreset: (id: ClipPresetId, patch: Partial<ClipPreset>) => void;
  togglePresetVisible: (id: ClipPresetId) => void;
  deletePreset: (id: ClipPresetId) => void;
  resetPresets: () => void;
};

const STORAGE_KEY = 'dropcut.presets.v1';
const LEGACY_STORAGE_KEY = 'clipshrink.presets.v1';
const PresetContext = createContext<PresetContextValue | null>(null);

function loadPresets() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return DEFAULT_PRESETS;
    const parsed = JSON.parse(raw) as ClipPreset[];
    if (!Array.isArray(parsed)) return DEFAULT_PRESETS;
    return parsed.map(normalizePreset);
  } catch {
    return DEFAULT_PRESETS;
  }
}

export function PresetProvider({ children }: PropsWithChildren) {
  const [presets, setPresets] = useState<ClipPreset[]>(loadPresets);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const hasLocalPresets = Boolean(window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY));

    loadPresetsFromRust().then((rustPresets) => {
      if (cancelled) return;
      if (!hasLocalPresets && rustPresets.length > 0) {
        setPresets(rustPresets.map(normalizePreset));
      }
      setHydrated(true);
    }).catch((error) => {
      console.error('Failed to load presets from Rust config', error);
      if (!cancelled) setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    if (hydrated) savePresetsToRust(presets).catch((error) => console.error('Failed to save presets to Rust config', error));
  }, [hydrated, presets]);

  const value = useMemo<PresetContextValue>(() => ({
    presets,
    addPreset: (preset) => setPresets((current) => [...current, normalizePreset(preset)]),
    updatePreset: (id, patch) => setPresets((current) => current.map((preset) => preset.id === id ? normalizePreset({ ...preset, ...patch }) : preset)),
    togglePresetVisible: (id) => setPresets((current) => current.map((preset) => preset.id === id ? { ...preset, visible: !preset.visible } : preset)),
    deletePreset: (id) => setPresets((current) => current.filter((preset) => preset.id !== id || !preset.id.startsWith('custom-'))),
    resetPresets: () => setPresets(DEFAULT_PRESETS),
  }), [presets]);

  return <PresetContext.Provider value={value}>{children}</PresetContext.Provider>;
}

export function usePresets() {
  const value = useContext(PresetContext);
  if (!value) throw new Error('usePresets must be used inside PresetProvider');
  return value;
}
