import { IconRefresh } from "@tabler/icons-react";
import { useLocation } from "react-router-dom";
import { formatRelativeTime } from "../utils";

const titles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Live delivery health" },
  "/events": { title: "Events", subtitle: "Published events in the outbox" },
  "/subscribers": { title: "Subscribers", subtitle: "Webhook endpoints and subscriptions" },
  "/deliveries": { title: "Deliveries", subtitle: "Every event × subscriber attempt" },
  "/dead-letters": { title: "Dead Letters", subtitle: "Exhausted retries awaiting replay" },
};

export function Header({ lastRefreshed, onRefresh }: { lastRefreshed: Date | null; onRefresh: () => void }) {
  const location = useLocation();
  const meta = titles[location.pathname] ?? { title: "Everhook", subtitle: "" };

  return (
    <header
      style={{
        height: "var(--header-height)",
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--bg-elevated)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
        flexShrink: 0,
      }}
    >
      <div>
        <div
          className="display"
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: "var(--fg)",
            lineHeight: 1.2,
            letterSpacing: -0.3,
          }}
        >
          {meta.title}
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-tertiary)", marginTop: 2 }}>{meta.subtitle}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 10.5,
              color: "var(--fg-tertiary)",
              textTransform: "uppercase",
              letterSpacing: 0.06,
              fontWeight: 600,
            }}
          >
            Last refreshed
          </div>
          <div
            className="mono"
            style={{ fontSize: 12, color: "var(--fg-secondary)", marginTop: 2 }}
          >
            {lastRefreshed ? formatRelativeTime(lastRefreshed.toISOString()) : "—"}
          </div>
        </div>
        <button
          onClick={onRefresh}
          title="Refresh now"
          style={{
            display: "grid",
            placeItems: "center",
            width: 36,
            height: 36,
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--fg-secondary)",
            transition: "background-color var(--duration-fast), color var(--duration-fast), border-color var(--duration-fast)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--surface-hover)";
            e.currentTarget.style.color = "var(--fg)";
            e.currentTarget.style.borderColor = "var(--border-strong)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--surface)";
            e.currentTarget.style.color = "var(--fg-secondary)";
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          <IconRefresh size={18} stroke={1.5} />
        </button>
      </div>
    </header>
  );
}
