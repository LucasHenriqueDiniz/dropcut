import { useEffect, type PropsWithChildren } from 'react';

type Props = {
  open: boolean;
  onClose?: () => void;
  /** Extra classes for the panel, mostly to override the default max width. */
  className?: string;
};

/**
 * Centered modal panel with a dimmed backdrop. Closing is opt-in: without
 * `onClose` the modal cannot be dismissed by Escape or by clicking outside,
 * which is what the onboarding flow wants.
 */
export function Modal({ open, onClose, className = 'max-w-md', children }: PropsWithChildren<Props>) {
  useEffect(() => {
    if (!open || !onClose) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-6">
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${className} rounded-2xl border border-white/10 bg-[#0a0d12] p-6 shadow-2xl`}
      >
        {children}
      </div>
    </div>
  );
}
