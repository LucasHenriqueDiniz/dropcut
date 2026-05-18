import { getCurrentWindow } from '@tauri-apps/api/window';
import { NavLink } from 'react-router-dom';
import { Clapperboard, HandHeart, History, Minus, Settings, SlidersHorizontal, Square, X } from 'lucide-react';
import { openExternalLink } from '../../lib/tauri';

const appWindow = getCurrentWindow();

const navItems = [
  { to: '/', label: 'Workspace', icon: Clapperboard },
  { to: '/presets', label: 'Presets', icon: SlidersHorizontal },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/history', label: 'History', icon: History },
];

export function TopBar() {
  return (
    <header data-tauri-drag-region className="flex h-10 shrink-0 items-center justify-between border-b border-white/10 bg-[#07080c]/85 pl-4 backdrop-blur-xl">
      <div data-tauri-drag-region className="flex items-center gap-3">
        <div className="grid size-6 place-items-center overflow-hidden rounded-md">
          <img src="/icons/32x32.png" alt="" className="size-4" draggable={false} />
        </div>
        <div className="ml-2 flex items-center gap-1 text-xs text-slate-500">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) => `inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition md:px-3 md:py-1 ${isActive ? 'border border-white/10 bg-white/5 font-semibold text-white' : 'hover:bg-white/5 hover:text-slate-200'}`}
            >
              <item.icon size={14} className="shrink-0" />
              <span className="hidden md:inline">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      <div className="flex h-full items-center">
        <button
          type="button"
          aria-label="Support DropCut"
          className="mr-1 hidden h-7 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-[11px] text-slate-300 transition hover:bg-white/10 hover:text-white md:inline-flex"
          onClick={() => openExternalLink('donate').catch(console.error)}
        >
          <HandHeart size={13} /> Support
        </button>
        <button
          type="button"
          aria-label="Minimize window"
          className="grid h-full w-12 place-items-center text-slate-400 transition hover:bg-white/10 hover:text-white"
          onClick={() => appWindow.minimize()}
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          aria-label="Maximize window"
          className="grid h-full w-12 place-items-center text-slate-400 transition hover:bg-white/10 hover:text-white"
          onClick={() => appWindow.toggleMaximize()}
        >
          <Square size={13} />
        </button>
        <button
          type="button"
          aria-label="Close window"
          className="grid h-full w-12 place-items-center text-slate-400 transition hover:bg-red-500 hover:text-white"
          onClick={() => appWindow.close()}
        >
          <X size={16} />
        </button>
      </div>
    </header>
  );
}
