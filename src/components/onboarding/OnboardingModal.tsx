import { useState } from 'react';
import { Clapperboard, MousePointerClick, Sparkles, SlidersHorizontal } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Toggle } from '../ui/Toggle';
import { Button } from '../ui/Button';
import { useTranslation } from '../../lib/LocaleProvider';
import { usePresets } from '../../lib/PresetProvider';
import { installContextMenu, uninstallContextMenu } from '../../lib/tauri';
import type { TranslationKey } from '../../lib/i18n';

const steps = [
  { titleKey: 'onboarding.welcomeTitle', bodyKey: 'onboarding.welcomeBody', icon: Sparkles },
  { titleKey: 'onboarding.presetsTitle', bodyKey: 'onboarding.presetsBody', icon: SlidersHorizontal },
  { titleKey: 'onboarding.contextMenuTitle', bodyKey: 'onboarding.contextMenuBody', icon: MousePointerClick },
  { titleKey: 'onboarding.doneTitle', bodyKey: 'onboarding.doneBody', icon: Clapperboard },
] satisfies { titleKey: TranslationKey; bodyKey: TranslationKey; icon: typeof Sparkles }[];

const CONTEXT_MENU_STEP = 2;

type Props = {
  open: boolean;
  onComplete: () => void;
};

export function OnboardingModal({ open, onComplete }: Props) {
  const t = useTranslation();
  const { presets } = usePresets();
  const [stepIndex, setStepIndex] = useState(0);
  const [wantsContextMenu, setWantsContextMenu] = useState(true);

  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const finish = () => {
    // The app registers the context menu on startup, so honouring an opt-out
    // means actively removing it. Either way this is idempotent.
    const action = wantsContextMenu ? installContextMenu(presets) : uninstallContextMenu();
    action.catch(console.error);
    onComplete();
  };

  return (
    <Modal open={open} className="max-w-lg">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#4fc3a1]/12 text-[#4fc3a1]">
          <step.icon size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
            {t('onboarding.stepCounter', { current: stepIndex + 1, total: steps.length })}
          </p>
          <h2 className="text-lg font-semibold text-white">{t(step.titleKey)}</h2>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-white/60">{t(step.bodyKey)}</p>

      {stepIndex === CONTEXT_MENU_STEP && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-white">{t('onboarding.contextMenuToggle')}</p>
            <Toggle checked={wantsContextMenu} onChange={setWantsContextMenu} />
          </div>
          <p className="mt-1.5 text-[10px] text-white/35">{t('onboarding.contextMenuHint')}</p>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {steps.map((item, index) => (
            <span
              key={item.titleKey}
              className={`h-1 rounded-full transition-all ${index === stepIndex ? 'w-5 bg-[#4fc3a1]' : 'w-1.5 bg-white/15'}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={() => setStepIndex((current) => current - 1)}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white/60 transition hover:text-white"
            >
              {t('onboarding.back')}
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="px-3 py-2 text-[11px] text-white/40 transition hover:text-white"
            >
              {t('onboarding.skip')}
            </button>
          )}

          <Button
            type="button"
            onClick={() => (isLastStep ? finish() : setStepIndex((current) => current + 1))}
            className="bg-[#1d9e75] px-4 py-2 text-xs hover:bg-[#188866]"
          >
            {isLastStep ? t('onboarding.finish') : t('onboarding.next')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
