export type AppConfig = {
  port: number;
  databaseUrl: string;
  redisUrl: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = Number(env.PORT ?? 3000);

  const databaseUrl = env.DATABASE_URL;
  const redisUrl = env.REDIS_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required — see server/.env.example");
  }
  if (!redisUrl) {
    throw new Error("REDIS_URL is required — see server/.env.example");
  }

  return { port, databaseUrl, redisUrl };
}
