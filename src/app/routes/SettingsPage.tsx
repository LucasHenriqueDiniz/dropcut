import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { CheckCircle2, ExternalLink, FolderOpen, HandHeart, LayoutPanelLeft, Monitor, RotateCcw, Save, Settings, Timeline, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Slider } from '../../components/ui/Slider';
import { Toggle } from '../../components/ui/Toggle';
import { installContextMenu, isContextMenuInstalled, openExternalLink, uninstallContextMenu } from '../../lib/tauri';
import { usePresets } from '../../lib/PresetProvider';

type AppSettings = {
  default_encoder: string;
  default_output: string;
  default_format: string;
  keep_audio_default: boolean;
  default_preset_id: string;
  auto_open_output_folder: boolean;
  output_filename_template: string;
  timeline_thumbnail_count: number;
};

type HealthStatus = {
  ffmpeg: { found: boolean };
  ffprobe: { found: boolean };
};

const DEFAULT_SETTINGS: AppSettings = {
  default_encoder: 'auto',
  default_output: 'same_folder',
  default_format: 'original',
  keep_audio_default: true,
  default_preset_id: 'discord-free',
  auto_open_output_folder: false,
  output_filename_template: '{target}mb_{name}',
  timeline_thumbnail_count: 12,
};

const sectionItems = [
  { id: 'editor', label: 'Editor defaults', icon: LayoutPanelLeft },
  { id: 'timeline', label: 'Timeline & output', icon: Timeline },
  { id: 'windows', label: 'Windows integration', icon: Monitor },
] as const;

type SettingsSectionId = (typeof sectionItems)[number]['id'];

const encoderOptions = [
  { value: 'auto', label: 'Auto' },
  { value: 'cpu_quality', label: 'CPU (libx264)' },
  { value: 'gpu_fast', label: 'GPU (h264_nvenc)' },
];

