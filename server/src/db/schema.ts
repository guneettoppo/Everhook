import { boolean, integer, jsonb, pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("events_idempotency_key_idx").on(t.idempotencyKey)],
);

export const subscribers = pgTable("subscribers", {
  id: uuid("id").defaultRandom().primaryKey(),
  url: text("url").notNull(),
  eventTypes: text("event_type").array().notNull(),
  status: text("status").notNull().default("ACTIVE"),
  secret: text("secret").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const deliveries = pgTable(
  "deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    subscriberId: uuid("subscriber_id")
      .notNull()
      .references(() => subscribers.id),
    status: text("status").notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    lastHttpStatus: integer("last_http_status"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("deliveries_event_subscriber_idx").on(t.eventId, t.subscriberId)],
);

export const deadLetters = pgTable(
  "dead_letters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deliveryId: uuid("delivery_id")
      .notNull()
      .references(() => deliveries.id),
    lastError: text("last_error"),
    attempts: integer("attempts").notNull().default(0),
    queuedAt: timestamp("queued_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("dead_letters_delivery_idx").on(t.deliveryId)],
);

export const deliveryAttempts = pgTable(
  "delivery_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deliveryId: uuid("delivery_id")
      .notNull()
      .references(() => deliveries.id),
    attempt: integer("attempt").notNull(),
    httpStatus: integer("http_status"),
    error: text("error"),
    delivered: boolean("delivered").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("delivery_attempts_delivery_attempt_idx").on(t.deliveryId, t.attempt)],
);
