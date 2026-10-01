import { useMemo, useState, type FormEvent } from "react";
import { FiEdit2, FiEye, FiList, FiPlus, FiRotateCcw, FiTruck, FiX, FiXCircle } from "react-icons/fi";
import { errorMessage } from "../../lib/api";
import type { ImageChange } from "../api/forms";
import { useIngredients } from "../api/inventory";
import {
  useDeliveries,
  useDelivery,
  usePriceList,
  usePriceLists,
  useRecordDelivery,
  useSavePriceList,
  useSaveSupplier,
  useSetSupplierActive,
  useSuppliers,
  type DeliveryInput,
  type SupplierFields,
} from "../api/suppliers";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Input, Select } from "../components/Field";
import ImageField from "../components/ImageField";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { ErrorNotice, Loading, LoadingRow } from "../components/QueryState";
import RowAction from "../components/RowAction";
import SearchInput from "../components/SearchInput";
import { INPUT_BASE } from "../components/styles";
import { EmptyRow, Table, Td, Th } from "../components/Table";
import Tabs from "../components/Tabs";
import { useNotifyError, useToast } from "../components/toastContext";
import type { Delivery, Ingredient, Supplier, SupplierIngredient } from "../types";
import { indexBy, sumBy } from "../utils/collections";
import { dayKey } from "../utils/dates";
import { formatDate, formatNumber, formatPeso, round2 } from "../utils/format";
import { useImageDraft } from "../utils/useImageDraft";

type View = "suppliers" | "deliveries";
type StatusFilter = "active" | "inactive" | "all";

const PAGE_SIZE = 25;

