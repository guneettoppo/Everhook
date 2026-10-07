import type { DeadLetterRow, DeliveryAttempt, DeliveryRow, EventRow, MockMode, Stats, SubscriberRow } from "./types";

const BASE = "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  stats: () => request<Stats>("/stats"),
  events: () => request<{ events: EventRow[] }>("/events"),
  publishEvent: (body: unknown) =>
    request<{ event_id: string }>("/events", { method: "POST", body: JSON.stringify(body) }),
  subscribers: () => request<{ subscribers: SubscriberRow[] }>("/subscribers"),
  registerSubscriber: (body: unknown) =>
    request<{ id: string }>("/subscribers", { method: "POST", body: JSON.stringify(body) }),
  deliveries: () => request<{ deliveries: DeliveryRow[] }>("/deliveries"),
  deliveryAttempts: (id: string) => request<{ attempts: DeliveryAttempt[] }>(`/deliveries/${id}/attempts`),
  dlq: () => request<{ dead_letters: DeadLetterRow[] }>("/dlq"),
  replay: (id: string) => request<{ replayed: boolean }>(`/dlq/${id}/replay`, { method: "POST" }),
  mockMode: () => request<{ mode: MockMode }>("/demo/mock-mode"),
  setMockMode: (mode: MockMode) =>
    request<{ mode: MockMode }>("/demo/mock-mode", { method: "POST", body: JSON.stringify({ mode }) }),
  demoSetup: () => request<{ ok: boolean }>("/demo/setup", { method: "POST" }),
  resetDemo: () => request<{ cleared: number }>("/demo/reset", { method: "POST" }),
};
