import React from 'react';
import { TopBar } from './TopBar';
import { OnboardingModal } from '../onboarding/OnboardingModal';
import { WhatsNewModal } from '../onboarding/WhatsNewModal';
import { useAppIntro } from '../../lib/useAppIntro';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { showOnboarding, completeOnboarding, whatsNewNotes, dismissWhatsNew } = useAppIntro();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07080c] text-slate-100 select-none">
      <div className="relative z-10 flex h-screen flex-col">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>

      <OnboardingModal open={showOnboarding} onComplete={completeOnboarding} />
      <WhatsNewModal open={whatsNewNotes.length > 0} notes={whatsNewNotes} onClose={dismissWhatsNew} />
    </div>
  );
}
