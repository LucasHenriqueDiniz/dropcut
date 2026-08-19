import { useEffect, useMemo, useState } from 'react';
import { Clock, FileVideo, FolderOpen, History, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { clearHistory, loadHistory, openExportFolder, type HistoryEntry } from '../../lib/tauri';
import { formatBytes, formatSeconds } from '../../lib/format';
import { useLocale } from '../../lib/LocaleProvider';

function fileName(path: string) {
  return path.split(/[\\/]/).pop() || path;
}

function folderName(path: string) {
  const index = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
  return index >= 0 ? path.slice(0, index) : path;
}

export function HistoryPage() {
  const { locale, t } = useLocale();

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t('history.unknownDate');
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const reductionLabel = (entry: HistoryEntry) =>
    t('history.smaller', { percent: Math.round(Math.max(0, entry.compressionRatio) * 100) });

  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => {
    const input = items.reduce((sum, item) => sum + item.inputSizeBytes, 0);
    const output = items.reduce((sum, item) => sum + item.outputSizeBytes, 0);
    const saved = Math.max(0, input - output);
    return { input, output, saved };
  }, [items]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await loadHistory());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleClear = async () => {
    if (items.length === 0 || clearing) return;
    setClearing(true);
    setError(null);
    try {
      await clearHistory();
      setItems([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="h-full overflow-auto bg-[#0d1117] p-4">
      <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-6xl overflow-hidden rounded-[10px] border border-white/[0.08] bg-[#0d1117]">
        <aside className="flex w-[240px] shrink-0 flex-col gap-4 border-r border-white/[0.07] bg-[#0b0f15] p-4">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-white/30">{t('history.title')}</p>
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white"><History size={14} className="text-[#4fc3a1]" /> {t('history.recentExports')}</div>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/30">{t('history.exports')}</p>
              <p className="mt-1 text-lg font-semibold text-white">{items.length}</p>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/30">{t('history.spaceSaved')}</p>
              <p className="mt-1 text-sm font-semibold text-[#4fc3a1]">{formatBytes(totals.saved)}</p>
            </div>
          </div>

          <div className="h-px bg-white/[0.07]" />
          <button
            type="button"
            disabled={items.length === 0 || clearing}
            onClick={handleClear}
            className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/55 transition hover:border-red-300/30 hover:bg-red-500/10 hover:text-red-100 disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:border-white/10 disabled:hover:bg-white/[0.04]"
          >
            {clearing ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            {t('history.clearHistory')}
          </button>
        </aside>

        <main className="min-w-0 flex-1 bg-[#0d1117] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/35">{t('history.title')}</p>
              <h1 className="mt-1 text-lg font-medium text-white">{t('history.recentExports')}</h1>
            </div>
            <button type="button" onClick={() => void refresh()} className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] text-white/45 transition hover:text-white">
              {t('common.refresh')}
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-300/20 bg-red-500/10 p-3 text-xs text-red-100">{error}</div>
          )}

          {loading ? (
            <div className="grid min-h-[360px] place-items-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-white/45">
              <div className="flex items-center gap-2 text-xs"><Loader2 size={15} className="animate-spin text-[#4fc3a1]" /> {t('history.loading')}</div>
            </div>
          ) : items.length === 0 ? (
            <div className="grid min-h-[360px] place-items-center rounded-lg border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center">
              <div>
                <div className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-[#4fc3a1]/10 text-[#4fc3a1]"><Sparkles size={20} /></div>
                <p className="text-sm font-medium text-white">{t('history.emptyTitle')}</p>
                <p className="mx-auto mt-2 max-w-md text-[11px] leading-relaxed text-white/40">{t('history.emptyDescription')}</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {items.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0e14] transition hover:border-[#4fc3a1]/25">
                  <div className="flex gap-4 p-4">
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#4fc3a1]/20 bg-[#4fc3a1]/10 text-[#4fc3a1]"><FileVideo size={20} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{fileName(item.outputPath)}</p>
                          <p className="mt-1 truncate text-[11px] text-white/35">{folderName(item.outputPath)}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold text-emerald-200">{reductionLabel(item)}</span>
                      </div>

                      <div className="mt-3 grid gap-2 text-[11px] text-white/45 sm:grid-cols-4">
                        <div className="rounded-lg bg-white/[0.035] p-2"><p className="text-white/30">{t('common.before')}</p><p className="mt-0.5 text-white">{formatBytes(item.inputSizeBytes)}</p></div>
                        <div className="rounded-lg bg-white/[0.035] p-2"><p className="text-white/30">{t('common.after')}</p><p className="mt-0.5 text-white">{formatBytes(item.outputSizeBytes)}</p></div>
                        <div className="rounded-lg bg-white/[0.035] p-2"><p className="text-white/30">{t('common.duration')}</p><p className="mt-0.5 text-white">{formatSeconds(item.durationSeconds)}</p></div>
                        <div className="rounded-lg bg-white/[0.035] p-2"><p className="text-white/30">{t('common.created')}</p><p className="mt-0.5 truncate text-white">{formatDate(item.createdAt)}</p></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] bg-white/[0.025] px-4 py-2">
                    <div className="flex min-w-0 items-center gap-2 text-[11px] text-white/35"><Clock size={13} /> <span className="truncate">{t('history.source', { name: fileName(item.inputPath) })}</span></div>
                    <button
                      type="button"
                      onClick={() => openExportFolder(item.outputPath).catch(console.error)}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/60 transition hover:border-[#4fc3a1]/30 hover:text-white"
                    >
                      <FolderOpen size={13} /> {t('history.openFolder')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
