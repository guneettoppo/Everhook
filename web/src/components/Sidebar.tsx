import { useLocation } from "react-router-dom";
import {
  IconAlertOctagon,
  IconInbox,
  IconLayoutDashboard,
  IconPlayerPlay,
  IconSend,
  IconUsers,
} from "@tabler/icons-react";

const nav = [
  { path: "/", label: "Dashboard", icon: IconLayoutDashboard },
  { path: "/demo", label: "Live Demo", icon: IconPlayerPlay },
  { path: "/events", label: "Events", icon: IconInbox },
  { path: "/subscribers", label: "Subscribers", icon: IconUsers },
  { path: "/deliveries", label: "Deliveries", icon: IconSend },
  { path: "/dead-letters", label: "Dead Letters", icon: IconAlertOctagon },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside
      style={{
        width: "var(--sidebar-width)",
        flexShrink: 0,
        backgroundColor: "var(--sidebar-bg)",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--sidebar-border)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Top sheen */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.02) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "20px 18px 16px",
          position: "relative",
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--fg)",
              letterSpacing: -0.5,
            }}
          >
            E
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--fg)",
              letterSpacing: -0.3,
              lineHeight: 1.2,
            }}
          >
            Everhook
          </span>
          <span style={{ fontSize: 11, color: "var(--fg-tertiary)", fontWeight: 500, marginTop: 1 }}>
            Webhook delivery
          </span>
        </div>
      </div>

      <div
        style={{
          height: 1,
          margin: "0 18px 8px",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
        }}
      />

      {/* Section label */}
      <div
        style={{
          padding: "8px 24px 6px",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.08,
          textTransform: "uppercase",
          color: "var(--fg-tertiary)",
        }}
      >
        Workspace
      </div>

      {/* Navigation */}
      <nav
        style={{
          padding: "0 10px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          position: "relative",
        }}
      >
        {nav.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === "/" ? location.pathname === "/" : location.pathname === item.path;
          return (
            <a
              key={item.path}
              href={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                fontSize: 13.5,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--fg)" : "var(--fg-secondary)",
                backgroundColor: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                borderRadius: 10,
                textDecoration: "none",
                position: "relative",
                transition:
                  "color var(--duration-fast), background-color var(--duration-fast)",
                letterSpacing: -0.1,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.color = "var(--fg)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "var(--fg-secondary)";
                }
              }}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  color: isActive ? "var(--fg)" : "var(--fg-tertiary)",
                }}
              >
                <Icon size={17} stroke={isActive ? 1.8 : 1.5} />
              </span>
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* User chip at the bottom — like macOS sidebar profile */}
      <div
        style={{
          margin: "10px 10px 10px",
          padding: "10px 12px",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 100%)",
            border: "1px solid rgba(255,255,255,0.10)",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--fg)",
            letterSpacing: 0.3,
          }}
        >
          D
        </div>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg)", lineHeight: 1.2 }}>Admin</span>
          <span style={{ fontSize: 10.5, color: "var(--fg-tertiary)", marginTop: 1 }}>local</span>
        </div>
      </div>
    </aside>
  );
}
