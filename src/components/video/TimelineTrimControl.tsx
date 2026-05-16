import { useRef, useState, type PointerEvent } from 'react';
import { formatSeconds } from '../../lib/format';
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';

type DragTarget = 'start' | 'end' | 'range' | 'playhead' | null;

type Props = {
  duration: number;
  start: number;
  end: number;
  currentTime: number;
  isPlaying: boolean;
  thumbnails: string[];
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
  onSeek: (value: number) => void;
  onPreviewSeek: (value: number) => void;
  onPlayPause: () => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function TimelineTrimControl({ duration, start, end, currentTime, isPlaying, thumbnails, onStartChange, onEndChange, onSeek, onPreviewSeek, onPlayPause }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rangeOffsetRef = useRef(0);
  const scrubTimeRef = useRef<number | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const safeDuration = duration || 1;
  const minGap = Math.min(0.5, safeDuration);
  const rangeLength = Math.max(end - start, minGap);
  const startPct = (start / safeDuration) * 100;
  const endPct = (end / safeDuration) * 100;
  const displayTime = scrubTime ?? currentTime;
  const currentPct = clamp((displayTime / safeDuration) * 100, 0, 100);
  const markers = Array.from({ length: 7 }, (_, index) => (safeDuration / 6) * index);

  const getTimeFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return clamp(((event.clientX - rect.left) / rect.width) * safeDuration, 0, safeDuration);
  };

  const updateDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragTarget) return;
    const time = getTimeFromPointer(event);

    if (dragTarget === 'start') {
      scrubTimeRef.current = time;
      setScrubTime(time);
      onPreviewSeek(time);
      onStartChange(clamp(time, 0, Math.max(end - minGap, 0)));
      return;
    }

    if (dragTarget === 'end') {
      scrubTimeRef.current = time;
      setScrubTime(time);
      onPreviewSeek(time);
      onEndChange(clamp(time, Math.min(start + minGap, safeDuration), safeDuration));
      return;
    }

    if (dragTarget === 'range') {
      const nextStart = clamp(time - rangeOffsetRef.current, 0, Math.max(safeDuration - rangeLength, 0));
      scrubTimeRef.current = clamp(nextStart + rangeOffsetRef.current, 0, safeDuration);
      setScrubTime(scrubTimeRef.current);
      onPreviewSeek(scrubTimeRef.current);
      onStartChange(nextStart);
      onEndChange(nextStart + rangeLength);
      return;
    }

    scrubTimeRef.current = time;
    setScrubTime(time);
    onPreviewSeek(time);
  };

  const beginDrag = (event: PointerEvent<HTMLDivElement>, target: DragTarget) => {
    event.preventDefault();
    event.stopPropagation();
    trackRef.current?.setPointerCapture(event.pointerId);
    setDragTarget(target);
    const time = getTimeFromPointer(event);

    if (target === 'range') {
      rangeOffsetRef.current = clamp(time - start, 0, rangeLength);
      scrubTimeRef.current = time;
      setScrubTime(time);
      onPreviewSeek(time);
      return;
    }

    if (target === 'playhead') {
      scrubTimeRef.current = time;
      setScrubTime(time);
      onPreviewSeek(time);
    }
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (trackRef.current?.hasPointerCapture(event.pointerId)) {
      trackRef.current.releasePointerCapture(event.pointerId);
    }
    if (dragTarget === 'playhead' && scrubTimeRef.current !== null) {
      onSeek(scrubTimeRef.current);
    }
    scrubTimeRef.current = null;
    setScrubTime(null);
    setDragTarget(null);
  };

  return (
    <div className="w-full bg-[#0b0f15]">
      <div className="flex items-center gap-1.5 border-b border-white/[0.05] px-3.5 py-2">
        <button type="button" className="grid size-7 place-items-center rounded-md border border-white/[0.09] bg-white/[0.05] text-white/70 transition hover:bg-white/10 hover:text-white" onClick={() => onSeek(Math.max(currentTime - 5, 0))}>
          <SkipBack size={16} />
        </button>
        <button type="button" className="grid size-8 place-items-center rounded-lg border border-[#1d9e75] bg-[#1d9e75] text-white transition hover:bg-[#188866]" onClick={onPlayPause}>
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
        <button type="button" className="grid size-7 place-items-center rounded-md border border-white/[0.09] bg-white/[0.05] text-white/70 transition hover:bg-white/10 hover:text-white" onClick={() => onSeek(Math.min(currentTime + 5, safeDuration))}>
          <SkipForward size={16} />
        </button>
        <div className="mx-1 h-3.5 w-px bg-white/[0.08]" />
        <div className="ml-auto font-mono text-[11px] text-white/45">
          <strong className="font-medium text-white">{formatSeconds(displayTime)}</strong> / {formatSeconds(safeDuration)}
        </div>
        <div className="mx-1 h-3.5 w-px bg-white/[0.08]" />
        <div className="hidden text-[10px] text-white/30 md:block">Range <span className="text-white/50">{formatSeconds(start)} - {formatSeconds(end)}</span></div>
      </div>

      <div className="relative">
        <div
          ref={trackRef}
          role="slider"
          aria-label="Video timeline"
          tabIndex={0}
          className="relative h-[82px] w-full touch-none overflow-hidden bg-[#08080c] outline-none ring-0"
          onPointerDown={(event) => beginDrag(event, 'playhead')}
          onPointerMove={updateDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
        <div className="absolute inset-x-0 top-0 h-6 border-b border-white/[0.06] bg-black/20 px-3.5">
          {markers.map((marker) => (
            <div key={marker} className="absolute top-0 h-full -translate-x-1/2" style={{ left: `${(marker / safeDuration) * 100}%` }}>
              <div className="h-1.5 w-px bg-white/20" />
              <span className="mt-0.5 block font-mono text-[9px] text-white/30">{formatSeconds(marker)}</span>
            </div>
          ))}
          <div className="absolute inset-y-0 z-30 w-px bg-[#4fc3a1]" style={{ left: `${currentPct}%` }}>
            <div className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#0d1117] bg-[#4fc3a1]" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 top-6 z-10 flex items-stretch gap-0.5 px-3.5 py-1">
          {(thumbnails.length > 0 ? thumbnails : Array.from({ length: 18 }, () => '')).map((thumbnail, index) => (
            <div key={`${thumbnail}-${index}`} className="relative min-w-0 flex-1 overflow-hidden rounded-[3px] bg-white/[0.05]">
              {thumbnail ? <img src={thumbnail} alt="" className="h-full w-full object-cover" draggable={false} /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_35%,rgba(56,189,248,0.35),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,41,59,0.72))]" />}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          ))}
        </div>

        <div
          className="absolute bottom-0 top-6 z-10 cursor-move border-y border-[#4fc3a1]/45 bg-[#4fc3a1]/5"
          style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
          onPointerDown={(event) => beginDrag(event, 'range')}
        />
        <div className="absolute bottom-0 top-6 z-20 bg-black/55 backdrop-grayscale" style={{ left: 0, width: `${startPct}%` }} />
        <div className="absolute bottom-0 top-6 z-20 bg-black/55 backdrop-grayscale" style={{ left: `${endPct}%`, right: 0 }} />

        <div className="absolute bottom-0 top-6 z-30 w-1.5 -translate-x-1/2 cursor-ew-resize rounded-l bg-[#4fc3a1]/70" style={{ left: `${startPct}%` }} onPointerDown={(event) => beginDrag(event, 'start')} />
        <div className="absolute bottom-0 top-6 z-30 w-1.5 -translate-x-1/2 cursor-ew-resize rounded-r bg-[#4fc3a1]/70" style={{ left: `${endPct}%` }} onPointerDown={(event) => beginDrag(event, 'end')} />
        <div className="absolute inset-y-0 z-40 w-0.5 bg-[#4fc3a1]" style={{ left: `${currentPct}%` }}>
          <div className="absolute left-1/2 top-6 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#0d1117] bg-[#4fc3a1]" />
        </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-3.5 pb-2 pt-1 text-[10px] text-white/25">
        <span>Drag green handles to trim · drag needle to scrub</span>
        <span>Clip <span className="font-mono text-white/45">{formatSeconds(Math.max(end - start, 0))}</span></span>
      </div>
    </div>
  );
}
