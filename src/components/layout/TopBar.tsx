import { getCurrentWindow } from '@tauri-apps/api/window';
import { NavLink } from 'react-router-dom';
import { HandHeart, Minus, Square, X } from 'lucide-react';
import { openExternalLink } from '../../lib/tauri';

const appWindow = getCurrentWindow();

const navItems = [
  { to: '/', label: 'Workspace' },
  { to: '/presets', label: 'Presets' },
  { to: '/settings', label: 'Settings' },
  { to: '/history', label: 'History' },
];

export function TopBar() {
  return (
    <header data-tauri-drag-region className="flex h-10 shrink-0 items-center justify-between border-b border-white/10 bg-[#07080c]/85 pl-4 backdrop-blur-xl">
      <div data-tauri-drag-region className="flex items-center gap-3">
        <div className="grid size-6 place-items-center overflow-hidden rounded-md">
          <img src="/icons/32x32.png" alt="" className="size-4" draggable={false} />
        </div>
        <div className="ml-2 hidden items-center gap-1 text-xs text-slate-500 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `rounded-md px-3 py-1 transition ${isActive ? 'border border-white/10 bg-white/5 font-semibold text-white' : 'hover:bg-white/5 hover:text-slate-200'}`}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="flex h-full items-center">
        <button
          type="button"
          aria-label="Support DropCut"
          className="mr-1 hidden h-7 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-[11px] text-slate-300 transition hover:bg-white/10 hover:text-white md:inline-flex"
          onClick={() => openExternalLink('support').catch(console.error)}
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
