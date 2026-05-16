import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import type { VideoMetadata } from './video';
import type { ClipPresetId, OutputFormat } from './presets';

type EditorSessionContextValue = {
  metadata: VideoMetadata | null;
  setMetadata: (value: VideoMetadata | null) => void;
  start: number;
  setStart: (value: number) => void;
  end: number;
  setEnd: (value: number) => void;
  currentTime: number;
  setCurrentTime: (value: number) => void;
  preset: ClipPresetId;
  setPreset: (value: ClipPresetId) => void;
  format: OutputFormat;
  setFormat: (value: OutputFormat) => void;
  thumbnails: string[];
  setThumbnails: (value: string[]) => void;
  thumbnailCacheKey: string | null;
  setThumbnailCacheKey: (value: string | null) => void;
  defaultPresetApplied: boolean;
  setDefaultPresetApplied: (value: boolean) => void;
};

const EditorSessionContext = createContext<EditorSessionContextValue | null>(null);

export function EditorSessionProvider({ children }: PropsWithChildren) {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(60);
  const [currentTime, setCurrentTime] = useState(0);
  const [preset, setPreset] = useState<ClipPresetId>('');
  const [format, setFormat] = useState<OutputFormat>('original');
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [thumbnailCacheKey, setThumbnailCacheKey] = useState<string | null>(null);
  const [defaultPresetApplied, setDefaultPresetApplied] = useState(false);

  return (
    <EditorSessionContext.Provider value={{
      metadata,
      setMetadata,
      start,
      setStart,
      end,
      setEnd,
      currentTime,
      setCurrentTime,
      preset,
      setPreset,
      format,
      setFormat,
      thumbnails,
      setThumbnails,
      thumbnailCacheKey,
      setThumbnailCacheKey,
      defaultPresetApplied,
      setDefaultPresetApplied,
    }}>
      {children}
    </EditorSessionContext.Provider>
  );
}

export function useEditorSession() {
  const value = useContext(EditorSessionContext);
  if (!value) throw new Error('useEditorSession must be used inside EditorSessionProvider');
  return value;
}
