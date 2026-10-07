import type { ComponentType, ReactNode } from "react";
import { Button } from "./Button";

export function SectionHeader({
  title,
  subtitle,
  action,
  actionLabel,
  onAction,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ComponentType<{ size: number; stroke: number; color?: string }>;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 18,
        gap: 16,
      }}
    >
      <div>
        <div className="display" style={{ fontSize: 18, fontWeight: 600, color: "var(--fg)" }}>
          {title}
        </div>
        {subtitle && <div style={{ fontSize: 13, color: "var(--fg-tertiary)", marginTop: 4 }}>{subtitle}</div>}
      </div>
      {action}
      {!action && actionLabel && onAction && Icon && (
        <Button onClick={onAction} icon={Icon}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
