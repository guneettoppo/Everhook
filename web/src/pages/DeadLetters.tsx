import { useCallback, useEffect, useState } from "react";
import { IconAlertOctagon, IconRotate } from "@tabler/icons-react";
import { motion } from "motion/react";
import { api } from "../api";
import { Button } from "../components/Button";
import { Cell } from "../components/ListRow";
import { EmptyState } from "../components/EmptyState";
import { SectionHeader } from "../components/SectionHeader";
import { TableList } from "../components/TableList";
import { fmtDate, fmtId } from "../utils";
import type { DeadLetterRow } from "../types";

export default function DeadLetters({ notify }: { notify: (m: string, ok: boolean) => void }) {
  const [rows, setRows] = useState<DeadLetterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.dlq();
      setRows(res.dead_letters);
    } catch (e) {
      notify(String(e instanceof Error ? e.message : "Failed to load dead letters"), false);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const replay = useCallback(
    async (id: string) => {
      setWorking(id);
      try {
        await api.replay(id);
        notify("Dead letter replayed", true);
        load();
      } catch (e) {
        notify(String(e instanceof Error ? e.message : "Replay failed"), false);
      } finally {
        setWorking(null);
      }
    },
    [notify, load]
  );

  const columns = [
    { key: "id", width: "120px", children: "DLQ" },
    { key: "event", width: "1fr", children: "Event" },
    { key: "subscriber", width: "2.5fr", children: "Subscriber" },
    { key: "attempts", width: "90px", align: "right" as const, children: "Attempts" },
    { key: "queued", width: "130px", align: "right" as const, children: "Queued" },
    { key: "action", width: "110px", align: "right" as const, children: "Action" },
  ];

  const tableRows = rows.map((r) => ({
    key: r.id,
    cells: [
      <Cell key="id" mono muted>
        {fmtId(r.id)}
      </Cell>,
      <Cell key="event">{r.event_type}</Cell>,
      <Cell key="sub" truncate muted>
        {r.subscriber_url}
      </Cell>,
      <div key="att" style={{ textAlign: "right" }}>
        <Cell mono>{r.attempts}</Cell>
      </div>,
      <div key="queued" style={{ textAlign: "right" }}>
        <Cell mono muted>
          {fmtDate(r.queued_at)}
        </Cell>
      </div>,
      <div key="action" style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          size="sm"
          variant="secondary"
          icon={IconRotate}
          loading={working === r.id}
          onClick={() => replay(r.id)}
        >
          Replay
        </Button>
      </div>,
    ],
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
      <SectionHeader title="Dead Letters" subtitle="Exhausted retries awaiting replay" />

      <TableList
        rows={tableRows}
        columns={columns}
        isLoading={loading}
        emptyState={
          <EmptyState icon={IconAlertOctagon} title="No dead letters">
            Everything is being delivered successfully.
          </EmptyState>
        }
      />
    </motion.div>
  );
}
