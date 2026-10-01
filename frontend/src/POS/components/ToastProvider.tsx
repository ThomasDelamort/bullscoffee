import { useCallback, useRef, useState, type ReactNode } from "react";
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from "react-icons/fi";
import { ToastContext, type ToastMessage, type ToastTone } from "./toastContext";

const DISMISS_AFTER_MS = 4000;

const ICONS = { success: FiCheckCircle, info: FiInfo, error: FiAlertCircle } as const;
const ICON_COLORS = {
  success: "text-emerald-400",
  info: "text-(--pos-sky)",
  error: "text-red-400",
} as const;

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-16 z-[60] lg:top-4 flex flex-col items-center gap-2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <div
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
              className="pointer-events-auto flex w-full items-start gap-3 rounded-xl bg-(--pos-raised) px-4 py-3 text-sm text-(--pos-ink) shadow-xl ring-1 ring-(--pos-line) sm:w-80"
            >
              <Icon aria-hidden className={`mt-0.5 size-4 shrink-0 ${ICON_COLORS[toast.tone]}`} />
              <p className="flex-1">{toast.message}</p>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(toast.id)}
                className="-mr-1 grid size-6 shrink-0 place-items-center rounded-md opacity-70 hover:opacity-100"
              >
                <FiX aria-hidden className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
