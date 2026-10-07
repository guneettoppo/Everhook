import Fastify from "fastify";
import { metricsText } from "./lib/metrics.js";
import { registerDeliveryRoutes } from "./routes/deliveries.js";
import { registerDemoRoutes } from "./routes/demo.js";
import { registerDlqRoutes } from "./routes/dlq.js";
import { registerEventRoutes } from "./routes/events.js";
import { registerSubscriberRoutes } from "./routes/subscribers.js";

export async function createApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV === "test" ? false : true,
  });

  app.get("/health", async () => {
    return { status: "ok", uptime: process.uptime() };
  });

  app.get("/metrics", async (_request, reply) => {
    return reply.type("text/plain; version=0.0.4").send(await metricsText());
  });

  await registerEventRoutes(app);
  await registerSubscriberRoutes(app);
  await registerDlqRoutes(app);
  await registerDeliveryRoutes(app);
  await registerDemoRoutes(app);

  return app;
}
