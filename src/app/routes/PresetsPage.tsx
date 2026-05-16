import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Slider } from '../../components/ui/Slider';
import { Toggle } from '../../components/ui/Toggle';
import { usePresets } from '../../lib/PresetProvider';
import { createPresetId, type ClipPreset, type EncoderMode, type OutputFormat } from '../../lib/presets';

const emptyPreset = (): ClipPreset => ({
  id: createPresetId(),
  label: '25 MB',
  targetMiB: 25,
  visible: true,
  description: 'Custom preset',
  outputFormat: 'original',
  speedQuality: 60,
  maxResolution: 1080,
  maxFps: 60,
  audioKbps: 96,
  defaultEncoder: 'auto',
});

function encoderFromSpeedQuality(value: number): EncoderMode {
  if (value <= 35) return 'gpu_fast';
  if (value >= 75) return 'cpu_quality';
  return 'auto';
}

export function PresetsPage() {
  const { presets, addPreset, updatePreset, deletePreset, resetPresets } = usePresets();
  const [activeId, setActiveId] = useState<string>('new');
  const [draft, setDraft] = useState<ClipPreset>(emptyPreset);

  const selected = activeId === 'new' ? null : presets.find((preset) => preset.id === activeId) ?? null;

  useEffect(() => {
    if (selected) setDraft(selected);
  }, [selected]);

  const updateDraft = (patch: Partial<ClipPreset>) => setDraft((current) => ({ ...current, ...patch }));

  const handleSave = () => {
    const speedQuality = Math.min(Math.max(draft.speedQuality, 0), 100);
    const next: ClipPreset = {
      ...draft,
      label: draft.label.trim() || `${Math.round(draft.targetMiB)} MB`,
      description: draft.description.trim() || 'Custom preset',
      targetMiB: Math.max(1, draft.targetMiB),
      speedQuality,
      defaultEncoder: encoderFromSpeedQuality(speedQuality),
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
            <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-white/30">Existing</p>
            <div className="flex flex-col gap-1.5">
              {presets.map((preset) => (
                <button key={preset.id} type="button" onClick={() => setActiveId(preset.id)} className={`rounded-lg border p-3 text-left transition ${activeId === preset.id ? 'border-[#4fc3a1] bg-[#4fc3a1]/10' : 'border-white/[0.09] bg-white/[0.04] hover:bg-white/[0.07]'}`}>
                  <p className="text-xs font-medium text-white">{preset.label}</p>
                  <p className="mt-0.5 text-[10px] text-white/40">{preset.description} · {preset.maxResolution}p · {preset.maxFps}fps</p>
                  {preset.visible && <span className="mt-1.5 inline-flex rounded-full bg-[#4fc3a1]/15 px-2 py-0.5 text-[10px] text-[#4fc3a1]">Visible</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-white/[0.07]" />
          <div className="mt-auto flex flex-col gap-2">
            <Button onClick={startNew} className="flex items-center justify-center gap-2 bg-[#1d9e75] text-xs hover:bg-[#188866]"><Plus size={14} /> New preset</Button>
            <Button onClick={resetPresets} variant="ghost" className="border border-white/10 bg-white/[0.04] text-xs">Reset defaults</Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-[#0d1117] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/35">Presets</p>
              <h1 className="mt-1 text-lg font-medium text-white">{selected ? 'Edit preset' : 'Create preset'}</h1>
            </div>
            {selected && selected.id.startsWith('custom-') && (
              <button type="button" onClick={() => { deletePreset(selected.id); startNew(); }} className="rounded-lg p-2 text-white/35 transition hover:bg-red-500/10 hover:text-red-300"><Trash2 size={16} /></button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-[11px] text-white/50">Name<input value={draft.label} onChange={(event) => updateDraft({ label: event.target.value })} className="w-full rounded-md border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white outline-none focus:border-[#4fc3a1]" /></label>
            <label className="space-y-1.5 text-[11px] text-white/50">Description<input value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} className="w-full rounded-md border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white outline-none focus:border-[#4fc3a1]" /></label>
            <label className="space-y-1.5 text-[11px] text-white/50">Max resolution<Select value={draft.maxResolution} options={[480, 720, 1080, 1440].map((value) => ({ value, label: `${value}p` }))} onChange={(maxResolution) => updateDraft({ maxResolution })} /></label>
            <label className="space-y-1.5 text-[11px] text-white/50">Max FPS<Select value={draft.maxFps} options={[24, 30, 60].map((value) => ({ value, label: String(value) }))} onChange={(maxFps) => updateDraft({ maxFps })} /></label>
            <label className="space-y-1.5 text-[11px] text-white/50">Output format<Select value={draft.outputFormat} options={[{ value: 'original' as OutputFormat, label: 'Original' }, { value: 'landscape' as OutputFormat, label: 'Landscape 16:9' }, { value: 'vertical' as OutputFormat, label: 'Vertical 9:16' }]} onChange={(outputFormat) => updateDraft({ outputFormat })} /></label>
            <label className="space-y-1.5 text-[11px] text-white/50">Audio bitrate<Select value={draft.audioKbps} options={[48, 96, 128, 192].map((value) => ({ value, label: `${value} kbps` }))} onChange={(audioKbps) => updateDraft({ audioKbps })} /></label>
          </div>

          <div className="mt-5 space-y-5">
            <label className="block space-y-2 text-[11px] text-white/50"><span className="flex justify-between">Target size <b className="font-medium text-[#4fc3a1]">{draft.targetMiB} MiB</b></span><Slider min={1} max={500} step={1} value={draft.targetMiB} onChange={(event) => updateDraft({ targetMiB: Number(event.target.value) })} /></label>
            <label className="block space-y-2 text-[11px] text-white/50"><span className="flex justify-between">Speed / Quality <b className="font-medium text-[#4fc3a1]">{draft.speedQuality}%</b></span><Slider min={0} max={100} step={1} value={draft.speedQuality} onChange={(event) => updateDraft({ speedQuality: Number(event.target.value), defaultEncoder: encoderFromSpeedQuality(Number(event.target.value)) })} /><span className="flex justify-between text-[10px] text-white/25"><span>Faster</span><span>Balanced</span><span>Better quality</span></span></label>
          </div>

          <div className="my-5 h-px bg-white/[0.07]" />
          <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs text-white">Show in editor</p><p className="text-[10px] text-white/35">Appears in workspace sidebar</p></div><Toggle checked={draft.visible} onChange={(visible) => updateDraft({ visible })} /></div>
          <Button onClick={handleSave} className="flex w-full items-center justify-center gap-2 bg-[#1d9e75] text-xs hover:bg-[#188866]"><Save size={15} /> {selected ? 'Save preset' : 'Create preset'}</Button>
        </main>
      </div>
    </div>
  );
}
