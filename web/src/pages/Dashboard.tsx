import { useCallback, useEffect, useState } from "react";
import { IconActivity, IconCheck, IconInbox, IconUsers } from "@tabler/icons-react";
import { motion } from "motion/react";
import { api } from "../api";
import { Cell } from "../components/ListRow";
import { MetricCard } from "../components/MetricCard";
import { SectionHeader } from "../components/SectionHeader";
import { StatusBadge } from "../components/StatusBadge";
import { TableList } from "../components/TableList";
import { fmtDate, fmtId } from "../utils";
import type { DeliveryRow, Stats } from "../types";

function statusOf(s: string): "delivered" | "pending" | "failed" | "retrying" {
  if (s === "delivered") return "delivered";
  if (s === "pending") return "pending";
  if (s === "failed") return "failed";
  return "retrying";
}

export default function Dashboard({
  notify,
  onRefresh,
}: {
  notify: (m: string, ok: boolean) => void;
  onRefresh: () => void;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([api.stats(), api.deliveries()]);
      setStats(s);
      setDeliveries(d.deliveries.slice(0, 8));
      onRefresh();
    } catch (e) {
      notify(String(e instanceof Error ? e.message : "Failed to load dashboard"), false);
    } finally {
      setLoading(false);
    }
  }, [notify, onRefresh]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const delivered = stats?.deliveries_by_status?.delivered ?? 0;
  const failed = stats?.deliveries_by_status?.failed ?? 0;
  const pending = stats?.deliveries_by_status?.pending ?? 0;

  const columns = [
    { key: "id", width: "140px", children: "ID" },
    { key: "event", width: "1.4fr", children: "Event" },
    { key: "subscriber", width: "2fr", children: "Subscriber" },
    { key: "status", width: "110px", align: "center" as const, children: "Status" },
    { key: "attempts", width: "80px", align: "right" as const, children: "Attempts" },
    { key: "created", width: "130px", align: "right" as const, children: "Created" },
  ];

  const rows = deliveries.map((d) => ({
    key: d.id,
    cells: [
      <Cell key="id" mono muted>
        {fmtId(d.id)}
      </Cell>,
      <Cell key="event">{d.event_type}</Cell>,
      <Cell key="sub" truncate muted>
        {d.subscriber_url}
      </Cell>,
      <div key="status" style={{ display: "flex", justifyContent: "center" }}>
        <StatusBadge status={statusOf(d.status)} compact />
      </div>,
      <div key="att" style={{ textAlign: "right" }}>
        <Cell mono>{d.attempts}</Cell>
      </div>,
      <div key="created" style={{ textAlign: "right" }}>
        <Cell mono muted>
          {fmtDate(d.created_at)}
        </Cell>
      </div>,
    ],
  }));

  return (
    <div style={{ position: "relative", minHeight: "100%" }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 18,
            marginBottom: 28,
          }}
        >
          <MetricCard
            label="Events"
            value={stats?.events ?? 0}
            icon={IconInbox}
            trend="Published to the outbox"
            isLoading={loading}
          />
          <MetricCard
            label="Subscribers"
            value={stats?.subscribers ?? 0}
            icon={IconUsers}
            trend="Active webhook endpoints"
            isLoading={loading}
          />
          <MetricCard
            label="Delivered"
            value={delivered}
            icon={IconCheck}
            trend={pending > 0 ? `${pending} pending right now` : "All caught up"}
            isLoading={loading}
          />
          <MetricCard
            label="Failed"
            value={failed}
            icon={IconActivity}
            trend={`${stats?.dead_letters ?? 0} dead letters`}
            isLoading={loading}
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
      >
        <SectionHeader title="Recent deliveries" subtitle="Latest webhook attempts across all subscribers" />
        <TableList rows={rows} columns={columns} isLoading={loading} />
      </motion.div>
    </div>
  );
}
