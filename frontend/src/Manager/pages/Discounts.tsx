import { useState, type FormEvent } from "react";
import { FiEdit2, FiPercent, FiPlus, FiShoppingBag, FiTag, FiTrash2 } from "react-icons/fi";
import { errorMessage } from "../../lib/api";
import { useDeleteDiscount, useDiscounts, useSaveDiscount, type DiscountFields } from "../api/discounts";
import { useOrders } from "../api/orders";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Input, Select } from "../components/Field";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { ErrorNotice, Loading, LoadingRow } from "../components/QueryState";
import RowAction from "../components/RowAction";
import StatCard from "../components/StatCard";
import { EmptyRow, Table, Td, Th } from "../components/Table";
import Toggle from "../components/Toggle";
import { useNotifyError, useToast } from "../components/toastContext";
import { isSale } from "../data/selectors";
import type { Discount, DiscountEligibility, DiscountKind } from "../types";
import { sumBy } from "../utils/collections";
import { dayKey, monthKey } from "../utils/dates";
import { formatDateTime, formatMonth, formatPeso } from "../utils/format";
import { describeDiscount } from "../utils/pricing";

const ELIGIBILITY: Record<DiscountEligibility, string> = {
  none: "Anyone",
  university_id: "Students with a university ID on file",
  government_id: "Senior citizens and PWDs (check their ID)",
};

