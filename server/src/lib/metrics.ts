/**
 * Prometheus-format metrics, backed by Redis so the API and worker processes
 * share the same counters. Served at GET /metrics by the API.
 *
 * Counters are INCR'd via Redis; the histogram is kept in-process on the
 * worker (retry backoff is only meaningful where retries are scheduled) and
 * snapshot into Redis periodically.
 */
import { redis } from "./rate-limiter.js";

const PREFIX = "eh:metrics:";

const COUNTERS = [
  "events_published",
  "deliveries_created",
  "delivered",
  "failed",
  "exhausted",
  "replayed",
] as const;

export type MetricCounter = (typeof COUNTERS)[number];

/** Increment a shared counter by 1 (fire-and-forget; Redis is loss-tolerant here). */
export function incrMetric(name: MetricCounter, by = 1): void {
  redis.incrby(`${PREFIX}${name}`, by).catch(() => {
    /* metrics must never break the pipeline */
  });
}

/** Read all shared counters. */
export async function readMetrics(): Promise<Record<MetricCounter, number>> {
  const keys = COUNTERS.map((c) => `${PREFIX}${c}`);
  const values = await redis.mget(keys);
  const out = {} as Record<MetricCounter, number>;
  COUNTERS.forEach((c, i) => {
    out[c] = Number(values[i] ?? 0);
  });
  return out;
}

/** Reset counters (used by tests). */
export async function resetMetrics(): Promise<void> {
  await redis.del(...COUNTERS.map((c) => `${PREFIX}${c}`));
  await redis.del(`${PREFIX}retry_histogram`);
}

// Retry backoff histogram — Redis hash: bucket index (seconds) -> count
export const RETRY_BUCKETS = [1, 5, 30, 120, 600, 3600, 21600];

export function recordRetryDelayMs(delayMs: number): void {
  const sec = delayMs / 1000;
  let bucket = RETRY_BUCKETS.length - 1;
  for (let i = 0; i < RETRY_BUCKETS.length; i++) {
    if (sec <= RETRY_BUCKETS[i]) {
      bucket = i;
      break;
    }
  }
  redis.hincrby(`${PREFIX}retry_histogram`, String(bucket), 1).catch(() => {});
}

async function readRetryHistogram(): Promise<number[]> {
  const raw = await redis.hgetall(`${PREFIX}retry_histogram`);
  return RETRY_BUCKETS.map((_, i) => Number(raw[String(i)] ?? 0));
}

export function metricsText(): Promise<string> {
  return Promise.all([readMetrics(), readRetryHistogram()]).then(([m, hist]) => {
    const lines: string[] = [];
    const push = (name: string, value: number, help: string) => {
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name} ${value}`);
    };

    push("everhook_events_published_total", m.events_published, "Events published via API");
    push("everhook_deliveries_created_total", m.deliveries_created, "Delivery rows created by fan-out");
    push("everhook_deliveries_delivered_total", m.delivered, "Successful 2xx deliveries");
    push("everhook_deliveries_failed_total", m.failed, "Failed delivery attempts (non-2xx/error)");
    push("everhook_deliveries_exhausted_total", m.exhausted, "Deliveries moved to DLQ after max attempts");
    push("everhook_deliveries_replayed_total", m.replayed, "Dead letters replayed");

    // Retry backoff histogram
    lines.push("# HELP everhook_retry_delay_seconds Retry backoff delay bucket (attempt-to-attempt)");
    lines.push("# TYPE everhook_retry_delay_seconds histogram");
    let cumulative = 0;
    RETRY_BUCKETS.forEach((bucket, i) => {
      cumulative += hist[i];
      lines.push(`everhook_retry_delay_seconds_bucket{le="${bucket}"} ${cumulative}`);
    });
    lines.push(`everhook_retry_delay_seconds_bucket{le="+Inf"} ${cumulative}`);
    lines.push(`everhook_retry_delay_seconds_count ${cumulative}`);

    // Process health (API process)
    lines.push("# HELP everhook_process_uptime_seconds Process uptime");
    lines.push("# TYPE everhook_process_uptime_seconds gauge");
    lines.push(`everhook_process_uptime_seconds ${Math.floor(process.uptime())}`);
    lines.push("# HELP everhook_process_memory_bytes RSS in bytes");
    lines.push("# TYPE everhook_process_memory_bytes gauge");
    lines.push(`everhook_process_memory_bytes ${process.memoryUsage().rss}`);

    return lines.join("\n") + "\n";
  });
}
