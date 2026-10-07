import type { ReactNode } from "react";

export function ListRow({
  columns,
  onClick,
  isLast = false,
}: {
  columns: { width?: string; align?: "left" | "right" | "center"; children: ReactNode }[];
  onClick?: () => void;
  isLast?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: columns.map((c) => c.width ?? "1fr").join(" "),
        alignItems: "center",
        padding: "12px 18px",
        borderBottom: isLast ? "none" : "1px solid var(--divider)",
        transition: "background-color var(--duration-fast)",
        cursor: onClick ? "pointer" : "default",
        backgroundColor: "transparent",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--surface-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      {columns.map((c, i) => {
        const align = c.align ?? "left";
        return (
          <div
            key={i}
            style={{
              textAlign: align,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {c.children}
          </div>
        );
      })}
    </div>
  );
}

export type CellProps = {
  children: ReactNode;
  width?: string;
  align?: "left" | "right" | "center";
  mono?: boolean;
  muted?: boolean;
  truncate?: boolean;
};

export function Cell({
  children,
  align = "left",
  mono = false,
  muted = false,
  truncate = false,
}: CellProps) {
  return (
    <span
      style={{
        textAlign: align,
        fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
        color: muted ? "var(--fg-tertiary)" : "var(--fg)",
        fontSize: mono ? 12 : 13,
        whiteSpace: truncate ? "nowrap" : "normal",
        overflow: truncate ? "hidden" : "visible",
        textOverflow: truncate ? "ellipsis" : "clip",
        display: truncate ? "block" : "inline",
      }}
    >
      {children}
    </span>
  );
}

export function ListHeaderCell({
  children,
  align = "left",
}: {
  children: ReactNode;
  width?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <div
      style={{
        textAlign: align,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        minWidth: 0,
      }}
    >
      {children}
    </div>
  );
}

export function List({
  children,
  headerColumns,
  columnWidths,
}: {
  children: ReactNode;
  headerColumns?: { label: string; align?: "left" | "right" | "center" }[];
  columnWidths?: string[];
}) {
  return (
    <div
      style={{
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        backgroundColor: "var(--surface)",
        overflow: "hidden",
      }}
    >
      {headerColumns && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: columnWidths ? columnWidths.join(" ") : "1fr",
            alignItems: "center",
            padding: "10px 18px",
            borderBottom: "1px solid var(--border)",
            backgroundColor: "var(--bg-elevated)",
            color: "var(--fg-tertiary)",
            fontSize: 10.5,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.05,
          }}
        >
          {headerColumns.map((h, i) => (
            <ListHeaderCell key={i} align={h.align}>
              {h.label}
            </ListHeaderCell>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}
