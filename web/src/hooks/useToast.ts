import { useCallback, useState } from "react";

export type Toast = {
  id: string;
  message: string;
  ok: boolean;
};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, ok: boolean) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, message, ok };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, show, dismiss };
}
