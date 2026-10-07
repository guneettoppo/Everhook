import { Redis } from "ioredis";
import { loadConfig } from "../config.js";

const config = loadConfig();

const RATE_LIMIT_CAP = Number(process.env.RATE_LIMIT_CAP ?? 5);
const RATE_LIMIT_REFILL_PER_SEC = Number(process.env.RATE_LIMIT_REFILL_PER_SEC ?? 2);

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

const TAKE_TOKEN_SCRIPT = `
local key = KEYS[1]
local cap = tonumber(ARGV[1])
local refillPerSec = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local tokens = tonumber(redis.call("GET", key) or "-1")
if tokens < 0 then
  tokens = cap
end

local last = tonumber(redis.call("GET", key .. ":ts") or tostring(now))
local elapsed = math.max(0, now - last)
tokens = math.min(cap, tokens + elapsed * refillPerSec)

if tokens >= 1 then
  redis.call("SET", key, tokens - 1)
  redis.call("SET", key .. ":ts", now)
  return 1
else
  redis.call("SET", key, tokens)
  redis.call("SET", key .. ":ts", now)
  return 0
end
`;

export async function tryTakeToken(subscriberId: string): Promise<boolean> {
  try {
    const key = `rl:${subscriberId}`;
    const now = Math.floor(Date.now() / 1000);
    const result = await redis.eval(
      TAKE_TOKEN_SCRIPT,
      1,
      key,
      String(RATE_LIMIT_CAP),
      String(RATE_LIMIT_REFILL_PER_SEC),
      String(now),
    );
    return result === 1;
  } catch (err) {
    console.error("[rate-limiter] redis unavailable, failing open:", err);
    return true;
  }
}
