import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { incrMetric } from "../lib/metrics.js";
import { deadLetters, deliveries, deliveryAttempts, events, subscribers } from "../db/schema.js";

export async function registerDlqRoutes(app: FastifyInstance) {
  app.get("/api/v1/dlq", async () => {
    const rows = await db
      .select({
        id: deadLetters.id,
        delivery_id: deadLetters.deliveryId,
        last_error: deadLetters.lastError,
        attempts: deadLetters.attempts,
        queued_at: deadLetters.queuedAt,
        event_type: events.eventType,
        subscriber_url: subscribers.url,
      })
      .from(deadLetters)
      .innerJoin(deliveries, eq(deadLetters.deliveryId, deliveries.id))
      .innerJoin(events, eq(deliveries.eventId, events.id))
      .innerJoin(subscribers, eq(deliveries.subscriberId, subscribers.id))
      .orderBy(deadLetters.queuedAt);

    return { dead_letters: rows };
  });

  app.post("/api/v1/dlq/:id/replay", async (request, reply) => {
    const { id } = request.params as { id: string };

    const [dead] = await db
      .select({ deliveryId: deadLetters.deliveryId })
      .from(deadLetters)
      .where(eq(deadLetters.id, id));

    if (!dead) {
      return reply.code(404).send({ error: "dead letter not found" });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(deliveries)
        .set({ status: "PENDING", attempts: 0, nextRetryAt: new Date(), lastError: null })
        .where(eq(deliveries.id, dead.deliveryId));
      // Fresh retry budget means fresh attempt history — drop old rows so the
      // unique (delivery_id, attempt) index doesn't collide on re-dispatch.
      await tx
        .delete(deliveryAttempts)
        .where(eq(deliveryAttempts.deliveryId, dead.deliveryId));
      await tx.delete(deadLetters).where(eq(deadLetters.id, id));
    });

    incrMetric("replayed");
    return { replayed: true, delivery_id: dead.deliveryId };
  });
}
