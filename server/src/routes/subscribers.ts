import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { subscribers } from "../db/schema.js";

type RegisterSubscriberBody = {
  url: string;
  event_types: string[];
  secret?: string;
};

export async function registerSubscriberRoutes(app: FastifyInstance) {
  app.get("/api/v1/subscribers", async () => {
    const rows = await db
      .select({
        id: subscribers.id,
        url: subscribers.url,
        event_types: subscribers.eventTypes,
        status: subscribers.status,
        created_at: subscribers.createdAt,
      })
      .from(subscribers)
      .orderBy(subscribers.createdAt);
    return { subscribers: rows };
  });

  app.post("/api/v1/subscribers", async (request, reply) => {
    const body = request.body as RegisterSubscriberBody;

    if (!body || typeof body.url !== "string" || body.url.length === 0) {
      return reply.code(422).send({ error: "url is required" });
    }
    if (!Array.isArray(body.event_types) || body.event_types.length === 0) {
      return reply.code(422).send({ error: "event_types must be a non-empty array" });
    }

    const secret =
      typeof body.secret === "string" && body.secret.length > 0
        ? body.secret
        : randomBytes(32).toString("hex");

    const [inserted] = await db
      .insert(subscribers)
      .values({ url: body.url, eventTypes: body.event_types, secret })
      .returning({
        id: subscribers.id,
        url: subscribers.url,
        eventTypes: subscribers.eventTypes,
        secret: subscribers.secret,
      });

    return reply.code(201).send(inserted);
  });
}
