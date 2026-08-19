import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Settings2, X } from 'lucide-react';
import { type ClipPreset, type ClipPresetId } from '../../lib/presets';
import { useTranslation } from '../../lib/LocaleProvider';

type Props = {
  value: ClipPresetId;
  presets: ClipPreset[];
  onChange: (value: ClipPresetId) => void;
  onToggleVisible: (id: ClipPresetId) => void;
};

export function PresetSelector({ value, presets, onChange, onToggleVisible }: Props) {
  const [manageOpen, setManageOpen] = useState(false);
  const t = useTranslation();
  const visiblePresets = presets.filter((preset) => preset.visible);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {visiblePresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(preset.id)}
            className={`rounded-xl border p-3 text-left transition ${value === preset.id ? 'border-violet-400 bg-violet-500/15 text-white' : 'border-white/15 bg-white/[0.03] text-slate-200 hover:border-white/30'}`}
          >
            <p className="text-lg font-bold">{preset.label}</p>
            <p className="text-xs text-slate-500">{t('presetSelector.approxSize', { size: preset.targetMiB })}</p>
            <p className="mt-1 truncate text-[10px] uppercase tracking-wide text-slate-500">{preset.description}</p>
          </button>
        ))}

      </div>

      <button
        type="button"
        onClick={() => setManageOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-medium uppercase tracking-wider text-slate-400 transition hover:border-white/20 hover:text-white"
      >
        <Settings2 size={13} /> {t('presetSelector.manageVisible')}
      </button>

      {manageOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={() => setManageOpen(false)}>
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-5 shadow-2xl shadow-black/50" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{t('presetSelector.presets')}</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{t('presetSelector.visibleInEditor')}</h3>
                <p className="mt-1 text-sm text-slate-500">{t('presetSelector.visibleDescription')}</p>
              </div>
              <button type="button" onClick={() => setManageOpen(false)} className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {presets.map((preset) => (
                <label key={preset.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-semibold text-white"><span className="truncate">{preset.label}</span></span>
                    <span className="ml-2 text-xs text-slate-500">{preset.description}</span>
                  </span>
                  <input type="checkbox" checked={preset.visible} onChange={() => onToggleVisible(preset.id)} />
                </label>
              ))}
            </div>
            <Link
              to="/presets"
              onClick={() => setManageOpen(false)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-300/30 bg-cyan-500/10 px-3 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/60 hover:bg-cyan-500/15"
            >
              <Plus size={16} /> {t('presetSelector.newPreset')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
