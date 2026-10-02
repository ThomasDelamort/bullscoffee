import { useState } from "react";
import { FiCopy, FiRefreshCw, FiSave, FiZap } from "react-icons/fi";
import type { PaymongoMethod } from "../../checkout/api";
import { API_URL, errorMessage } from "../../lib/api";
import { useGateway, useSaveGateway, useTestGateway, type GatewaySettings } from "../api/paymentGateway";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Input } from "../components/Field";
import PageHeader from "../components/PageHeader";
import { useToast } from "../components/toastContext";
import Toggle from "../components/Toggle";

const METHODS: { id: PaymongoMethod; label: string }[] = [
  { id: "gcash", label: "GCash" },
  { id: "paymaya", label: "Maya" },
  { id: "grab_pay", label: "GrabPay" },
  { id: "card", label: "Credit & debit cards" },
  { id: "qrph", label: "QR Ph" },
];

const WEBHOOK_URL = `${API_URL}/api/payments/webhook`;

export default function PaymentGateway() {
  const notify = useToast();
  const gateway = useGateway();
  const save = useSaveGateway();
  const test = useTestGateway();
  // Unsaved edits; null while the page shows what's saved.
  const [draft, setDraft] = useState<GatewaySettings | null>(null);

  const status = gateway.data;
  const settings = draft ?? status;

  const update = (patch: Partial<GatewaySettings>) =>
    settings &&
    setDraft({ enabled_methods: settings.enabled_methods, send_email_receipt: settings.send_email_receipt, ...patch });

  const toggleMethod = (id: PaymongoMethod, enabled: boolean) =>
    settings &&
    update({
      enabled_methods: enabled
        ? [...settings.enabled_methods, id]
        : settings.enabled_methods.filter((m) => m !== id),
    });

  const saveChanges = () => {
    if (!draft || save.isPending) return;
    save.mutate(draft, {
      onSuccess: () => {
        setDraft(null);
        notify("Payment settings saved.");
      },
      onError: (e) => notify(errorMessage(e), "error"),
    });
  };

  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(WEBHOOK_URL);
      notify("Webhook URL copied.");
    } catch {
      notify("Couldn't copy. Select the URL and copy it manually.", "error");
    }
  };

  const testConnection = () =>
    test.mutate(undefined, {
      onSuccess: ({ mode, webhooks }) => {
        const enabled = webhooks.filter((w) => w.status === "enabled").length;
        notify(
          enabled
            ? `Connected to PayMongo (${mode} mode). ${enabled === 1 ? "1 webhook confirms" : `${enabled} webhooks confirm`} paid checkouts.`
            : `Connected to PayMongo (${mode} mode), but no enabled webhook listens for checkout_session.payment.paid, so payments won't be confirmed.`,
          enabled ? "success" : "error",
        );
      },
      onError: (e) => notify(errorMessage(e), "error"),
    });

  return (
    <>
      <PageHeader
        title="Payment Gateway"
        description="Bull's Coffee accepts online payments through PayMongo. The API keys live in the backend's .env file; choose here which methods checkout offers."
        actions={
          <Button variant="primary" icon={FiSave} disabled={!draft || save.isPending} onClick={saveChanges}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        }
      />

      {gateway.isPending && (
        <Card>
          <p className="text-sm text-(--admin-muted)">Loading payment settings…</p>
        </Card>
      )}

      {gateway.error && (
        <Card>
          <p className="text-sm font-medium">Couldn't load payment settings</p>
          <p className="mt-1 text-sm text-(--admin-muted)">{errorMessage(gateway.error)}</p>
          <Button size="sm" icon={FiRefreshCw} className="mt-4" onClick={() => void gateway.refetch()}>
            Try again
          </Button>
        </Card>
      )}

      {status && settings && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="flex flex-col gap-6 xl:col-span-2">
            <Card
              title={
                <span className="flex flex-wrap items-center gap-2">
                  PayMongo
                  <Badge tone={status.mode === "live" ? "success" : "info"} dot>
                    {status.mode === "live" ? "Live" : "Test mode"}
                  </Badge>
                </span>
              }
              description="Single integration for GCash, Maya, GrabPay, QR Ph and cards"
            >
              <div className="flex flex-col gap-5">
                <div>
                  <p className="mb-1.5 text-xs font-medium">Configuration</p>
                  <ul className="divide-y divide-(--admin-line) rounded-lg ring-1 ring-(--admin-line)">
                    <ConfigRow label="Secret key" variable="PAYMONGO_SECRET_KEY" set={status.secret_key_set} />
                    <ConfigRow
                      label="Webhook signing secret"
                      variable="PAYMONGO_WEBHOOK_SECRET"
                      set={status.webhook_secret_set}
                    />
                    <ConfigRow
                      label="Return pages"
                      variable="PAYMONGO_SUCCESS_URL, PAYMONGO_CANCEL_URL"
                      set={status.return_urls_set}
                    />
                  </ul>
                  <p className="mt-1 text-xs text-(--admin-muted)">
                    The mode follows the secret key: an sk_test_ key runs in test mode, an sk_live_ key takes real
                    payments. Restart the backend after changing .env.
                  </p>
                </div>
                <Field
                  label="Webhook URL"
                  hint="Add this in the PayMongo dashboard under Developers → Webhooks, subscribed to checkout_session.payment.paid. PayMongo can't reach localhost, so test locally through a tunnel such as ngrok."
                >
                  <div className="flex gap-2">
                    <Input value={WEBHOOK_URL} readOnly className="font-mono text-(--admin-muted)" />
                    <Button icon={FiCopy} aria-label="Copy webhook URL" onClick={() => void copyWebhook()} />
                  </div>
                </Field>
              </div>
              <div className="mt-5 flex justify-end">
                <Button size="sm" icon={FiZap} disabled={test.isPending} onClick={testConnection}>
                  {test.isPending ? "Testing…" : "Test connection"}
                </Button>
              </div>
            </Card>

            <Card title="Payment methods" description="Switched-on methods appear on PayMongo's checkout page">
              <ul className="flex flex-col gap-4">
                {METHODS.map((method) => (
                  <li key={method.id}>
                    <Toggle
                      checked={settings.enabled_methods.includes(method.id)}
                      onChange={(enabled) => toggleMethod(method.id, enabled)}
                      label={method.label}
                    />
                  </li>
                ))}
              </ul>
              {settings.enabled_methods.length === 0 && (
                <p className="mt-4 text-xs text-amber-800">
                  With every method off, the kiosk and register only take payment at the counter.
                </p>
              )}
            </Card>
          </div>

          <Card title="Transaction rules" className="h-fit">
            <div className="flex flex-col gap-5">
              <Toggle
                checked={settings.send_email_receipt}
                onChange={(send_email_receipt) => update({ send_email_receipt })}
                label="Send payment confirmation"
                description="PayMongo emails the customer a receipt once payment clears."
              />
              <p className="text-xs text-(--admin-muted)">
                Orders are marked paid only when PayMongo's webhook confirms the payment, never when the customer
                lands back on the success page.
              </p>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

interface ConfigRowProps {
  label: string;
  /** The backend .env variable(s) it comes from. */
  variable: string;
  set: boolean;
}

function ConfigRow({ label, variable, set }: ConfigRowProps) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-sm">{label}</span>
        <span className="block truncate font-mono text-xs text-(--admin-muted)">{variable}</span>
      </span>
      <Badge tone={set ? "success" : "danger"} dot>
        {set ? "Set" : "Missing"}
      </Badge>
    </li>
  );
}
