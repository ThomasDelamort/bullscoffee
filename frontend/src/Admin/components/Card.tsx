import type { ReactNode } from "react";

interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Drop the body padding, e.g. for edge-to-edge tables. */
  flush?: boolean;
  className?: string;
  children: ReactNode;
}

export default function Card({
  title,
  description,
  actions,
  flush = false,
  className = "",
  children,
}: CardProps) {
  const hasHeader = title || description || actions;
  return (
    <section
      className={`overflow-hidden rounded-2xl bg-(--admin-surface) shadow-sm ring-1 ring-(--admin-line) ${className}`}
    >
      {hasHeader && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-(--admin-line) px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-xs text-(--admin-muted)">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}
