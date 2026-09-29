import { createContext, useContext } from "react";

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
