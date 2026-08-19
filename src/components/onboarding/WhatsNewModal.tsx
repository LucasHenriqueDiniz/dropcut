import { Sparkles, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useTranslation } from '../../lib/locale';
import type { ReleaseNote } from '../../lib/releaseNotes';

type Props = {
  open: boolean;
  notes: ReleaseNote[];
  onClose: () => void;
};

export function WhatsNewModal({ open, notes, onClose }: Props) {
  const t = useTranslation();

  if (notes.length === 0) return null;

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#4fc3a1]/12 text-[#4fc3a1]">
          <Sparkles size={22} />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-white">
            {t('whatsNew.title', { version: notes[0].version })}
          </h2>
          <p className="text-xs text-white/40">{t('whatsNew.subtitle')}</p>
        </div>
      </div>

      <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
        {notes.map((note) => (
          <div key={note.version}>
            {notes.length > 1 && (
              <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-white/30">{note.version}</p>
            )}
            <ul className="space-y-2">
              {note.highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-2 text-sm leading-relaxed text-white/65">
                  <Check size={14} className="mt-1 shrink-0 text-[#4fc3a1]" />
                  <span>{t(highlight)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="button" onClick={onClose} className="bg-[#1d9e75] px-4 py-2 text-xs hover:bg-[#188866]">
          {t('whatsNew.gotIt')}
        </Button>
      </div>
    </Modal>
  );
}
