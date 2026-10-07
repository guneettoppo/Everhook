import type { ComponentType, ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: ComponentType<{ size: number; stroke: number; color?: string }>;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "48px 28px",
        borderRadius: "var(--radius-lg)",
        border: "1px dashed var(--border-strong)",
        backgroundColor: "var(--surface)",
        color: "var(--fg-secondary)",
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: "var(--radius-xl)",
          display: "grid",
          placeItems: "center",
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          marginBottom: 18,
          color: "var(--accent-text)",
        }}
      >
        <Icon size={26} stroke={1.5} />
      </div>
      <div className="display" style={{ fontSize: 17, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 14, color: "var(--fg-tertiary)", maxWidth: 360, lineHeight: 1.5 }}>{children}</div>
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}
