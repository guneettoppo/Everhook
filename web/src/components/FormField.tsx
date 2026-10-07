import type { ReactNode } from "react";

export function FormField({ label, children, error, hint }: { label: string; children: ReactNode; error?: string; hint?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-secondary)" }}>{label}</label>
      {children}
      {error ? (
        <div style={{ fontSize: 12, color: "var(--error)" }}>{error}</div>
      ) : hint ? (
        <div style={{ fontSize: 12, color: "var(--fg-tertiary)" }}>{hint}</div>
      ) : null}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      autoFocus={autoFocus}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        backgroundColor: "var(--surface)",
        color: "var(--fg)",
        fontSize: 14,
        outline: "none",
        transition: "border-color var(--duration-fast), box-shadow var(--duration-fast)",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.boxShadow = "0 0 0 2px var(--accent-glow)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 5,
  required,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      required={required}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        backgroundColor: "var(--surface)",
        color: "var(--fg)",
        fontSize: 14,
        fontFamily: "var(--font-mono)",
        lineHeight: 1.5,
        resize: "vertical",
        outline: "none",
        transition: "border-color var(--duration-fast), box-shadow var(--duration-fast)",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.boxShadow = "0 0 0 2px var(--accent-glow)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}
