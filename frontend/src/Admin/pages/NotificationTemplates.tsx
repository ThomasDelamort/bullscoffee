import { useRef, useState } from "react";
import type { IconType } from "react-icons";
import { FiBell, FiMail, FiMessageSquare, FiRotateCcw, FiSave, FiSend } from "react-icons/fi";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Input, TextArea } from "../components/Field";
import PageHeader from "../components/PageHeader";
import { FOCUS_RING } from "../components/styles";
import { useToast } from "../components/toastContext";
import Toggle from "../components/Toggle";
import { TEMPLATE_SAMPLE, TEMPLATE_VARIABLES, TEMPLATES } from "../data/mock";
import type { NotificationChannel, NotificationTemplate } from "../types";
import { fillTemplate } from "../utils/format";

const CHANNELS: Record<NotificationChannel, { label: string; icon: IconType }> = {
  email: { label: "Email", icon: FiMail },
  sms: { label: "SMS", icon: FiMessageSquare },
  push: { label: "Push", icon: FiBell },
};

const SMS_LIMIT = 160;

export default function NotificationTemplates() {
  const notify = useToast();
  const [templates, setTemplates] = useState<NotificationTemplate[]>(TEMPLATES);
  const [selectedId, setSelectedId] = useState(TEMPLATES[0]!.id);
  const saved = templates.find((t) => t.id === selectedId)!;

  const save = (template: NotificationTemplate) => {
    setTemplates((current) => current.map((t) => (t.id === template.id ? template : t)));
    notify(`"${template.name}" template saved.`);
  };

  return (
    <>
      <PageHeader
        title="Notification Templates"
        description="The emails, texts and push notifications customers get when something happens to their order or account."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Card flush title="Templates" className="h-fit">
          <ul className="divide-y divide-(--admin-line)">
            {templates.map((template) => {
              const { icon: Icon, label } = CHANNELS[template.channel];
              const active = template.id === selectedId;
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
                    <Icon aria-hidden className="size-4 shrink-0 text-(--admin-muted)" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{template.name}</span>
                      <span className="block text-xs text-(--admin-muted)">
                        {label} · <code>{template.event}</code>
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
        <TemplateEditor key={saved.id} template={saved} onSave={save} />
      </div>
    </>
  );
}

interface TemplateEditorProps {
  template: NotificationTemplate;
  onSave: (template: NotificationTemplate) => void;
}

function TemplateEditor({ template, onSave }: TemplateEditorProps) {
  const notify = useToast();
  const [draft, setDraft] = useState(template);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(template);
  const hasSubject = draft.channel !== "sms";
  const preview = {
    subject: fillTemplate(draft.subject, TEMPLATE_SAMPLE),
    body: fillTemplate(draft.body, TEMPLATE_SAMPLE),
  };

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

  const { icon: ChannelIcon, label: channelLabel } = CHANNELS[draft.channel];

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 2xl:grid-cols-2">
      <Card
        title={draft.name}
        description={
          <>
            Sent on <code>{draft.event}</code>
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
            <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </Field>
          {hasSubject && (
            <Field label={draft.channel === "push" ? "Title" : "Subject"}>
              <Input value={draft.subject} onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))} />
            </Field>
          )}
          <Field
            label="Message"
            hint={
              draft.channel === "sms" && (
                <span className={preview.body.length > SMS_LIMIT ? "font-medium text-red-700" : ""}>
                  {preview.body.length}/{SMS_LIMIT} characters with sample data
                  {preview.body.length > SMS_LIMIT && " (will send as 2 messages)"}
                </span>
              )
            }
          >
            <TextArea
              ref={bodyRef}
              rows={draft.channel === "email" ? 9 : 4}
              value={draft.body}
              onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
              className="font-mono text-xs leading-relaxed"
            />
          </Field>
          <div>
            <p className="mb-1.5 text-xs font-medium">Insert variable</p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARIABLES.map((v) => (
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
          <div className="flex flex-wrap justify-end gap-2 border-t border-(--admin-line) pt-4">
            <Button icon={FiRotateCcw} disabled={!dirty} onClick={() => setDraft(template)}>
              Discard
            </Button>
            <Button icon={FiSend} onClick={() => notify(`Test ${channelLabel.toLowerCase()} sent to your account.`, "info")}>
              Send test
            </Button>
            <Button variant="primary" icon={FiSave} disabled={!dirty} onClick={() => onSave(draft)}>
              Save
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Preview" description="Rendered with sample data" className="h-fit">
        <div className="rounded-xl bg-(--admin-canvas) p-4">
          <p className="mb-3 flex items-center gap-2 text-xs text-(--admin-muted)">
            <ChannelIcon aria-hidden className="size-3.5" />
            {channelLabel}
          </p>
          <div className="rounded-lg bg-(--admin-surface) p-4 shadow-sm ring-1 ring-(--admin-line)">
            {hasSubject && preview.subject && <p className="mb-2 text-sm font-semibold">{preview.subject}</p>}
            <p className="text-sm whitespace-pre-line">{preview.body}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
