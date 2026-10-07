import { useCallback, useEffect, useState } from "react";
import { IconPlus, IconUsers } from "@tabler/icons-react";
import { motion } from "motion/react";
import { api } from "../api";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { FormField, TextInput } from "../components/FormField";
import { Cell } from "../components/ListRow";
import { SectionHeader } from "../components/SectionHeader";
import { SlidePanel } from "../components/SlidePanel";
import { StatusBadge } from "../components/StatusBadge";
import { TableList } from "../components/TableList";
import { fmtDate, fmtId } from "../utils";
import type { SubscriberRow } from "../types";

export default function Subscribers({ notify }: { notify: (m: string, ok: boolean) => void }) {
  const [subs, setSubs] = useState<SubscriberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [url, setUrl] = useState("");
  const [types, setTypes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.subscribers();
      setSubs(res.subscribers);
    } catch (e) {
      notify(String(e instanceof Error ? e.message : "Failed to load subscribers"), false);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const register = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        await api.registerSubscriber({
          url,
          event_types: types.split(",").map((t) => t.trim()).filter(Boolean),
        });
        notify("Subscriber registered", true);
        setOpen(false);
        setUrl("");
        setTypes("");
        load();
      } catch (err) {
        notify(String(err instanceof Error ? err.message : "Registration failed"), false);
      } finally {
        setSaving(false);
      }
    },
    [url, types, notify, load]
  );

  const columns = [
    { key: "id", width: "120px", children: "ID" },
    { key: "url", width: "2.5fr", children: "URL" },
    { key: "types", width: "1.5fr", children: "Event types" },
    { key: "status", width: "100px", align: "center" as const, children: "Status" },
    { key: "created", width: "130px", align: "right" as const, children: "Created" },
  ];

  const rows = subs.map((s) => ({
    key: s.id,
    cells: [
      <Cell key="id" mono muted>
        {fmtId(s.id)}
      </Cell>,
      <Cell key="url" truncate>
        {s.url}
      </Cell>,
      <div key="types" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {s.event_types.map((t) => (
          <span
            key={t}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.06)",
              color: "var(--fg-secondary)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {t}
          </span>
        ))}
      </div>,
      <div key="status" style={{ display: "flex", justifyContent: "center" }}>
        <StatusBadge status={s.status === "active" ? "active" : "inactive"} compact />
      </div>,
      <div key="created" style={{ textAlign: "right" }}>
        <Cell mono muted>
          {fmtDate(s.created_at)}
        </Cell>
      </div>,
    ],
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
      <SectionHeader
        title="Subscribers"
        subtitle="Webhook endpoints and event subscriptions"
        actionLabel="Register subscriber"
        onAction={() => setOpen(true)}
        icon={IconPlus}
      />

      <TableList
        rows={rows}
        columns={columns}
        isLoading={loading}
        emptyState={
          <EmptyState icon={IconUsers} title="No subscribers">
            Register a webhook endpoint to receive events.
          </EmptyState>
        }
      />

      <SlidePanel
        open={open}
        onClose={() => setOpen(false)}
        title="Register subscriber"
        subtitle="Add a webhook endpoint"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="sub-form" loading={saving} icon={IconPlus}>
              Register
            </Button>
          </>
        }
      >
        <form id="sub-form" onSubmit={register}>
          <FormField label="Webhook URL" hint="HTTPS endpoint that accepts POST">
            <TextInput value={url} onChange={setUrl} placeholder="https://api.example.com/webhooks" type="url" />
          </FormField>
          <FormField label="Event types" hint="Comma-separated list">
            <TextInput value={types} onChange={setTypes} placeholder="user.signup, order.created" />
          </FormField>
        </form>
      </SlidePanel>
    </motion.div>
  );
}
