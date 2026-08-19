import { getCurrentWindow } from '@tauri-apps/api/window';
import { NavLink } from 'react-router-dom';
import { ArrowUpCircle, Clapperboard, HandHeart, History, Minus, Settings, SlidersHorizontal, Square, X } from 'lucide-react';
import { openExternalLink } from '../../lib/tauri';
import { useTranslation } from '../../lib/locale';
import { useUpdateCheck } from '../../lib/useUpdateCheck';
import type { TranslationKey } from '../../lib/i18n';

const appWindow = getCurrentWindow();

const navItems = [
  { to: '/', labelKey: 'nav.workspace', icon: Clapperboard },
  { to: '/presets', labelKey: 'nav.presets', icon: SlidersHorizontal },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
  { to: '/history', labelKey: 'nav.history', icon: History },
] satisfies { to: string; labelKey: TranslationKey; icon: typeof Clapperboard }[];

export function TopBar() {
  const t = useTranslation();
  const updateVersion = useUpdateCheck();

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
              title={t(item.labelKey)}
              className={({ isActive }) => `inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition md:px-3 md:py-1 ${isActive ? 'border border-white/10 bg-white/5 font-semibold text-white' : 'hover:bg-white/5 hover:text-slate-200'}`}
            >
              <item.icon size={14} className="shrink-0" />
              <span className="hidden md:inline">{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </div>
      </div>

      <div className="flex h-full items-center">
        {updateVersion && (
          <button
            type="button"
            title={t('update.availableTooltip', { version: updateVersion })}
            className="mr-1 inline-flex h-7 items-center gap-1.5 rounded-md border border-[#4fc3a1]/30 bg-[#1d9e75]/15 px-2.5 text-[11px] font-medium text-[#4fc3a1] transition hover:bg-[#1d9e75]/25"
            onClick={() => openExternalLink('releases').catch(console.error)}
          >
            <ArrowUpCircle size={13} /> {t('update.available')}
          </button>
        )}
        <button
          type="button"
          aria-label={t('topBar.supportAria')}
          className="mr-1 hidden h-7 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-[11px] text-slate-300 transition hover:bg-white/10 hover:text-white md:inline-flex"
          onClick={() => openExternalLink('donate').catch(console.error)}
        >
          <HandHeart size={13} /> {t('topBar.support')}
        </button>
        <button
          type="button"
          aria-label={t('topBar.minimize')}
          className="grid h-full w-12 place-items-center text-slate-400 transition hover:bg-white/10 hover:text-white"
          onClick={() => appWindow.minimize()}
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          aria-label={t('topBar.maximize')}
          className="grid h-full w-12 place-items-center text-slate-400 transition hover:bg-white/10 hover:text-white"
          onClick={() => appWindow.toggleMaximize()}
        >
          <Square size={13} />
        </button>
        <button
          type="button"
          aria-label={t('topBar.close')}
          className="grid h-full w-12 place-items-center text-slate-400 transition hover:bg-red-500 hover:text-white"
          onClick={() => appWindow.close()}
        >
          <X size={16} />
        </button>
      </div>
    </header>
  );
}
