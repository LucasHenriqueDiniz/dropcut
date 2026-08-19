import { Link, useLocation } from 'react-router-dom';
import { Clapperboard, History, SlidersHorizontal, Settings, Scissors, Zap } from 'lucide-react';
import { useTranslation } from '../../lib/locale';
import type { TranslationKey } from '../../lib/i18n';

const nav = [
  { to: '/', labelKey: 'nav.editor', icon: Clapperboard },
  { to: '/presets', labelKey: 'nav.presets', icon: SlidersHorizontal },
  { to: '/history', labelKey: 'nav.history', icon: History },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
] satisfies { to: string; labelKey: TranslationKey; icon: typeof Clapperboard }[];

export function Sidebar() {
  const location = useLocation();
  const t = useTranslation();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-slate-950/45 p-4 backdrop-blur-xl lg:block">
      <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-blue-950/20">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/20">
            <Scissors size={19} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{t('sidebar.workspace')}</p>
            <p className="text-xs text-slate-500">{t('sidebar.workspaceSubtitle')}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-400/15 bg-blue-500/10 p-3 text-xs text-blue-100">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <Zap size={13} />
            {t('sidebar.coreFlow')}
          </div>
          <p className="leading-relaxed text-blue-100/70">{t('sidebar.coreFlowDescription')}</p>
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
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-slate-400">
        <p className="mb-2 font-semibold text-slate-200">{t('sidebar.steps')}</p>
        <ol className="space-y-1.5">
          <li>{t('sidebar.step1')}</li>
          <li>{t('sidebar.step2')}</li>
          <li>{t('sidebar.step3')}</li>
          <li>{t('sidebar.step4')}</li>
        </ol>
      </div>
    </aside>
  );
}
