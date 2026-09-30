import type { ReactNode } from "react";

interface TableProps {
  /** Below this width the table scrolls sideways; defaults to never wrapping cells. */
  minWidth?: string;
  children: ReactNode;
}

/** Scrolls sideways on narrow screens instead of squashing columns. */
export function Table({ minWidth = "min-w-max", children }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-left text-sm ${minWidth}`}>{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`border-b border-(--mgr-line) bg-(--mgr-canvas)/60 px-5 py-2.5 text-xs font-medium tracking-wide whitespace-nowrap text-(--mgr-muted) uppercase ${className}`}
    >
      {children}
    </th>
  );
}

interface TdProps {
  /** Let long text wrap; other cells stay on one line. */
  wrap?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Td({ wrap = false, className = "", children }: TdProps) {
  return (
    <td
      className={`border-b border-(--mgr-line) px-5 py-3 align-middle ${wrap ? "" : "whitespace-nowrap"} ${className}`}
    >
      {children}
    </td>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-sm text-(--mgr-muted)">
        {children}
      </td>
    </tr>
  );
}
