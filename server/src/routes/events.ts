import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { incrMetric } from "../lib/metrics.js";
import { events } from "../db/schema.js";

type PublishEventBody = {
  event_type: string;
  data: unknown;
  idempotency_key?: string;
};

export async function registerEventRoutes(app: FastifyInstance) {
  app.get("/api/v1/events", async () => {
    const rows = await db
      .select({
        id: events.id,
        event_type: events.eventType,
        payload: events.payload,
        idempotency_key: events.idempotencyKey,
        created_at: events.createdAt,
      })
      .from(events)
      .orderBy(events.createdAt)
      .limit(50);
    return { events: rows };
  });

  app.post("/api/v1/events", async (request, reply) => {
    const body = request.body as PublishEventBody;

    if (!body || typeof body.event_type !== "string" || body.event_type.length === 0) {
      return reply.code(422).send({ error: "event_type is required" });
    }
    if (body.data === undefined) {
      return reply.code(422).send({ error: "data is required" });
    }

    if (body.idempotency_key) {
      const existing = await db.query.events.findFirst({
        where: eq(events.idempotencyKey, body.idempotency_key),
      });
      if (existing) {
        return reply.code(200).send({ event_id: existing.id, duplicate: true });
      }
    }

    try {
      const [inserted] = await db
        .insert(events)
        .values({
          eventType: body.event_type,
          payload: body.data,
          idempotencyKey: body.idempotency_key ?? null,
        })
        .returning({ id: events.id });
      incrMetric("events_published");
      return reply.code(201).send({ event_id: inserted.id });
    } catch (err) {
      const key = body.idempotency_key;
      if (key) {
        const existing = await db.query.events.findFirst({
          where: eq(events.idempotencyKey, key),
        });
        if (existing) {
          return reply.code(200).send({ event_id: existing.id, duplicate: true });
        }
      }
      throw err;
    }
  });
}
