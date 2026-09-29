import { useState } from "react";
import { FiCopy, FiEye, FiEyeOff, FiSave, FiZap } from "react-icons/fi";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Input, Select } from "../components/Field";
import PageHeader from "../components/PageHeader";
import { FOCUS_RING } from "../components/styles";
import Tabs from "../components/Tabs";
import { useToast } from "../components/toastContext";
import Toggle from "../components/Toggle";
import { PAYMONGO_SETTINGS } from "../data/mock";
import type { GatewayMode, PaymentGatewaySettings } from "../types";

export default function PaymentGateway() {
  const notify = useToast();
  const [settings, setSettings] = useState<PaymentGatewaySettings>(PAYMONGO_SETTINGS);
  const [showSecret, setShowSecret] = useState(false);
  const [autoVerify, setAutoVerify] = useState(true);
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [refundWindow, setRefundWindow] = useState("24");
  const [paymentTimeout, setPaymentTimeout] = useState("15");

  const update = (patch: Partial<PaymentGatewaySettings>) => setSettings((current) => ({ ...current, ...patch }));

  const toggleMethod = (id: string, enabled: boolean) =>
    setSettings((current) => ({
      ...current,
      methods: current.methods.map((m) => (m.id === id ? { ...m, enabled } : m)),
    }));

  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(settings.webhook_url);
      notify("Webhook URL copied.");
    } catch {
      notify("Couldn't copy. Select the URL and copy it manually.", "error");
    }
  };

  const testConnection = () => notify(`PayMongo: connection OK (${settings.mode}).`);

  return (
    <>
      <PageHeader
        title="Payment Gateway"
        description="Bull's Coffee accepts payments through PayMongo. Configure keys and control how transactions are verified and confirmed."
        actions={
          <Button variant="primary" icon={FiSave} onClick={() => notify("Payment settings saved.")}>
            Save changes
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card
            title={
              <span className="flex flex-wrap items-center gap-2">
                PayMongo
                <Badge tone={settings.mode === "live" ? "success" : "info"} dot>
                  {settings.mode === "live" ? "Live" : "Sandbox"}
                </Badge>
              </span>
            }
            description="Single integration for GCash, Maya, GrabPay, QR Ph and cards"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-xs font-medium">Mode</p>
                <Tabs<GatewayMode>
                  label="PayMongo mode"
                  value={settings.mode}
                  onChange={(mode) => update({ mode })}
                  options={[
                    { value: "sandbox", label: "Sandbox" },
                    { value: "live", label: "Live" },
                  ]}
                />
              </div>
              <Field label="Public key">
                <Input value={settings.public_key} onChange={(e) => update({ public_key: e.target.value })} className="font-mono" spellCheck={false} />
              </Field>
              <Field label="Secret key">
                <div className="relative">
                  <Input
                    type={showSecret ? "text" : "password"}
                    value={settings.secret_key}
                    onChange={(e) => update({ secret_key: e.target.value })}
                    className="pr-10 font-mono"
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    aria-label={showSecret ? "Hide secret key" : "Show secret key"}
                    onClick={() => setShowSecret((v) => !v)}
                    className={`absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-lg text-(--admin-muted) hover:text-(--admin-ink) ${FOCUS_RING}`}
                  >
                    {showSecret ? <FiEyeOff aria-hidden className="size-4" /> : <FiEye aria-hidden className="size-4" />}
                  </button>
                </div>
              </Field>
              <Field label="Webhook URL" className="sm:col-span-2" hint="Paste this into the PayMongo dashboard so payments get confirmed.">
                <div className="flex gap-2">
                  <Input value={settings.webhook_url} readOnly className="font-mono text-(--admin-muted)" />
                  <Button icon={FiCopy} aria-label="Copy webhook URL" onClick={() => void copyWebhook()} />
                </div>
              </Field>
            </div>
            <div className="mt-5 flex justify-end">
              <Button size="sm" icon={FiZap} onClick={testConnection}>
                Test connection
              </Button>
            </div>
          </Card>

          <Card title="Payment methods" description="Enabled methods appear at checkout">
            <ul className="flex flex-col gap-4">
              {settings.methods.map((method) => (
                <li key={method.id}>
                  <Toggle
                    checked={method.enabled}
                    onChange={(enabled) => toggleMethod(method.id, enabled)}
                    label={method.label}
                  />
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card title="Transaction rules" className="h-fit">
          <div className="flex flex-col gap-5">
            <Toggle
              checked={autoVerify}
              onChange={setAutoVerify}
              label="Verify transactions automatically"
              description="Mark orders paid as soon as PayMongo's webhook confirms."
            />
            <Toggle
              checked={sendConfirmation}
              onChange={setSendConfirmation}
              label="Send payment confirmation"
              description="Email the customer a receipt once payment clears."
            />
            <Field label="Payment timeout" hint="Unpaid online orders are cancelled after this.">
              <Select value={paymentTimeout} onChange={(e) => setPaymentTimeout(e.target.value)}>
                <option value="5">5 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
              </Select>
            </Field>
            <Field label="Refund window" hint="How long after purchase customers can request a refund.">
              <Select value={refundWindow} onChange={(e) => setRefundWindow(e.target.value)}>
                <option value="2">2 hours</option>
                <option value="24">24 hours</option>
                <option value="72">3 days</option>
                <option value="168">7 days</option>
              </Select>
            </Field>
          </div>
        </Card>
      </div>
    </>
  );
}
