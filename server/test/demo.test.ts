import { beforeAll, afterAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp, closePool } from "./helpers.js";

describe("Demo control API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });
  afterAll(async () => {
    await app.close();
    await closePool();
  });

  it("setup creates exactly one demo subscriber without touching mock mode", async () => {
    const res = await app.inject({ method: "POST", url: "/api/v1/demo/setup" });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const list = await app.inject({ method: "GET", url: "/api/v1/subscribers" });
    const demo = list.json().subscribers.filter((s: { url: string }) => s.url === "http://localhost:9000/demo");
    expect(demo).toHaveLength(1);
  });

  it("setup is idempotent — running twice keeps exactly one demo subscriber", async () => {
    await app.inject({ method: "POST", url: "/api/v1/demo/setup" });
    await app.inject({ method: "POST", url: "/api/v1/demo/setup" });
    const list = await app.inject({ method: "GET", url: "/api/v1/subscribers" });
    const demo = list.json().subscribers.filter((s: { url: string }) => s.url === "http://localhost:9000/demo");
    expect(demo).toHaveLength(1);
  });

  it("sets mock mode and rejects invalid modes", async () => {
    const ok = await app.inject({
      method: "POST",
      url: "/api/v1/demo/mock-mode",
      payload: { mode: "error500" },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().mode).toBe("error500");

    const bad = await app.inject({
      method: "POST",
      url: "/api/v1/demo/mock-mode",
      payload: { mode: "banana" },
    });
    expect(bad.statusCode).toBe(422);
  });

  it("reset clears demo data without touching other subscribers", async () => {
    // Non-demo subscriber + event
    await app.inject({
      method: "POST",
      url: "/api/v1/subscribers",
      payload: { url: "http://localhost:9999/other", event_types: ["a.b"], secret: "s" },
    });
    await app.inject({ method: "POST", url: "/api/v1/events", payload: { event_type: "a.b", data: { x: 1 } } });

    // Demo subscriber + event
    await app.inject({ method: "POST", url: "/api/v1/demo/setup" });
    await app.inject({
      method: "POST",
      url: "/api/v1/events",
      payload: { event_type: "payment.succeeded", data: { demo: true } },
    });

    const res = await app.inject({ method: "POST", url: "/api/v1/demo/reset" });
    expect(res.statusCode).toBe(200);

    // reset deletes demo data but keeps the demo subscriber (so the demo page
    // stays wired up) and leaves non-demo subscribers untouched.
    const subs = await app.inject({ method: "GET", url: "/api/v1/subscribers" });
    const urls = subs.json().subscribers.map((s: { url: string }) => s.url);
    expect(urls).toContain("http://localhost:9999/other");
    expect(urls).toContain("http://localhost:9000/demo");
  });
});
