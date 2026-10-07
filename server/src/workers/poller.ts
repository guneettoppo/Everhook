import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { createHmac } from "node:crypto";
import { db, pool } from "../db/client.js";
import { tryTakeToken } from "../lib/rate-limiter.js";
import { incrMetric, recordRetryDelayMs } from "../lib/metrics.js";
import { deadLetters, deliveries, deliveryAttempts, events, subscribers } from "../db/schema.js";

const INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 2000);
const DELIVERY_TIMEOUT_MS = Number(process.env.DELIVERY_TIMEOUT_MS ?? 10000);
const MAX_ATTEMPTS = Number(process.env.MAX_ATTEMPTS ?? 8);
const RETRY_BASE_MS = 1000;
const RETRY_FACTOR = 5;
const RETRY_CAP_MS = 6 * 60 * 60 * 1000;

function nextRetryDelayMs(attempt: number): number {
  const raw = Math.min(RETRY_BASE_MS * Math.pow(RETRY_FACTOR, attempt - 1), RETRY_CAP_MS);
  const jitter = 0.8 + Math.random() * 0.4;
  return Math.round(raw * jitter);
}

export async function pollOnce(): Promise<number> {
  const undelivered = await db
    .select({ id: events.id, eventType: events.eventType })
    .from(events)
    .leftJoin(deliveries, eq(deliveries.eventId, events.id))
    .where(isNull(deliveries.id))
    .limit(50);

  for (const event of undelivered) {
    await db.transaction(async (tx) => {
      const [claimed] = await tx
        .select({ id: events.id })
        .from(events)
        .where(eq(events.id, event.id))
        .for("update", { skipLocked: true });

      if (!claimed) {
        return;
      }

      const matches = await tx
        .select({ id: subscribers.id })
        .from(subscribers)
        .where(
          and(
            eq(subscribers.status, "ACTIVE"),
            sql`${event.eventType} = ANY(${subscribers.eventTypes})`,
          ),
        );

      if (matches.length > 0) {
        await tx.insert(deliveries).values(
          matches.map((m) => ({ eventId: event.id, subscriberId: m.id })),
        );
        incrMetric("deliveries_created", matches.length);
      }
    });
  }

  return undelivered.length;
}

export async function dispatchPending(): Promise<number> {
  const pending = await db
    .select({ id: deliveries.id })
    .from(deliveries)
    .where(
      and(
        eq(deliveries.status, "PENDING"),
        or(isNull(deliveries.nextRetryAt), lte(deliveries.nextRetryAt, new Date())),
      ),
    )
    .limit(10);

  for (const { id } of pending) {
    await dispatchOne(id);
  }

  return pending.length;
}

export async function sweepDlq(): Promise<number> {
  const exhausted = await db
    .select({ id: deliveries.id, attempts: deliveries.attempts, lastError: deliveries.lastError })
    .from(deliveries)
    .where(and(eq(deliveries.status, "FAILED"), gte(deliveries.attempts, MAX_ATTEMPTS)))
    .limit(50);

  for (const delivery of exhausted) {
    await db.transaction(async (tx) => {
      const [claimed] = await tx
        .select({ id: deliveries.id })
        .from(deliveries)
        .where(and(eq(deliveries.id, delivery.id), eq(deliveries.status, "FAILED")))
        .for("update", { skipLocked: true });

      if (!claimed) {
        return;
      }

      await tx.insert(deadLetters).values({
        deliveryId: delivery.id,
        lastError: delivery.lastError,
        attempts: delivery.attempts,
      });
      await tx
        .update(deliveries)
        .set({ status: "DLQ" })
        .where(eq(deliveries.id, delivery.id));
    });
  }

  return exhausted.length;
}

async function dispatchOne(deliveryId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [claimed] = await tx
      .select({
        id: deliveries.id,
        eventId: deliveries.eventId,
        subscriberId: deliveries.subscriberId,
        attempts: deliveries.attempts,
      })
      .from(deliveries)
      .where(and(eq(deliveries.id, deliveryId), eq(deliveries.status, "PENDING")))
      .for("update", { skipLocked: true });

    if (!claimed) {
      return;
    }

    const allowed = await tryTakeToken(claimed.subscriberId);
    if (!allowed) {
      return;
    }

    const [sub] = await tx
      .select({ url: subscribers.url, secret: subscribers.secret })
      .from(subscribers)
      .where(eq(subscribers.id, claimed.subscriberId));

    const [evt] = await tx
      .select({ eventType: events.eventType, payload: events.payload })
      .from(events)
      .where(eq(events.id, claimed.eventId));

    if (!sub || !evt) {
      return;
    }

    const attempt = claimed.attempts + 1;
    const body = JSON.stringify(evt.payload);
    const signature = createHmac("sha256", sub.secret).update(body).digest("hex");

    let delivered = false;
    let lastHttpStatus: number | null = null;
    let lastError: string | null = null;

    try {
      const res = await fetch(sub.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Event-ID": claimed.eventId,
          "X-Event-Type": evt.eventType,
          "X-Delivery-Attempt": String(attempt),
          "X-Signature": `sha256=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });

      lastHttpStatus = res.status;
      delivered = res.status >= 200 && res.status < 300;
      if (!delivered) {
        lastError = `subscriber returned HTTP ${res.status}`;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    const exhausted = !delivered && attempt >= MAX_ATTEMPTS;
    const retryDelayMs = delivered || exhausted ? 0 : nextRetryDelayMs(attempt);

    await tx.insert(deliveryAttempts).values({
      deliveryId: claimed.id,
      attempt,
      httpStatus: lastHttpStatus,
      error: lastError,
      delivered,
    });

    await tx
      .update(deliveries)
      .set({
        status: delivered ? "DELIVERED" : exhausted ? "FAILED" : "PENDING",
        attempts: attempt,
        lastHttpStatus,
        lastError,
        nextRetryAt: delivered || exhausted ? null : new Date(Date.now() + retryDelayMs),
      })
      .where(eq(deliveries.id, claimed.id));

    if (delivered) incrMetric("delivered");
    else if (exhausted) incrMetric("exhausted");
    else {
      incrMetric("failed");
      recordRetryDelayMs(retryDelayMs);
    }

    console.log(
      `[poller] ${delivered ? "delivered" : exhausted ? "exhausted" : "retry scheduled"} ` +
        `attempt ${attempt}${lastError ? ` — ${lastError}` : ""}`,
    );
  });
}

let running = true;

async function loop() {
  while (running) {
    try {
      const fannedOut = await pollOnce();
      const dispatched = await dispatchPending();
      const swept = await sweepDlq();
      if (fannedOut > 0 || dispatched > 0 || swept > 0) {
        console.log(`[poller] fan-out: ${fannedOut}, dispatched: ${dispatched}, swept: ${swept}`);
      }
    } catch (err) {
      console.error("[poller] error:", err);
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
  await pool.end();
  console.log("[poller] stopped");
}

process.on("SIGINT", () => {
  running = false;
});
process.on("SIGTERM", () => {
  running = false;
});

// Only start the loop when this file is run directly (worker entrypoint),
// not when imported by tests or other modules.
const isEntrypoint =
  process.argv[1] && import.meta.url.endsWith(new URL(`file://${process.argv[1]}`).pathname);

if (isEntrypoint) {
  void loop();
}
