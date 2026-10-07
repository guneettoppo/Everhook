import { useCallback, useEffect, useState } from "react";
import {
  IconActivity,
  IconBolt,
  IconCheck,
  IconClock,
  IconPlayerPlay,
  IconRotate,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { api } from "../api";
import { Button } from "../components/Button";
import { FormField, TextArea, TextInput } from "../components/FormField";
import { fmtId } from "../utils";
import type { DeliveryRow, MockMode } from "../types";

const MODES: { id: MockMode; label: string; hint: string; tone: "ok" | "warn" | "error" }[] = [
  { id: "healthy", label: "Healthy", hint: "responds 200", tone: "ok" },
  { id: "error500", label: "500 error", hint: "responds 500", tone: "error" },
  { id: "timeout", label: "Timeout", hint: "hangs forever", tone: "warn" },
  { id: "down", label: "Down", hint: "socket reset", tone: "error" },
];

const PRESETS = [
  { label: "payment.succeeded", payload: { order_id: "ord_101", amount: 990, currency: "usd" } },
  { label: "user.signup", payload: { user_id: "usr_42", email: "demo@everhook.dev", plan: "pro" } },
  { label: "order.shipped", payload: { order_id: "ord_102", tracking: "1Z999AA10123456784", carrier: "fedex" } },
];

const DEMO_SUBSCRIBER_URL = "http://localhost:9000/demo";

type Attempt = {
  attempt: number;
  http_status: number | null;
  error: string | null;
  delivered: boolean;
  created_at: string;
};

export default function Demo({ notify }: { notify: (m: string, ok: boolean) => void }) {
  const [mode, setMode] = useState<MockMode>("healthy");
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [attemptsByDelivery, setAttemptsByDelivery] = useState<Record<string, Attempt[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [eventType, setEventType] = useState("payment.succeeded");
  const [payload, setPayload] = useState(JSON.stringify(PRESETS[0].payload, null, 2));
  const [publishing, setPublishing] = useState(false);
  const [working, setWorking] = useState<string | null>(null);

  const loadMode = useCallback(async () => {
    try {
      const res = await api.mockMode();
      setMode(res.mode);
    } catch {
      /* server not ready */
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const [d, dlq] = await Promise.all([api.deliveries(), api.dlq()]);
      // Only show deliveries + dead letters for the demo subscriber — keeps the demo clean
      const demoDeliveries = d.deliveries.filter((x) => x.subscriber_url === DEMO_SUBSCRIBER_URL);
      const demoDeadLetters = dlq.dead_letters.filter((x) => x.subscriber_url === DEMO_SUBSCRIBER_URL);
      setDeliveries(demoDeliveries.slice(0, 20));
      setDeadLetters(demoDeadLetters);
    } catch {
      /* server not ready */
    }
  }, []);

  const [deadLetters, setDeadLetters] = useState<{ id: string; event_type: string; subscriber_url: string; last_error: string | null; queued_at: string }[]>([]);

  const refresh = useCallback(() => {
    void loadMode();
    void load();
  }, [loadMode, load]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [refresh]);

  // Ensure the demo subscriber exists (idempotent server-side setup — dedupes,
  // registers with the mock's secret so HMAC checks pass, resets mode to healthy).
  useEffect(() => {
    (async () => {
      try {
        await api.demoSetup();
        setTimeout(() => load(), 300);
      } catch {
        /* server not ready */
      }
    })();
  }, [load]);

  const setMockMode = useCallback(
    async (m: MockMode) => {
      try {
        await api.setMockMode(m);
        setMode(m);
        notify(`Mock subscriber → ${m}`, true);
      } catch (e) {
        notify(String(e instanceof Error ? e.message : "failed to set mode"), false);
      }
    },
    [notify],
  );

  const clearData = useCallback(async () => {
    try {
      const res = await api.resetDemo();
      setDeliveries([]);
      setDeadLetters([]);
      setAttemptsByDelivery({});
      setExpanded(new Set());
      notify(`Cleared ${res.cleared} demo deliveries`, true);
      setTimeout(() => load(), 300);
    } catch (e) {
      notify(String(e instanceof Error ? e.message : "failed to clear demo data"), false);
    }
  }, [notify, load]);

  const publish = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setPublishing(true);
      try {
        const body = JSON.parse(payload);
        const res = await api.publishEvent({ event_type: eventType, data: body });
        notify(`Event ${fmtId(res.event_id)} published`, true);
        setTimeout(() => load(), 500);
      } catch (err) {
        notify(String(err instanceof Error ? err.message : "invalid JSON"), false);
      } finally {
        setPublishing(false);
      }
    },
    [eventType, payload, notify, load],
  );

  const toggleExpand = useCallback(async (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      if (!attemptsByDelivery[id]) {
        try {
          const res = await api.deliveryAttempts(id);
          setAttemptsByDelivery((prev) => ({ ...prev, [id]: res.attempts }));
        } catch {
          setAttemptsByDelivery((prev) => ({ ...prev, [id]: [] }));
        }
      }
    }
    setExpanded(next);
  }, [expanded, attemptsByDelivery]);

  const replay = useCallback(
    async (id: string) => {
      setWorking(id);
      try {
        await api.replay(id);
        notify("Dead letter replayed — back to PENDING", true);
        setTimeout(() => load(), 300);
      } catch (e) {
        notify(String(e instanceof Error ? e.message : "replay failed"), false);
      } finally {
        setWorking(null);
      }
    },
    [notify, load],
  );

  const statusTone = (s: string) => {
    if (s === "DELIVERED") return { color: "var(--ok)", bg: "var(--ok-surface)", icon: IconCheck, label: "Delivered" };
    if (s === "PENDING") return { color: "var(--warn)", bg: "var(--warn-surface)", icon: IconClock, label: "Pending / retrying" };
    if (s === "FAILED") return { color: "var(--error)", bg: "var(--error-surface)", icon: IconX, label: "Failed" };
    if (s === "DLQ") return { color: "var(--info)", bg: "var(--info-surface)", icon: IconRotate, label: "Dead letter" };
    return { color: "var(--fg-tertiary)", bg: "rgba(255,255,255,0.04)", icon: IconActivity, label: s };
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
      <div style={{ marginBottom: 22, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div className="display" style={{ fontSize: 20, fontWeight: 600, color: "var(--fg)", letterSpacing: -0.3 }}>
            Live Demo
          </div>
          <div style={{ fontSize: 13, color: "var(--fg-tertiary)", marginTop: 4, maxWidth: 640, lineHeight: 1.5 }}>
            Break the subscriber, watch the machine fix it. Publish an event → attempt timeline shows each retry with
            exponential backoff → exhausted deliveries land in the DLQ → flip back to healthy and replay.
          </div>
        </div>
        <Button variant="secondary" size="sm" icon={IconTrash} onClick={clearData}>
          Clear demo data
        </Button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          gap: 18,
          alignItems: "start",
        }}
      >
        {/* Left column: controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Mock mode */}
          <div
            style={{
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
              padding: 18,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.06, color: "var(--fg-tertiary)", marginBottom: 12 }}>
              Mock subscriber health
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {MODES.map((m) => {
                const active = mode === m.id;
                const tone = m.tone;
                const color = tone === "ok" ? "var(--ok)" : tone === "warn" ? "var(--warn)" : "var(--error)";
                return (
                  <button
                    key={m.id}
                    onClick={() => setMockMode(m.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${active ? color : "var(--border)"}`,
                      backgroundColor: active ? (tone === "ok" ? "var(--ok-surface)" : tone === "warn" ? "var(--warn-surface)" : "var(--error-surface)") : "transparent",
                      color: active ? color : "var(--fg-secondary)",
                      transition: "all var(--duration-fast)",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: active ? color : "var(--fg-muted)", flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: 13.5, flex: 1 }}>{m.label}</span>
                    <span style={{ fontSize: 11, color: active ? color : "var(--fg-tertiary)" }}>{m.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Publish */}
          <form
            onSubmit={publish}
            style={{
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
              padding: 18,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.06, color: "var(--fg-tertiary)", marginBottom: 12 }}>
              Publish event
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setEventType(p.label);
                    setPayload(JSON.stringify(p.payload, null, 2));
                  }}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: "4px 9px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-elevated)",
                    color: "var(--fg-secondary)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <FormField label="Event type">
              <TextInput value={eventType} onChange={setEventType} placeholder="payment.succeeded" />
            </FormField>
            <FormField label="Payload (JSON)">
              <TextArea value={payload} onChange={setPayload} rows={6} />
            </FormField>
            <Button type="submit" loading={publishing} icon={IconPlayerPlay} fullWidth>
              Publish event
            </Button>
          </form>
        </div>

        {/* Right column: live feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          {/* Deliveries */}
          <div
            style={{
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "var(--bg-elevated)",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.06, color: "var(--fg-tertiary)" }}>
                Delivery feed
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ok)", fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--ok)", boxShadow: "0 0 8px var(--ok)" }} />
                live
              </span>
            </div>

            {deliveries.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--fg-tertiary)", fontSize: 13 }}>
                No deliveries yet. Publish an event to start the machine.
              </div>
            ) : (
              <div>
                {deliveries.map((d, i) => {
                  const st = statusTone(d.status);
                  const StIcon = st.icon;
                  const isOpen = expanded.has(d.id);
                  const attempts = attemptsByDelivery[d.id];
                  return (
                    <div key={d.id} style={{ borderBottom: i === deliveries.length - 1 ? "none" : "1px solid var(--divider)" }}>
                      <button
                        onClick={() => toggleExpand(d.id)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "13px 16px",
                          backgroundColor: "transparent",
                          transition: "background-color var(--duration-fast)",
                          textAlign: "left",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <span
                          style={{
                            display: "grid",
                            placeItems: "center",
                            width: 26,
                            height: 26,
                            borderRadius: 8,
                            flexShrink: 0,
                            backgroundColor: st.bg,
                            color: st.color,
                          }}
                        >
                          <StIcon size={14} stroke={2} />
                        </span>
                        <span className="mono" style={{ fontSize: 11, color: "var(--fg-tertiary)", flexShrink: 0 }}>
                          {fmtId(d.id)}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{d.event_type}</span>
                        <span style={{ fontSize: 12, color: "var(--fg-tertiary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {d.subscriber_url}
                        </span>
                        <span style={{ fontSize: 11.5, color: st.color, fontWeight: 600, flexShrink: 0 }}>
                          {st.label} · {d.attempts} attempt{d.attempts === 1 ? "" : "s"}
                        </span>
                        <IconBolt size={13} stroke={1.5} color={isOpen ? "var(--fg)" : "var(--fg-muted)"} style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 150ms" }} />
                      </button>

                      {isOpen && (
                        <div style={{ padding: "0 16px 14px 54px" }}>
                          {!attempts ? (
                            <div style={{ padding: "12px 0", color: "var(--fg-tertiary)", fontSize: 12 }}>Loading attempts…</div>
                          ) : attempts.length === 0 ? (
                            <div style={{ padding: "12px 0", color: "var(--fg-tertiary)", fontSize: 12 }}>
                              No attempt records yet (delivery created, waiting for first attempt).
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {attempts.map((a) => {
                                const ok = a.delivered;
                                return (
                                  <div
                                    key={a.attempt}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 10,
                                      padding: "8px 10px",
                                      borderRadius: 8,
                                      backgroundColor: "var(--bg-elevated)",
                                      border: `1px solid ${ok ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)"}`,
                                      fontSize: 12,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 10.5,
                                        fontWeight: 700,
                                        padding: "2px 7px",
                                        borderRadius: 999,
                                        backgroundColor: ok ? "var(--ok-surface)" : "var(--error-surface)",
                                        color: ok ? "var(--ok)" : "var(--error)",
                                        flexShrink: 0,
                                        fontFamily: "var(--font-mono)",
                                      }}
                                    >
                                      #{a.attempt}
                                    </span>
                                    <span style={{ color: ok ? "var(--ok)" : "var(--error)", fontWeight: 600, flexShrink: 0 }}>
                                      {ok ? "delivered" : a.http_status ? `HTTP ${a.http_status}` : "failed"}
                                    </span>
                                    {a.error && (
                                      <span style={{ color: "var(--fg-tertiary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                                        {a.error}
                                      </span>
                                    )}
                                    <span style={{ color: "var(--fg-muted)", fontSize: 10.5, flexShrink: 0, fontFamily: "var(--font-mono)" }}>
                                      {new Date(a.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                    </span>
                                  </div>
                                );
                              })}
                              <div style={{ fontSize: 10.5, color: "var(--fg-muted)", marginTop: 2 }}>
                                Exponential backoff: 1s → 5s → 30s → 2m → 10m → 1h → 6h (±20% jitter). Max 8 attempts.
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dead letters */}
          {deadLetters.length > 0 && (
            <div
              style={{
                borderRadius: "var(--radius-lg)",
                border: "1px solid rgba(148,163,184,0.2)",
                backgroundColor: "var(--info-surface)",
                padding: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <IconRotate size={16} stroke={1.5} color="var(--info)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
                  {deadLetters.length} dead letter{deadLetters.length === 1 ? "" : "s"} — replay to recover
                </span>
              </div>
              {deadLetters.map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 8,
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    marginBottom: 6,
                  }}
                >
                  <span className="mono" style={{ fontSize: 11, color: "var(--fg-tertiary)", flexShrink: 0 }}>
                    {fmtId(d.id)}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, flexShrink: 0 }}>{d.event_type}</span>
                  <span style={{ fontSize: 11.5, color: "var(--fg-tertiary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.last_error ?? "no error"}
                  </span>
                  <Button size="sm" variant="secondary" icon={IconRotate} loading={working === d.id} onClick={() => replay(d.id)}>
                    Replay
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
