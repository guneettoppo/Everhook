import { useCallback, useEffect, useState } from "react";
import { IconInbox, IconPlus } from "@tabler/icons-react";
import { motion } from "motion/react";
import { api } from "../api";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { FormField, TextArea, TextInput } from "../components/FormField";
import { Cell } from "../components/ListRow";
import { SectionHeader } from "../components/SectionHeader";
import { SlidePanel } from "../components/SlidePanel";
import { TableList } from "../components/TableList";
import { fmtDate, fmtId, fmtPayload } from "../utils";
import type { EventRow } from "../types";

export default function Events({ notify }: { notify: (m: string, ok: boolean) => void }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [eventType, setEventType] = useState("");
  const [payload, setPayload] = useState("");
  const [key, setKey] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.events();
      setEvents(res.events);
    } catch (e) {
      notify(String(e instanceof Error ? e.message : "Failed to load events"), false);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const publish = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        let body;
        try {
          body = payload ? JSON.parse(payload) : {};
        } catch {
          notify("Payload is not valid JSON", false);
          setSaving(false);
          return;
        }
        await api.publishEvent({
          event_type: eventType,
          payload: body,
          idempotency_key: key || undefined,
        });
        notify("Event published", true);
        setOpen(false);
        setEventType("");
        setPayload("");
        setKey("");
        load();
      } catch (err) {
        notify(String(err instanceof Error ? err.message : "Publish failed"), false);
      } finally {
        setSaving(false);
      }
    },
    [eventType, payload, key, notify, load]
  );

  const columns = [
    { key: "id", width: "120px", children: "ID" },
    { key: "type", width: "1fr", children: "Type" },
    { key: "payload", width: "2.5fr", children: "Payload" },
    { key: "created", width: "160px", align: "right" as const, children: "Created" },
  ];

  const rows = events.map((ev) => ({
    key: ev.id,
    cells: [
      <Cell key="id" mono muted>
        {fmtId(ev.id)}
      </Cell>,
      <Cell key="type">{ev.event_type}</Cell>,
      <Cell key="payload" mono muted>
        {fmtPayload(ev.payload)}
      </Cell>,
      <div key="created" style={{ textAlign: "right" }}>
        <Cell mono muted>
          {fmtDate(ev.created_at)}
        </Cell>
      </div>,
    ],
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
      <SectionHeader
        title="Events"
        subtitle="Published events waiting to be delivered"
        actionLabel="Publish event"
        onAction={() => setOpen(true)}
        icon={IconPlus}
      />

      <TableList
        rows={rows}
        columns={columns}
        isLoading={loading}
        emptyState={
          <EmptyState icon={IconInbox} title="No events yet">
            Publish your first event to start the delivery pipeline.
          </EmptyState>
        }
      />

      <SlidePanel
        open={open}
        onClose={() => setOpen(false)}
        title="Publish event"
        subtitle="Add a new event to the outbox"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="publish-form" loading={saving} icon={IconPlus}>
              Publish
            </Button>
          </>
        }
      >
        <form id="publish-form" onSubmit={publish}>
          <FormField label="Event type" hint="e.g. order.created">
            <TextInput value={eventType} onChange={setEventType} placeholder="user.signup" />
          </FormField>
          <FormField label="Payload" hint="Valid JSON object">
            <TextArea value={payload} onChange={setPayload} placeholder='{"id": 1, "email": "a@b.com"}' rows={8} />
          </FormField>
          <FormField label="Idempotency key" hint="Optional, prevents duplicates">
            <TextInput value={key} onChange={setKey} placeholder="uuid-or-correlation-id" />
          </FormField>
        </form>
      </SlidePanel>
    </motion.div>
  );
}
