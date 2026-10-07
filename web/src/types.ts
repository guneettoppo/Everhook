export type EventRow = {
  id: string;
  event_type: string;
  payload: unknown;
  idempotency_key: string | null;
  created_at: string;
};

export type SubscriberRow = {
  id: string;
  url: string;
  event_types: string[];
  status: string;
  created_at: string;
};

export type DeliveryRow = {
  id: string;
  event_type: string;
  subscriber_url: string;
  status: string;
  attempts: number;
  last_http_status: number | null;
  last_error: string | null;
  created_at: string;
  next_retry_at: string | null;
};

export type DeliveryAttempt = {
  attempt: number;
  http_status: number | null;
  error: string | null;
  delivered: boolean;
  created_at: string;
};

export type MockMode = "healthy" | "error500" | "timeout" | "down";

export type DeadLetterRow = {
  id: string;
  delivery_id: string;
  last_error: string | null;
  attempts: number;
  queued_at: string;
  event_type: string;
  subscriber_url: string;
};

export type Stats = {
  events: number;
  subscribers: number;
  dead_letters: number;
  deliveries_by_status: Record<string, number>;
};
