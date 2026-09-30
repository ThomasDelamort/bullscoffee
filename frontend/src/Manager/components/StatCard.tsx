import type { ReactNode } from "react";
import type { IconType } from "react-icons";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: IconType;
}

export default function StatCard({ label, value, hint, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-(--mgr-surface) p-5 shadow-sm ring-1 ring-(--mgr-line)">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-(--mgr-muted) uppercase">{label}</p>
        <span className="grid size-8 place-items-center rounded-lg bg-(--mgr-accent)/15">
          <Icon aria-hidden className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-(--mgr-muted)">{hint}</p>}
    </div>
  );
}
