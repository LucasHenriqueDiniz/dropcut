import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { CheckCircle2, Clapperboard, Loader2, Square, XCircle } from 'lucide-react';
import { cancelBackgroundCompress, listenToEncodeProgress, startBackgroundCompress } from '../lib/tauri';
import { useTranslation } from '../lib/locale';

export function ProgressWindow() {
  const [progress, setProgress] = useState({ status: 'starting', value: 0, stage: '' });
  const [isCancelling, setIsCancelling] = useState(false);
  const t = useTranslation();

  useEffect(() => {
    let closeTimer: number | undefined;
    const unlisten = listenToEncodeProgress((payload) => {
      setProgress({ status: payload.status, value: payload.progress, stage: payload.stage });

      const normalized = payload.status.toLowerCase();
      if (normalized.includes('done') || normalized.includes('error') || normalized.includes('failed') || normalized.includes('cancelled')) {
        closeTimer = window.setTimeout(() => {
          void getCurrentWindow().close();
        }, 1200);
      }
    });

    void (async () => {
      try {
        await getCurrentWindow().show();
        await startBackgroundCompress();
      } catch (error) {
        setProgress({ status: `Error: ${String(error)}`, value: 0, stage: '' });
        closeTimer = window.setTimeout(() => {
          void getCurrentWindow().close();
        }, 1600);
      } finally {
        document.getElementById('boot-splash')?.remove();
      }
    })();

    return () => {
      if (closeTimer) {
        window.clearTimeout(closeTimer);
      }
      unlisten.then((fn) => fn());
    };
  }, []);

  const normalized = progress.status.toLowerCase();
  const isDone = normalized.includes('done');
  const isCancelled = normalized.includes('cancelled');
  const isError = normalized.includes('error') || normalized.includes('failed');
  const isFinished = isDone || isError || isCancelled;
  const percent = isDone ? 100 : Math.max(0, Math.min(Number.isFinite(progress.value) ? progress.value : 0, 100));
  const rounded = Math.round(percent);
  const title = isError
    ? t('progress.exportFailed')
    : isCancelled
      ? t('progress.exportCancelled')
      : isDone
        ? t('progress.exportComplete')
        : rounded > 0
          ? t('progress.compressingVideo')
          : t('progress.preparingExport');
  const stageLabel = progress.stage === 'adjusting' ? t('progress.stageAdjusting') : t('progress.stageEncoding');
  const detail = isDone
    ? t('progress.compressedReady')
    : isCancelled
      ? t('progress.cancelledDetail')
      : isError
        ? progress.status
        : rounded > 0
          ? stageLabel
          : t('progress.startingStage');

  const handleCancel = async () => {
    if (isFinished || isCancelling) return;
    setIsCancelling(true);
    try {
      await cancelBackgroundCompress();
      setProgress({ status: 'Cancelled by user', value: rounded, stage: '' });
    } catch (error) {
      setProgress({ status: `Error: failed to cancel (${String(error)})`, value: rounded, stage: '' });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#07080c] p-4 text-white">
      <div className="w-full max-w-[380px] overflow-hidden rounded-[28px] border border-white/10 bg-[#090d13] shadow-[0_22px_80px_rgba(0,0,0,0.55)]">
        <div className="relative p-5">
          <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_20%_0%,rgba(79,195,161,0.18),transparent_34%),radial-gradient(circle_at_80%_30%,rgba(124,58,237,0.16),transparent_30%)]" />
          <div className="relative flex items-center gap-3">
            <div className={`grid size-11 shrink-0 place-items-center rounded-2xl border ${isError ? 'border-red-300/20 bg-red-500/15 text-red-300' : isDone ? 'border-emerald-300/20 bg-emerald-500/15 text-emerald-300' : 'border-[#4fc3a1]/25 bg-[#4fc3a1]/12 text-[#4fc3a1]'}`}>
              {isError ? <XCircle size={20} /> : isDone ? <CheckCircle2 size={20} /> : <Clapperboard size={20} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">DropCut</p>
              <p className="mt-1 truncate text-base font-semibold text-white">{title}</p>
            </div>
            {!isFinished ? <Loader2 size={18} className="animate-spin text-[#4fc3a1]" /> : null}
          </div>

          <div className="relative mt-5">
            <div className="mb-2 flex items-center justify-between text-xs text-white/45">
              <span>{rounded > 0 ? t('progress.encodingFrames') : t('progress.startingFfmpeg')}</span>
              <span className="font-mono text-[#4fc3a1]">{rounded}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-white/[0.06]">
              <div className={`h-full rounded-full transition-all duration-300 ${isError ? 'bg-red-400' : isDone ? 'bg-emerald-400' : 'bg-gradient-to-r from-[#1d9e75] to-[#8b5cf6]'}`} style={{ width: `${rounded}%` }} />
            </div>
            <p className="mt-3 line-clamp-2 min-h-8 text-xs leading-relaxed text-white/45">{detail}</p>
          </div>

          {!isFinished ? (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isCancelling}
              className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:border-red-200/45 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCancelling ? <Loader2 size={16} className="animate-spin" /> : <Square size={14} />}
              {isCancelling ? t('progress.cancelling') : t('progress.cancelCompression')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
