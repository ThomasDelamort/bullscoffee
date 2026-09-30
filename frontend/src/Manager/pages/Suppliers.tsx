import { useMemo, useState, type FormEvent } from "react";
import { FiEdit2, FiEye, FiList, FiPlus, FiRotateCcw, FiTruck, FiX, FiXCircle } from "react-icons/fi";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Input, Select } from "../components/Field";
import ImageField from "../components/ImageField";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import RowAction from "../components/RowAction";
import SearchInput from "../components/SearchInput";
import { INPUT_BASE } from "../components/styles";
import { EmptyRow, Table, Td, Th } from "../components/Table";
import Tabs from "../components/Tabs";
import { useToast } from "../components/toastContext";
import { useManagerData, type DeliveryDraft } from "../data/dataContext";
import type { Delivery, Supplier, SupplierIngredient } from "../types";
import { groupBy, indexBy, nextId, sumBy } from "../utils/collections";
import { dayKey } from "../utils/dates";
import { formatDate, formatNumber, formatPeso, fullName, round2 } from "../utils/format";

type View = "suppliers" | "deliveries";
type StatusFilter = "active" | "inactive" | "all";
type SupplierForm = Omit<Supplier, "supplier_id" | "is_active" | "created_at">;

const PAGE_SIZE = 25;

