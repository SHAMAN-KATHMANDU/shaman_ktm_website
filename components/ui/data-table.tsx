"use client";

import { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  selectable,
  selected,
  onSelectChange,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectChange?: (next: Set<string>) => void;
  empty?: ReactNode;
}) {
  const allChecked =
    selectable && selected ? rows.length > 0 && rows.every((r) => selected.has(rowKey(r))) : false;

  const toggleAll = () => {
    if (!selected || !onSelectChange) return;
    onSelectChange(allChecked ? new Set() : new Set(rows.map(rowKey)));
  };

  const toggleOne = (id: string) => {
    if (!selected || !onSelectChange) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectChange(next);
  };

  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <table className="w-full text-sm">
        <thead className="border-b border-[var(--color-border)] bg-[var(--color-base)] text-left text-[10px] uppercase tracking-wider opacity-70">
          <tr>
            {selectable && (
              <th className="w-10 p-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="h-4 w-4 accent-[var(--color-gold)]"
                />
              </th>
            )}
            {columns.map((c) => (
              <th
                key={c.key}
                className="p-3 font-medium"
                style={{
                  width: c.width,
                  textAlign: c.align ?? "left",
                }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const id = rowKey(r);
            return (
              <tr
                key={id}
                onClick={() => onRowClick?.(r)}
                className={`border-t border-[var(--color-border)] transition ${
                  onRowClick ? "cursor-pointer hover:bg-[var(--color-base)]" : ""
                }`}
              >
                {selectable && (
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected?.has(id) ?? false}
                      onChange={() => toggleOne(id)}
                      className="h-4 w-4 accent-[var(--color-gold)]"
                    />
                  </td>
                )}
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className="p-3"
                    style={{ textAlign: c.align ?? "left" }}
                  >
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
