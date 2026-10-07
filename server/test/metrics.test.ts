import { beforeAll, afterAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp, closePool, startMockSubscriber } from "./helpers.js";
import { pollOnce, dispatchPending } from "../src/workers/poller.js";
import { resetMetrics } from "../src/lib/metrics.js";

describe("Metrics endpoint", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    // Reset counters so the test is deterministic regardless of other files
    await resetMetrics();
  });
  afterAll(async () => {
    await app.close();
    await closePool();
  });

  it("serves Prometheus text format at /metrics", async () => {
    const res = await app.inject({ method: "GET", url: "/metrics" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    const body = res.body;
    expect(body).toContain("# TYPE everhook_deliveries_delivered_total counter");
    expect(body).toContain("# TYPE everhook_process_memory_bytes gauge");
    expect(body).toMatch(/everhook_process_uptime_seconds \d+/);
  });

  it("reflects real activity: publish + deliver increments counters", async () => {
    const mock = await startMockSubscriber();
    await app.inject({
      method: "POST",
      url: "/api/v1/subscribers",
      payload: { url: mock.url, event_types: ["payment.succeeded"], secret: "test-secret" },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/events",
      payload: { event_type: "payment.succeeded", data: { order_id: "m1" } },
    });
    await pollOnce();
    await dispatchPending();

    const res = await app.inject({ method: "GET", url: "/metrics" });
    const body = res.body;
    expect(body).toMatch(/everhook_events_published_total 1/);
    expect(body).toMatch(/everhook_deliveries_created_total 1/);
    expect(body).toMatch(/everhook_deliveries_delivered_total 1/);
    await mock.close();
  });

  it("records retry backoff in the histogram on failure", async () => {
    const mock = await startMockSubscriber();
    mock.setMode("error500");
    await app.inject({
      method: "POST",
      url: "/api/v1/subscribers",
      payload: { url: mock.url, event_types: ["a.b"], secret: "test-secret" },
    });
    await app.inject({ method: "POST", url: "/api/v1/events", payload: { event_type: "a.b", data: { x: 1 } } });
    await pollOnce();
    await dispatchPending();

    const res = await app.inject({ method: "GET", url: "/metrics" });
    const body = res.body;
    expect(body).toMatch(/everhook_deliveries_failed_total 1/);
    expect(body).toMatch(/everhook_retry_delay_seconds_bucket\{le="5"\} 1/); // attempt-1 backoff ~1s lands in ≤5s bucket
    await mock.close();
  });
});
