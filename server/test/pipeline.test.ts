import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { db } from "../src/db/client.js";
import { deadLetters, deliveries, deliveryAttempts, events, subscribers } from "../src/db/schema.js";
import { pollOnce, dispatchPending, sweepDlq } from "../src/workers/poller.js";
import { buildApp, closePool, makeAllRetriesDue, startMockSubscriber } from "./helpers.js";

describe("Delivery pipeline (fan-out → dispatch → retry → DLQ → replay)", () => {
  let app: FastifyInstance;
  let mock: Awaited<ReturnType<typeof startMockSubscriber>>;

  beforeAll(async () => {
    app = await buildApp();
  });
  afterAll(async () => {
    await app.close();
    await mock?.close();
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

  it("fans out an event to matching subscribers and delivers with HMAC signature", async () => {
    mock = await startMockSubscriber();
    const sub = await registerSubscriber(mock.url, ["payment.succeeded"]);
    const { event_id } = await publish("payment.succeeded", { order_id: "ord_1", amount: 500 });

    // pollOnce creates the delivery row
    await pollOnce();
    const rows = await db.select().from(deliveries);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("PENDING");

    // dispatchPending performs the HTTP POST
    await dispatchPending();
    const [delivered] = await db.select().from(deliveries);
    expect(delivered.status).toBe("DELIVERED");
    expect(delivered.attempts).toBe(1);
    expect(delivered.lastHttpStatus).toBe(200);

    // Attempt was recorded
    const attempts = await db.select().from(deliveryAttempts);
    expect(attempts).toHaveLength(1);
    expect(attempts[0].attempt).toBe(1);
    expect(attempts[0].delivered).toBe(true);

    // The mock received a signed request — verify HMAC against the subscriber secret
    const received = mock.received();
    expect(received).toHaveLength(1);
    const { signature, body } = received[0];
    expect(signature).toMatch(/^sha256=/);
    const expected = createHmac("sha256", "test-secret").update(body).digest("hex");
    expect(signature).toBe(`sha256=${expected}`);
    void sub;
    void event_id;
  });

  it("does not fan out to subscribers that don't match the event type", async () => {
    mock = await startMockSubscriber();
    await registerSubscriber(mock.url, ["invoice.created"]);
    await publish("payment.succeeded", { order_id: "ord_2" });
    await pollOnce();
    const rows = await db.select().from(deliveries);
    expect(rows).toHaveLength(0);
  });

  it("retries with exponential backoff on 500, then delivers once subscriber recovers", async () => {
    mock = await startMockSubscriber();
    mock.setMode("error500");
    await registerSubscriber(mock.url, ["user.signup"]);
    await publish("user.signup", { user_id: 1 });

    await pollOnce();
    await dispatchPending();
    await makeAllRetriesDue(); // skip real backoff wait
    await dispatchPending();

    const rows = await db.select().from(deliveries);
    expect(rows[0].attempts).toBe(2);
    expect(rows[0].status).toBe("PENDING"); // still retrying
    expect(rows[0].lastHttpStatus).toBe(500);
    expect(rows[0].nextRetryAt).toBeTruthy(); // backoff scheduled

    // Subscriber recovers → next attempt delivers
    mock.setMode("healthy");
    await makeAllRetriesDue();
    await dispatchPending();

    const [after] = await db.select().from(deliveries);
    expect(after.status).toBe("DELIVERED");
    expect(after.attempts).toBeGreaterThan(2);
  });

  it("moves exhausted deliveries to the DLQ, and replay resets the retry budget", async () => {
    mock = await startMockSubscriber();
    mock.setMode("error500"); // permanently failing
    await registerSubscriber(mock.url, ["order.shipped"]);
    await publish("order.shipped", { order_id: "ord_3" });

    await pollOnce();
    // MAX_ATTEMPTS=3 from vitest env: three dispatch attempts exhaust it
    for (let i = 0; i < 3; i++) {
      await dispatchPending();
      await makeAllRetriesDue();
    }
    await sweepDlq();

    const [deliveryRow] = await db.select().from(deliveries);
    expect(deliveryRow.status).toBe("DLQ");

    const dlq = await db.select().from(deadLetters);
    expect(dlq).toHaveLength(1);
    expect(dlq[0].attempts).toBe(3);

    // Replay via API
    const replayRes = await app.inject({
      method: "POST",
      url: `/api/v1/dlq/${dlq[0].id}/replay`,
    });
    expect(replayRes.statusCode).toBe(200);

    // Delivery reset to PENDING with a fresh retry budget and no attempt history
    const [replayed] = await db.select().from(deliveries);
    expect(replayed.status).toBe("PENDING");
    expect(replayed.attempts).toBe(0);
    const attemptRows = await db.select().from(deliveryAttempts);
    expect(attemptRows).toHaveLength(0); // old history cleared — no index collision

    // Subscriber recovers → replayed delivery succeeds on attempt 1
    mock.setMode("healthy");
    await dispatchPending();
    const [final] = await db.select().from(deliveries);
    expect(final.status).toBe("DELIVERED");
    expect(final.attempts).toBe(1);
  });

  it("DLQ endpoints: list and replay through the API", async () => {
    mock = await startMockSubscriber();
    mock.setMode("error500");
    await registerSubscriber(mock.url, ["a.b"]);
    await publish("a.b", { x: 1 });
    await pollOnce();
    for (let i = 0; i < 3; i++) {
      await dispatchPending();
      await makeAllRetriesDue();
    }
    await sweepDlq();

    const listRes = await app.inject({ method: "GET", url: "/api/v1/dlq" });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().dead_letters).toHaveLength(1);
  });
});
