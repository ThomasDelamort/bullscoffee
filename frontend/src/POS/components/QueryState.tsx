import { FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import { errorMessage } from "../../lib/api";
import { buttonClass } from "./styles";

export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}

export function Loading({ label = "Loading…", className = "py-16" }: { label?: string; className?: string }) {
  return (
    <p role="status" className={`flex items-center justify-center gap-2 text-sm text-(--pos-muted) ${className}`}>
      <Spinner />
      {label}
    </p>
  );
}

/** Inline failure banner with a retry, for a query that didn't load. */
export function ErrorNotice({
  error,
  onRetry,
  title = "Couldn't load this",
  className = "",
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200 ring-1 ring-red-400/25 ring-inset ${className}`}
    >
      <FiAlertCircle aria-hidden className="size-4 shrink-0 text-red-300" />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">{title}.</span> {errorMessage(error)}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={buttonClass("secondary", "sm")}>
          <FiRefreshCw aria-hidden className="size-3.5" />
          Try again
        </button>
      )}
    </div>
  );
}
