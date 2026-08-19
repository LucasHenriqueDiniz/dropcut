import { useEffect, useMemo, useState, useRef } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import Aurora from '../../components/backgrounds/Aurora';
import { VideoDropzone } from '../../components/video/VideoDropzone';
import { VideoPreview } from '../../components/video/VideoPreview';
import { TimelineTrimControl } from '../../components/video/TimelineTrimControl';
import { ExportPanel } from '../../components/video/ExportPanel';
import { ProgressDialog } from '../../components/video/ProgressDialog';
import { type OutputFormat } from '../../lib/presets';
import { usePresets } from '../../lib/PresetProvider';
import { useEditorSession } from '../../lib/EditorSessionProvider';
import { generateVideoThumbnails, getFileSize, openExportFolder, probeVideo, startEncode, listenToEncodeProgress } from '../../lib/tauri';
import { AlertTriangle, FolderOpen, Loader2, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { Link } from 'react-router-dom';
import { formatSeconds } from '../../lib/format';
import { Toggle } from '../../components/ui/Toggle';
import { Select } from '../../components/ui/Select';
import { isAcceptedVideoPath, unsupportedVideoMessage } from '../../lib/videoFiles';
import { useTranslation } from '../../lib/LocaleProvider';

type AppSettings = {
  default_encoder: string;
  keep_audio_default: boolean;
  default_preset_id: string;
  auto_open_output_folder: boolean;
  output_filename_template: string;
  timeline_thumbnail_count: number;
};

export function EditorPage() {
  const {
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
  } = useEditorSession();
  const t = useTranslation();
  const [isProbing, setIsProbing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { presets } = usePresets();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [progress, setProgress] = useState({ open: false, status: 'probing', value: 0 });
  const [lastOutputPath, setLastOutputPath] = useState<string | null>(null);
  const [lastSuccessfulOutputPath, setLastSuccessfulOutputPath] = useState<string | null>(null);
  const [lastOutputSizeBytes, setLastOutputSizeBytes] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewSeekRef = useRef({ time: 0, timer: 0 });
  const settingsRef = useRef<AppSettings | null>(null);
  const lastOutputPathRef = useRef<string | null>(null);
  const autoOpenedPathRef = useRef<string | null>(null);
  const lastVolumeBeforeMuteRef = useRef(1);

  const videoSrc = useMemo(() => {
    if (!metadata) return undefined;
    return convertFileSrc(metadata.path);
  }, [metadata]);

  const visiblePresetOptions = presets
    .filter((item) => item.visible)
    .map((item) => ({ value: item.id, label: item.label, description: item.description }));
  const selectedPreset = presets.find((item) => item.id === preset && item.visible) ?? presets.find((item) => item.visible) ?? presets[0];

  useEffect(() => {
    const firstVisiblePreset = presets.find((item) => item.visible) ?? presets[0];
    if (!preset && firstVisiblePreset) setPreset(firstVisiblePreset.id);
    if (preset && !presets.some((item) => item.id === preset)) setPreset(presets[0]?.id ?? '');
    if (preset && presets.some((item) => item.id === preset && !item.visible) && firstVisiblePreset) setPreset(firstVisiblePreset.id);
  }, [preset, presets]);

  useEffect(() => {
    invoke<AppSettings>('get_settings').then((value) => {
      setSettings(value);
      settingsRef.current = value;
      if (defaultPresetApplied) return;
      const defaultPreset = presets.find((item) => item.id === value.default_preset_id);
      if (defaultPreset) {
        setDefaultPresetApplied(true);
        setPreset(defaultPreset.id);
        setFormat(defaultPreset.outputFormat);
      }
    }).catch(console.error);
  }, [presets]);

  useEffect(() => {
    const unlisten = listenToEncodeProgress((payload) => {
      setProgress({ open: true, status: payload.status, value: payload.progress });

      const outputPath = lastOutputPathRef.current;
      const shouldAutoOpen = settingsRef.current?.auto_open_output_folder;
      if (outputPath && payload.status.toLowerCase().includes('done')) {
        setLastSuccessfulOutputPath(outputPath);
        getFileSize(outputPath).then((sizeBytes) => {
          setLastOutputSizeBytes(sizeBytes);
        }).catch(() => {
          setLastOutputSizeBytes(null);
        });
      }
      if (outputPath && shouldAutoOpen && payload.status.toLowerCase().includes('done') && autoOpenedPathRef.current !== outputPath) {
        autoOpenedPathRef.current = outputPath;
        openExportFolder(outputPath).catch(console.error);
      }
    });
    
    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewSeekRef.current.timer) window.clearTimeout(previewSeekRef.current.timer);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = Math.min(Math.max(volume, 0), 1);
    video.muted = isMuted || volume <= 0;
  }, [isMuted, volume, metadata?.path]);

  useEffect(() => {
    if (!videoSrc || !metadata) {
      setThumbnails([]);
      setThumbnailCacheKey(null);
      return;
    }

    const thumbnailCount = settings?.timeline_thumbnail_count ?? 12;
    const nextCacheKey = `${metadata.path}:${metadata.duration_seconds}:${thumbnailCount}`;

    if (thumbnailCacheKey === nextCacheKey && thumbnails.length > 0) return;

    let cancelled = false;

    generateVideoThumbnails(metadata.path, metadata.duration_seconds, thumbnailCount).then((paths) => {
      if (!cancelled) {
        setThumbnails(paths.map((path) => convertFileSrc(path)));
        setThumbnailCacheKey(nextCacheKey);
      }
    }).catch((error) => {
      console.warn('Failed to generate timeline thumbnails', error);
      if (!cancelled) {
        setThumbnails([]);
        setThumbnailCacheKey(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [metadata, setThumbnailCacheKey, setThumbnails, settings?.timeline_thumbnail_count, thumbnailCacheKey, thumbnails.length, videoSrc]);

  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(time)) return;

    const nextTime = Math.min(Math.max(time, 0), metadata?.duration_seconds ?? time);
    if (Math.abs(video.currentTime - nextTime) < 0.03) return;

    try {
      video.currentTime = nextTime;
      setCurrentTime(nextTime);
    } catch (error) {
      console.warn('Video seek failed', error);
    }
  };

  const previewSeekTo = (time: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(time)) return;

    previewSeekRef.current.time = time;
    setCurrentTime(time);

    if (previewSeekRef.current.timer) return;

    previewSeekRef.current.timer = window.setTimeout(() => {
      previewSeekRef.current.timer = 0;
      const latestVideo = videoRef.current;
      if (!latestVideo) return;

      const nextTime = Math.min(Math.max(previewSeekRef.current.time, 0), metadata?.duration_seconds ?? previewSeekRef.current.time);
      if (Math.abs(latestVideo.currentTime - nextTime) < 0.05) return;

      try {
        latestVideo.currentTime = nextTime;
      } catch (error) {
        console.warn('Video preview seek failed', error);
      }
    }, 90);
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      if (video.currentTime < start || video.currentTime >= end) {
        video.currentTime = start;
      }
      await video.play();
    } else {
      video.pause();
    }
  };

  const handleVolumeChange = (nextVolume: number) => {
    const video = videoRef.current;
    const clamped = Math.min(Math.max(nextVolume, 0), 1);

    setVolume(clamped);

    if (clamped <= 0) {
      setIsMuted(true);
    } else {
      lastVolumeBeforeMuteRef.current = clamped;
      setIsMuted(false);
    }

    if (video) {
      video.volume = clamped;
      video.muted = clamped <= 0;
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;

    if (isMuted || volume <= 0) {
      const restored = Math.max(lastVolumeBeforeMuteRef.current, 0.05);
      setVolume(restored);
      setIsMuted(false);
      if (video) {
        video.volume = restored;
        video.muted = false;
      }
      return;
    }

    if (volume > 0) {
      lastVolumeBeforeMuteRef.current = volume;
    }

    setIsMuted(true);
    if (video) {
      video.muted = true;
    }
  };

  const handleStartChange = (value: number) => {
    const next = Math.min(value, Math.max(end - 0.5, 0));
    setStart(next);
  };

  const handleEndChange = (value: number) => {
    const max = metadata?.duration_seconds ?? value;
    const next = Math.max(Math.min(value, max), start + 0.5);
    setEnd(next);
  };

  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  const handleSelectVideo = async (path: string) => {
    setErrorMessage(null);
    if (!isAcceptedVideoPath(path)) {
      setErrorMessage(unsupportedVideoMessage(t));
      return;
    }

    setIsProbing(true);
    try {
      const meta = await probeVideo(path);
      setMetadata(meta);
      setStart(0);
      setEnd(meta.duration_seconds);
      setCurrentTime(0);
      const defaultVolume = 1;
      setVolume(defaultVolume);
      setIsMuted(false);
      lastVolumeBeforeMuteRef.current = defaultVolume;
      setThumbnails([]);
      setThumbnailCacheKey(null);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : t('editor.failedToLoad'));
      console.error('Probe failed', e);
    } finally {
      setIsProbing(false);
    }
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === 'enter' || event.payload.type === 'over') {
        setIsDraggingFile(true);
        return;
      }

      if (event.payload.type === 'leave') {
        setIsDraggingFile(false);
        return;
      }

      if (event.payload.type === 'drop') {
        setIsDraggingFile(false);
        const [path] = event.payload.paths;
        if (path) void handleSelectVideo(path);
      }
    }).then((dispose) => {
      unlisten = dispose;
    }).catch(console.error);

    return () => {
      unlisten?.();
    };
  }, []);

  const handleExport = async (target: number) => {
    if (!metadata || !selectedPreset) return;
    try {
      const stem = metadata.file_name.replace(/\.[^/.]+$/, '');
      const folder = metadata.path.includes('\\')
        ? metadata.path.slice(0, metadata.path.lastIndexOf('\\'))
        : metadata.path.slice(0, metadata.path.lastIndexOf('/'));
      const template = settings?.output_filename_template.trim() || '{target}mb_{name}';
      const outputName = template.replaceAll('{target}', String(target)).replaceAll('{name}', stem);
      const outputPath = await save({
        defaultPath: `${folder}\\${outputName}.mp4`,
        filters: [{ name: 'MP4 Video', extensions: ['mp4'] }],
      });

      if (!outputPath) return;

      setLastOutputPath(outputPath);
      setLastOutputSizeBytes(null);
      lastOutputPathRef.current = outputPath;
      autoOpenedPathRef.current = null;
      setProgress({ open: true, status: 'Encoding...', value: 0 });
      await startEncode({
        input_path: metadata.path,
        output_path: outputPath,
        target,
        start_seconds: start,
        end_seconds: end,
        format,
        encoder: selectedPreset.defaultEncoder === 'auto' ? (settings?.default_encoder ?? 'auto') : selectedPreset.defaultEncoder,
        keep_audio: settings?.keep_audio_default ?? true,
        max_resolution: selectedPreset.maxResolution,
        max_fps: selectedPreset.maxFps,
        audio_kbps: selectedPreset.audioKbps,
        speed_quality: selectedPreset.speedQuality,
      });
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const formatModes = [
    { id: 'original', title: 'Original' },
    { id: 'landscape', title: '16:9' },
    { id: 'vertical', title: '9:16' },
  ];

  return (
    <div className="flex h-full min-h-0 w-full animate-in fade-in duration-500 bg-[#0b0f15]">
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {isDraggingFile && (
          <div className="pointer-events-none absolute inset-3 z-30 grid place-items-center rounded-2xl border border-[#4fc3a1]/70 bg-[#1d9e75]/10 text-center backdrop-blur-sm">
            <div className="rounded-xl border border-white/10 bg-[#0a0d12]/85 px-7 py-5">
              <p className="text-2xl font-semibold text-white">{t('editor.dropToLoad')}</p>
              <p className="mt-2 text-sm text-[#4fc3a1]/80">{t('editor.dropToLoadDetail')}</p>
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          <section className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-[#080b10] p-4">
            <div className="pointer-events-none absolute inset-0 opacity-75">
              <Aurora colorStops={["#06111d", "#1d9e75", "#7c3aed"]} blend={0.34} amplitude={0.9} speed={0.16} />
            </div>
            <div className="absolute inset-0 bg-[#080b10]/38" />
            {!metadata ? (
              <div className="relative z-10 w-full max-w-[430px]">
                <VideoDropzone onSelect={handleSelectVideo} />
              </div>
            ) : (
              <div className="relative z-10 h-full w-full">
                <VideoPreview
                  ref={videoRef}
                  src={videoSrc}
                  onTimeUpdate={(time) => {
                    setCurrentTime(time);
                    if (videoRef.current && !videoRef.current.paused && time >= end) {
                      videoRef.current.pause();
                      videoRef.current.currentTime = start;
                    }
                  }}
                  onLoadedMetadata={(duration) => {
                    if (!metadata || end <= 0) setEnd(duration);
                    if (videoRef.current && currentTime > 0 && currentTime < duration) {
                      try {
                        videoRef.current.currentTime = currentTime;
                      } catch (error) {
                        console.warn('Failed to restore preview time', error);
                      }
                    }
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/55 px-2.5 py-1 text-[10px] text-white/55 backdrop-blur-sm">{metadata.file_name}</div>
                <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-black/55 px-2.5 py-1 font-mono text-[10px] text-white/55 backdrop-blur-sm">{formatSeconds(currentTime)} / {formatSeconds(metadata.duration_seconds)}</div>
              </div>
            )}
          </section>

          <aside className="flex w-[230px] shrink-0 flex-col gap-3 border-l border-white/[0.07] bg-[#0a0d12] p-3">
            {metadata ? (
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-white/30">{t('editor.fileInfo')}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="rounded-md border border-white/[0.08] bg-white/[0.04] p-2"><p className="text-xs font-medium text-white">{metadata.height}p</p><p className="mt-0.5 text-[10px] text-white/35">{t('editor.resolution')}</p></div>
                  <div className="rounded-md border border-white/[0.08] bg-white/[0.04] p-2"><p className="text-xs font-medium text-white">{formatSeconds(metadata.duration_seconds)}</p><p className="mt-0.5 text-[10px] text-white/35">{t('editor.duration')}</p></div>
                  <div className="rounded-md border border-white/[0.08] bg-white/[0.04] p-2"><p className="truncate text-xs font-medium text-white">{metadata.video_codec || t('editor.unknown')}</p><p className="mt-0.5 text-[10px] text-white/35">{t('editor.codec')}</p></div>
                  <div className="rounded-md border border-white/[0.08] bg-white/[0.04] p-2"><p className="text-xs font-medium text-white">{Math.round(metadata.fps || 0)}fps</p><p className="mt-0.5 text-[10px] text-white/35">{t('editor.fps')}</p></div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-3 text-xs text-white/40">
                {t('editor.loadVideoHint')}
              </div>
            )}

            <div className="h-px bg-white/[0.07]" />
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-white/30">{t('editor.targetSize')}</p>
              <Select
                value={selectedPreset?.id ?? ''}
                options={visiblePresetOptions}
                className="mb-2"
                onChange={(value) => {
                  const nextPreset = presets.find((item) => item.id === value);
                  setPreset(value);
                  if (nextPreset) setFormat(nextPreset.outputFormat);
                }}
              />
              <Link to="/presets" className="flex w-full items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white/60 transition hover:text-white">
                <SlidersHorizontal size={13} /> {t('editor.managePresets')}
              </Link>
              {selectedPreset && (
                <div className="mt-2 rounded-lg border border-white/[0.08] bg-white/[0.035] p-2.5">
                  <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-white/30">{t('editor.presetDetails')}</p>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="rounded-md bg-black/20 p-2"><p className="font-medium text-white">{selectedPreset.maxResolution}p</p><p className="mt-0.5 text-white/35">{t('editor.maxRes')}</p></div>
                    <div className="rounded-md bg-black/20 p-2"><p className="font-medium text-white">{selectedPreset.maxFps}fps</p><p className="mt-0.5 text-white/35">{t('editor.frameCap')}</p></div>
                    <div className="rounded-md bg-black/20 p-2"><p className="font-medium text-white">{selectedPreset.audioKbps > 0 ? `${selectedPreset.audioKbps}k` : t('editor.audioOff')}</p><p className="mt-0.5 text-white/35">{t('editor.audio')}</p></div>
                    <div className="rounded-md bg-black/20 p-2"><p className="font-medium text-white">{selectedPreset.defaultEncoder === 'gpu_fast' ? 'GPU' : selectedPreset.defaultEncoder === 'cpu_quality' ? 'CPU' : t('settings.encoderAuto')}</p><p className="mt-0.5 text-white/35">{t('editor.encoder')}</p></div>
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-white/[0.07]" />
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-white/30">{t('editor.aspectRatio')}</p>
              <div className="flex flex-wrap gap-1.5">
                {formatModes.map((mode) => (
                  <button key={mode.id} type="button" onClick={() => setFormat(mode.id as OutputFormat)} className={`rounded-full border px-2.5 py-1 text-[10px] transition ${format === mode.id ? 'border-[#1d9e75] bg-[#4fc3a1]/15 text-[#4fc3a1]' : 'border-white/10 bg-white/[0.06] text-white/50 hover:text-white'}`}>
                    {mode.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div><p className="text-[11px] text-white">{t('editor.keepAudio')}</p><p className="text-[10px] text-white/35">{t('editor.keepAudioSubtitle')}</p></div>
                <Toggle checked={settings?.keep_audio_default ?? true} onChange={(keep_audio_default) => setSettings((current) => current ? { ...current, keep_audio_default } : current)} />
              </div>
              <ExportPanel label={selectedPreset?.label ?? t('editor.presetFallback')} disabled={!metadata || !selectedPreset} onExport={() => selectedPreset && handleExport(Math.ceil(selectedPreset.targetMiB))} />
              {metadata && lastSuccessfulOutputPath && (
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => selectedPreset && handleExport(Math.ceil(selectedPreset.targetMiB))}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-[11px] text-white/65 transition hover:text-white"
                  >
                    <RotateCcw size={13} /> {t('editor.reExport')}
                  </button>
                  <button
                    type="button"
                    onClick={() => openExportFolder(lastSuccessfulOutputPath).catch(console.error)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-[11px] text-white/65 transition hover:text-white"
                  >
                    <FolderOpen size={13} /> {t('editor.openExported')}
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>

        {(isProbing || errorMessage) && (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-30 flex justify-center px-4">
            {errorMessage ? (
              <div className="pointer-events-auto flex max-w-md items-start gap-2 rounded-lg border border-amber-300/20 bg-[#0a0d12]/95 px-3 py-2 text-xs leading-relaxed text-amber-200 shadow-lg backdrop-blur-sm">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-300" />
                <p className="flex-1">{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="shrink-0 text-amber-200/60 transition hover:text-amber-100"
                  aria-label={t('common.dismiss')}
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-white/10 bg-[#0a0d12]/95 px-3 py-2 text-xs text-blue-300 shadow-lg backdrop-blur-sm">
                <Loader2 size={14} className="animate-spin" />
                {t('editor.probing')}
              </div>
            )}
          </div>
        )}

        {metadata && (
          <div className="relative z-10 border-t border-white/[0.08] bg-[#0b0f15]">
              <TimelineTrimControl
                duration={metadata.duration_seconds}
                start={start}
                end={end}
                currentTime={currentTime}
                isPlaying={isPlaying}
                hasAudio={metadata.has_audio}
                volume={volume}
                isMuted={isMuted}
                thumbnails={thumbnails}
                onStartChange={handleStartChange}
                onEndChange={handleEndChange}
                onSeek={seekTo}
                onPreviewSeek={previewSeekTo}
                onPlayPause={togglePlay}
                onVolumeChange={handleVolumeChange}
                onToggleMute={toggleMute}
              />
          </div>
        )}
      </main>

      <ProgressDialog 
        open={progress.open} 
        status={progress.status as any} 
        progress={progress.value} 
        outputPath={lastOutputPath}
        inputSizeBytes={metadata?.size_bytes ?? null}
        outputSizeBytes={lastOutputSizeBytes}
        onOpenFolder={() => {
          if (lastOutputPath) openExportFolder(lastOutputPath).catch(console.error);
        }}
        onClose={() => setProgress((value) => ({ ...value, open: false }))}
      />
    </div>
  );
}
