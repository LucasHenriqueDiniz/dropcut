import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

type SelectOption<T extends string | number> = {
  value: T;
  label: string;
  description?: string;
};

type SelectProps<T extends string | number> = {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
};

export function Select<T extends string | number>({ value, options, onChange, className = '' }: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.05] px-2.5 py-2 text-left text-[11px] text-white outline-none transition hover:bg-white/[0.08] focus:border-[#4fc3a1]"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{selected?.label ?? 'Select'}</span>
          {selected?.description && <span className="mt-0.5 block truncate text-[10px] text-white/35">{selected.description}</span>}
        </span>
        <ChevronDown size={14} className={`shrink-0 text-white/35 transition ${open ? 'rotate-180 text-[#4fc3a1]' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-60 overflow-auto rounded-lg border border-white/10 bg-[#0b0f15] p-1 shadow-2xl shadow-black/50">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={String(option.value)}
                type="button"
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[11px] transition ${active ? 'bg-[#4fc3a1]/12 text-white' : 'text-white/60 hover:bg-white/[0.06] hover:text-white'}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{option.label}</span>
                  {option.description && <span className="mt-0.5 block truncate text-[10px] text-white/35">{option.description}</span>}
                </span>
                {active && <Check size={13} className="shrink-0 text-[#4fc3a1]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
