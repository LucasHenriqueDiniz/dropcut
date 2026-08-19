import type { ProgressStatus } from '../../lib/video';
import { CheckCircle2, Clapperboard, FolderOpen, Loader2, X, XCircle } from 'lucide-react';
import { formatBytes } from '../../lib/format';
import { useTranslation } from '../../lib/LocaleProvider';

const RING_CIRCUMFERENCE = 2 * Math.PI * 35;

function ProgressRing({ pct, done, error }: { pct: number; done: boolean; error: boolean }) {
  const offset = RING_CIRCUMFERENCE * (1 - pct / 100);
  const t = useTranslation();

  return (
    <div className="relative size-24 shrink-0">
      <svg width={96} height={96} viewBox="0 0 80 80" className="-rotate-90">
        <circle cx={40} cy={40} r={35} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
        <circle
          cx={40}
          cy={40}
          r={35}
          fill="none"
          stroke={error ? '#f87171' : done ? '#34d399' : '#4fc3a1'}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {!done && !error ? <Loader2 size={14} className="mb-1 animate-spin text-[#4fc3a1]" /> : null}
        <span className="font-mono text-[20px] font-semibold leading-none text-white">{Math.round(pct)}%</span>
        <span className="mt-1 text-[9px] uppercase tracking-[0.16em] text-white/35">{t('progress.of100')}</span>
      </div>
    </div>
  );
}

type Props = {
  open: boolean;
  status: ProgressStatus;
  progress: number;
  outputPath?: string | null;
  inputSizeBytes?: number | null;
  outputSizeBytes?: number | null;
  onClose?: () => void;
  onOpenFolder?: () => void;
  compact?: boolean;
};

