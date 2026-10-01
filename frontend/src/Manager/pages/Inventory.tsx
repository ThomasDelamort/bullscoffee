import { useMemo, useState, type FormEvent } from "react";
import { FiAlertTriangle, FiArchive, FiBox, FiDollarSign, FiEdit2, FiPlus, FiRotateCcw, FiSliders, FiXOctagon } from "react-icons/fi";
import { Link } from "react-router-dom";
import { errorMessage } from "../../lib/api";
import { useProducts, useRecipes } from "../api/catalog";
import type { ImageChange } from "../api/forms";
import {
  useIngredients,
  useRecordMovement,
  useSaveIngredient,
  useSetIngredientActive,
  useStockMovements,
  type IngredientFields,
} from "../api/inventory";
import { usePriceLists, useSuppliers } from "../api/suppliers";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Input, Select } from "../components/Field";
import ImageField from "../components/ImageField";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { ErrorNotice, LoadingRow } from "../components/QueryState";
import RowAction from "../components/RowAction";
import SearchInput from "../components/SearchInput";
import StatCard from "../components/StatCard";
import { MOVEMENT_REASON, STOCK_STATE } from "../components/status";
import { FOCUS_RING } from "../components/styles";
import { EmptyRow, Table, Td, Th } from "../components/Table";
import Tabs from "../components/Tabs";
import { useNotifyError, useToast } from "../components/toastContext";
import { stockState } from "../data/selectors";
import { managerPath } from "../routes";
import type { Ingredient, StockMovementReason, SupplierIngredient } from "../types";
import { formatDateTime, formatNumber, formatPesoWhole, round2 } from "../utils/format";
import { useImageDraft } from "../utils/useImageDraft";

type View = "stock" | "movements";
type StockFilter = "all" | "low" | "out" | "inactive";
type ReasonFilter = StockMovementReason | "all";

const PAGE_SIZE = 50;
const UNITS = ["g", "kg", "ml", "L", "pc", "slice", "pack"];
const NO_IDS: readonly number[] = [];

