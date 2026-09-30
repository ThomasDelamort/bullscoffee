import type { IconType } from "react-icons";
import { FOCUS_RING } from "./styles";

interface RowActionProps {
  icon: IconType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

/** Icon-only table action; the label doubles as tooltip and accessible name. */
export default function RowAction({ icon: Icon, label, onClick, disabled, danger }: RowActionProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-8 place-items-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${FOCUS_RING} ${
        danger ? "text-red-600 hover:bg-red-50" : "text-(--mgr-muted) hover:bg-(--mgr-ink)/5 hover:text-(--mgr-ink)"
      }`}
    >
      <Icon aria-hidden className="size-4" />
    </button>
  );
}
