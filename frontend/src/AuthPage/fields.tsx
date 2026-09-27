import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { FiArrowRight, FiEye, FiEyeOff } from "react-icons/fi";

export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500";

const INPUT =
  "h-12 w-full rounded-xl border border-stone-200 bg-white text-[15px] text-stone-900 placeholder:text-stone-400 transition-colors focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 focus:outline-none disabled:bg-stone-50";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label: string;
  icon?: IconType;
  value: string;
  onChange: (value: string) => void;
  /** Rendered at the right of the label row, e.g. "Forgot password?". */
  labelAside?: ReactNode;
}

export function TextField({ label, icon, labelAside, value, onChange, className = "", ...inputProps }: TextFieldProps) {
  const id = useId();
  return (
    <Field id={id} label={label} icon={icon} labelAside={labelAside}>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT} ${icon ? "pl-11" : "pl-4"} pr-4 ${className}`}
        {...inputProps}
      />
    </Field>
  );
}

export function PasswordField({ label, icon, labelAside, value, onChange, ...inputProps }: Omit<TextFieldProps, "type">) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <Field id={id} label={label} icon={icon} labelAside={labelAside}>
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT} ${icon ? "pl-11" : "pl-4"} pr-12`}
        {...inputProps}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className={`absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-stone-400 transition-colors hover:text-stone-700 ${FOCUS_RING}`}
      >
        {visible ? <FiEyeOff className="size-4" /> : <FiEye className="size-4" />}
      </button>
    </Field>
  );
}

interface FieldProps {
  id: string;
  label: string;
  icon?: IconType;
  labelAside?: ReactNode;
  children: ReactNode;
}

function Field({ id, label, icon: Icon, labelAside, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-bold tracking-wide text-stone-700 uppercase">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        {Icon && (
          <Icon aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-stone-400" />
        )}
        {children}
      </div>
    </div>
  );
}

export function SubmitButton({ children, busy, disabled }: { children: ReactNode; busy: boolean; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className={`mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1F1916] text-[15px] font-bold text-white shadow-lg shadow-stone-900/20 transition-colors hover:bg-[#3A2E27] disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
    >
      {busy ? (
        <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : null}
      {children}
      {!busy && <FiArrowRight aria-hidden className="size-4" />}
    </button>
  );
}

export function TextButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded text-sm font-semibold text-amber-600 transition-colors hover:text-amber-700 ${FOCUS_RING}`}
    >
      {children}
    </button>
  );
}

export function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 text-xs font-semibold tracking-wider text-stone-400 uppercase">
      <span className="h-px flex-1 bg-stone-200" />
      {children}
      <span className="h-px flex-1 bg-stone-200" />
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
      {message}
    </p>
  );
}

/** Heading block for the secondary steps (verify email, reset password). */
export function StepHeader({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">{title}</h2>
      <p className="text-sm text-stone-500">{children}</p>
    </div>
  );
}