export default function Suppliers() {
  const notify = useToast();
  const notifyError = useNotifyError();
  const [view, setView] = useState<View>("suppliers");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [query, setQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [editing, setEditing] = useState<Supplier | "new" | null>(null);
  const [pricing, setPricing] = useState<Supplier | null>(null);
  const [receiving, setReceiving] = useState<number | "pick" | null>(null);
  const [viewing, setViewing] = useState<Delivery | null>(null);
  const [deactivating, setDeactivating] = useState<Supplier | null>(null);

  const suppliersQuery = useSuppliers();
  const deliveriesQuery = useDeliveries();
  const ingredientsQuery = useIngredients();
  const suppliers = useMemo(() => suppliersQuery.data ?? [], [suppliersQuery.data]);
  const supplierIds = useMemo(() => suppliers.map((s) => s.supplier_id), [suppliers]);
  const { prices } = usePriceLists(supplierIds);

  const saveSupplier = useSaveSupplier();
  const setSupplierActive = useSetSupplierActive();
  const savePriceList = useSavePriceList();
  const recordDelivery = useRecordDelivery();

  const allDeliveries = useMemo(() => deliveriesQuery.data ?? [], [deliveriesQuery.data]);
  const lastDelivery = useMemo(() => {
    const last = new Map<number, string>();
    for (const d of allDeliveries) {
      if ((last.get(d.supplier_id) ?? "") < d.delivery_date) last.set(d.supplier_id, d.delivery_date);
    }
    return last;
  }, [allDeliveries]);

  const count = (s: Exclude<StatusFilter, "all">) => suppliers.filter((x) => x.is_active === (s === "active")).length;
  const q = query.trim().toLowerCase();
  const visibleSuppliers = suppliers.filter(
    (s) =>
      (status === "all" || s.is_active === (status === "active")) &&
      (!q || s.supplier_name.toLowerCase().includes(q) || (s.contact_person ?? "").toLowerCase().includes(q)),
  );
  // The API returns deliveries newest first.
  const deliveries = allDeliveries.filter((d) => supplierFilter === "all" || String(d.supplier_id) === supplierFilter);

  const closeEditor = () => {
    setEditing(null);
    saveSupplier.reset();
  };

  const submitSupplier = (fields: SupplierFields, image: ImageChange) => {
    const supplierId = editing === "new" || editing === null ? null : editing.supplier_id;
    saveSupplier.mutate(
      { supplierId, fields, image },
      {
        onSuccess: () => {
          notify(
            supplierId === null
              ? `${fields.supplier_name} added. Set up their price list next.`
              : `${fields.supplier_name} updated.`,
          );
          closeEditor();
        },
      },
    );
  };

  const setActive = (s: Supplier, is_active: boolean) =>
    setSupplierActive.mutate(
      { supplierId: s.supplier_id, is_active },
      {
        onSuccess: () => {
          notify(is_active ? `${s.supplier_name} is active again.` : `${s.supplier_name} was deactivated.`);
          setDeactivating(null);
        },
        onError: notifyError,
      },
    );

  const submitPrices = (supplier: Supplier, rows: Pick<SupplierIngredient, "ingredient_id" | "unit_price">[]) =>
    savePriceList.mutate(
      { supplierId: supplier.supplier_id, prices: rows },
      {
        onSuccess: () => {
          notify(`${supplier.supplier_name}'s price list saved.`);
          setPricing(null);
        },
        onError: notifyError,
      },
    );

  const submitDelivery = (draft: DeliveryInput) => {
    const name = suppliers.find((s) => s.supplier_id === draft.supplier_id)?.supplier_name;
    recordDelivery.mutate(draft, {
      onSuccess: () => {
        notify(
          `Delivery from ${name} recorded. Stock updated for ${draft.items.length} ${draft.items.length === 1 ? "ingredient" : "ingredients"}.`,
        );
        setReceiving(null);
      },
      onError: notifyError,
    });
  };

  const failed = suppliersQuery.error ?? (view === "deliveries" ? deliveriesQuery.error : null);

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Who supplies each ingredient and at what price, plus every delivery received. Recording a delivery adds it to stock."
        actions={
          <>
            <Button icon={FiTruck} onClick={() => setReceiving("pick")}>
              Record delivery
            </Button>
            <Button variant="primary" icon={FiPlus} onClick={() => setEditing("new")}>
              Add supplier
            </Button>
          </>
        }
      />

      {failed && (
        <ErrorNotice
          className="mb-4"
          title="Couldn't load suppliers"
          error={failed}
          onRetry={() => void Promise.all([suppliersQuery.refetch(), deliveriesQuery.refetch()])}
        />
      )}

      <div className="mb-4">
        <Tabs
          label="Section"
          value={view}
          onChange={(v) => {
            setView(v);
            setLimit(PAGE_SIZE);
          }}
          options={[
            { value: "suppliers", label: "Suppliers", count: suppliers.length },
            { value: "deliveries", label: "Deliveries", count: allDeliveries.length },
          ]}
        />
      </div>

      {view === "suppliers" ? (
        <Card flush>
          <div className="flex flex-col gap-3 border-b border-(--mgr-line) p-4 lg:flex-row lg:items-center lg:justify-between">
            <Tabs
              label="Filter by status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "active", label: "Active", count: count("active") },
                { value: "inactive", label: "Inactive", count: count("inactive") },
                { value: "all", label: "All", count: suppliers.length },
              ]}
            />
            <SearchInput value={query} onChange={setQuery} placeholder="Search suppliers" className="lg:w-64" />
          </div>

          <Table>
            <thead>
              <tr>
                <Th>Supplier</Th>
                <Th>Contact</Th>
                <Th>Supplies</Th>
                <Th>Last delivery</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {suppliersQuery.isPending && <LoadingRow colSpan={6} label="Loading suppliers…" />}
              {visibleSuppliers.map((s) => {
                const list = prices.get(s.supplier_id);
                const items = (list ?? []).map((si) => si.ingredient_name);
                const last = lastDelivery.get(s.supplier_id);
                return (
                  <tr key={s.supplier_id} className="hover:bg-(--mgr-canvas)/50">
                    <Td>
                      <p className="font-medium">{s.supplier_name}</p>
                      <p className="max-w-60 truncate text-xs text-(--mgr-muted)">{s.supplier_address ?? "No address"}</p>
                    </Td>
                    <Td>
                      <p>{s.contact_person ?? "—"}</p>
                      <p className="text-xs text-(--mgr-muted)">
                        {s.supplier_email}
                        {s.contact_number ? ` · ${s.contact_number}` : ""}
                      </p>
                    </Td>
                    <Td className="max-w-60 truncate text-(--mgr-muted)">
                      {!list
                        ? "…"
                        : items.length
                          ? `${items.slice(0, 3).join(", ")}${items.length > 3 ? ` +${items.length - 3}` : ""}`
                          : "No price list yet"}
                    </Td>
                    <Td className="text-(--mgr-muted)">{last ? formatDate(last) : "Never"}</Td>
                    <Td>
                      <Badge tone={s.is_active ? "success" : "neutral"} dot>
                        {s.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        {s.is_active ? (
                          <>
                            <RowAction
                              icon={FiTruck}
                              label={`Record a delivery from ${s.supplier_name}`}
                              disabled={items.length === 0}
                              onClick={() => setReceiving(s.supplier_id)}
                            />
                            <RowAction icon={FiList} label={`${s.supplier_name}'s price list`} onClick={() => setPricing(s)} />
                            <RowAction icon={FiEdit2} label={`Edit ${s.supplier_name}`} onClick={() => setEditing(s)} />
                            <RowAction icon={FiXCircle} label={`Deactivate ${s.supplier_name}`} danger onClick={() => setDeactivating(s)} />
                          </>
                        ) : (
                          <RowAction
                            icon={FiRotateCcw}
                            label={`Reactivate ${s.supplier_name}`}
                            disabled={setSupplierActive.isPending}
                            onClick={() => setActive(s, true)}
                          />
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {suppliersQuery.isSuccess && visibleSuppliers.length === 0 && <EmptyRow colSpan={6}>No suppliers match.</EmptyRow>}
            </tbody>
          </Table>
        </Card>
      ) : (
        <Card flush>
          <div className="flex justify-end border-b border-(--mgr-line) p-4">
            <Select
              aria-label="Filter by supplier"
              value={supplierFilter}
              onChange={(e) => {
                setSupplierFilter(e.target.value);
                setLimit(PAGE_SIZE);
              }}
              className="sm:w-60"
            >
              <option value="all">All suppliers</option>
              {suppliers.map((s) => (
                <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
              ))}
            </Select>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Supplier</Th>
                <Th className="text-right">Items</Th>
                <Th>Received by</Th>
                <Th className="text-right">Cost</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {deliveriesQuery.isPending && <LoadingRow colSpan={6} label="Loading deliveries…" />}
              {deliveries.slice(0, limit).map((d) => (
                <tr key={d.delivery_id} className="hover:bg-(--mgr-canvas)/50">
                  <Td>{formatDate(d.delivery_date)}</Td>
                  <Td className="font-medium">{d.supplier_name}</Td>
                  <Td className="text-right text-(--mgr-muted) tabular-nums">{d.item_count}</Td>
                  <Td className="text-(--mgr-muted)">{d.employee_name}</Td>
                  <Td className="text-right tabular-nums">{formatPeso(d.total_cost)}</Td>
                  <Td className="text-right">
                    <RowAction icon={FiEye} label={`View delivery #${d.delivery_id}`} onClick={() => setViewing(d)} />
                  </Td>
                </tr>
              ))}
              {deliveriesQuery.isSuccess && deliveries.length === 0 && <EmptyRow colSpan={6}>No deliveries recorded.</EmptyRow>}
            </tbody>
          </Table>
          {deliveries.length > limit && (
            <div className="flex items-center justify-between gap-3 px-5 py-3 text-sm text-(--mgr-muted)">
              <span>
                Showing {limit} of {deliveries.length}
              </span>
              <Button size="sm" onClick={() => setLimit(limit + PAGE_SIZE)}>
                Show more
              </Button>
            </div>
          )}
        </Card>
      )}

      <SupplierModal
        key={`supplier-${editing === null ? "closed" : editing === "new" ? "new" : editing.supplier_id}`}
        supplier={editing}
        suppliers={suppliers}
        saving={saveSupplier.isPending}
        serverError={saveSupplier.error ? errorMessage(saveSupplier.error) : null}
        onClose={closeEditor}
        onSave={submitSupplier}
      />

      <PriceListModal
        key={`prices-${pricing?.supplier_id ?? "closed"}`}
        supplier={pricing}
        ingredients={ingredientsQuery.data ?? []}
        saving={savePriceList.isPending}
        onClose={() => setPricing(null)}
        onSave={submitPrices}
      />

      <DeliveryModal
        key={`delivery-${receiving ?? "closed"}`}
        initialSupplier={receiving}
        suppliers={suppliers}
        prices={prices}
        ingredients={ingredientsQuery.data ?? []}
        saving={recordDelivery.isPending}
        onClose={() => setReceiving(null)}
        onSave={submitDelivery}
      />

      <DeliveryDetailsModal delivery={viewing} onClose={() => setViewing(null)} />

      <Modal
        open={deactivating !== null}
        onClose={() => setDeactivating(null)}
        size="sm"
        title={`Deactivate ${deactivating?.supplier_name ?? ""}?`}
        description="You won't be able to record deliveries from them, and their prices stop counting toward stock value. Their delivery history is kept."
        footer={
          <>
            <Button onClick={() => setDeactivating(null)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={setSupplierActive.isPending}
              onClick={() => deactivating && setActive(deactivating, false)}
            >
              {setSupplierActive.isPending ? "Deactivating…" : "Deactivate"}
            </Button>
          </>
        }
      />
    </>
  );
}

function DeliveryDetailsModal({ delivery, onClose }: { delivery: Delivery | null; onClose: () => void }) {
  const details = useDelivery(delivery?.delivery_id ?? null);
  return (
    <Modal
      open={delivery !== null}
      onClose={onClose}
      title={delivery ? `Delivery from ${delivery.supplier_name}` : ""}
      description={delivery ? `${formatDate(delivery.delivery_date)} · received by ${delivery.employee_name}` : undefined}
    >
      {details.data ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--mgr-line) text-left text-xs text-(--mgr-muted)">
              <th scope="col" className="pb-2 font-medium">Ingredient</th>
              <th scope="col" className="pb-2 text-right font-medium">Received</th>
              <th scope="col" className="pb-2 text-right font-medium">Unit cost</th>
              <th scope="col" className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {details.data.items.map((i) => (
              <tr key={i.ingredient_id} className="border-b border-(--mgr-line)">
                <td className="py-2">{i.ingredient_name}</td>
                <td className="py-2 text-right tabular-nums">
                  {formatNumber(i.quantity_received)} {i.unit_of_measure}
                </td>
                <td className="py-2 text-right tabular-nums">{formatPeso(i.unit_cost)}</td>
                <td className="py-2 text-right tabular-nums">{formatPeso(i.quantity_received * i.unit_cost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3} className="pt-2 text-right font-semibold">Total</th>
              <td className="pt-2 text-right font-semibold tabular-nums">{formatPeso(details.data.total_cost)}</td>
            </tr>
          </tfoot>
        </table>
      ) : details.error ? (
        <ErrorNotice title="Couldn't load this delivery" error={details.error} onRetry={() => void details.refetch()} />
      ) : (
        <Loading />
      )}
    </Modal>
  );
}

interface SupplierModalProps {
  supplier: Supplier | "new" | null;
  suppliers: readonly Supplier[];
  saving: boolean;
  serverError: string | null;
  onClose: () => void;
  onSave: (fields: SupplierFields, image: ImageChange) => void;
}

function SupplierModal({ supplier, suppliers, saving, serverError, onClose, onSave }: SupplierModalProps) {
  const existing = supplier === "new" ? null : supplier;
  const [error, setError] = useState<string | null>(null);
  const image = useImageDraft(existing?.image_url ?? null);
  const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim() || null;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("supplier_name")).trim();
    const taken = suppliers.some(
      (s) => s.supplier_name.toLowerCase() === name.toLowerCase() && s.supplier_id !== existing?.supplier_id,
    );
    if (taken) return setError(`${name} is already on file.`);
    setError(null);
    onSave(
      {
        supplier_name: name,
        contact_person: text(form, "contact_person"),
        supplier_email: String(form.get("supplier_email")).trim(),
        contact_number: text(form, "contact_number"),
        supplier_address: text(form, "supplier_address"),
      },
      image.change,
    );
  };

  const shownError = error ?? serverError;

  return (
    <Modal
      open={supplier !== null}
      onClose={onClose}
      title={existing ? `Edit ${existing.supplier_name}` : "Add supplier"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="supplier-form" disabled={saving}>
            {saving ? "Saving…" : existing ? "Save changes" : "Add supplier"}
          </Button>
        </>
      }
    >
      <form id="supplier-form" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Company name" className="sm:col-span-2">
          <Input name="supplier_name" required maxLength={100} defaultValue={existing?.supplier_name} autoComplete="off" />
        </Field>
        <Field label="Contact person" hint="Optional">
          <Input name="contact_person" maxLength={50} defaultValue={existing?.contact_person ?? ""} autoComplete="off" />
        </Field>
        <Field label="Contact number" hint="Optional">
          <Input name="contact_number" type="tel" maxLength={20} defaultValue={existing?.contact_number ?? ""} autoComplete="off" />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <Input name="supplier_email" type="email" required maxLength={255} defaultValue={existing?.supplier_email} autoComplete="off" />
        </Field>
        <Field label="Address" hint="Optional" className="sm:col-span-2">
          <Input name="supplier_address" maxLength={150} defaultValue={existing?.supplier_address ?? ""} autoComplete="off" />
        </Field>
        <ImageField label="Logo" value={image.preview} onChange={image.onChange} className="sm:col-span-2" />
        {shownError && (
          <p role="alert" className="text-sm text-red-700 sm:col-span-2">
            {shownError}
          </p>
        )}
      </form>
    </Modal>
  );
}

interface PriceListModalProps {
  supplier: Supplier | null;
  ingredients: readonly Ingredient[];
  saving: boolean;
  onClose: () => void;
  onSave: (supplier: Supplier, rows: Pick<SupplierIngredient, "ingredient_id" | "unit_price">[]) => void;
}

/** Waits for the saved price list, so editing starts from what's on file. */
function PriceListModal(props: PriceListModalProps) {
  const { supplier, onClose } = props;
  const list = usePriceList(supplier?.supplier_id ?? null);

  return (
    <Modal
      open={supplier !== null}
      onClose={onClose}
      size="lg"
      title={`${supplier?.supplier_name ?? ""} price list`}
      description="What they supply and the agreed price per unit. Deliveries start from these prices."
    >
      {list.data && supplier ? (
        <PriceListEditor {...props} supplier={supplier} saved={list.data} />
      ) : list.error ? (
        <ErrorNotice title="Couldn't load the price list" error={list.error} onRetry={() => void list.refetch()} />
      ) : (
        <Loading />
      )}
    </Modal>
  );
}

function PriceListEditor({
  supplier,
  saved,
  ingredients,
  saving,
  onClose,
  onSave,
}: PriceListModalProps & { supplier: Supplier; saved: readonly SupplierIngredient[] }) {
  const [rows, setRows] = useState(() => saved.map((si) => ({ ingredient_id: si.ingredient_id, price: String(si.unit_price) })));
  const [adding, setAdding] = useState("");
  const byId = indexBy(ingredients, (i) => i.ingredient_id);
  const savedById = indexBy(saved, (si) => si.ingredient_id);
  const listed = new Set(rows.map((r) => r.ingredient_id));
  const choices = ingredients.filter((i) => i.is_active && !listed.has(i.ingredient_id));
  const invalid = rows.some((r) => r.price === "" || Number(r.price) < 0);

  return (
    <>
      <ul className="divide-y divide-(--mgr-line)">
        {rows.map((r) => {
          const name = byId.get(r.ingredient_id)?.ingredient_name ?? savedById.get(r.ingredient_id)?.ingredient_name;
          const unit = byId.get(r.ingredient_id)?.unit_of_measure ?? savedById.get(r.ingredient_id)?.unit_of_measure;
          return (
            <li key={r.ingredient_id} className="flex items-center gap-3 py-2">
              <span className="flex-1 text-sm font-medium">{name}</span>
              <label className="flex items-center gap-2 text-sm text-(--mgr-muted)">
                ₱
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  aria-label={`Price per ${unit} of ${name}`}
                  value={r.price}
                  onChange={(e) => setRows(rows.map((x) => (x.ingredient_id === r.ingredient_id ? { ...x, price: e.target.value } : x)))}
                  className={`${INPUT_BASE} w-28`}
                />
                per {unit}
              </label>
              <RowAction
                icon={FiX}
                label={`Remove ${name}`}
                onClick={() => setRows(rows.filter((x) => x.ingredient_id !== r.ingredient_id))}
              />
            </li>
          );
        })}
        {rows.length === 0 && <li className="py-6 text-center text-sm text-(--mgr-muted)">Nothing listed yet.</li>}
      </ul>
      {choices.length > 0 && (
        <div className="mt-4 flex gap-2">
          <Select aria-label="Ingredient to add" value={adding} onChange={(e) => setAdding(e.target.value)}>
            <option value="">Add an ingredient…</option>
            {choices.map((i) => (
              <option key={i.ingredient_id} value={i.ingredient_id}>{i.ingredient_name}</option>
            ))}
          </Select>
          <Button
            icon={FiPlus}
            disabled={!adding}
            onClick={() => {
              setRows([...rows, { ingredient_id: Number(adding), price: "" }]);
              setAdding("");
            }}
          >
            Add
          </Button>
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2 border-t border-(--mgr-line) pt-4">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          disabled={invalid || saving}
          onClick={() =>
            onSave(
              supplier,
              rows.map((r) => ({ ingredient_id: r.ingredient_id, unit_price: round2(Number(r.price)) })),
            )
          }
        >
          {saving ? "Saving…" : "Save price list"}
        </Button>
      </div>
    </>
  );
}

interface DeliveryModalProps {
  /** A supplier to start with, or "pick" to choose one. */
  initialSupplier: number | "pick" | null;
  suppliers: readonly Supplier[];
  prices: ReadonlyMap<number, SupplierIngredient[]>;
  ingredients: readonly Ingredient[];
  saving: boolean;
  onClose: () => void;
  onSave: (draft: DeliveryInput) => void;
}

function DeliveryModal({ initialSupplier, suppliers, prices, ingredients, saving, onClose, onSave }: DeliveryModalProps) {
  const active = suppliers.filter((s) => s.is_active && (prices.get(s.supplier_id)?.length ?? 0) > 0);
  const today = dayKey(new Date());
  const [supplierId, setSupplierId] = useState(
    typeof initialSupplier === "number" ? initialSupplier : (active[0]?.supplier_id ?? 0),
  );
  const [date, setDate] = useState(today);
  const [lines, setLines] = useState<Record<number, { qty: string; cost: string }>>({});
  const onHand = indexBy(ingredients, (i) => i.ingredient_id);

  const priceList = prices.get(supplierId) ?? [];
  const line = (si: SupplierIngredient) => lines[si.ingredient_id] ?? { qty: "", cost: String(si.unit_price) };
  const filled = priceList.filter((si) => Number(line(si).qty) > 0);
  const invalid = filled.length === 0 || filled.some((si) => !(Number(line(si).cost) >= 0) || line(si).cost === "");
  const total = round2(sumBy(filled, (si) => Number(line(si).qty) * Number(line(si).cost)));

  return (
    <Modal
      open={initialSupplier !== null}
      onClose={onClose}
      size="lg"
      title="Record delivery"
      description="Enter what actually arrived. Leave an item blank if it wasn't delivered."
      footer={
        <>
          <span className="mr-auto self-center text-sm">
            Total <span className="font-semibold tabular-nums">{formatPeso(total)}</span>
          </span>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={invalid || saving}
            onClick={() =>
              onSave({
                supplier_id: supplierId,
                delivery_date: date,
                items: filled.map((si) => ({
                  ingredient_id: si.ingredient_id,
                  quantity_received: round2(Number(line(si).qty)),
                  unit_cost: round2(Number(line(si).cost)),
                })),
              })
            }
          >
            {saving ? "Recording…" : "Add to stock"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Supplier">
          <Select
            value={supplierId}
            onChange={(e) => {
              setSupplierId(Number(e.target.value));
              setLines({});
            }}
          >
            {active.map((s) => (
              <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Delivery date">
          <Input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </Field>
      </div>

      <table className="mt-5 w-full text-sm">
        <thead>
          <tr className="border-b border-(--mgr-line) text-left text-xs text-(--mgr-muted)">
            <th scope="col" className="pb-2 font-medium">Ingredient</th>
            <th scope="col" className="pb-2 font-medium">Received</th>
            <th scope="col" className="pb-2 font-medium">Unit cost (₱)</th>
          </tr>
        </thead>
        <tbody>
          {priceList.map((si) => {
            const l = line(si);
            const set = (patch: Partial<typeof l>) => setLines({ ...lines, [si.ingredient_id]: { ...l, ...patch } });
            return (
              <tr key={si.ingredient_id} className="border-b border-(--mgr-line)">
                <td className="py-2 pr-3">
                  <p className="font-medium">{si.ingredient_name}</p>
                  <p className="text-xs text-(--mgr-muted)">
                    On hand {formatNumber(onHand.get(si.ingredient_id)?.current_quantity ?? 0)} {si.unit_of_measure}
                  </p>
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      aria-label={`${si.ingredient_name} received`}
                      value={l.qty}
                      onChange={(e) => set({ qty: e.target.value })}
                      className={`${INPUT_BASE} w-28`}
                    />
                    <span className="text-xs text-(--mgr-muted)">{si.unit_of_measure}</span>
                  </div>
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    aria-label={`${si.ingredient_name} unit cost`}
                    value={l.cost}
                    onChange={(e) => set({ cost: e.target.value })}
                    className={`${INPUT_BASE} w-28`}
                  />
                </td>
              </tr>
            );
          })}
          {priceList.length === 0 && (
            <tr>
              <td colSpan={3} className="py-6 text-center text-(--mgr-muted)">
                {active.length === 0 ? "No active supplier has a price list yet." : "This supplier has no price list yet."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Modal>
  );
}
