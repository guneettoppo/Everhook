import { IconCheck, IconX } from "@tabler/icons-react";
import type { Toast } from "../hooks/useToast";

export function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 22,
        right: 22,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: 360,
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const Icon = toast.ok ? IconCheck : IconX;
  const color = toast.ok ? "var(--ok)" : "var(--error)";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px",
        borderRadius: "var(--radius-lg)",
        backgroundColor: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        color: "var(--fg)",
        animation: "fade-in-up 240ms var(--ease-out) forwards",
      }}
    >
      <Icon size={18} stroke={2} color={color} />
      <span style={{ fontSize: 14, fontWeight: 500 }}>{toast.message}</span>
    </div>
  );
}
