import { beforeAll, afterAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp, closePool } from "./helpers.js";

describe("Subscriber registration API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });
  afterAll(async () => {
    await app.close();
    await closePool();
  });

  it("registers a subscriber with a generated secret", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/subscribers",
      payload: { url: "http://localhost:9999/hook", event_types: ["payment.succeeded"] },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeTruthy();
    expect(body.secret).toBeTruthy();
    expect(body.secret).toHaveLength(64); // 32 random bytes hex
  });

  it("honors a caller-provided secret", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/subscribers",
      payload: { url: "http://localhost:9999/hook2", event_types: ["a.b"], secret: "my-secret" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().secret).toBe("my-secret");
  });

  it("rejects missing url with 422", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/subscribers",
      payload: { event_types: ["a.b"] },
    });
    expect(res.statusCode).toBe(422);
  });

  it("rejects empty event_types with 422", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/subscribers",
      payload: { url: "http://localhost:9999/hook3", event_types: [] },
    });
    expect(res.statusCode).toBe(422);
  });

  it("lists registered subscribers", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/subscribers",
      payload: { url: "http://localhost:9999/hook4", event_types: ["x.y"] },
    });
    const res = await app.inject({ method: "GET", url: "/api/v1/subscribers" });
    expect(res.statusCode).toBe(200);
    expect(res.json().subscribers.length).toBeGreaterThanOrEqual(1);
  });
});