export default function Inventory() {
  const notify = useToast();
  const notifyError = useNotifyError();
  const [view, setView] = useState<View>("stock");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState<ReasonFilter>("all");
  const [ingredientFilter, setIngredientFilter] = useState("all");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [adjusting, setAdjusting] = useState<Ingredient | null>(null);
  const [editing, setEditing] = useState<Ingredient | "new" | null>(null);
  const [retiring, setRetiring] = useState<Ingredient | null>(null);

  const ingredientsQuery = useIngredients();
  // The ingredient filter runs server-side; reasons are counted per tab, so that one stays client-side.
  const movementsQuery = useStockMovements(
    ingredientFilter === "all" ? {} : { ingredient_id: Number(ingredientFilter) },
  );
  const suppliersQuery = useSuppliers();
  const activeSupplierIds = useMemo(
    () => (suppliersQuery.data ?? []).filter((s) => s.is_active).map((s) => s.supplier_id),
    [suppliersQuery.data],
  );
  const { prices } = usePriceLists(activeSupplierIds);
  const products = useProducts();
  // Only the retire dialog needs recipes ("still used in ..."), so load them on demand.
  const productIds = useMemo(() => (products.data ?? []).map((p) => p.product_id), [products.data]);
  const { recipes } = useRecipes(retiring ? productIds : NO_IDS);

  const saveIngredient = useSaveIngredient();
  const setIngredientActive = useSetIngredientActive();
  const recordMovement = useRecordMovement();

  const allIngredients = useMemo(() => ingredientsQuery.data ?? [], [ingredientsQuery.data]);
  const supplierNames = useMemo(
    () => new Map((suppliersQuery.data ?? []).map((s) => [s.supplier_id, s.supplier_name])),
    [suppliersQuery.data],
  );
  const supplyOf = useMemo(() => {
    const byIngredient = new Map<number, SupplierIngredient[]>();
    for (const list of prices.values()) {
      for (const si of list) byIngredient.set(si.ingredient_id, [...(byIngredient.get(si.ingredient_id) ?? []), si]);
    }
    return byIngredient;
  }, [prices]);

  const active = allIngredients.filter((i) => i.is_active);
  const low = active.filter((i) => stockState(i) === "low");
  const out = active.filter((i) => stockState(i) === "out");
  const value = active.reduce((sum, i) => {
    const unitPrices = (supplyOf.get(i.ingredient_id) ?? []).map((si) => si.unit_price);
    return sum + (unitPrices.length ? i.current_quantity * Math.min(...unitPrices) : 0);
  }, 0);

  const q = query.trim().toLowerCase();
  const stockRows = allIngredients.filter((i) => {
    if (q && !i.ingredient_name.toLowerCase().includes(q)) return false;
    if (filter === "inactive") return !i.is_active;
    if (!i.is_active) return false;
    return filter === "all" || stockState(i) === filter;
  });

  // The API returns movements newest first.
  const allMovements = movementsQuery.data ?? [];
  const movements = allMovements.filter((m) => reason === "all" || m.reason === reason);
  const reasonCount = (r: StockMovementReason) => allMovements.filter((m) => m.reason === r).length;

  const closeEditor = () => {
    setEditing(null);
    saveIngredient.reset();
  };

  const submitIngredient = (fields: IngredientFields, image: ImageChange, openingStock: number) => {
    const ingredientId = editing === "new" || editing === null ? null : editing.ingredient_id;
    saveIngredient.mutate(
      { ingredientId, fields, image, openingStock },
      {
        onSuccess: () => {
          notify(ingredientId === null ? `${fields.ingredient_name} is now tracked.` : `${fields.ingredient_name} updated.`);
          closeEditor();
        },
      },
    );
  };

  const setActive = (i: Ingredient, is_active: boolean) =>
    setIngredientActive.mutate(
      { ingredientId: i.ingredient_id, is_active },
      {
        onSuccess: () => {
          notify(is_active ? `${i.ingredient_name} is tracked again.` : `${i.ingredient_name} was retired.`);
          setRetiring(null);
        },
        onError: notifyError,
      },
    );

  const usedBy = (i: Ingredient) =>
    (products.data ?? [])
      .filter((p) => (recipes.get(p.product_id) ?? []).some((r) => r.ingredient_id === i.ingredient_id))
      .map((p) => p.product_name);

  const failed = ingredientsQuery.error ?? (view === "movements" ? movementsQuery.error : null);

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock on hand for every ingredient. Deliveries add to it automatically; record waste and count corrections here."
        actions={
          view === "stock" ? (
            <Button variant="primary" icon={FiPlus} onClick={() => setEditing("new")}>
              Add ingredient
            </Button>
          ) : undefined
        }
      />

      {failed && (
        <ErrorNotice
          className="mb-6"
          title="Couldn't load inventory"
          error={failed}
          onRetry={() => void Promise.all([ingredientsQuery.refetch(), movementsQuery.refetch()])}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ingredients tracked" value={active.length} hint={`${allIngredients.length - active.length} retired`} icon={FiBox} />
        <StatCard label="Low stock" value={low.length} hint="At or below minimum" icon={FiAlertTriangle} />
        <StatCard label="Out of stock" value={out.length} hint={out.map((i) => i.ingredient_name).join(", ") || "None"} icon={FiXOctagon} />
        <StatCard label="Stock value" value={formatPesoWhole(value)} hint="At each item's cheapest supplier price" icon={FiDollarSign} />
      </div>

      <div className="mt-6 mb-4">
        <Tabs
          label="Section"
          value={view}
          onChange={(v) => {
            setView(v);
            setLimit(PAGE_SIZE);
          }}
          options={[
            { value: "stock", label: "Stock levels" },
            { value: "movements", label: "Movement log" },
          ]}
        />
      </div>

      {view === "stock" ? (
        <Card flush>
          <div className="flex flex-col gap-3 border-b border-(--mgr-line) p-4 lg:flex-row lg:items-center lg:justify-between">
            <Tabs
              label="Filter by stock level"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All", count: active.length },
                { value: "low", label: "Low", count: low.length },
                { value: "out", label: "Out", count: out.length },
                { value: "inactive", label: "Retired", count: allIngredients.length - active.length },
              ]}
            />
            <SearchInput value={query} onChange={setQuery} placeholder="Search ingredients" className="lg:w-64" />
          </div>

          <Table>
            <thead>
              <tr>
                <Th>Ingredient</Th>
                <Th className="text-right">On hand</Th>
                <Th>Level</Th>
                <Th>Status</Th>
                <Th>Suppliers</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {ingredientsQuery.isPending && <LoadingRow colSpan={6} label="Loading stock…" />}
              {stockRows.map((i) => {
                const state = stockState(i);
                const s = STOCK_STATE[state];
                const names = (supplyOf.get(i.ingredient_id) ?? []).map((si) => supplierNames.get(si.supplier_id));
                const pct = i.minimum_stock_level > 0 ? Math.min(100, (i.current_quantity / (i.minimum_stock_level * 2)) * 100) : i.current_quantity > 0 ? 100 : 0;
                return (
                  <tr key={i.ingredient_id} className="hover:bg-(--mgr-canvas)/50">
                    <Td>
                      <p className="font-medium">{i.ingredient_name}</p>
                      <p className="text-xs text-(--mgr-muted)">Minimum {formatNumber(i.minimum_stock_level)} {i.unit_of_measure}</p>
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatNumber(i.current_quantity)} <span className="text-(--mgr-muted)">{i.unit_of_measure}</span>
                    </Td>
                    <Td>
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-(--mgr-grid)" aria-hidden>
                        <div
                          className={`h-full rounded-full ${state === "out" ? "bg-red-500" : state === "low" ? "bg-amber-500" : "bg-(--mgr-chart)"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </Td>
                    <Td>
                      {i.is_active ? <Badge tone={s.tone} dot>{s.label}</Badge> : <Badge tone="neutral">Retired</Badge>}
                    </Td>
                    <Td className="max-w-56 truncate text-(--mgr-muted)">{names.join(", ") || "None on file"}</Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        {i.is_active ? (
                          <>
                            <RowAction icon={FiSliders} label={`Record stock in or out for ${i.ingredient_name}`} onClick={() => setAdjusting(i)} />
                            <RowAction icon={FiEdit2} label={`Edit ${i.ingredient_name}`} onClick={() => setEditing(i)} />
                            <RowAction icon={FiArchive} label={`Retire ${i.ingredient_name}`} danger onClick={() => setRetiring(i)} />
                          </>
                        ) : (
                          <RowAction
                            icon={FiRotateCcw}
                            label={`Track ${i.ingredient_name} again`}
                            disabled={setIngredientActive.isPending}
                            onClick={() => setActive(i, true)}
                          />
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {ingredientsQuery.isSuccess && stockRows.length === 0 && <EmptyRow colSpan={6}>No ingredients match.</EmptyRow>}
            </tbody>
          </Table>
        </Card>
      ) : (
        <Card flush>
          <div className="flex flex-col gap-3 border-b border-(--mgr-line) p-4 lg:flex-row lg:items-center lg:justify-between">
            <Tabs
              label="Filter by reason"
              value={reason}
              onChange={(r) => {
                setReason(r);
                setLimit(PAGE_SIZE);
              }}
              options={[
                { value: "all", label: "All" },
                { value: "sale", label: "Sales", count: reasonCount("sale") },
                { value: "delivery", label: "Deliveries", count: reasonCount("delivery") },
                { value: "waste", label: "Waste", count: reasonCount("waste") },
                { value: "adjustment", label: "Adjustments", count: reasonCount("adjustment") },
              ]}
            />
            <Select
              aria-label="Filter by ingredient"
              value={ingredientFilter}
              onChange={(e) => {
                setIngredientFilter(e.target.value);
                setLimit(PAGE_SIZE);
              }}
              className="lg:w-56"
            >
              <option value="all">All ingredients</option>
              {allIngredients.map((i) => (
                <option key={i.ingredient_id} value={i.ingredient_id}>{i.ingredient_name}</option>
              ))}
            </Select>
          </div>

          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Ingredient</Th>
                <Th className="text-right">Change</Th>
                <Th>Reason</Th>
                <Th>Recorded by</Th>
              </tr>
            </thead>
            <tbody>
              {movementsQuery.isPending && <LoadingRow colSpan={5} label="Loading movements…" />}
              {movements.slice(0, limit).map((m) => {
                const r = MOVEMENT_REASON[m.reason];
                return (
                  <tr key={m.movement_id} className="hover:bg-(--mgr-canvas)/50">
                    <Td className="text-(--mgr-muted)">{formatDateTime(m.moved_at)}</Td>
                    <Td className="font-medium">{m.ingredient_name}</Td>
                    <Td className={`text-right font-medium tabular-nums ${m.quantity_change > 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {m.quantity_change > 0 ? "+" : "−"}
                      {formatNumber(Math.abs(m.quantity_change))} {m.unit_of_measure}
                    </Td>
                    <Td>
                      <Badge tone={r.tone}>{r.label}</Badge>
                    </Td>
                    <Td className="text-(--mgr-muted)">{m.employee_name}</Td>
                  </tr>
                );
              })}
              {movementsQuery.isSuccess && movements.length === 0 && (
                <EmptyRow colSpan={5}>No movements match these filters.</EmptyRow>
              )}
            </tbody>
          </Table>
          {movements.length > limit && (
            <div className="flex items-center justify-between gap-3 px-5 py-3 text-sm text-(--mgr-muted)">
              <span>
                Showing {limit} of {formatNumber(movements.length)}
              </span>
              <Button size="sm" onClick={() => setLimit(limit + PAGE_SIZE)}>
                Show more
              </Button>
            </div>
          )}
        </Card>
      )}

      <MovementModal
        key={`movement-${adjusting?.ingredient_id ?? "closed"}`}
        ingredient={adjusting}
        saving={recordMovement.isPending}
        onClose={() => setAdjusting(null)}
        onSave={(change, why) => {
          if (!adjusting) return;
          recordMovement.mutate(
            { ingredient_id: adjusting.ingredient_id, quantity_change: change, reason: why },
            {
              onSuccess: () => {
                notify(
                  `${change > 0 ? "Added" : "Removed"} ${formatNumber(Math.abs(change))} ${adjusting.unit_of_measure} of ${adjusting.ingredient_name}.`,
                );
                setAdjusting(null);
              },
              onError: notifyError,
            },
          );
        }}
      />

      <IngredientModal
        key={`ingredient-${editing === null ? "closed" : editing === "new" ? "new" : editing.ingredient_id}`}
        ingredient={editing}
        ingredients={allIngredients}
        saving={saveIngredient.isPending}
        serverError={saveIngredient.error ? errorMessage(saveIngredient.error) : null}
        onClose={closeEditor}
        onSave={submitIngredient}
      />

      <Modal
        open={retiring !== null}
        onClose={() => setRetiring(null)}
        size="sm"
        title={`Retire ${retiring?.ingredient_name ?? ""}?`}
        description={
          retiring && usedBy(retiring).length
            ? `It's still in the recipe for ${usedBy(retiring).join(", ")}. Those products will show as out of stock until you change their recipes.`
            : "It stops appearing in stock alerts and recipe choices. Its movement history is kept."
        }
        footer={
          <>
            <Button onClick={() => setRetiring(null)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={setIngredientActive.isPending}
              onClick={() => retiring && setActive(retiring, false)}
            >
              {setIngredientActive.isPending ? "Retiring…" : "Retire"}
            </Button>
          </>
        }
      />
    </>
  );
}

interface MovementModalProps {
  ingredient: Ingredient | null;
  saving: boolean;
  onClose: () => void;
  onSave: (quantityChange: number, reason: "waste" | "adjustment") => void;
}

function MovementModal({ ingredient, saving, onClose, onSave }: MovementModalProps) {
  const [direction, setDirection] = useState<"in" | "out">("out");
  const [reason, setReason] = useState<"waste" | "adjustment">("waste");
  const [quantity, setQuantity] = useState("");
  const qty = Number(quantity) || 0;
  const onHand = ingredient?.current_quantity ?? 0;
  const tooMuch = direction === "out" && qty > onHand;
  const after = round2(direction === "in" ? onHand + qty : onHand - qty);

  return (
    <Modal
      open={ingredient !== null}
      onClose={onClose}
      title={`Stock in or out: ${ingredient?.ingredient_name ?? ""}`}
      description={`On hand: ${formatNumber(onHand)} ${ingredient?.unit_of_measure ?? ""}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={qty <= 0 || tooMuch || saving}
            onClick={() => onSave(direction === "in" ? qty : -qty, reason)}
          >
            {saving ? "Recording…" : "Record"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div role="radiogroup" aria-label="Direction" className="grid grid-cols-2 gap-1 rounded-xl bg-(--mgr-ink)/5 p-1">
          {(["out", "in"] as const).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={direction === d}
              onClick={() => {
                setDirection(d);
                setReason(d === "in" ? "adjustment" : "waste");
              }}
              className={`rounded-lg py-1.5 text-sm font-medium ${FOCUS_RING} ${
                direction === d ? "bg-(--mgr-surface) shadow-sm" : "text-(--mgr-muted) hover:text-(--mgr-ink)"
              }`}
            >
              {d === "out" ? "Stock out" : "Stock in"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={`Quantity (${ingredient?.unit_of_measure ?? ""})`} hint={tooMuch ? "More than is on hand." : undefined}>
            <Input type="number" min={0.01} step="0.01" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
          </Field>
          <Field label="Reason">
            <Select value={reason} onChange={(e) => setReason(e.target.value as "waste" | "adjustment")}>
              {direction === "out" && <option value="waste">Waste (spoiled, spilled, expired)</option>}
              <option value="adjustment">Count correction</option>
            </Select>
          </Field>
        </div>

        {direction === "in" && (
          <p className="text-xs text-(--mgr-muted)">
            Receiving from a supplier? Record it as a{" "}
            <Link to={managerPath("suppliers")} className="font-medium text-(--mgr-ink) underline underline-offset-2">
              delivery
            </Link>{" "}
            so costs are tracked too.
          </p>
        )}
        {qty > 0 && !tooMuch && (
          <p className="text-sm">
            New on-hand: <span className="font-semibold tabular-nums">{formatNumber(after)} {ingredient?.unit_of_measure}</span>
          </p>
        )}
      </div>
    </Modal>
  );
}

interface IngredientModalProps {
  ingredient: Ingredient | "new" | null;
  ingredients: readonly Ingredient[];
  saving: boolean;
  serverError: string | null;
  onClose: () => void;
  onSave: (fields: IngredientFields, image: ImageChange, openingStock: number) => void;
}

function IngredientModal({ ingredient, ingredients, saving, serverError, onClose, onSave }: IngredientModalProps) {
  const existing = ingredient === "new" ? null : ingredient;
  const [error, setError] = useState<string | null>(null);
  const image = useImageDraft(existing?.image_url ?? null);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("ingredient_name")).trim();
    const taken = ingredients.some(
      (i) => i.ingredient_name.toLowerCase() === name.toLowerCase() && i.ingredient_id !== existing?.ingredient_id,
    );
    if (taken) return setError(`${name} is already tracked.`);
    setError(null);
    onSave(
      {
        ingredient_name: name,
        unit_of_measure: String(form.get("unit_of_measure")).trim(),
        minimum_stock_level: Number(form.get("minimum_stock_level")) || 0,
      },
      image.change,
      Number(form.get("opening_stock")) || 0,
    );
  };

  const shownError = error ?? serverError;

  return (
    <Modal
      open={ingredient !== null}
      onClose={onClose}
      title={existing ? `Edit ${existing.ingredient_name}` : "Add ingredient"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="ingredient-form" disabled={saving}>
            {saving ? "Saving…" : existing ? "Save changes" : "Add ingredient"}
          </Button>
        </>
      }
    >
      <form id="ingredient-form" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          <Input name="ingredient_name" required maxLength={100} defaultValue={existing?.ingredient_name} autoComplete="off" />
        </Field>
        <Field label="Unit of measure" hint="Recipes and stock use this unit.">
          <Input name="unit_of_measure" required maxLength={20} list="units" defaultValue={existing?.unit_of_measure} autoComplete="off" />
          <datalist id="units">
            {UNITS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </Field>
        <Field label="Minimum stock level" hint="Below this it shows as low stock.">
          <Input name="minimum_stock_level" type="number" required min={0} step="0.01" defaultValue={existing?.minimum_stock_level ?? 0} />
        </Field>
        {!existing && (
          <Field label="Opening stock" hint="Recorded as a count correction." className="sm:col-span-2">
            <Input name="opening_stock" type="number" min={0} step="0.01" defaultValue={0} />
          </Field>
        )}
        <ImageField label="Image" value={image.preview} onChange={image.onChange} className="sm:col-span-2" />
        {shownError && (
          <p role="alert" className="text-sm text-red-700 sm:col-span-2">
            {shownError}
          </p>
        )}
      </form>
    </Modal>
  );
}
