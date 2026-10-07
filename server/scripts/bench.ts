/**
 * Everhook benchmark - publish throughput (autocannon) + metrics snapshot.
 * Delivery throughput is visible in /metrics (worker counter, Redis-backed).
 *
 * Usage:
 *   npm run bench            publish + metrics
 *   N_EVENTS=... npm run bench
 */
import autocannon from "autocannon";

const API = process.env.API_URL ?? "http://localhost:3000";
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 10);

type MetricRow = {
  name: string;
  labels: Record<string, string>;
  value: number;
};

const COUNTER_ROWS: ReadonlyArray<readonly [string, string]> = [
  ["events_published_total", "Events published"],
  ["deliveries_created_total", "Deliveries created"],
  ["deliveries_delivered_total", "Deliveries delivered"],
  ["deliveries_failed_total", "Deliveries failed"],
  ["deliveries_exhausted_total", "Deliveries exhausted"],
  ["deliveries_replayed_total", "Deliveries replayed"],
];

const BUCKET_LABELS: Record<string, string> = {
  "1": "<= 1s",
  "5": "<= 5s",
  "30": "<= 30s",
  "120": "<= 2m",
  "600": "<= 10m",
  "3600": "<= 1h",
  "21600": "<= 6h",
  "+Inf": "+Inf",
};

const LABEL_WIDTH = 26;

function row(label: string, value: string): string {
  return `  ${label.padEnd(LABEL_WIDTH)}${value}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${Math.floor(totalSeconds % 60)}s`;
  return `${Math.floor(totalSeconds)}s`;
}

function parseMetricRows(text: string): MetricRow[] {
  const rows: MetricRow[] = [];
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{([^}]*)\})?\s+(.+)$/);
    if (!match) continue;

    const labels: Record<string, string> = {};
    if (match[2]) {
      const labelRe = /([a-zA-Z_:][a-zA-Z0-9_:]*)="([^"]*)"/g;
      let labelMatch: RegExpExecArray | null;
      while ((labelMatch = labelRe.exec(match[2])) !== null) {
        labels[labelMatch[1]] = labelMatch[2];
      }
    }

    rows.push({ name: match[1], labels, value: Number(match[3]) });
  }
  return rows;
}

export function formatMetricsText(text: string): string {
  const rows = parseMetricRows(text);
  const value = (name: string) =>
    rows.find((r) => r.name === name && Object.keys(r.labels).length === 0)?.value ?? 0;

  const lines: string[] = ["── Metrics snapshot ──"];
  for (const [suffix, label] of COUNTER_ROWS) {
    lines.push(row(label, formatNumber(value(`everhook_${suffix}`))));
  }

  const buckets = rows.filter((r) => r.name === "everhook_retry_delay_seconds_bucket");
  const retryCount = value("everhook_retry_delay_seconds_count");
  if (buckets.length > 0 || retryCount > 0) {
    lines.push("", "── Retry backoff histogram (cumulative) ──");
    for (const bucket of buckets) {
      const label = BUCKET_LABELS[bucket.labels.le ?? ""] ?? bucket.labels.le ?? "unknown";
      lines.push(row(label, formatNumber(bucket.value)));
    }
    lines.push(row("Total retries", formatNumber(retryCount)));
  }

  const uptime = value("everhook_process_uptime_seconds");
  const memory = value("everhook_process_memory_bytes");
  if (uptime > 0 || memory > 0) {
    lines.push("", "── Process ──");
    if (uptime > 0) lines.push(row("Uptime", formatDuration(uptime)));
    if (memory > 0) lines.push(row("Memory", formatBytes(memory)));
  }

  return lines.join("\n");
}

async function main() {
  await fetch(`${API}/api/v1/demo/setup`, { method: "POST" });

  console.log(`── Publish throughput (${CONCURRENCY} concurrent, 5s) ──`);
  const r = await new Promise<autocannon.Result>((resolve, reject) => {
    const inst = autocannon({
      url: `${API}/api/v1/events`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // payment.succeeded is registered on the demo subscriber - ensures fan-out
      body: JSON.stringify({ event_type: "payment.succeeded", data: { i: 0 } }),
      connections: CONCURRENCY,
      duration: 5,
    });
    inst.on("done", resolve);
    inst.on("error", reject);
  });

  console.log(row("req/s", formatNumber(Math.round(r.requests.average))));
  console.log(row("total requests", formatNumber(r.requests.total)));
  console.log(row("latency avg", `${r.latency.average.toFixed(1)}ms`));
  console.log(row("latency p50", `${r.latency.p50.toFixed(1)}ms`));
  console.log(row("latency p99", `${r.latency.p99_9.toFixed(1)}ms`));

  const m = await fetch(`${API}/metrics`).then((res) => res.text());
  console.log(`\n${formatMetricsText(m)}`);
  process.exit(0);
}

const isEntrypoint =
  process.argv[1] && import.meta.url.endsWith(new URL(`file://${process.argv[1]}`).pathname);

if (isEntrypoint) {
  void main();
}
