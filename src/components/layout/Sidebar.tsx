import { Link, useLocation } from 'react-router-dom';
import { Clapperboard, History, SlidersHorizontal, Settings, Scissors, Zap } from 'lucide-react';

const nav = [
  { to: '/', label: 'Editor', icon: Clapperboard },
  { to: '/presets', label: 'Presets', icon: SlidersHorizontal },
  { to: '/history', label: 'History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-slate-950/45 p-4 backdrop-blur-xl lg:block">
      <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-blue-950/20">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/20">
            <Scissors size={19} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Workspace</p>
            <p className="text-xs text-slate-500">Trim and compress</p>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-400/15 bg-blue-500/10 p-3 text-xs text-blue-100">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <Zap size={13} />
            Core flow
          </div>
          <p className="leading-relaxed text-blue-100/70">Load a video, drag the trim handles, choose a target and export.</p>
        </div>
      </div>

      <nav className="space-y-2">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                active
                  ? 'border border-blue-400/25 bg-blue-500/15 text-white shadow-lg shadow-blue-950/20'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-slate-400">
        <p className="mb-2 font-semibold text-slate-200">Steps</p>
        <ol className="space-y-1.5">
          <li>1. Select video</li>
          <li>2. Adjust trim range</li>
          <li>3. Pick or create a preset</li>
          <li>4. Save MP4</li>
        </ol>
      </div>
    </aside>
  );
}
