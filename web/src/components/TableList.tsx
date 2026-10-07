import type { ReactNode } from "react";
import { List, ListRow } from "./ListRow";
import type { CellProps } from "./ListRow";

export type Column = CellProps & { key: string };

export function TableList({
  rows,
  columns,
  isLoading,
  emptyState,
  onRowClick,
}: {
  rows: { key: string; cells: ReactNode[] }[];
  columns: Column[];
  isLoading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (key: string) => void;
}) {
  if (!isLoading && rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const widths = columns.map((c) => c.width ?? "1fr");
  const headerColumns = columns.map((c) => ({
    label: typeof c.children === "string" ? c.children : "",
    align: c.align,
  }));

  return (
    <List columnWidths={widths} headerColumns={headerColumns}>
      {isLoading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: widths.join(" "),
            padding: "32px 18px",
            textAlign: "center",
            color: "var(--fg-tertiary)",
            fontSize: 13,
          }}
        >
          <div style={{ gridColumn: `1 / -1` }}>Loading…</div>
        </div>
      )}
      {!isLoading &&
        rows.map((r, i) => (
          <ListRow
            key={r.key}
            isLast={i === rows.length - 1}
            onClick={onRowClick ? () => onRowClick(r.key) : undefined}
            columns={r.cells.map((child, j) => ({
              width: columns[j]?.width,
              align: columns[j]?.align,
              children: child,
            }))}
          />
        ))}
    </List>
  );
}
