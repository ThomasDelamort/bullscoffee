import { FOCUS_RING } from "./styles";

interface TabOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly TabOption<T>[];
  label: string;
}

/** Segmented filter control. Acts as a radio group since it filters one view. */
export default function Tabs<T extends string>({ value, onChange, options, label }: TabsProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex max-w-full overflow-x-auto rounded-xl bg-(--mgr-ink)/5 p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${FOCUS_RING} ${
              active
                ? "bg-(--mgr-surface) shadow-sm"
                : "text-(--mgr-muted) hover:text-(--mgr-ink)"
            }`}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={`rounded-full px-1.5 text-xs tabular-nums ${
                  active ? "bg-(--mgr-accent)/20" : "bg-(--mgr-ink)/5"
                }`}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
