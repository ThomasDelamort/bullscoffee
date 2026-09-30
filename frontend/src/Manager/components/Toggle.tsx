import { FOCUS_RING } from "./styles";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name; also shown next to the switch unless hideLabel is set. */
  label: string;
  description?: string;
  hideLabel?: boolean;
  disabled?: boolean;
}

export default function Toggle({
  checked,
  onChange,
  label,
  description,
  hideLabel = false,
  disabled = false,
}: ToggleProps) {
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={hideLabel ? label : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING} ${
        checked ? "bg-(--mgr-ink)" : "bg-stone-300"
      }`}
    >
      <span
        aria-hidden
        className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );

  if (hideLabel) return control;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="mt-0.5 text-xs text-(--mgr-muted)">{description}</p>}
      </div>
      {control}
    </div>
  );
}
