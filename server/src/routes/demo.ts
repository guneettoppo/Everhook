import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FastifyInstance } from "fastify";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { deadLetters, deliveries, deliveryAttempts, events, subscribers } from "../db/schema.js";

export type MockMode = "healthy" | "error500" | "timeout" | "down";

const DEMO_SUBSCRIBER_URL = "http://localhost:9000/demo";
const DEMO_EVENT_TYPES = ["payment.succeeded", "user.signup", "order.shipped", "demo.*"];

const STATE_FILE = resolve(process.env.MOCK_STATE_FILE ?? "mock-state.json");

export function readMockMode(): MockMode {
  try {
    if (existsSync(STATE_FILE)) {
      const raw = JSON.parse(readFileSync(STATE_FILE, "utf8")) as { mode?: MockMode };
      if (raw.mode) return raw.mode;
    }
  } catch {
    // fall through to default
  }
  return "healthy";
}

export function writeMockMode(mode: MockMode): void {
  writeFileSync(STATE_FILE, JSON.stringify({ mode }, null, 2));
}

async function demoSubscriberIds(): Promise<string[]> {
  const rows = await db
    .select({ id: subscribers.id })
    .from(subscribers)
    .where(eq(subscribers.url, DEMO_SUBSCRIBER_URL));
  return rows.map((r) => r.id);
}

export async function registerDemoRoutes(app: FastifyInstance) {
  app.get("/api/v1/demo/mock-mode", async () => {
    return { mode: readMockMode() };
  });

  app.post("/api/v1/demo/mock-mode", async (request, reply) => {
    const body = request.body as { mode?: MockMode };
    const mode = body?.mode;
    if (!mode || !["healthy", "error500", "timeout", "down"].includes(mode)) {
      return reply.code(422).send({ error: "mode must be one of: healthy, error500, timeout, down" });
    }
    writeMockMode(mode);
    return { mode };
  });

  // Idempotent: ensures exactly one demo subscriber exists (dedupes extras).
  // Does NOT touch mock mode — mode is controlled only by the explicit toggle.
  app.post("/api/v1/demo/setup", async () => {
    const ids = await demoSubscriberIds();
    if (ids.length === 0) {
      await db.insert(subscribers).values({
        url: DEMO_SUBSCRIBER_URL,
        eventTypes: DEMO_EVENT_TYPES,
        status: "ACTIVE",
        secret: "test-secret",
      });
    } else if (ids.length > 1) {
      // Deduplicate: delete the extras (their data will be cleaned by reset)
      const [keep, ...extras] = ids;
      for (const extraId of extras) {
        await deleteSubscriberData(extraId);
        await db.delete(subscribers).where(eq(subscribers.id, extraId));
      }
      void keep;
    }
    return { ok: true };
  });

  app.post("/api/v1/demo/reset", async () => {
    const ids = await demoSubscriberIds();
    let cleared = 0;
    for (const id of ids) {
      cleared += await deleteSubscriberData(id);
    }
    return { cleared };
  });
}

async function deleteSubscriberData(subscriberId: string): Promise<number> {
  const demoDeliveryIds = await db
    .select({ id: deliveries.id })
    .from(deliveries)
    .where(eq(deliveries.subscriberId, subscriberId));

  const ids = demoDeliveryIds.map((d) => d.id);
  let cleared = 0;
  if (ids.length > 0) {
    await db.delete(deadLetters).where(inArray(deadLetters.deliveryId, ids));
    await db.delete(deliveryAttempts).where(inArray(deliveryAttempts.deliveryId, ids));
    cleared = ids.length;
  }

  await db.delete(deliveries).where(eq(deliveries.subscriberId, subscriberId));

  // Delete events that now have no deliveries at all (orphans from demo runs)
  // Use a raw SQL subquery to avoid massive IN(...) lists (can be 90k+ rows).
  await db.execute(
    sql.raw(`DELETE FROM events WHERE id NOT IN (SELECT DISTINCT event_id FROM deliveries)`),
  );

  return cleared;
}
