import { useRef, useState } from "react";
import { FiInfo, FiMail, FiRotateCcw, FiSave, FiSend } from "react-icons/fi";
import { errorMessage } from "../../lib/api";
import {
  useNotificationLog,
  useNotificationTemplates,
  useSaveTemplate,
  useSendTestTemplate,
} from "../api/notifications";
import Badge, { type Tone } from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Input, TextArea } from "../components/Field";
import PageHeader from "../components/PageHeader";
import { ErrorNotice, Loading, LoadingRow } from "../components/QueryState";
import { FOCUS_RING } from "../components/styles";
import { EmptyRow, Table, Td, Th } from "../components/Table";
import { useToast } from "../components/toastContext";
import Toggle from "../components/Toggle";
import type { NotificationLogEntry, NotificationTemplate, TemplateChanges } from "../types";
import { fillTemplate, formatDateTime } from "../utils/format";

const SEND_STATUS: Record<NotificationLogEntry["status"], { tone: Tone; label: string }> = {
  sent: { tone: "success", label: "Sent" },
  failed: { tone: "danger", label: "Failed" },
  skipped: { tone: "neutral", label: "Skipped" },
};

export default function NotificationTemplates() {
  const templates = useNotificationTemplates();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (templates.isPending) return <Loading label="Loading templates…" />;
  if (templates.isError) {
    return <ErrorNotice title="Couldn't load templates" error={templates.error} onRetry={() => void templates.refetch()} />;
  }

  const { templates: list, email_configured, variables } = templates.data;
  const selected = list.find((t) => t.id === selectedId) ?? list[0];

  return (
    <>
      <PageHeader
        title="Notification Templates"
        description="The emails customers get when something happens to their order. Orders without a signed-in customer (most walk-ins) have no one to email."
      />

      {!email_configured && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-sky-50 px-5 py-4 text-sm text-sky-900 ring-1 ring-sky-200">
          <FiInfo aria-hidden className="mt-0.5 size-5 shrink-0" />
          <p>
            <span className="font-semibold">Email isn't set up yet.</span> Templates can be edited, but nothing is sent
            until <code>RESEND_API_KEY</code> and <code>NOTIFY_FROM</code> are set in the backend's environment.
            Orders go through either way.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Card flush title="Templates" className="h-fit">
          <ul className="divide-y divide-(--admin-line)">
            {list.map((template) => {
              const active = template.id === selected?.id;
              return (
                <li key={template.id}>
                  <button
                    type="button"
                    aria-current={active || undefined}
                    onClick={() => setSelectedId(template.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${FOCUS_RING} ${
                      active ? "bg-(--admin-gold)/10" : "hover:bg-(--admin-canvas)/60"
                    }`}
                  >
                    <FiMail aria-hidden className="size-4 shrink-0 text-(--admin-muted)" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{template.name}</span>
                      <span className="block text-xs text-(--admin-muted)">
                        <code>{template.event}</code>
                      </span>
                    </span>
                    {!template.enabled && <Badge>Off</Badge>}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Keyed so the draft resets when another template is picked. */}
        {selected && <TemplateEditor key={selected.id} template={selected} variables={variables} />}
      </div>

      <RecentSends />
    </>
  );
}

const editable = (t: NotificationTemplate): TemplateChanges => ({
  name: t.name,
  subject: t.subject,
  body: t.body,
  enabled: t.enabled,
});

function TemplateEditor({ template, variables }: { template: NotificationTemplate; variables: Record<string, string> }) {
  const notify = useToast();
  const save = useSaveTemplate();
  const sendTest = useSendTestTemplate();
  const [draft, setDraft] = useState<TemplateChanges>(() => editable(template));
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(editable(template));
  const preview = { subject: fillTemplate(draft.subject, variables), body: fillTemplate(draft.body, variables) };

  const insertVariable = (name: string) => {
    const token = `{{${name}}}`;
    const el = bodyRef.current;
    const start = el?.selectionStart ?? draft.body.length;
    const end = el?.selectionEnd ?? draft.body.length;
    setDraft((d) => ({ ...d, body: d.body.slice(0, start) + token + d.body.slice(end) }));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const submit = () =>
    save.mutate(
      { id: template.id, changes: draft },
      {
        onSuccess: (saved) => notify(`"${saved.name}" template saved.`),
        onError: (error) => notify(errorMessage(error), "error"),
      },
    );

  const test = () =>
    sendTest.mutate(template.id, {
      onSuccess: (result) => {
        if (result.status === "sent") notify(`Test email sent to ${result.recipient}.`);
        else if (result.status === "skipped") notify(`Not sent: ${result.error}`, "info");
        else notify(`Test email failed: ${result.error}`, "error");
      },
      onError: (error) => notify(errorMessage(error), "error"),
    });

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 2xl:grid-cols-2">
      <Card
        title={template.name}
        description={
          <>
            Sent on <code>{template.event}</code>
          </>
        }
        actions={
          <Toggle
            hideLabel
            label="Template enabled"
            checked={draft.enabled}
            onChange={(enabled) => setDraft((d) => ({ ...d, enabled }))}
          />
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Template name">
            <Input maxLength={100} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </Field>
          <Field label="Subject">
            <Input maxLength={200} value={draft.subject} onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))} />
          </Field>
          <Field label="Message">
            <TextArea
              ref={bodyRef}
              rows={9}
              maxLength={5000}
              value={draft.body}
              onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
              className="font-mono text-xs leading-relaxed"
            />
          </Field>
          <div>
            <p className="mb-1.5 text-xs font-medium">Insert variable</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(variables).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  className={`rounded-md bg-(--admin-canvas) px-2 py-1 font-mono text-[11px] ring-1 ring-(--admin-line) hover:bg-(--admin-gold)/15 ${FOCUS_RING}`}
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-(--admin-line) pt-4">
            {dirty && <p className="mr-auto text-xs text-(--admin-muted)">Save first: tests send the saved version.</p>}
            <Button icon={FiRotateCcw} disabled={!dirty || save.isPending} onClick={() => setDraft(editable(template))}>
              Discard
            </Button>
            <Button icon={FiSend} disabled={dirty || sendTest.isPending} onClick={test}>
              {sendTest.isPending ? "Sending…" : "Send test"}
            </Button>
            <Button variant="primary" icon={FiSave} disabled={!dirty || save.isPending} onClick={submit}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Preview" description="Rendered with sample data" className="h-fit">
        <div className="rounded-xl bg-(--admin-canvas) p-4">
          <p className="mb-3 flex items-center gap-2 text-xs text-(--admin-muted)">
            <FiMail aria-hidden className="size-3.5" />
            Email
          </p>
          <div className="rounded-lg bg-(--admin-surface) p-4 shadow-sm ring-1 ring-(--admin-line)">
            {preview.subject && <p className="mb-2 text-sm font-semibold">{preview.subject}</p>}
            <p className="text-sm whitespace-pre-line">{preview.body}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RecentSends() {
  const log = useNotificationLog();
  const rows = log.data ?? [];
  return (
    <Card flush title="Recent sends" description="The last 20 emails the system tried to send" className="mt-6">
      <Table>
        <thead>
          <tr>
            <Th>Time</Th>
            <Th>Template</Th>
            <Th>Order</Th>
            <Th>Recipient</Th>
            <Th>Result</Th>
          </tr>
        </thead>
        <tbody>
          {log.isPending && <LoadingRow colSpan={5} />}
          {log.isError && (
            <tr>
              <td colSpan={5} className="p-4">
                <ErrorNotice error={log.error} onRetry={() => void log.refetch()} />
              </td>
            </tr>
          )}
          {rows.map((entry) => (
            <tr key={entry.id}>
              <Td className="text-(--admin-muted)">{formatDateTime(entry.sent_at)}</Td>
              <Td>{entry.template_name ?? entry.template_id ?? "—"}</Td>
              <Td className="text-(--admin-muted)">
                {entry.order_id ? `#${entry.order_id}` : entry.template_id === "ticket-reply" ? "—" : "Test"}
              </Td>
              <Td className="text-(--admin-muted)">{entry.recipient ?? "—"}</Td>
              <Td wrap>
                <Badge tone={SEND_STATUS[entry.status].tone} dot>{SEND_STATUS[entry.status].label}</Badge>
                {entry.error && <span className="ml-2 text-xs text-(--admin-muted)">{entry.error}</span>}
              </Td>
            </tr>
          ))}
          {log.isSuccess && rows.length === 0 && <EmptyRow colSpan={5}>No emails yet.</EmptyRow>}
        </tbody>
      </Table>
    </Card>
  );
}
