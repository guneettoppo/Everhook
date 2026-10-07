import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { db } from "../src/db/client.js";
import { deadLetters, deliveries, events } from "../src/db/schema.js";
import { pollOnce, dispatchPending, sweepDlq } from "../src/workers/poller.js";
import { buildApp, closePool, makeAllRetriesDue, startMockSubscriber } from "./helpers.js";

/**
 * Failure-injection suite — the phase that PROVES reliability instead of
 * claiming it. Each test simulates a production outage and asserts the event
 * is never lost (at-least-once) and the system recovers without manual help.
 */
describe("Failure injection: at-least-once under crashes and outages", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });
  afterAll(async () => {
    await app.close();
    await closePool();
  });

  async function registerSubscriber(url: string, eventTypes: string[], secret = "test-secret") {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/subscribers",
      payload: { url, event_types: eventTypes, secret },
    });
    expect(res.statusCode).toBe(201);
    return res.json() as { id: string };
  }

  async function publish(eventType: string, data: unknown) {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      payload: { event_type: eventType, data },
    });
    expect(res.statusCode).toBe(201);
    return res.json() as { event_id: string };
  }

  it("worker dies AFTER fan-out but BEFORE dispatch — event is not lost, next cycle delivers it", async () => {
    const mock = await startMockSubscriber();
    await registerSubscriber(mock.url, ["payment.succeeded"]);
    const { event_id } = await publish("payment.succeeded", { order_id: "f1" });

    // Cycle 1: fan-out runs, creates the delivery row... then the worker crashes
    // (SIGKILL) before dispatch. Simulated by simply NOT calling dispatchPending.
    await pollOnce();
    const before = await db.select().from(deliveries);
    expect(before).toHaveLength(1);
    expect(before[0].status).toBe("PENDING"); // nothing delivered yet

    // "Restart": a fresh worker picks up where the dead one left off.
    await dispatchPending();
    const after = await db.select().from(deliveries);
    expect(after[0].status).toBe("DELIVERED");
    expect(after[0].attempts).toBe(1);
    expect(mock.received()).toHaveLength(1);
    void event_id;
  });

  it("worker dies DURING delivery (subscriber never responds) — delivery stays PENDING, retried after restart, eventually DLQ", async () => {
    const mock = await startMockSubscriber();
    mock.setMode("timeout"); // subscriber hangs forever → dispatcher aborts
    await registerSubscriber(mock.url, ["user.signup"]);
    await publish("user.signup", { user_id: "f2" });

    await pollOnce();

    // Attempt 1: hangs, dispatcher's AbortSignal fires → FAILED→PENDING with retry scheduled
    await dispatchPending();
    const afterAttempt1 = await db.select().from(deliveries);
    expect(afterAttempt1[0].status).toBe("PENDING");
    expect(afterAttempt1[0].nextRetryAt).toBeTruthy();

    // "Restart" (fresh dispatch cycles, like a new worker process)
    await dispatchPending();
    await makeAllRetriesDue();
    await dispatchPending();
    await makeAllRetriesDue();
    await dispatchPending();
    await sweepDlq();

    // 3 timeout attempts exhaust → DLQ. Event was never lost: it's parked in the DLQ.
    const dlq = await db.select().from(deadLetters);
    expect(dlq).toHaveLength(1);
    const [final] = await db.select().from(deliveries);
    expect(final.status).toBe("DLQ");
    void mock;
  });

  it("subscriber is DOWN for 2 attempts then recovers — delivery succeeds, attempts recorded", async () => {
    const mock = await startMockSubscriber();
    mock.setMode("down"); // socket reset = connection error
    await registerSubscriber(mock.url, ["order.shipped"]);
    await publish("order.shipped", { order_id: "f3" });

    await pollOnce();
    await dispatchPending();
    await makeAllRetriesDue();
    await dispatchPending();

    const mid = await db.select().from(deliveries);
    expect(mid[0].status).toBe("PENDING");
    expect(mid[0].attempts).toBe(2);
    expect(mid[0].lastError).toBeTruthy(); // fetch failed / socket hang up

    mock.setMode("healthy");
    await makeAllRetriesDue();
    await dispatchPending();

    const [after] = await db.select().from(deliveries);
    expect(after.status).toBe("DELIVERED");
    expect(after.attempts).toBe(3);
  });

  it("event survives a full pipeline restart with zero loss (publish → crash → restart → delivered)", async () => {
    const mock = await startMockSubscriber();
    await registerSubscriber(mock.url, ["payment.succeeded", "user.signup"]);

    // Batch publish 5 events, then "crash" before any fan-out
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const { event_id } = await publish("payment.succeeded", { n: i });
      ids.push(event_id);
    }
    expect((await db.select().from(events)).length).toBe(5);

    // Restart: fresh worker runs fan-out + dispatch + sweep (full cycle)
    await pollOnce();
    await dispatchPending();
    await sweepDlq();

    const rows = await db.select().from(deliveries);
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row.status).toBe("DELIVERED");
    }
    // All 5 events present, none lost
    expect((await db.select().from(events)).length).toBe(5);
  });

  it("subscriber not registered for an event type → event stays pending in outbox, no phantom delivery", async () => {
    await publish("invoice.created", { n: 1 });
    await pollOnce();
    const rows = await db.select().from(deliveries);
    expect(rows).toHaveLength(0);
    // Event still in the outbox, waiting — not lost
    expect((await db.select().from(events)).length).toBe(1);
  });
});
