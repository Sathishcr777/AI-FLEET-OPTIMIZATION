import React from "react";
import { clsx } from "clsx";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T, index: number) => React.ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
  isNumeric?: boolean;
  isTechnical?: boolean;
  className?: string;
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T, index: number) => string | number;
  onRowClick?: (item: T) => void;
  selectedId?: string | number | null;
  isLoading?: boolean;
  skeletonRowCount?: number;
  emptyMessage?: string;
  className?: string;
}

export function Table<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  selectedId,
  isLoading = false,
  skeletonRowCount = 4,
  emptyMessage = "No data available",
  className,
}: TableProps<T>) {
  return (
    <div
      className={clsx(
        "w-full overflow-x-auto rounded-2xl border border-[#1F2E47] bg-[#111C2D] shadow-card",
        className
      )}
    >
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#1F2E47] bg-[#16253B] text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300 font-sans">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={clsx(
                  "py-4 px-5",
                  (col.align === "center" || (col.isNumeric && !col.align)) && "text-center",
                  col.align === "right" && "text-right",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1F2E47]/70 text-sm sm:text-[14.5px] font-sans">
          {isLoading ? (
            Array.from({ length: skeletonRowCount }).map((_, idx) => (
              <tr key={`skeleton-row-${idx}`} className="animate-pulse">
                {columns.map((col, colIdx) => (
                  <td key={`skeleton-cell-${col.key}-${colIdx}`} className="py-4 px-5">
                    <div
                      className={clsx(
                        "h-4 bg-[#1E2E47] rounded-lg",
                        colIdx === 0 ? "w-3/4" : colIdx === columns.length - 1 ? "w-1/2" : "w-2/3"
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center text-slate-400 font-sans">
                <div className="flex flex-col items-center justify-center gap-2">
                  <span className="text-base font-semibold text-slate-300">{emptyMessage}</span>
                  <span className="text-xs sm:text-sm text-slate-500">
                    No matching records found in this view
                  </span>
                </div>
              </td>
            </tr>
          ) : (
            data.map((item, rowIdx) => {
              const rowKey = keyExtractor(item, rowIdx);
              const isSelected = selectedId !== undefined && selectedId !== null && selectedId === rowKey;

              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={clsx(
                    "transition-colors duration-100",
                    isSelected
                      ? "bg-blue-950/40 text-white border-l-4 border-blue-500 font-semibold"
                      : onRowClick
                      ? "cursor-pointer hover:bg-[#16253B]/70"
                      : "hover:bg-[#16253B]/30"
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx(
                        "py-4 px-5 text-slate-200",
                        (col.align === "center" || (col.isNumeric && !col.align)) && "text-center",
                        col.align === "right" && "text-right",
                        (col.isNumeric || col.isTechnical) && "font-mono tabular-nums text-slate-100",
                        col.className
                      )}
                    >
                      {col.render
                        ? col.render(item, rowIdx)
                        : String((item as Record<string, unknown>)[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

