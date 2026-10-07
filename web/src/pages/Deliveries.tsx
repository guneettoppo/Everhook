import { useCallback, useEffect, useState } from "react";
import { IconSend } from "@tabler/icons-react";
import { motion } from "motion/react";
import { api } from "../api";
import { EmptyState } from "../components/EmptyState";
import { Cell } from "../components/ListRow";
import { SectionHeader } from "../components/SectionHeader";
import { StatusBadge } from "../components/StatusBadge";
import { TableList } from "../components/TableList";
import { fmtDate, fmtId } from "../utils";
import type { DeliveryRow } from "../types";

function statusOf(s: string): "delivered" | "pending" | "failed" | "retrying" {
  if (s === "delivered") return "delivered";
  if (s === "pending") return "pending";
  if (s === "failed") return "failed";
  return "retrying";
}

export default function Deliveries({ notify }: { notify: (m: string, ok: boolean) => void }) {
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.deliveries();
      setDeliveries(res.deliveries);
    } catch (e) {
      notify(String(e instanceof Error ? e.message : "Failed to load deliveries"), false);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    { key: "id", width: "120px", children: "Delivery" },
    { key: "event", width: "1fr", children: "Event" },
    { key: "subscriber", width: "2.5fr", children: "Subscriber" },
    { key: "status", width: "110px", align: "center" as const, children: "Status" },
    { key: "attempts", width: "90px", align: "right" as const, children: "Attempts" },
    { key: "http", width: "90px", align: "right" as const, children: "HTTP" },
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
      <div key="http" style={{ textAlign: "right" }}>
        <Cell mono muted>
          {d.last_http_status ?? "—"}
        </Cell>
      </div>,
      <div key="created" style={{ textAlign: "right" }}>
        <Cell mono muted>
          {fmtDate(d.created_at)}
        </Cell>
      </div>,
    ],
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
      <SectionHeader title="Deliveries" subtitle="Every event × subscriber attempt" />

      <TableList
        rows={rows}
        columns={columns}
        isLoading={loading}
        emptyState={
          <EmptyState icon={IconSend} title="No deliveries yet">
            Publish an event and register a subscriber to generate deliveries.
          </EmptyState>
        }
      />
    </motion.div>
  );
}
