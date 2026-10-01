import { useEffect, useRef, type ReactNode } from "react";
import { FiX } from "react-icons/fi";
import { FOCUS_RING } from "./styles";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md";
  children?: ReactNode;
}

const WIDTHS = { sm: "max-w-sm", md: "max-w-lg" } as const;

/** Native <dialog>: focus trapping, Escape and the backdrop come from the browser. */
export default function Modal({ open, onClose, title, footer, size = "md", children }: ModalProps) {
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
      onClose={onClose}
      // Clicks on the backdrop land on the <dialog> itself; clicks inside land on its children.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={`pos-root m-auto w-[calc(100%-2rem)] ${WIDTHS[size]} rounded-2xl bg-(--pos-panel) p-0 text-(--pos-ink) shadow-2xl ring-1 ring-(--pos-line) backdrop:bg-black/60 backdrop:backdrop-blur-sm`}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-(--pos-line) px-6 py-4">
            <h2 className="min-w-0 text-base font-semibold">{title}</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className={`-mr-2 grid size-8 shrink-0 place-items-center rounded-lg text-(--pos-muted) hover:bg-white/5 hover:text-(--pos-ink) ${FOCUS_RING}`}
            >
              <FiX aria-hidden className="size-4" />
            </button>
          </header>
          {children && <div className="pos-scroll overflow-y-auto px-6 py-5">{children}</div>}
          {footer && (
            <footer className="flex flex-wrap justify-end gap-2 border-t border-(--pos-line) bg-black/15 px-6 py-4">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
