import { Button } from '../ui/Button';

type Props = {
  label: string;
  onExport: () => void;
  disabled?: boolean;
};

export function ExportPanel({ label, onExport, disabled }: Props) {
  return (
    <div className="space-y-3">
      <Button disabled={disabled} className="w-full bg-[#1d9e75] text-white hover:bg-[#188866] disabled:cursor-not-allowed disabled:opacity-40" onClick={onExport}>
        <span className="inline-flex w-full items-center justify-center gap-1.5">
          <span className="shrink-0">Export</span>
          <span className="min-w-0 max-w-[130px] truncate" title={label}>{label}</span>
        </span>
      </Button>
    </div>
  );
}
