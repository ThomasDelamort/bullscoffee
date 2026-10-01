import { useEffect, useRef, type ReactNode } from "react";
import { FiX } from "react-icons/fi";
import { ROUND_BUTTON } from "../styles";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** id of the heading that names the sheet. */
  labelledBy: string;
  children: ReactNode;
}

/**
 * Slides up from the bottom on phones and sits centered on larger screens.
 * Native <dialog>: focus trapping, Escape and the backdrop come from the browser.
 * Children should be a scrolling body and a footer; they only render while open.
 */
export default function Sheet({ open, onClose, labelledBy, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      // Clicks on the backdrop land on the <dialog> itself; clicks inside land on its children.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="kiosk-sheet mx-0 mt-auto mb-0 max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-[2rem] bg-(--k-surface) p-0 text-(--k-ink) shadow-2xl backdrop:bg-[#2a1a10]/55 backdrop:backdrop-blur-sm open:flex open:flex-col sm:m-auto sm:max-h-[88dvh] sm:max-w-xl sm:rounded-[2rem]"
    >
      {open && children}
    </dialog>
  );
}

export function CloseButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClick}
      className={`${ROUND_BUTTON} size-12 bg-(--k-surface)/90 text-(--k-ink) shadow-md ring-1 ring-(--k-line) backdrop-blur hover:bg-(--k-surface) ${className}`}
    >
      <FiX aria-hidden className="size-5" strokeWidth={2.5} />
    </button>
  );
}
