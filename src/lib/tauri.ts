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

export const listenToEncodeProgress = (callback: (event: { status: string, progress: number }) => void) => 
  listen<{ status: string, progress: number }>('encode-progress', (event) => {
    callback(event.payload);
  });

export const startBackgroundCompress = () =>
  invoke<boolean>('start_background_compress');

export const cancelBackgroundCompress = () =>
  invoke<boolean>('cancel_background_compress');

export const getFfmpegStatus = () => 
  invoke<any>('get_ffmpeg_status');

export const loadPresets = () => invoke<ClipPreset[]>('load_presets');
export const savePresets = (presets: ClipPreset[]) => invoke<void>('save_presets', { presets });
export const installContextMenu = (presets?: ClipPreset[]) => invoke<boolean>('install_context_menu', { presets });
export const uninstallContextMenu = () => invoke<boolean>('uninstall_context_menu');
export const isContextMenuInstalled = () => invoke<boolean>('is_context_menu_installed');
export const openExportFolder = (outputPath: string) => invoke<void>('open_export_folder', { outputPath });
export const getFileSize = (path: string) => invoke<number>('get_file_size', { path });
export const loadHistory = () => invoke<HistoryEntry[]>('load_history');
export const clearHistory = () => invoke<void>('clear_history');
export const openExternalLink = (kind: 'donate' | 'github') => invoke<void>('open_external_link', { kind });
