import { forwardRef, useState } from 'react';
import { useTranslation } from '../../lib/locale';

type Props = {
  src?: string; 
  onTimeUpdate?: (time: number) => void;
  onLoadedMetadata?: (duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
};

export const VideoPreview = forwardRef<HTMLVideoElement, Props>(({ src, onTimeUpdate, onLoadedMetadata, onPlay, onPause }, ref) => {
  const [error, setError] = useState<string | null>(null);
  const t = useTranslation();

  if (!src) return <div className="h-full min-h-[320px] rounded-2xl bg-slate-900/70" />;
  
  return (
    <div className="relative flex h-full min-h-[320px] w-full items-center justify-center overflow-hidden rounded-2xl bg-black">
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-4 text-center">
          <p className="text-xs text-red-400 font-mono">{error}</p>
        </div>
      )}
      <video 
        ref={ref}
        src={src} 
        className="h-full max-h-full w-full max-w-full object-contain" 
        onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setError(null);
          onLoadedMetadata?.(e.currentTarget.duration);
        }}
        onPlay={onPlay}
        onPause={onPause}
        onError={(e) => {
          const video = e.currentTarget;
          const err = video.error;
          const message = err?.message ?? '';
          if (message.includes('PIPELINE_ERROR_READ') || message.includes('demuxer seek failed') || message.includes('FFmpegDemuxer')) {
            console.warn('Ignoring transient preview seek error:', err);
            setError(null);
            return;
          }

          console.error("Video load error:", err);
          setError(
            err
              ? t('preview.error', { code: err.code, message: message || t('preview.mediaRejected') })
              : t('preview.unknownError')
          );
        }}
      />
    </div>
  );
});

VideoPreview.displayName = "VideoPreview";