export function SettingsPage() {
  const { presets } = usePresets();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [contextMenuInstalled, setContextMenuInstalled] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('editor');

  useEffect(() => {
    invoke<AppSettings>('get_settings').then((value) => setSettings({ ...DEFAULT_SETTINGS, ...value })).catch(console.error);
    invoke<HealthStatus>('check_health').then(setHealth).catch(console.error);
    isContextMenuInstalled().then(setContextMenuInstalled).catch(console.error);
  }, []);

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
    setStatus(null);
  };

  const handleSave = async () => {
    try {
      await invoke('save_settings', { settings });
      setStatus('Settings saved.');
    } catch {
      setStatus('Failed to save settings.');
    }
  };

  const handleInstallMenu = async () => {
    try {
      const success = await installContextMenu(presets);
      setContextMenuInstalled(success);
      setStatus(success ? 'Windows context menu installed for visible presets.' : 'Context menu was not changed.');
    } catch {
      setStatus('Failed to install context menu.');
    }
  };

  const handleUninstallMenu = async () => {
    try {
      const success = await uninstallContextMenu();
      setContextMenuInstalled(false);
      setStatus(success ? 'Windows context menu removed.' : 'Context menu was not changed.');
    } catch {
      setStatus('Failed to remove context menu.');
    }
  };

  return (
    <div className="h-full overflow-auto bg-[#0d1117] p-4">
      <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-6xl overflow-hidden rounded-[10px] border border-white/[0.08] bg-[#0d1117]">
        <aside className="flex w-[240px] shrink-0 flex-col gap-4 border-r border-white/[0.07] bg-[#0b0f15] p-4">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-white/30">Sections</p>
            <div className="flex flex-col gap-1">
              {sectionItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activeSection;
                return (
                  <button key={item.id} type="button" onClick={() => setActiveSection(item.id)} className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition ${isActive ? 'bg-white/[0.07] text-white' : 'text-white/50 hover:bg-white/[0.05] hover:text-white/85'}`}>
                    <Icon size={14} className={isActive ? 'text-[#4fc3a1]' : 'text-white/35'} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-white/[0.07]" />
          <div className="mt-auto flex flex-col gap-2">
            <Button onClick={() => openExternalLink('donate').catch(console.error)} variant="ghost" className="flex items-center justify-center gap-2 border border-white/10 bg-white/[0.04] text-xs"><HandHeart size={14} /> Support DropCut</Button>
            <Button onClick={() => openExternalLink('github').catch(console.error)} variant="ghost" className="flex items-center justify-center gap-2 border border-white/10 bg-white/[0.04] text-xs"><ExternalLink size={14} /> GitHub repo</Button>
            <Button onClick={() => { setSettings(DEFAULT_SETTINGS); setStatus('Defaults restored. Save to persist them.'); }} variant="ghost" className="flex items-center justify-center gap-2 border border-white/10 bg-white/[0.04] text-xs"><RotateCcw size={14} /> Reset</Button>
            <Button onClick={handleSave} className="flex items-center justify-center gap-2 bg-[#1d9e75] text-xs hover:bg-[#188866]"><Save size={14} /> Save</Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-[#0d1117] p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/35">Settings</p>
              <h1 className="mt-1 text-lg font-medium text-white">App defaults</h1>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 text-[#4fc3a1]"><Settings size={18} /></div>
          </div>

          {status && <div className="mb-4 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/65">{status}</div>}

          <div className="space-y-5">
            {activeSection === 'editor' && <section>
              <h2 className="mb-3 text-sm font-medium text-white">Editor defaults</h2>
              <div className="space-y-4">
                <label className="block space-y-1.5 text-[11px] text-white/50">
                  Default preset
                  <Select
                    value={settings.default_preset_id}
                    options={presets.map((preset) => ({ value: preset.id, label: preset.label, description: preset.description }))}
                    onChange={(default_preset_id) => updateSettings({ default_preset_id })}
                  />
                </label>

                <div>
                  <p className="mb-2 text-[11px] text-white/50">Encoder preference</p>
                  <div className="flex flex-wrap gap-1.5">
                    {encoderOptions.map((option) => (
                      <button key={option.value} type="button" onClick={() => updateSettings({ default_encoder: option.value })} className={`rounded-full border px-2.5 py-1 text-[10px] transition ${settings.default_encoder === option.value ? 'border-[#1d9e75] bg-[#4fc3a1]/15 text-[#4fc3a1]' : 'border-white/10 bg-white/[0.06] text-white/50 hover:text-white'}`}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                  <div><p className="text-xs text-white">Keep audio by default</p><p className="text-[10px] text-white/35">Can be changed in workspace before export.</p></div>
                  <Toggle checked={settings.keep_audio_default} onChange={(keep_audio_default) => updateSettings({ keep_audio_default })} />
                </div>
              </div>
            </section>}

            {activeSection === 'timeline' && <div className="h-px bg-white/[0.07]" />}

            {activeSection === 'timeline' && <section>
              <h2 className="mb-3 text-sm font-medium text-white">Timeline & output</h2>
              <div className="space-y-4">
                <label className="block space-y-2 text-[11px] text-white/50"><span className="flex justify-between">Timeline thumbnails <b className="font-medium text-[#4fc3a1]">{settings.timeline_thumbnail_count}</b></span><Slider min={6} max={24} step={1} value={settings.timeline_thumbnail_count} onChange={(event) => updateSettings({ timeline_thumbnail_count: Number(event.target.value) })} /></label>
                <label className="block space-y-1.5 text-[11px] text-white/50">Output filename template<input value={settings.output_filename_template} onChange={(event) => updateSettings({ output_filename_template: event.target.value })} className="w-full rounded-md border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white outline-none focus:border-[#4fc3a1]" /><span className="block text-[10px] text-white/30">Tokens: {'{target}'} and {'{name}'}.</span></label>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3"><div><p className="text-xs text-white">Open output folder after export</p></div><Toggle checked={settings.auto_open_output_folder} onChange={(auto_open_output_folder) => updateSettings({ auto_open_output_folder })} /></div>
              </div>
            </section>}

            {activeSection === 'windows' && <div className="h-px bg-white/[0.07]" />}

            {activeSection === 'windows' && <section>
              <h2 className="mb-3 text-sm font-medium text-white">Windows integration</h2>
              <div className="mb-4 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1">
                {[['FFmpeg', health?.ffmpeg.found], ['FFprobe', health?.ffprobe.found]].map(([label, found]) => (
                  <div key={label as string} className="flex items-center justify-between border-b border-white/[0.06] py-2 text-[11px] last:border-b-0">
                    <span className="text-white/50">{label}</span>
                    <span className={`flex items-center gap-1.5 ${found ? 'text-[#4fc3a1]' : 'text-red-300'}`}>{found ? <CheckCircle2 size={13} /> : <XCircle size={13} />}{found ? 'Ready' : 'Missing'}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-b border-white/[0.06] py-2 text-[11px] last:border-b-0">
                  <span className="text-white/50">Context menu</span>
                  <span className={`flex items-center gap-1.5 ${contextMenuInstalled ? 'text-[#4fc3a1]' : 'text-white/35'}`}>{contextMenuInstalled ? <CheckCircle2 size={13} /> : <XCircle size={13} />}{contextMenuInstalled ? 'Installed' : 'Not installed'}</span>
                </div>
              </div>
              <p className="mb-3 text-[11px] text-white/35">Adds right-click actions for visible presets. Each action compresses in the background without opening the main window.</p>
              <div className="grid gap-2 sm:grid-cols-2"><Button onClick={handleInstallMenu} className="inline-flex items-center justify-center gap-2 bg-[#1d9e75] text-xs hover:bg-[#188866]"><FolderOpen size={14} />Force install/update</Button><Button onClick={handleUninstallMenu} variant="ghost" className="inline-flex items-center justify-center border border-white/10 bg-white/[0.04] text-xs">Remove menu</Button></div>
            </section>}
          </div>
        </main>
      </div>
    </div>
  );
}
