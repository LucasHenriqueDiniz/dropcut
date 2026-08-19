import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { VideoMetadata, EncodeRequest } from './video';
import type { ClipPreset } from './presets';

export type HistoryEntry = {
  id: string;
  createdAt: string;
  inputPath: string;
  outputPath: string;
  inputSizeBytes: number;
  outputSizeBytes: number;
  compressionRatio: number;
  durationSeconds: number;
};

export const probeVideo = (inputPath: string) =>
  invoke<VideoMetadata>('probe_video', { inputPath });

export const startEncode = (request: EncodeRequest) =>
  invoke<string>('start_encode', { request });

export const generateVideoThumbnails = (inputPath: string, durationSeconds: number, thumbnailCount?: number) =>
  invoke<string[]>('generate_video_thumbnails', { inputPath, durationSeconds, thumbnailCount });

export const listenToEncodeProgress = (callback: (event: { status: string, progress: number, stage: string }) => void) => 
  listen<{ status: string, progress: number, stage: string }>('encode-progress', (event) => {
    callback(event.payload);
  });

/// What the size target actually buys for this clip, so the UI can show it
/// instead of asking the user to pick numbers that fight the target.
export type EncodeEstimate = {
  fits: boolean;
  videoKbps: number;
  audioKbps: number;
  height: number;
  fps: number;
  smallestBytes: number;
  /** Target that would have kept the sound, so a mute warning can suggest one. */
  audioNeedsMib: number;
};

export const estimateExport = (
  targetMib: number,
  durationSeconds: number,
  keepAudio: boolean,
  sourceHeight: number,
  sourceFps: number,
) =>
  invoke<EncodeEstimate>('estimate_export', { targetMib, durationSeconds, keepAudio, sourceHeight, sourceFps });

export const startBackgroundCompress = () =>
  invoke<boolean>('start_background_compress');

export const cancelBackgroundCompress = () =>
  invoke<boolean>('cancel_background_compress');

export const getFfmpegStatus = () => 
  invoke<any>('get_ffmpeg_status');

export type AppSettings = {
  default_output: string;
  default_format: string;
  keep_audio_default: boolean;
  default_preset_id: string;
  auto_open_output_folder: boolean;
  output_filename_template: string;
  timeline_thumbnail_count: number;
  locale: string;
};

export const getSettings = () => invoke<AppSettings>('get_settings');
export const saveSettings = (settings: AppSettings) => invoke<void>('save_settings', { settings });

export const loadPresets = () => invoke<ClipPreset[]>('load_presets');
export const savePresets = (presets: ClipPreset[]) => invoke<void>('save_presets', { presets });
export const installContextMenu = (presets?: ClipPreset[]) => invoke<boolean>('install_context_menu', { presets });
export const uninstallContextMenu = () => invoke<boolean>('uninstall_context_menu');
export const isContextMenuInstalled = () => invoke<boolean>('is_context_menu_installed');
export const openExportFolder = (outputPath: string) => invoke<void>('open_export_folder', { outputPath });
export const getFileSize = (path: string) => invoke<number>('get_file_size', { path });
export const loadHistory = () => invoke<HistoryEntry[]>('load_history');
export const clearHistory = () => invoke<void>('clear_history');
export const openExternalLink = (kind: 'donate' | 'github' | 'releases') => invoke<void>('open_external_link', { kind });