export function ProgressDialog({ open, status, progress, outputPath, inputSizeBytes, outputSizeBytes, onClose, onOpenFolder, compact = false }: Props) {
  const t = useTranslation();

  if (!open) return null;

  const normalized = status.toLowerCase();
  const isDone = normalized.includes('done');
  const isError = normalized.includes('error') || normalized.includes('failed');
  const safeProgress = isDone ? 100 : Math.max(0, Math.min(Number.isFinite(progress) ? progress : 0, 100));
  const percent = Math.round(safeProgress);
  const isPreparing = !isDone && !isError && percent <= 0;
  const currentStep = isDone ? t('progress.finalized') : isError ? t('progress.interrupted') : isPreparing ? t('progress.preparingExport') : t('progress.encodingFrames');
  const hasSizeSummary = Boolean(isDone && inputSizeBytes != null && outputSizeBytes != null);
  const savedRatio = hasSizeSummary && inputSizeBytes && outputSizeBytes ? Math.max(0, 1 - outputSizeBytes / inputSizeBytes) : 0;
  const savedPercent = Math.round(savedRatio * 100);
  const inputSizeLabel = inputSizeBytes != null ? formatBytes(inputSizeBytes) : null;
  const outputSizeLabel = outputSizeBytes != null ? formatBytes(outputSizeBytes) : null;
  const progressTitle = isDone ? t('progress.exportComplete') : isError ? t('progress.exportFailed') : percent < 30 ? t('progress.preparingExportEllipsis') : percent < 90 ? t('progress.processingVideo') : t('progress.almostReady');
  const stageLine = isDone
    ? t('progress.compressedReady')
    : isError
      ? status
      : percent < 30
        ? t('progress.startingStage')
        : percent < 90
          ? t('progress.encodingStage')
          : t('progress.finalizingStage');

  if (compact) {
    return (
      <div className={`w-full max-w-[380px] overflow-hidden rounded-[28px] border border-white/10 bg-[#090d13]/95 shadow-[0_22px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl ${isDone ? 'animate-in fade-in zoom-in-95 duration-300' : ''}`}>
        <div className="p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`grid size-10 place-items-center rounded-2xl border ${isError ? 'border-red-300/20 bg-red-500/15 text-red-300' : isDone ? 'border-emerald-300/20 bg-emerald-500/15 text-emerald-300' : 'border-[#4fc3a1]/25 bg-[#4fc3a1]/12 text-[#4fc3a1]'}`}>
                {isError ? <XCircle size={18} /> : isDone ? <CheckCircle2 size={18} /> : <Clapperboard size={18} />}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">{t('progress.exportingVideo')}</p>
                <p className="mt-1 text-sm font-semibold leading-tight text-white">{isError ? t('progress.exportFailed') : isDone ? t('progress.exportComplete') : currentStep}</p>
              </div>
            </div>
            {(isDone || isError) && onClose && (
              <button type="button" onClick={onClose} className="grid size-7 place-items-center rounded-lg text-white/35 transition hover:bg-white/10 hover:text-white" aria-label={t('progress.closeProgress')}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <ProgressRing pct={percent} done={isDone} error={isError} />

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center justify-between text-[11px] text-white/45">
                <span>{currentStep}</span>
                <span className="font-mono text-[#4fc3a1]">{percent}/100</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-white/[0.06]">
                <div className={`h-full rounded-full transition-all duration-300 ${isError ? 'bg-red-400' : isDone ? 'bg-emerald-400' : 'bg-gradient-to-r from-[#1d9e75] to-[#8b5cf6]'}`} style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-white/45">{stageLine}</p>
            </div>
          </div>

          {hasSizeSummary && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">{t('common.before')}</p>
                <p className="mt-1 text-sm font-semibold text-white">{inputSizeLabel ?? '-'}</p>
              </div>
              <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-emerald-100/70">{t('common.after')}</p>
                <p className="mt-1 text-sm font-semibold text-emerald-100">{outputSizeLabel ?? '-'}</p>
              </div>
            </div>
          )}

          {outputPath && <p className="relative mt-4 truncate rounded-lg border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-[11px] text-white/40">{outputPath}</p>}

          {hasSizeSummary && (
            <span className="mt-3 inline-flex items-center rounded-full border border-emerald-300/25 bg-emerald-400/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-100 animate-[pulse_1.6s_ease-in-out_2]">
              {t('progress.saved', { percent: savedPercent })}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-md" onClick={onClose}>
      <div className={`w-full max-w-[540px] overflow-hidden rounded-3xl border border-white/10 bg-[#090d13] shadow-[0_28px_90px_rgba(0,0,0,0.6)] ${isDone ? 'animate-in fade-in zoom-in-95 duration-300' : ''}`} onClick={(event) => event.stopPropagation()}>
        <div className="relative p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_0%,rgba(79,195,161,0.2),transparent_36%),radial-gradient(circle_at_80%_18%,rgba(124,58,237,0.2),transparent_34%)]" />
          {isDone ? (
            <div className="relative">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="grid size-11 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-500/15 text-emerald-300">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/35">{t('progress.exportComplete')}</p>
                    <h2 className="mt-1 text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:whitespace-nowrap">
                      {t('progress.videoReady')}
                    </h2>
                  </div>
                </div>

                {(isDone || isError) && onClose && (
                  <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-lg text-white/35 transition hover:bg-white/10 hover:text-white" aria-label={t('progress.closeProgress')}>
                    <X size={16} />
                  </button>
                )}
              </div>

              {hasSizeSummary && (
                <div className="mb-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">{t('common.before')}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{inputSizeLabel ?? '-'}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-emerald-100/70">{t('common.after')}</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-100">{outputSizeLabel ?? '-'}</p>
                  </div>
                </div>
              )}

              {outputPath && <p className="relative mb-4 truncate rounded-lg border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-[11px] text-white/40">{outputPath}</p>}

              {isDone && outputPath && onOpenFolder && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenFolder();
                    onClose?.();
                  }}
                  className="relative flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200/50 hover:bg-emerald-400/15"
                >
                  <FolderOpen size={16} /> {t('progress.openExportFolder')}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="relative mb-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`grid size-11 place-items-center rounded-2xl border ${isError ? 'border-red-300/20 bg-red-500/15 text-red-300' : 'border-[#4fc3a1]/25 bg-[#4fc3a1]/12 text-[#4fc3a1]'}`}>
                    {isError ? <XCircle size={22} /> : <Clapperboard size={22} />}
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/35">{t('progress.exportingVideo')}</p>
                    <h2 className="mt-1 text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] text-white text-balance">
                      {progressTitle}
                    </h2>
                  </div>
                </div>

                {(isDone || isError) && onClose && (
                  <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-lg text-white/35 transition hover:bg-white/10 hover:text-white" aria-label={t('progress.closeProgress')}>
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="relative grid gap-5 sm:grid-cols-[140px_1fr] sm:items-center">
                <div className="mx-auto rounded-full p-2" aria-label={t('progress.progressAria', { percent })}>
                  <ProgressRing pct={percent} done={false} error={isError} />
                </div>

                <div className="min-w-0">
                  <div className="mb-2 flex items-center justify-between text-xs text-white/50">
                    <span>{currentStep}</span>
                    <span className="font-mono text-[#4fc3a1]">{percent}/100</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-white/[0.06]">
                    <div className={`h-full rounded-full transition-all duration-300 ${isError ? 'bg-red-400' : 'bg-gradient-to-r from-[#1d9e75] to-[#8b5cf6]'}`} style={{ width: `${percent}%` }} />
                  </div>
                  <p className="mt-3 max-h-20 overflow-auto rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-xs leading-relaxed text-white/50">{stageLine}</p>
                </div>
              </div>

              {outputPath && <p className="relative mt-4 truncate rounded-lg border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-[11px] text-white/40">{outputPath}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
