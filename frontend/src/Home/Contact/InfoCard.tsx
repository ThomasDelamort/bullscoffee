import type { ReactNode } from "react";
import { BRAND_GOLD } from "../Hero/hero.config";

interface InfoCardProps {
  label: string;
  children: ReactNode;
}

/** Small white card used for the Visit / Hours / Email details. */
export default function InfoCard({ label, children }: InfoCardProps) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-900/5">
      <p
        className="text-xs font-bold tracking-[0.14em] uppercase"
        style={{ color: BRAND_GOLD }}
      >
        {label}
      </p>
      <div className="mt-3 text-sm">{children}</div>
    </div>
  );
}
