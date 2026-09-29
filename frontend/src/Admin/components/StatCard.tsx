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
    <div className="rounded-2xl bg-(--admin-surface) p-5 shadow-sm ring-1 ring-(--admin-line)">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-(--admin-muted) uppercase">{label}</p>
        <span className="grid size-8 place-items-center rounded-lg bg-(--admin-gold)/15">
          <Icon aria-hidden className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-(--admin-muted)">{hint}</p>}
    </div>
  );
}
