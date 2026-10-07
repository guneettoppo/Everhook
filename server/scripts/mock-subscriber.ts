import { createHmac, timingSafeEqual } from "node:crypto";
import http from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { MockMode } from "../src/routes/demo.js";

const port = Number(process.env.MOCK_PORT ?? 9000);
const MOCK_SECRET = process.env.MOCK_SECRET ?? "test-secret";
const STATE_FILE = resolve(process.env.MOCK_STATE_FILE ?? "mock-state.json");

function readMode(): MockMode {
  try {
    if (existsSync(STATE_FILE)) {
      const raw = JSON.parse(readFileSync(STATE_FILE, "utf8")) as { mode?: MockMode };
      if (raw.mode) return raw.mode;
    }
  } catch {
    // fall through
  }
  return "healthy";
}

function verifySignature(payload: string, header: string | undefined): boolean {
  if (!header?.startsWith("sha256=")) {
    return false;
  }
  const expected = Buffer.from(header.slice(7), "hex");
  const computed = createHmac("sha256", MOCK_SECRET).update(payload).digest("hex");
  const actual = Buffer.from(computed, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function handle(req: http.IncomingMessage, res: http.ServerResponse): void {
  const mode = readMode();
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", () => {
    const valid = verifySignature(body, req.headers["x-signature"] as string | undefined);
    console.log(
      `[mock] ${req.method} ${req.url} — mode=${mode} — signature ${valid ? "VALID" : "INVALID"}`,
    );

    switch (mode) {
      case "error500":
        console.log("[mock] responding HTTP 500 (simulated failure)");
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "simulated internal error" }));
        return;
      case "timeout":
        console.log("[mock] hanging (simulated timeout) — request will abort server-side");
        // Do nothing: never respond. The dispatcher's AbortSignal.timeout will fire.
        return;
      case "down":
        console.log("[mock] destroying socket (simulated down)");
        req.socket.destroy();
        return;
      case "healthy":
      default:
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ received: true, valid }));
        return;
    }
  });
}

const server = http.createServer(handle);
server.listen(port, () => {
  console.log(
    `[mock] subscriber listening on :${port} (secret: ${MOCK_SECRET}, state: ${STATE_FILE})`,
  );
});
