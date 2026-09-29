import { useEffect, useRef, type ReactNode } from "react";
import { FiX } from "react-icons/fi";
import { FOCUS_RING } from "./styles";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  children?: ReactNode;
}

const WIDTHS = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" } as const;

/** Native <dialog>: focus trapping, Escape and the backdrop come from the browser. */
export default function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  size = "md",
  children,
}: ModalProps) {
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
      className={`admin-root m-auto w-[calc(100%-2rem)] ${WIDTHS[size]} rounded-2xl bg-(--admin-surface) p-0 text-(--admin-ink) shadow-2xl backdrop:bg-(--admin-ink)/50`}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-(--admin-line) px-6 py-4">
            <div>
              <h2 className="text-base font-semibold">{title}</h2>
              {description && <p className="mt-1 text-sm text-(--admin-muted)">{description}</p>}
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className={`-mr-2 grid size-8 shrink-0 place-items-center rounded-lg hover:bg-(--admin-ink)/5 ${FOCUS_RING}`}
            >
              <FiX aria-hidden className="size-4" />
            </button>
          </header>
          {children && <div className="overflow-y-auto px-6 py-5">{children}</div>}
          {footer && (
            <footer className="flex flex-wrap justify-end gap-2 border-t border-(--admin-line) bg-(--admin-canvas)/60 px-6 py-4">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
