import type { ComponentProps, ReactNode } from "react";
import { INPUT_CLASS } from "./styles";

interface FieldProps {
  label: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Label + control + optional hint. The control goes inside the <label>, so no ids are needed. */
export function Field({ label, hint, className = "", children }: FieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-(--admin-muted)">{hint}</span>}
    </label>
  );
}

export function Input({ className = "", ...rest }: ComponentProps<"input">) {
  return <input className={`${INPUT_CLASS} ${className}`} {...rest} />;
}

export function Select({ className = "", ...rest }: ComponentProps<"select">) {
  return <select className={`${INPUT_CLASS} pr-8 ${className}`} {...rest} />;
}

export function TextArea({ className = "", ...rest }: ComponentProps<"textarea">) {
  return <textarea className={`${INPUT_CLASS} ${className}`} {...rest} />;
}
