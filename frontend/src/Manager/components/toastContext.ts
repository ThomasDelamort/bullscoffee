import { createContext, useCallback, useContext } from "react";
import { errorMessage } from "../../lib/api";

export type ToastTone = "success" | "info" | "error";

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
}

export type Notify = (message: string, tone?: ToastTone) => void;

export const ToastContext = createContext<Notify | null>(null);

export function useToast(): Notify {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error("useToast must be used inside <ToastProvider>");
  return notify;
}

/** For a mutation's onError: shows the server's message as an error toast. */
export function useNotifyError(): (error: unknown) => void {
  const notify = useToast();
  return useCallback((error: unknown) => notify(errorMessage(error), "error"), [notify]);
}
