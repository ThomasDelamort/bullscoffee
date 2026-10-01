import { FiMinus, FiPlus, FiTrash2 } from "react-icons/fi";
import { MAX_QUANTITY } from "../data/useCart";
import { ROUND_BUTTON } from "../styles";

const SIZES = {
  md: { button: "size-12 sm:size-14", icon: "size-5", value: "w-9 text-xl sm:w-10" },
  sm: { button: "size-11", icon: "size-4", value: "w-8 text-base" },
} as const;

interface QtyStepperProps {
  value: number;
  onChange: (quantity: number) => void;
  /** Product name, for the button labels. */
  name: string;
  /** When given, the minus button turns into a remove button at 1. */
  onRemove?: () => void;
  size?: keyof typeof SIZES;
}

export default function QtyStepper({ value, onChange, name, onRemove, size = "md" }: QtyStepperProps) {
  const s = SIZES[size];
  const removes = onRemove !== undefined && value <= 1;
  const ring = "bg-(--k-surface) text-(--k-ink) ring-1 ring-(--k-line) hover:ring-(--k-ink)/40";

  return (
    <div className="flex items-center">
      <button
        type="button"
        aria-label={removes ? `Remove ${name}` : `One fewer ${name}`}
        disabled={!removes && value <= 1}
        onClick={() => (removes ? onRemove() : onChange(value - 1))}
        className={`${ROUND_BUTTON} ${s.button} ${ring}`}
      >
        {removes ? <FiTrash2 aria-hidden className={s.icon} /> : <FiMinus aria-hidden className={s.icon} strokeWidth={2.5} />}
      </button>
      <span aria-live="polite" aria-label={`Quantity ${value}`} className={`${s.value} text-center font-extrabold tabular-nums`}>
        {value}
      </span>
      <button
        type="button"
        aria-label={`One more ${name}`}
        disabled={value >= MAX_QUANTITY}
        onClick={() => onChange(value + 1)}
        className={`${ROUND_BUTTON} ${s.button} ${ring}`}
      >
        <FiPlus aria-hidden className={s.icon} strokeWidth={2.5} />
      </button>
    </div>
  );
}
