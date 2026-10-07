import http from "node:http";
import { beforeEach, afterEach } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "../src/db/client.js";
import { redis } from "../src/lib/rate-limiter.js";
import { deliveries } from "../src/db/schema.js";
import { createApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";

const TABLES = ["delivery_attempts", "dead_letters", "deliveries", "events", "subscribers"];

/** Truncate all tables — call in beforeEach. */
export async function resetDb(): Promise<void> {
  for (const t of TABLES) {
    await db.execute(sql.raw(`TRUNCATE TABLE ${t} CASCADE`));
  }
}

/** Clear rate-limit tokens so tests get a full bucket. */
export async function flushRedis(): Promise<void> {
  await redis.flushdb();
}

/** Wipe everything between tests. */
export async function resetAll(): Promise<void> {
  await resetDb();
  await flushRedis();
}

/**
 * Force all PENDING deliveries to be due now, so tests don't wait on real
 * exponential backoff between dispatch attempts.
 */
export async function makeAllRetriesDue(): Promise<void> {
  await db
    .update(deliveries)
    .set({ nextRetryAt: new Date(0) })
    .where(eq(deliveries.status, "PENDING"));
}

export async function closePool(): Promise<void> {
  await pool.end();
  redis.disconnect();
}

export type SubscriberMode = "healthy" | "error500" | "timeout" | "down";

/**
 * A controllable mock webhook receiver. Returns 200 by default; switch modes
 * to simulate failures:
 *  - healthy:  200 + echo
 *  - error500: HTTP 500
 *  - timeout:  never responds (dispatcher's AbortSignal fires)
 *  - down:     destroys the socket (connection reset)
 */
export function startMockSubscriber(): Promise<{
  url: string;
  setMode: (m: SubscriberMode) => void;
  getMode: () => SubscriberMode;
  received: () => { signature?: string; body: string; attempts: string }[];
  close: () => Promise<void>;
}> {
  let mode: SubscriberMode = "healthy";
  const log: { signature?: string; body: string; attempts: string }[] = [];

  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      log.push({
        signature: req.headers["x-signature"] as string | undefined,
        body,
        attempts: (req.headers["x-delivery-attempt"] as string) ?? "",
      });
      switch (mode) {
        case "error500":
          res.writeHead(500);
          res.end(JSON.stringify({ error: "boom" }));
          break;
        case "timeout":
          // Never respond — connection stays open until the client aborts.
          break;
        case "down":
          req.socket.destroy();
          break;
        default:
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ received: true }));
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      resolve({
        url: `http://127.0.0.1:${addr.port}/hook`,
        setMode: (m) => {
          mode = m;
        },
        getMode: () => mode,
        received: () => [...log],
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

/** Build the Fastify app (fresh, logger off in tests). */
export async function buildApp(): Promise<FastifyInstance> {
  const app = await createApp();
  return app;
}

// Wire vitest hooks so test files can just import { resetAll } and get cleanup
// for free. Individual files may override by calling resetAll() in beforeAll.
beforeEach(async () => {
  await resetAll();
});
afterEach(async () => {
  // no per-test teardown needed; next beforeEach wipes
});
