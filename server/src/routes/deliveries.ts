import type { FastifyInstance } from "fastify";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { deadLetters, deliveries, deliveryAttempts, events, subscribers } from "../db/schema.js";

export async function registerDeliveryRoutes(app: FastifyInstance) {
  app.get("/api/v1/deliveries", async () => {
    const rows = await db
      .select({
        id: deliveries.id,
        event_type: events.eventType,
        subscriber_url: subscribers.url,
        status: deliveries.status,
        attempts: deliveries.attempts,
        last_http_status: deliveries.lastHttpStatus,
        last_error: deliveries.lastError,
        created_at: deliveries.createdAt,
        next_retry_at: deliveries.nextRetryAt,
      })
      .from(deliveries)
      .innerJoin(events, eq(deliveries.eventId, events.id))
      .innerJoin(subscribers, eq(deliveries.subscriberId, subscribers.id))
      .orderBy(desc(deliveries.createdAt))
      .limit(100);

    return { deliveries: rows };
  });

  app.get("/api/v1/deliveries/:id/attempts", async (request, reply) => {
    const { id } = request.params as { id: string };
    const attempts = await db
      .select({
        attempt: deliveryAttempts.attempt,
        http_status: deliveryAttempts.httpStatus,
        error: deliveryAttempts.error,
        delivered: deliveryAttempts.delivered,
        created_at: deliveryAttempts.createdAt,
      })
      .from(deliveryAttempts)
      .where(eq(deliveryAttempts.deliveryId, id))
      .orderBy(deliveryAttempts.attempt);
    if (attempts.length === 0) {
      return reply.code(404).send({ error: "no attempts for delivery" });
    }
    return { attempts };
  });

  app.get("/api/v1/stats", async () => {
    const [eventCount] = await db.select({ count: sql<number>`count(*)::int` }).from(events);
    const [subscriberCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscribers);
    const [deadLetterCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(deadLetters);

    const statusRows = await db
      .select({ status: deliveries.status, count: sql<number>`count(*)::int` })
      .from(deliveries)
      .groupBy(deliveries.status);

    const byStatus: Record<string, number> = {};
    for (const row of statusRows) {
      byStatus[row.status] = row.count;
    }

    return {
      events: eventCount.count,
      subscribers: subscriberCount.count,
      dead_letters: deadLetterCount.count,
      deliveries_by_status: byStatus,
    };
  });
}
