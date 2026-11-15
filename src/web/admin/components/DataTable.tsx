import type { ReactNode } from "react";
import { cn } from "@web/lib/cn";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  className?: string;
}

/** Tabla accesible con encabezados y desplazamiento horizontal en pantallas chicas (RNF-03). */
export function DataTable<T>({ caption, columns, rows, rowKey }: { caption: string; columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string }) {
  return (
    <div className="overflow-x-auto rounded-[18px] border border-border">
      <table className="w-full min-w-[640px] text-[15px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            {columns.map((c) => (
              <th key={c.header} scope="col" className={cn("px-4 py-3 font-medium", c.align === "right" && "text-right", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className="border-t border-border">
              {columns.map((c) => (
                <td key={c.header} className={cn("px-4 py-3 align-middle", c.align === "right" && "tabular text-right", c.className)}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
