import type { TablerIcon } from "@tabler/icons-react";
import CountUp from "../bits/CountUp";
import SpotlightCard from "../bits/SpotlightCard";

export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  isLoading,
}: {
  label: string;
  value: number | string;
  icon: TablerIcon;
  trend?: string;
  isLoading?: boolean;
}) {
  const num = typeof value === "number" ? value : parseInt(String(value), 10) || 0;

  return (
    <SpotlightCard className="metric-card" spotlightColor="rgba(255, 255, 255, 0.08)">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: "var(--fg-secondary)", marginBottom: 10, fontWeight: 500 }}>
            {label}
          </div>
          <div
            style={{
              fontSize: 32,
              lineHeight: 1,
              fontWeight: 600,
              fontFamily: "var(--font-display)",
              color: "var(--fg)",
              letterSpacing: -0.5,
            }}
          >
            {isLoading ? (
              <span
                className="pulse-skeleton"
                style={{ display: "inline-block", width: 56, height: 28, borderRadius: 6, marginTop: 4 }}
              />
            ) : (
              <CountUp to={num} duration={1.2} separator="," />
            )}
          </div>
          {trend && (
            <div style={{ fontSize: 12, color: "var(--fg-tertiary)", marginTop: 8, fontWeight: 500 }}>
              {trend}
            </div>
          )}
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "var(--fg-secondary)",
            flexShrink: 0,
          }}
        >
          <Icon size={20} stroke={1.5} />
        </div>
      </div>
    </SpotlightCard>
  );
}
