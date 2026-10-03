import { useState, type ReactNode } from "react";
import { FiAlertTriangle, FiExternalLink, FiShield } from "react-icons/fi";
import { errorMessage } from "../../lib/api";
import { useSaveSettings, useSettings } from "../api/settings";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Input, TextArea } from "../components/Field";
import PageHeader from "../components/PageHeader";
import { ErrorNotice, Loading } from "../components/QueryState";
import { buttonClass } from "../components/styles";
import { useToast } from "../components/toastContext";
import Toggle from "../components/Toggle";
import type { GeneralSettings } from "../types";
import { formatDateTime } from "../utils/format";

const CLERK_DASHBOARD = "https://dashboard.clerk.com";

const pickGeneral = (s: GeneralSettings): GeneralSettings => ({
  store_name: s.store_name,
  support_email: s.support_email,
  online_ordering: s.online_ordering,
  maintenance_mode: s.maintenance_mode,
  maintenance_message: s.maintenance_message,
});

export default function Settings() {
  const notify = useToast();
  const settings = useSettings();
  const save = useSaveSettings();
  // null: no unsaved edits, so the form shows what's saved.
  const [draft, setDraft] = useState<GeneralSettings | null>(null);

  if (settings.isPending) return <Loading label="Loading settings…" />;
  if (settings.isError) {
    return <ErrorNotice title="Couldn't load settings" error={settings.error} onRetry={() => void settings.refetch()} />;
  }

  const saved = pickGeneral(settings.data);
  const form = draft ?? saved;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(saved);

  const set = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) =>
    setDraft({ ...form, [key]: value });

  const submit = () => {
    if (!draft) return;
    save.mutate(draft, {
      onSuccess: () => {
        setDraft(null);
        notify("Settings saved.");
      },
      onError: (error) => notify(errorMessage(error), "error"),
    });
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Store-wide settings the system enforces."
      />
      {settings.data.updated_by_name && (
        <p className="-mt-4 mb-6 text-xs text-(--admin-muted)">
          Last changed by {settings.data.updated_by_name}, {formatDateTime(settings.data.updated_at)}.
        </p>
      )}

      <div className="flex flex-col gap-6 pb-20">
        <Section title="General" description="How the store identifies itself to customers.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Store name" hint="Used in emails, as the sender's name and {{store_name}}.">
              <Input maxLength={100} value={form.store_name} onChange={(e) => set("store_name", e.target.value)} />
            </Field>
            <Field label="Support email" hint="Shown on the Contact page. Customer replies to emails go here.">
              <Input
                type="email"
                maxLength={255}
                value={form.support_email}
                onChange={(e) => set("support_email", e.target.value)}
              />
            </Field>
          </div>
        </Section>

        <Section title="Ordering" description="What customers can do without a cashier.">
          <Toggle
            checked={form.online_ordering}
            onChange={(v) => set("online_ordering", v)}
            label="Kiosk ordering"
            description="When off, the kiosk asks customers to order at the counter and stops taking orders. The POS isn't affected."
          />
        </Section>

        <Section title="Maintenance" description="Pause self-ordering while you work on the store.">
          <div className="flex flex-col gap-5">
            <Toggle
              checked={form.maintenance_mode}
              onChange={(v) => set("maintenance_mode", v)}
              label="Maintenance mode"
              description="The kiosk shows the message below instead of the menu, and the storefront shows it as a banner. Staff can still sign in and use the POS."
            />
            {form.maintenance_mode && !saved.maintenance_mode && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
                <FiAlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                The kiosk stops accepting orders as soon as you save.
              </p>
            )}
            <Field label="Message shown to customers">
              <TextArea
                rows={3}
                maxLength={500}
                value={form.maintenance_message}
                onChange={(e) => set("maintenance_message", e.target.value)}
              />
            </Field>
          </div>
        </Section>

        <Section title="Sign-in & security" description="Managed in Clerk, which handles every sign-in.">
          <div className="flex items-start gap-3 rounded-xl bg-(--admin-canvas) p-4">
            <FiShield aria-hidden className="mt-0.5 size-5 shrink-0 text-(--admin-muted)" />
            <div className="min-w-0 text-sm">
              <p>These are set in the Clerk dashboard, not here:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-(--admin-muted)">
                <li>Session lifetime and inactivity timeout</li>
                <li>Account lockout after failed sign-ins</li>
                <li>Password rules</li>
                <li>Two-factor authentication</li>
              </ul>
              <a
                href={CLERK_DASHBOARD}
                target="_blank"
                rel="noreferrer"
                className={`${buttonClass("secondary", "sm")} mt-4`}
              >
                Open the Clerk dashboard <FiExternalLink aria-hidden className="size-3.5" />
              </a>
            </div>
          </div>
        </Section>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-(--admin-line) bg-(--admin-surface)/95 backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <p className="text-sm font-medium">You have unsaved changes.</p>
            <div className="flex gap-2">
              <Button onClick={() => setDraft(null)} disabled={save.isPending}>Discard</Button>
              <Button variant="primary" onClick={submit} disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save settings"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-(--admin-muted)">{description}</p>
        </div>
        <div>{children}</div>
      </div>
    </Card>
  );
}
