import { useEffect, useState } from 'react';
import { Plus, Save, Trash2, Wand2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Slider } from '../../components/ui/Slider';
import { Toggle } from '../../components/ui/Toggle';
import { usePresets } from '../../lib/PresetProvider';
import { createPresetId, type ClipPreset } from '../../lib/presets';
import { useTranslation } from '../../lib/locale';

const emptyPreset = (): ClipPreset => ({
  id: createPresetId(),
  label: '25 MB',
  targetMiB: 25,
  visible: true,
  description: 'Custom preset',
});

export function PresetsPage() {
  const { presets, addPreset, updatePreset, deletePreset, resetPresets } = usePresets();
  const t = useTranslation();
  const [activeId, setActiveId] = useState<string>('new');
  const [draft, setDraft] = useState<ClipPreset>(emptyPreset);

  const selected = activeId === 'new' ? null : presets.find((preset) => preset.id === activeId) ?? null;

  useEffect(() => {
    if (selected) setDraft(selected);
  }, [selected]);

  const updateDraft = (patch: Partial<ClipPreset>) => setDraft((current) => ({ ...current, ...patch }));

  const setTarget = (value: number) => {
    if (!Number.isFinite(value)) return;
    updateDraft({ targetMiB: Math.min(Math.max(Math.round(value), 1), 20000) });
  };

  const handleSave = () => {
    const targetMiB = Math.min(Math.max(draft.targetMiB, 1), 20000);
    const next: ClipPreset = {
      ...draft,
      targetMiB,
      label: draft.label.trim() || `${targetMiB} MB`,
      description: draft.description.trim() || t('presets.customPreset'),
    };

    if (selected) {
      updatePreset(selected.id, next);
      return;
    }

    addPreset({ ...next, id: createPresetId() });
    setDraft(emptyPreset());
  };

  const startNew = () => {
    setActiveId('new');
    setDraft(emptyPreset());
  };

  return (
    <div className="h-full overflow-auto bg-[#0d1117] p-4">
      <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-6xl overflow-hidden rounded-[10px] border border-white/[0.08] bg-[#0d1117]">
        <aside className="flex w-[240px] shrink-0 flex-col gap-4 border-r border-white/[0.07] bg-[#0b0f15] p-4">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-white/30">{t('presets.existing')}</p>
            <div className="flex flex-col gap-1.5">
              {presets.map((preset) => (
                <button key={preset.id} type="button" onClick={() => setActiveId(preset.id)} className={`rounded-lg border p-3 text-left transition ${activeId === preset.id ? 'border-[#4fc3a1] bg-[#4fc3a1]/10' : 'border-white/[0.09] bg-white/[0.04] hover:bg-white/[0.07]'}`}>
                  <p className="text-xs font-medium text-white">{preset.label}</p>
                  <p className="mt-0.5 text-[10px] text-white/40">{preset.description}</p>
                  {preset.visible && <span className="mt-1.5 inline-flex rounded-full bg-[#4fc3a1]/15 px-2 py-0.5 text-[10px] text-[#4fc3a1]">{t('presets.visible')}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-white/[0.07]" />
          <div className="mt-auto flex flex-col gap-2">
            <Button onClick={startNew} className="flex items-center justify-center gap-2 bg-[#1d9e75] text-xs hover:bg-[#188866]"><Plus size={14} /> {t('presets.newPreset')}</Button>
            <Button onClick={resetPresets} variant="ghost" className="border border-white/10 bg-white/[0.04] text-xs">{t('presets.resetDefaults')}</Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-[#0d1117] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/35">{t('presets.title')}</p>
              <h1 className="mt-1 text-lg font-medium text-white">{selected ? t('presets.editPreset') : t('presets.createPreset')}</h1>
            </div>
            {selected && selected.id.startsWith('custom-') && (
              <button type="button" onClick={() => { deletePreset(selected.id); startNew(); }} className="rounded-lg p-2 text-white/35 transition hover:bg-red-500/10 hover:text-red-300"><Trash2 size={16} /></button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-[11px] text-white/50">{t('presets.name')}<input value={draft.label} onChange={(event) => updateDraft({ label: event.target.value })} className="w-full rounded-md border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white outline-none focus:border-[#4fc3a1]" /></label>
            <label className="space-y-1.5 text-[11px] text-white/50">{t('presets.description')}<input value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} className="w-full rounded-md border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white outline-none focus:border-[#4fc3a1]" /></label>
          </div>

          <div className="mt-5">
            <label className="block space-y-2 text-[11px] text-white/50">
              <span className="flex items-center justify-between">
                {t('presets.targetSize')}
                <span className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={20000}
                    value={draft.targetMiB}
                    onChange={(event) => setTarget(Number(event.target.value))}
                    className="w-20 rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-right text-xs font-medium text-[#4fc3a1] outline-none focus:border-[#4fc3a1]"
                  />
                  <b className="font-medium text-[#4fc3a1]">MB</b>
                </span>
              </span>
              <Slider min={1} max={500} step={1} value={Math.min(draft.targetMiB, 500)} onChange={(event) => setTarget(Number(event.target.value))} />
            </label>
          </div>

          {/* Quality is not a field any more: every setting that used to live here
              competed with the size target the app promises to hit. */}
          <div className="mt-5 flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <Wand2 size={15} className="mt-0.5 shrink-0 text-[#4fc3a1]" />
            <div>
              <p className="text-xs text-white">{t('presets.autoQualityTitle')}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-white/40">{t('presets.autoQualityBody')}</p>
            </div>
          </div>

          <div className="my-5 h-px bg-white/[0.07]" />
          <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs text-white">{t('presets.showInEditor')}</p><p className="text-[10px] text-white/35">{t('presets.showInEditorSubtitle')}</p></div><Toggle checked={draft.visible} onChange={(visible) => updateDraft({ visible })} /></div>
          <Button onClick={handleSave} className="flex w-full items-center justify-center gap-2 bg-[#1d9e75] text-xs hover:bg-[#188866]"><Save size={15} /> {selected ? t('presets.savePreset') : t('presets.createPreset')}</Button>
        </main>
      </div>
    </div>
  );
}