export default function Discounts() {
  const notify = useToast();
  const notifyError = useNotifyError();
  const [editing, setEditing] = useState<Discount | "new" | null>(null);
  const [deleting, setDeleting] = useState<Discount | null>(null);

  const now = new Date();
  const discountsQuery = useDiscounts();
  const monthOrders = useOrders({ from: `${monthKey(now)}-01`, to: dayKey(now) });
  const saveDiscount = useSaveDiscount();
  const deleteDiscount = useDeleteDiscount();

  const discounts = discountsQuery.data ?? [];
  const thisMonth = (monthOrders.data ?? []).filter(isSale);
  const discounted = thisMonth.filter((o) => o.discount_amount > 0);
  const given = sumBy(discounted, (o) => o.discount_amount);
  const share = thisMonth.length ? Math.round((discounted.length / thisMonth.length) * 100) : 0;
  // The API returns orders newest first.
  const recent = discounted.slice(0, 8);

  const closeEditor = () => {
    setEditing(null);
    saveDiscount.reset();
  };

  const save = (fields: DiscountFields) => {
    const discountId = editing === "new" || editing === null ? null : editing.discount_id;
    saveDiscount.mutate(
      { discountId, fields },
      {
        onSuccess: () => {
          notify(discountId === null ? `${fields.discount_name} discount created.` : `${fields.discount_name} discount updated.`);
          closeEditor();
        },
      },
    );
  };

  const toggle = (d: Discount, is_active: boolean) =>
    saveDiscount.mutate(
      { discountId: d.discount_id, fields: { is_active } },
      {
        onSuccess: () =>
          notify(is_active ? `${d.discount_name} is now offered at checkout.` : `${d.discount_name} is hidden from checkout.`),
        onError: notifyError,
      },
    );

  const confirmDelete = () => {
    if (!deleting) return;
    deleteDiscount.mutate(deleting.discount_id, {
      onSuccess: () => {
        notify(`${deleting.discount_name} discount deleted.`);
        setDeleting(null);
      },
      onError: notifyError,
    });
  };

  return (
    <>
      <PageHeader
        title="Discounts"
        description="Set up the discounts cashiers can apply at checkout on the Point of Sale."
        actions={
          <Button variant="primary" icon={FiPlus} onClick={() => setEditing("new")} disabled={!discountsQuery.isSuccess}>
            Add discount
          </Button>
        }
      />

      {discountsQuery.error && (
        <ErrorNotice
          className="mb-6"
          title="Couldn't load discounts"
          error={discountsQuery.error}
          onRetry={() => void discountsQuery.refetch()}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Given this month" value={formatPeso(given)} hint={formatMonth(now)} icon={FiTag} />
        <StatCard
          label="Discounted orders"
          value={discounted.length}
          hint={`${share}% of this month's orders`}
          icon={FiShoppingBag}
        />
        <StatCard
          label="Active discounts"
          value={discountsQuery.isSuccess ? discounts.filter((d) => d.is_active).length : "—"}
          hint={`${discounts.length} set up in total`}
          icon={FiPercent}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3" title="Discount presets" flush>
          <Table>
            <thead>
              <tr>
                <Th>Discount</Th>
                <Th>Who qualifies</Th>
                <Th>Offered</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {discountsQuery.isPending && <LoadingRow colSpan={4} label="Loading discounts…" />}
              {discounts.map((d) => (
                <tr key={d.discount_id} className="hover:bg-(--mgr-canvas)/50">
                  <Td>
                    <p className="font-medium">{d.discount_name}</p>
                    <p className="text-xs text-(--mgr-muted)">{describeDiscount(d)}</p>
                  </Td>
                  <Td wrap className="text-(--mgr-muted)">{ELIGIBILITY[d.eligibility]}</Td>
                  <Td>
                    <Toggle
                      checked={d.is_active}
                      onChange={(v) => toggle(d, v)}
                      label={`Offer ${d.discount_name} at checkout`}
                      hideLabel
                    />
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <RowAction icon={FiEdit2} label={`Edit ${d.discount_name}`} onClick={() => setEditing(d)} />
                      <RowAction icon={FiTrash2} label={`Delete ${d.discount_name}`} danger onClick={() => setDeleting(d)} />
                    </div>
                  </Td>
                </tr>
              ))}
              {discountsQuery.isSuccess && discounts.length === 0 && <EmptyRow colSpan={4}>No discounts set up yet.</EmptyRow>}
            </tbody>
          </Table>
          <p className="px-5 py-3 text-xs text-(--mgr-muted)">
            Cashiers can also enter a one-off custom amount at checkout.
          </p>
        </Card>

        <Card className="xl:col-span-2" title="Recently discounted orders" description="This month" flush>
          {monthOrders.isPending ? (
            <Loading />
          ) : (
            <ul className="divide-y divide-(--mgr-line)">
              {recent.map((o) => (
                <li key={o.order_id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      #{o.order_id} · {o.customer_name ?? "Walk-in"}
                    </p>
                    <p className="text-xs text-(--mgr-muted)">{formatDateTime(o.ordered_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium tabular-nums">−{formatPeso(o.discount_amount)}</p>
                    <p className="text-xs text-(--mgr-muted) tabular-nums">paid {formatPeso(o.total_amount)}</p>
                  </div>
                </li>
              ))}
              {recent.length === 0 && <li className="px-5 py-10 text-center text-sm text-(--mgr-muted)">None yet.</li>}
            </ul>
          )}
        </Card>
      </div>

      <DiscountModal
        key={`discount-${editing === null ? "closed" : editing === "new" ? "new" : editing.discount_id}`}
        discount={editing}
        saving={saveDiscount.isPending}
        serverError={saveDiscount.error ? errorMessage(saveDiscount.error) : null}
        onClose={closeEditor}
        onSave={save}
      />

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        size="sm"
        title={`Delete ${deleting?.discount_name ?? ""}?`}
        description="It disappears from checkout. Past orders keep the amount they were discounted. To pause it instead, switch it off."
        footer={
          <>
            <Button onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleteDiscount.isPending}>
              {deleteDiscount.isPending ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      />
    </>
  );
}

interface DiscountModalProps {
  discount: Discount | "new" | null;
  saving: boolean;
  serverError: string | null;
  onClose: () => void;
  onSave: (fields: DiscountFields) => void;
}

function DiscountModal({ discount, saving, serverError, onClose, onSave }: DiscountModalProps) {
  const existing = discount === "new" ? null : discount;
  const [kind, setKind] = useState<DiscountKind>(existing?.kind ?? "percent");
  const [active, setActive] = useState(existing?.is_active ?? true);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    onSave({
      discount_name: String(form.get("discount_name")).trim(),
      kind,
      value: Number(form.get("value")),
      eligibility: form.get("eligibility") as DiscountEligibility,
      is_active: active,
    });
  };

  return (
    <Modal
      open={discount !== null}
      onClose={onClose}
      title={existing ? `Edit ${existing.discount_name}` : "Add discount"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="discount-form" disabled={saving}>
            {saving ? "Saving…" : existing ? "Save changes" : "Create discount"}
          </Button>
        </>
      }
    >
      <form id="discount-form" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          <Input name="discount_name" required maxLength={50} defaultValue={existing?.discount_name} autoComplete="off" />
        </Field>
        <Field label="Type">
          <Select value={kind} onChange={(e) => setKind(e.target.value as DiscountKind)}>
            <option value="percent">Percentage off</option>
            <option value="fixed">Fixed amount off</option>
          </Select>
        </Field>
        <Field label={kind === "percent" ? "Percent (%)" : "Amount (₱)"}>
          <Input
            name="value"
            type="number"
            required
            min={0.01}
            max={kind === "percent" ? 100 : undefined}
            step="0.01"
            defaultValue={existing?.value}
          />
        </Field>
        <Field label="Who qualifies" className="sm:col-span-2">
          <Select name="eligibility" defaultValue={existing?.eligibility ?? "none"}>
            {Object.entries(ELIGIBILITY).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Toggle checked={active} onChange={setActive} label="Offer at checkout" description="Switch off to pause it without deleting." />
        </div>
        {serverError && (
          <p role="alert" className="text-sm text-red-700 sm:col-span-2">
            {serverError}
          </p>
        )}
      </form>
    </Modal>
  );
}
