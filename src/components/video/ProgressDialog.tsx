import type { ProgressStatus } from '../../lib/video';
import { CheckCircle2, Clapperboard, FolderOpen, Loader2, X, XCircle } from 'lucide-react';

type Props = {
  open: boolean;
  status: ProgressStatus;
  progress: number;
  outputPath?: string | null;
  onClose?: () => void;
  onOpenFolder?: () => void;
  compact?: boolean;
};

export function ProgressDialog({ open, status, progress, outputPath, onClose, onOpenFolder, compact = false }: Props) {
  if (!open) return null;

  const normalized = status.toLowerCase();
  const isDone = normalized.includes('done');
  const isError = normalized.includes('error') || normalized.includes('failed');
  const safeProgress = isDone ? 100 : Math.max(0, Math.min(Number.isFinite(progress) ? progress : 0, 100));
  const percent = Math.round(safeProgress);
  const isPreparing = !isDone && !isError && percent <= 0;
  const currentStep = isDone ? 'Finalized' : isError ? 'Interrupted' : isPreparing ? 'Preparing export' : 'Encoding frames';
  const detail = isDone ? 'Your video is ready.' : isError ? status : isPreparing ? 'Starting FFmpeg and preparing output...' : status;
  const ringStyle = { background: `conic-gradient(${isError ? '#f87171' : isDone ? '#34d399' : '#4fc3a1'} ${percent * 3.6}deg, rgba(255,255,255,0.08) 0deg)` };

  if (compact) {
    return (
      <div className="w-full max-w-[340px] overflow-hidden rounded-[28px] border border-white/10 bg-[#090d13]/95 shadow-[0_22px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className={`grid size-10 place-items-center rounded-2xl border ${isError ? 'border-red-300/20 bg-red-500/15 text-red-300' : isDone ? 'border-emerald-300/20 bg-emerald-500/15 text-emerald-300' : 'border-[#4fc3a1]/25 bg-[#4fc3a1]/12 text-[#4fc3a1]'}`}>
              {isError ? <XCircle size={18} /> : isDone ? <CheckCircle2 size={18} /> : <Clapperboard size={18} />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">DropCut</p>
              <p className="truncate text-sm font-semibold text-white">{isError ? 'Export failed' : isDone ? 'Export complete' : currentStep}</p>
            </div>
            {(isDone || isError) && onClose && (
              <button type="button" onClick={onClose} className="ml-auto grid size-7 place-items-center rounded-lg text-white/35 transition hover:bg-white/10 hover:text-white" aria-label="Close progress">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="grid size-20 shrink-0 place-items-center rounded-full p-1" style={ringStyle} aria-label={`Export progress ${percent}%`}>
              <div className="grid size-full place-items-center rounded-full border border-white/10 bg-[#090d13]">
                {!isDone && !isError && percent < 100 ? <Loader2 size={14} className="mb-0.5 animate-spin text-[#4fc3a1]" /> : null}
                <p className="text-2xl font-bold tabular-nums text-white">{percent}%</p>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center justify-between text-[11px] text-white/45">
                <span>{currentStep}</span>
                <span className="font-mono text-[#4fc3a1]">{percent}/100</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-white/[0.06]">
                <div className={`h-full rounded-full transition-all duration-300 ${isError ? 'bg-red-400' : isDone ? 'bg-emerald-400' : 'bg-gradient-to-r from-[#1d9e75] to-[#8b5cf6]'}`} style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-white/45">{detail}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-[500px] overflow-hidden rounded-3xl border border-white/10 bg-[#090d13] shadow-2xl shadow-[#1d9e75]/20" onClick={(event) => event.stopPropagation()}>
        <div className="relative p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_0%,rgba(79,195,161,0.18),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(124,58,237,0.16),transparent_32%)]" />
          <div className="relative mb-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`grid size-11 place-items-center rounded-2xl border ${isError ? 'border-red-300/20 bg-red-500/15 text-red-300' : isDone ? 'border-emerald-300/20 bg-emerald-500/15 text-emerald-300' : 'border-[#4fc3a1]/25 bg-[#4fc3a1]/12 text-[#4fc3a1]'}`}>
                {isError ? <XCircle size={22} /> : isDone ? <CheckCircle2 size={22} /> : <Clapperboard size={22} />}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/35">Exporting video</p>
                <p className="mt-1 text-lg font-semibold text-white">{isError ? 'Export failed' : isDone ? 'Export complete' : currentStep}</p>
              </div>
            </div>

            {(isDone || isError) && onClose && (
              <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-lg text-white/35 transition hover:bg-white/10 hover:text-white" aria-label="Close progress">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="relative grid gap-5 sm:grid-cols-[132px_1fr] sm:items-center">
            <div className="mx-auto grid size-32 place-items-center rounded-full p-2" style={ringStyle} aria-label={`Export progress ${percent}%`}>
              <div className="grid size-full place-items-center rounded-full border border-white/10 bg-[#090d13]">
                {!isDone && !isError && percent < 100 ? <Loader2 size={18} className="mb-1 animate-spin text-[#4fc3a1]" /> : null}
                <div className="text-center">
                  <p className="text-3xl font-bold tabular-nums text-white">{percent}%</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/35">0 to 100</p>
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between text-xs text-white/50">
                <span>{currentStep}</span>
                <span className="font-mono text-[#4fc3a1]">{percent}/100</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-white/[0.06]">
                <div className={`h-full rounded-full transition-all duration-300 ${isError ? 'bg-red-400' : isDone ? 'bg-emerald-400' : 'bg-gradient-to-r from-[#1d9e75] to-[#8b5cf6]'}`} style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-3 max-h-20 overflow-auto rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2 text-xs leading-relaxed text-white/45">{detail}</p>
            </div>
          </div>

          {outputPath && (
            <p className="relative mt-4 truncate rounded-lg border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-[11px] text-white/40">{outputPath}</p>
          )}

          {isDone && outputPath && onOpenFolder && (
            <button
              type="button"
              onClick={() => {
                onOpenFolder();
                onClose?.();
              }}
              className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200/50 hover:bg-emerald-400/15"
            >
              <FolderOpen size={16} /> Open export folder
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
