import { FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import { errorMessage } from "../../lib/api";
import Button from "./Button";

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
      className={`flex flex-wrap items-center gap-3 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-900 ring-1 ring-red-200 ${className}`}
    >
      <FiAlertCircle aria-hidden className="size-5 shrink-0" />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">{title}.</span> {errorMessage(error)}
      </p>
      {onRetry && (
        <Button size="sm" icon={FiRefreshCw} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}

/** Centered spinner for a card or modal body that's still loading. */
export function Loading({ label = "Loading…", className = "py-10" }: { label?: string; className?: string }) {
  return (
    <p role="status" className={`flex items-center justify-center gap-2 text-sm text-(--admin-muted) ${className}`}>
      <Spinner />
      {label}
    </p>
  );
}

/** Table body placeholder while rows load. */
export function LoadingRow({ colSpan, label }: { colSpan: number; label?: string }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <Loading label={label} />
      </td>
    </tr>
  );
}

/** Table body row for a query that failed. */
export function ErrorRow({ colSpan, error, onRetry }: { colSpan: number; error: unknown; onRetry?: () => void }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-4">
        <ErrorNotice error={error} onRetry={onRetry} />
      </td>
    </tr>
  );
}
