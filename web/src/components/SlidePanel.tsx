import { IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";

export function SlidePanel({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(3px)",
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          maxWidth: "95vw",
          height: "100%",
          backgroundColor: "var(--bg-elevated)",
          borderLeft: "1px solid var(--border)",
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          animation: "slide-in 240ms var(--ease-out) forwards",
        }}
      >
        <div
          style={{
            padding: "22px 26px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div className="display" style={{ fontSize: 20, fontWeight: 600, color: "var(--fg)" }}>
              {title}
            </div>
            {subtitle && <div style={{ fontSize: 13, color: "var(--fg-tertiary)", marginTop: 4 }}>{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            style={{
              display: "grid",
              placeItems: "center",
              width: 32,
              height: 32,
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--fg-secondary)",
              flexShrink: 0,
            }}
          >
            <IconX size={18} stroke={1.5} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "26px" }}>{children}</div>

        {footer && (
          <div
            style={{
              padding: "18px 26px",
              borderTop: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
