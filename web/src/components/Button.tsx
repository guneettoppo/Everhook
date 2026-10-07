import type { MouseEventHandler, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  icon: Icon,
  onClick,
  type = "button",
  fullWidth,
  form,
}: {
  children: ReactNode;
  variant?: Variant;
  size?: "sm" | "md";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ComponentType<{ size: number; stroke: number; color?: string }>;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  fullWidth?: boolean;
  form?: string;
}) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontWeight: 500,
    borderRadius: 8,
    transition:
      "background-color var(--duration-fast), border-color var(--duration-fast), color var(--duration-fast), transform 80ms, box-shadow var(--duration-fast)",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled || loading ? 0.55 : 1,
    width: fullWidth ? "100%" : "auto",
    letterSpacing: -0.1,
  };

  const sizeStyles: Record<"sm" | "md", React.CSSProperties> = {
    sm: { padding: "5px 11px", fontSize: 12.5, height: 28 },
    md: { padding: "0 14px", fontSize: 13.5, height: 32 },
  };

  const variants: Record<Variant, React.CSSProperties> = {
    primary: {
      backgroundColor: "#ffffff",
      color: "#0a0a0a",
      border: "1px solid rgba(255,255,255,0.9)",
      boxShadow: "0 1px 2px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.40)",
    },
    secondary: {
      backgroundColor: "rgba(255,255,255,0.06)",
      color: "var(--fg)",
      border: "1px solid rgba(255,255,255,0.10)",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--fg-secondary)",
      border: "1px solid transparent",
    },
    danger: {
      backgroundColor: "var(--error-surface)",
      color: "var(--error)",
      border: "1px solid rgba(248, 113, 113, 0.25)",
    },
  };

  const hover: Record<Variant, React.CSSProperties> = {
    primary: { backgroundColor: "#e6e6ea", borderColor: "rgba(255,255,255,0.7)" },
    secondary: { backgroundColor: "rgba(255,255,255,0.10)", borderColor: "rgba(255,255,255,0.16)" },
    ghost: { backgroundColor: "rgba(255,255,255,0.04)", color: "var(--fg)" },
    danger: { backgroundColor: "rgba(248, 113, 113, 0.16)" },
  };

  return (
    <button
      type={type}
      form={form}
      disabled={disabled || loading}
      onClick={onClick}
      style={{ ...base, ...sizeStyles[size], ...variants[variant] }}
      onMouseEnter={(e) => {
        if (disabled || loading) return;
        Object.assign(e.currentTarget.style, hover[variant]);
      }}
      onMouseLeave={(e) => {
        Object.assign(e.currentTarget.style, variants[variant]);
      }}
      onMouseDown={(e) => {
        if (disabled || loading) return;
        e.currentTarget.style.transform = "translateY(1px)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {Icon && !loading && <Icon size={size === "sm" ? 13 : 15} stroke={1.7} />}
      {loading && <span className="spinner" />}
      {children}
    </button>
  );
}
