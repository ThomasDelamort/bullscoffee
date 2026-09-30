import { useState, type ReactNode } from "react";
import type { SeriesPoint } from "../../types";
import Button from "../Button";
import Card from "../Card";

interface ChartCardProps {
  title: string;
  description?: string;
  data: SeriesPoint[];
  /** Column headers for the table view. */
  columns: [string, string];
  format?: (value: number) => string;
  children: ReactNode;
}

/** A chart with a table view of the same data one click away. */
export default function ChartCard({
  title,
  description,
  data,
  columns,
  format = String,
  children,
}: ChartCardProps) {
  const [asTable, setAsTable] = useState(false);

  return (
    <Card
      title={title}
      description={description}
      actions={
        <Button size="sm" variant="ghost" aria-pressed={asTable} onClick={() => setAsTable((v) => !v)}>
          {asTable ? "Show chart" : "Show table"}
        </Button>
      }
    >
      {asTable ? (
        <div className="max-h-[220px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-(--mgr-muted)">
                <th scope="col" className="pb-2 font-medium">{columns[0]}</th>
                <th scope="col" className="pb-2 text-right font-medium">{columns[1]}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.label} className="border-t border-(--mgr-line)">
                  <td className="py-1.5">{d.label}</td>
                  <td className="py-1.5 text-right tabular-nums">{format(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </Card>
  );
}
