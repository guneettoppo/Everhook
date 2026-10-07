import { IconCheck, IconClock, IconLoader2, IconX } from "@tabler/icons-react";

const config = {
  delivered: { color: "var(--ok)", bg: "var(--ok-surface)", icon: IconCheck, label: "Delivered", spin: false },
  pending: { color: "var(--warn)", bg: "var(--warn-surface)", icon: IconClock, label: "Pending", spin: false },
  failed: { color: "var(--error)", bg: "var(--error-surface)", icon: IconX, label: "Failed", spin: false },
  active: { color: "var(--ok)", bg: "var(--ok-surface)", icon: IconCheck, label: "Active", spin: false },
  inactive: { color: "var(--fg-tertiary)", bg: "rgba(255,255,255,0.04)", icon: IconX, label: "Inactive", spin: false },
  retrying: { color: "var(--info)", bg: "var(--info-surface)", icon: IconLoader2, label: "Retrying", spin: true },
} as const;

const varColorToHex = (c: string) => {
  if (c.startsWith("#")) return c;
  if (c.startsWith("var(--ok)")) return "#4ade80";
  if (c.startsWith("var(--warn)")) return "#facc15";
  if (c.startsWith("var(--error)")) return "#f87171";
  if (c.startsWith("var(--info)")) return "#94a3b8";
  if (c.startsWith("var(--fg-tertiary)")) return "#71717a";
  return "#a1a1aa";
};

export function StatusBadge({ status, compact }: { status: keyof typeof config; compact?: boolean }) {
  const s = config[status] ?? config.pending;
  const Icon = s.icon;
  const color = varColorToHex(s.color);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: compact ? "3px 8px" : "5px 10px",
        borderRadius: 999,
        fontSize: compact ? 11 : 12,
        fontWeight: 600,
        textTransform: "capitalize",
        color,
        backgroundColor: s.bg,
        border: `1px solid ${color}30`,
        opacity: 0.95,
      }}
    >
      <span
        className={s.spin ? "everhook-spin" : undefined}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      >
        <Icon size={compact ? 12 : 13} stroke={2} />
      </span>
      {s.label}
    </span>
  );
}
