import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Run test files sequentially: they share the same Postgres/Redis and
    // each file resets the DB in beforeAll, so parallelism would race.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    globalSetup: ["./test/global-setup.ts"],
    env: {
      DATABASE_URL: "postgresql://everhook:everhook_dev@localhost:5432/everhook_test",
      REDIS_URL: "redis://localhost:6379",
      NODE_ENV: "test",
      MOCK_STATE_FILE: "/tmp/everhook-test-mock-state.json",
      // Short delivery timeout so "timeout mode" tests don't wait 10s per attempt
      DELIVERY_TIMEOUT_MS: "1500",
      // Tests control MAX_ATTEMPTS explicitly per test via the poller's env read;
      // default here matches the demo worker for predictable DLQ timing.
      MAX_ATTEMPTS: "3",
      RATE_LIMIT_CAP: "100",
      RATE_LIMIT_REFILL_PER_SEC: "100",
    },
  },
});
