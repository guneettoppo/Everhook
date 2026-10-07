import { beforeAll, afterAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp, closePool } from "./helpers.js";

describe("Event ingestion API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });
  afterAll(async () => {
    await app.close();
    await closePool();
  });

  it("publishes an event and returns 201 with event_id", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      payload: { event_type: "payment.succeeded", data: { order_id: "ord_1" } },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.event_id).toBeTruthy();
    expect(body.duplicate).toBeUndefined();
  });

  it("rejects missing event_type with 422", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      payload: { data: {} },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error).toContain("event_type");
  });

  it("rejects missing data with 422", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      payload: { event_type: "x.y" },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error).toContain("data");
  });

  it("dedupes on idempotency key: same key returns same event_id with duplicate flag", async () => {
    const payload = { event_type: "user.signup", data: { user_id: 42 }, idempotency_key: "key-abc" };
    const first = await app.inject({ method: "POST", url: "/api/v1/events", payload });
    expect(first.statusCode).toBe(201);
    const firstId = first.json().event_id;

    const second = await app.inject({ method: "POST", url: "/api/v1/events", payload });
    expect(second.statusCode).toBe(200);
    const secondBody = second.json();
    expect(secondBody.event_id).toBe(firstId);
    expect(secondBody.duplicate).toBe(true);
  });

  it("lists events", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/events",
      payload: { event_type: "order.shipped", data: { order_id: "ord_2" } },
    });
    const res = await app.inject({ method: "GET", url: "/api/v1/events" });
    expect(res.statusCode).toBe(200);
    expect(res.json().events.length).toBeGreaterThanOrEqual(1);
  });
});