export default function Suppliers() {
  const { db, update, recordDelivery } = useManagerData();
  const notify = useToast();
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

  const ingredients = useMemo(() => indexBy(db.ingredients, (i) => i.ingredient_id), [db.ingredients]);
  const employees = useMemo(() => indexBy(db.employees, (e) => e.employee_id), [db.employees]);
  const suppliers = useMemo(() => indexBy(db.suppliers, (s) => s.supplier_id), [db.suppliers]);
  const priceLists = useMemo(() => groupBy(db.supplier_ingredients, (si) => si.supplier_id), [db.supplier_ingredients]);
  const itemsByDelivery = useMemo(() => groupBy(db.delivery_items, (i) => i.delivery_id), [db.delivery_items]);
  const lastDelivery = useMemo(() => {
    const last = new Map<number, string>();
    for (const d of db.deliveries) {
      if ((last.get(d.supplier_id) ?? "") < d.delivery_date) last.set(d.supplier_id, d.delivery_date);
    }
    return last;
  }, [db.deliveries]);

  const count = (s: Exclude<StatusFilter, "all">) => db.suppliers.filter((x) => x.is_active === (s === "active")).length;
  const q = query.trim().toLowerCase();
  const visibleSuppliers = db.suppliers.filter(
    (s) =>
      (status === "all" || s.is_active === (status === "active")) &&
      (!q || s.supplier_name.toLowerCase().includes(q) || (s.contact_person ?? "").toLowerCase().includes(q)),
  );
  const deliveries = db.deliveries
    .filter((d) => supplierFilter === "all" || String(d.supplier_id) === supplierFilter)
    .sort((a, b) => b.delivery_date.localeCompare(a.delivery_date) || b.delivery_id - a.delivery_id);
  const costOf = (deliveryId: number) =>
    round2(sumBy(itemsByDelivery.get(deliveryId) ?? [], (i) => i.quantity_received * i.unit_cost));

  const saveSupplier = (form: SupplierForm) => {
    if (editing === "new") {
      update("suppliers", (rows) => [
        ...rows,
        { ...form, supplier_id: nextId(rows, (s) => s.supplier_id), is_active: true, created_at: new Date().toISOString() },
      ]);
      notify(`${form.supplier_name} added. Set up their price list next.`);
    } else if (editing) {
      update("suppliers", (rows) => rows.map((s) => (s.supplier_id === editing.supplier_id ? { ...s, ...form } : s)));
      notify(`${form.supplier_name} updated.`);
    }
    setEditing(null);
  };

  const setActive = (s: Supplier, is_active: boolean) => {
    update("suppliers", (rows) => rows.map((x) => (x.supplier_id === s.supplier_id ? { ...x, is_active } : x)));
    notify(is_active ? `${s.supplier_name} is active again.` : `${s.supplier_name} was deactivated.`);
  };

  const savePrices = (supplier: Supplier, rows: SupplierIngredient[]) => {
    update("supplier_ingredients", (all) => [...all.filter((si) => si.supplier_id !== supplier.supplier_id), ...rows]);
    notify(`${supplier.supplier_name}'s price list saved.`);
    setPricing(null);
  };

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

      <div className="mb-4">
        <Tabs
          label="Section"
          value={view}
          onChange={(v) => {
            setView(v);
            setLimit(PAGE_SIZE);
          }}
          options={[
            { value: "suppliers", label: "Suppliers", count: db.suppliers.length },
            { value: "deliveries", label: "Deliveries", count: db.deliveries.length },
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
                { value: "all", label: "All", count: db.suppliers.length },
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
              {visibleSuppliers.map((s) => {
                const items = (priceLists.get(s.supplier_id) ?? []).map((si) => ingredients.get(si.ingredient_id)?.ingredient_name);
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
                      {items.length ? `${items.slice(0, 3).join(", ")}${items.length > 3 ? ` +${items.length - 3}` : ""}` : "No price list yet"}
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
                          <RowAction icon={FiRotateCcw} label={`Reactivate ${s.supplier_name}`} onClick={() => setActive(s, true)} />
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {visibleSuppliers.length === 0 && <EmptyRow colSpan={6}>No suppliers match.</EmptyRow>}
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
              {db.suppliers.map((s) => (
                <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
              ))}
            </Select>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Supplier</Th>
                <Th>Items</Th>
                <Th>Received by</Th>
                <Th className="text-right">Cost</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {deliveries.slice(0, limit).map((d) => {
                const items = itemsByDelivery.get(d.delivery_id) ?? [];
                const receiver = employees.get(d.employee_id);
                return (
                  <tr key={d.delivery_id} className="hover:bg-(--mgr-canvas)/50">
                    <Td>{formatDate(d.delivery_date)}</Td>
                    <Td className="font-medium">{suppliers.get(d.supplier_id)?.supplier_name}</Td>
                    <Td className="max-w-72 truncate text-(--mgr-muted)">
                      {items.map((i) => ingredients.get(i.ingredient_id)?.ingredient_name).join(", ")}
                    </Td>
                    <Td className="text-(--mgr-muted)">{receiver ? fullName(receiver) : "—"}</Td>
                    <Td className="text-right tabular-nums">{formatPeso(costOf(d.delivery_id))}</Td>
                    <Td className="text-right">
                      <RowAction icon={FiEye} label={`View delivery #${d.delivery_id}`} onClick={() => setViewing(d)} />
                    </Td>
                  </tr>
                );
              })}
              {deliveries.length === 0 && <EmptyRow colSpan={6}>No deliveries recorded.</EmptyRow>}
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
        onClose={() => setEditing(null)}
        onSave={saveSupplier}
      />

      <PriceListModal key={`prices-${pricing?.supplier_id ?? "closed"}`} supplier={pricing} onClose={() => setPricing(null)} onSave={savePrices} />

      <DeliveryModal
        key={`delivery-${receiving ?? "closed"}`}
        initialSupplier={receiving}
        onClose={() => setReceiving(null)}
        onSave={(draft) => {
          recordDelivery(draft);
          notify(`Delivery from ${suppliers.get(draft.supplier_id)?.supplier_name} recorded. Stock updated for ${draft.items.length} ${draft.items.length === 1 ? "ingredient" : "ingredients"}.`);
          setReceiving(null);
        }}
      />

      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing ? `Delivery from ${suppliers.get(viewing.supplier_id)?.supplier_name}` : ""}
        description={
          viewing
            ? `${formatDate(viewing.delivery_date)} · received by ${fullName(employees.get(viewing.employee_id) ?? { first_name: "?", last_name: "" })}`
            : undefined
        }
      >
        {viewing && (
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
              {(itemsByDelivery.get(viewing.delivery_id) ?? []).map((i) => {
                const ing = ingredients.get(i.ingredient_id);
                return (
                  <tr key={i.ingredient_id} className="border-b border-(--mgr-line)">
                    <td className="py-2">{ing?.ingredient_name}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatNumber(i.quantity_received)} {ing?.unit_of_measure}
                    </td>
                    <td className="py-2 text-right tabular-nums">{formatPeso(i.unit_cost)}</td>
                    <td className="py-2 text-right tabular-nums">{formatPeso(i.quantity_received * i.unit_cost)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={3} className="pt-2 text-right font-semibold">Total</th>
                <td className="pt-2 text-right font-semibold tabular-nums">{formatPeso(costOf(viewing.delivery_id))}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </Modal>

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
              onClick={() => {
                if (deactivating) setActive(deactivating, false);
                setDeactivating(null);
              }}
            >
              Deactivate
            </Button>
          </>
        }
      />
    </>
  );
}

interface SupplierModalProps {
  supplier: Supplier | "new" | null;
  onClose: () => void;
  onSave: (form: SupplierForm) => void;
}

function SupplierModal({ supplier, onClose, onSave }: SupplierModalProps) {
  const { db } = useManagerData();
  const existing = supplier === "new" ? null : supplier;
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState(existing?.image_url ?? null);
  const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim() || null;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("supplier_name")).trim();
    const taken = db.suppliers.some(
      (s) => s.supplier_name.toLowerCase() === name.toLowerCase() && s.supplier_id !== existing?.supplier_id,
    );
    if (taken) return setError(`${name} is already on file.`);
    onSave({
      supplier_name: name,
      contact_person: text(form, "contact_person"),
      supplier_email: String(form.get("supplier_email")).trim(),
      contact_number: text(form, "contact_number"),
      supplier_address: text(form, "supplier_address"),
      image_url: image,
    });
  };

  return (
    <Modal
      open={supplier !== null}
      onClose={onClose}
      title={existing ? `Edit ${existing.supplier_name}` : "Add supplier"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="supplier-form">
            {existing ? "Save changes" : "Add supplier"}
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
        <ImageField label="Logo" value={image} onChange={setImage} className="sm:col-span-2" />
        {error && (
          <p role="alert" className="text-sm text-red-700 sm:col-span-2">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

interface PriceListModalProps {
  supplier: Supplier | null;
  onClose: () => void;
  onSave: (supplier: Supplier, rows: SupplierIngredient[]) => void;
}

function PriceListModal({ supplier, onClose, onSave }: PriceListModalProps) {
  const { db } = useManagerData();
  const [rows, setRows] = useState(() =>
    db.supplier_ingredients
      .filter((si) => si.supplier_id === supplier?.supplier_id)
      .map((si) => ({ ingredient_id: si.ingredient_id, price: String(si.unit_price) })),
  );
  const [adding, setAdding] = useState("");
  const listed = new Set(rows.map((r) => r.ingredient_id));
  const choices = db.ingredients.filter((i) => i.is_active && !listed.has(i.ingredient_id));
  const invalid = rows.some((r) => r.price === "" || Number(r.price) < 0);
  const unit = (id: number) => db.ingredients.find((i) => i.ingredient_id === id);

  return (
    <Modal
      open={supplier !== null}
      onClose={onClose}
      size="lg"
      title={`${supplier?.supplier_name ?? ""} price list`}
      description="What they supply and the agreed price per unit. Deliveries start from these prices."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={invalid}
            onClick={() =>
              supplier &&
              onSave(
                supplier,
                rows.map((r) => ({ supplier_id: supplier.supplier_id, ingredient_id: r.ingredient_id, unit_price: round2(Number(r.price)) })),
              )
            }
          >
            Save price list
          </Button>
        </>
      }
    >
      <ul className="divide-y divide-(--mgr-line)">
        {rows.map((r) => {
          const ing = unit(r.ingredient_id);
          return (
            <li key={r.ingredient_id} className="flex items-center gap-3 py-2">
              <span className="flex-1 text-sm font-medium">{ing?.ingredient_name}</span>
              <label className="flex items-center gap-2 text-sm text-(--mgr-muted)">
                ₱
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  aria-label={`Price per ${ing?.unit_of_measure} of ${ing?.ingredient_name}`}
                  value={r.price}
                  onChange={(e) => setRows(rows.map((x) => (x.ingredient_id === r.ingredient_id ? { ...x, price: e.target.value } : x)))}
                  className={`${INPUT_BASE} w-28`}
                />
                per {ing?.unit_of_measure}
              </label>
              <RowAction
                icon={FiX}
                label={`Remove ${ing?.ingredient_name}`}
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
    </Modal>
  );
}

interface DeliveryModalProps {
  /** A supplier to start with, or "pick" to choose one. */
  initialSupplier: number | "pick" | null;
  onClose: () => void;
  onSave: (draft: DeliveryDraft) => void;
}

function DeliveryModal({ initialSupplier, onClose, onSave }: DeliveryModalProps) {
  const { db } = useManagerData();
  const active = db.suppliers.filter((s) => s.is_active && db.supplier_ingredients.some((si) => si.supplier_id === s.supplier_id));
  const today = dayKey(new Date());
  const [supplierId, setSupplierId] = useState(
    typeof initialSupplier === "number" ? initialSupplier : (active[0]?.supplier_id ?? 0),
  );
  const [date, setDate] = useState(today);
  const [lines, setLines] = useState<Record<number, { qty: string; cost: string }>>({});

  const priceList = db.supplier_ingredients.filter((si) => si.supplier_id === supplierId);
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
            disabled={invalid}
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
            Add to stock
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
            const ing = db.ingredients.find((i) => i.ingredient_id === si.ingredient_id);
            const l = line(si);
            const set = (patch: Partial<typeof l>) => setLines({ ...lines, [si.ingredient_id]: { ...l, ...patch } });
            return (
              <tr key={si.ingredient_id} className="border-b border-(--mgr-line)">
                <td className="py-2 pr-3">
                  <p className="font-medium">{ing?.ingredient_name}</p>
                  <p className="text-xs text-(--mgr-muted)">
                    On hand {formatNumber(ing?.current_quantity ?? 0)} {ing?.unit_of_measure}
                  </p>
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      aria-label={`${ing?.ingredient_name} received`}
                      value={l.qty}
                      onChange={(e) => set({ qty: e.target.value })}
                      className={`${INPUT_BASE} w-28`}
                    />
                    <span className="text-xs text-(--mgr-muted)">{ing?.unit_of_measure}</span>
                  </div>
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    aria-label={`${ing?.ingredient_name} unit cost`}
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
                This supplier has no price list yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Modal>
  );
}
