import { useState, type ReactNode } from "react";
import { FiAlertTriangle } from "react-icons/fi";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Input, Select, TextArea } from "../components/Field";
import PageHeader from "../components/PageHeader";
import { useToast } from "../components/toastContext";
import Toggle from "../components/Toggle";

interface SystemSettings {
  storeName: string;
  supportEmail: string;
  timezone: string;
  currency: string;
  onlineOrdering: boolean;
  orderTypes: { dineIn: boolean; takeout: boolean; pickup: boolean };
  ordersPerSlot: number;
  loyaltyPointsPerPeso: number;
  sessionTimeout: string;
  lockoutAttempts: number;
  passwordMinLength: number;
  staffTwoFactor: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

const DEFAULTS: SystemSettings = {
  storeName: "Bull's Coffee",
  supportEmail: "support@bullscoffee.ph",
  timezone: "Asia/Manila",
  currency: "PHP",
  onlineOrdering: true,
  orderTypes: { dineIn: true, takeout: true, pickup: true },
  ordersPerSlot: 12,
  loyaltyPointsPerPeso: 0.1,
  sessionTimeout: "30",
  lockoutAttempts: 5,
  passwordMinLength: 8,
  staffTwoFactor: true,
  maintenanceMode: false,
  maintenanceMessage: "We're brewing some updates. Online ordering will be back shortly!",
};

export default function Settings() {
  const notify = useToast();
  const [saved, setSaved] = useState(DEFAULTS);
  const [draft, setDraft] = useState(DEFAULTS);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const set = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const setOrderType = (key: keyof SystemSettings["orderTypes"], value: boolean) =>
    setDraft((d) => ({ ...d, orderTypes: { ...d.orderTypes, [key]: value } }));

  const save = () => {
    setSaved(draft);
    notify("Settings saved.");
  };

  return (
    <>
      <PageHeader title="Settings" description="Store-wide configuration, ordering rules and security policies." />

      <div className="flex flex-col gap-6 pb-20">
        <Section title="General" description="How the store identifies itself to customers.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Store name">
              <Input value={draft.storeName} onChange={(e) => set("storeName", e.target.value)} />
            </Field>
            <Field label="Support email" hint="Customers reply to this address.">
              <Input type="email" value={draft.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} />
            </Field>
            <Field label="Time zone">
              <Select value={draft.timezone} onChange={(e) => set("timezone", e.target.value)}>
                <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                <option value="UTC">UTC</option>
              </Select>
            </Field>
            <Field label="Currency">
              <Select value={draft.currency} onChange={(e) => set("currency", e.target.value)}>
                <option value="PHP">Philippine peso (₱)</option>
                <option value="USD">US dollar ($)</option>
              </Select>
            </Field>
          </div>
        </Section>

        <Section title="Ordering" description="What customers can do in the app.">
          <div className="flex flex-col gap-5">
            <Toggle
              checked={draft.onlineOrdering}
              onChange={(v) => set("onlineOrdering", v)}
              label="Online ordering"
              description="When off, customers can browse the menu but not check out."
            />
            <fieldset disabled={!draft.onlineOrdering} className="disabled:opacity-60">
              <legend className="mb-2 text-xs font-medium">Order types offered</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {(
                  [
                    ["dineIn", "Dine-in"],
                    ["takeout", "Takeout"],
                    ["pickup", "Scheduled pickup"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draft.orderTypes[key]}
                      onChange={(e) => setOrderType(key, e.target.checked)}
                      className="size-4 accent-(--admin-ink)"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Max orders per 15-minute slot" hint="Stops the queue from overwhelming baristas.">
                <Input type="number" min={1} value={draft.ordersPerSlot} onChange={(e) => set("ordersPerSlot", Number(e.target.value))} />
              </Field>
              <Field label="Loyalty points per ₱1 spent">
                <Input type="number" min={0} step={0.05} value={draft.loyaltyPointsPerPeso} onChange={(e) => set("loyaltyPointsPerPeso", Number(e.target.value))} />
              </Field>
            </div>
          </div>
        </Section>

        <Section title="Security" description="Applies to every account type.">
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Session timeout">
                <Select value={draft.sessionTimeout} onChange={(e) => set("sessionTimeout", e.target.value)}>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="480">8 hours</option>
                </Select>
              </Field>
              <Field label="Lock account after" hint="Failed sign-in attempts">
                <Input type="number" min={3} max={10} value={draft.lockoutAttempts} onChange={(e) => set("lockoutAttempts", Number(e.target.value))} />
              </Field>
              <Field label="Minimum password length">
                <Input type="number" min={8} max={64} value={draft.passwordMinLength} onChange={(e) => set("passwordMinLength", Number(e.target.value))} />
              </Field>
            </div>
            <Toggle
              checked={draft.staffTwoFactor}
              onChange={(v) => set("staffTwoFactor", v)}
              label="Require two-factor authentication for staff"
              description="Admins, managers and cashiers must confirm sign-ins with a second factor."
            />
          </div>
        </Section>

        <Section title="Maintenance" description="Take the storefront offline while you work on it.">
          <div className="flex flex-col gap-5">
            <Toggle
              checked={draft.maintenanceMode}
              onChange={(v) => set("maintenanceMode", v)}
              label="Maintenance mode"
              description="Customers see the message below instead of the store. Staff and admins can still sign in."
            />
            {draft.maintenanceMode && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
                <FiAlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                Online orders stop being accepted as soon as you save.
              </p>
            )}
            <Field label="Message shown to customers">
              <TextArea rows={3} value={draft.maintenanceMessage} onChange={(e) => set("maintenanceMessage", e.target.value)} />
            </Field>
          </div>
        </Section>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-(--admin-line) bg-(--admin-surface)/95 backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <p className="text-sm font-medium">You have unsaved changes.</p>
            <div className="flex gap-2">
              <Button onClick={() => setDraft(saved)}>Discard</Button>
              <Button variant="primary" onClick={save}>Save settings</Button>
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
