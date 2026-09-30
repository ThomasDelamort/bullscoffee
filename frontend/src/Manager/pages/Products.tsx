import { useMemo, useState, type FormEvent } from "react";
import { FiEdit2, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Input, Select, TextArea } from "../components/Field";
import ImageField from "../components/ImageField";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import RowAction from "../components/RowAction";
import SearchInput from "../components/SearchInput";
import { INPUT_BASE } from "../components/styles";
import { EmptyRow, Table, Td, Th } from "../components/Table";
import Tabs from "../components/Tabs";
import Toggle from "../components/Toggle";
import { useToast } from "../components/toastContext";
import { useManagerData } from "../data/dataContext";
import { makeableCount } from "../data/selectors";
import type { Category, Product, ProductIngredient } from "../types";
import { groupBy, indexBy, nextId } from "../utils/collections";
import { formatNumber, formatPeso, initials } from "../utils/format";
import { SIZES } from "../utils/pricing";

type View = "products" | "categories";
type Availability = "all" | "available" | "unavailable";
type ProductForm = Omit<Product, "product_id" | "created_at">;
type RecipeLine = Omit<ProductIngredient, "product_id">;

const SIZE_HINT = SIZES.filter((s) => s.upcharge)
  .map((s) => `${s.label} +₱${s.upcharge}`)
  .join(", ");

export default function Products() {
  const { db, update } = useManagerData();
  const notify = useToast();
  const [view, setView] = useState<View>("products");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availability, setAvailability] = useState<Availability>("all");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | "new" | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const ingredients = useMemo(() => indexBy(db.ingredients, (i) => i.ingredient_id), [db.ingredients]);
  const recipes = useMemo(() => groupBy(db.product_ingredients, (r) => r.product_id), [db.product_ingredients]);
  const categories = useMemo(() => indexBy(db.categories, (c) => c.category_id), [db.categories]);
  const orderCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const i of db.order_items) counts.set(i.product_id, (counts.get(i.product_id) ?? 0) + 1);
    return counts;
  }, [db.order_items]);

  const inFilters = db.products.filter((p) => {
    const q = query.trim().toLowerCase();
    return (
      (categoryFilter === "all" || String(p.category_id) === categoryFilter) &&
      (!q || p.product_name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q))
    );
  });
  const visible = inFilters.filter(
    (p) => availability === "all" || (availability === "available") === p.is_available,
  );

  const patchProduct = (id: number, change: Partial<Product>) =>
    update("products", (rows) => rows.map((p) => (p.product_id === id ? { ...p, ...change } : p)));

  const saveProduct = (form: ProductForm, recipe: RecipeLine[]) => {
    const product_id = editing === "new" || editing === null ? nextId(db.products, (p) => p.product_id) : editing.product_id;
    if (editing === "new") {
      update("products", (rows) => [...rows, { ...form, product_id, created_at: new Date().toISOString() }]);
      notify(`${form.product_name} added to the menu.`);
    } else {
      patchProduct(product_id, form);
      notify(`${form.product_name} updated.`);
    }
    update("product_ingredients", (rows) => [
      ...rows.filter((r) => r.product_id !== product_id),
      ...recipe.map((r) => ({ ...r, product_id })),
    ]);
    setEditing(null);
  };

  const setAvailable = (p: Product, is_available: boolean) => {
    patchProduct(p.product_id, { is_available });
    notify(is_available ? `${p.product_name} is back on the menu.` : `${p.product_name} is hidden from the POS.`);
  };

  const recategorize = (p: Product, category_id: number) => {
    patchProduct(p.product_id, { category_id });
    notify(`${p.product_name} moved to ${categories.get(category_id)?.category_name}.`);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    update("products", (rows) => rows.filter((p) => p.product_id !== deleting.product_id));
    // product_ingredients cascades with the product.
    update("product_ingredients", (rows) => rows.filter((r) => r.product_id !== deleting.product_id));
    notify(`${deleting.product_name} deleted.`);
    setDeleting(null);
  };

  const saveCategory = (form: Omit<Category, "category_id">) => {
    if (editingCategory === "new") {
      update("categories", (rows) => [...rows, { ...form, category_id: nextId(rows, (c) => c.category_id) }]);
      notify(`${form.category_name} category created.`);
    } else if (editingCategory) {
      update("categories", (rows) =>
        rows.map((c) => (c.category_id === editingCategory.category_id ? { ...c, ...form } : c)),
      );
      notify(`${form.category_name} category updated.`);
    }
    setEditingCategory(null);
  };

  const confirmDeleteCategory = () => {
    if (!deletingCategory) return;
    update("categories", (rows) => rows.filter((c) => c.category_id !== deletingCategory.category_id));
    notify(`${deletingCategory.category_name} category deleted.`);
    setDeletingCategory(null);
  };

  const deletingOrders = deleting ? (orderCounts.get(deleting.product_id) ?? 0) : 0;
  const categoryProducts = deletingCategory
    ? db.products.filter((p) => p.category_id === deletingCategory.category_id).length
    : 0;

  return (
    <>
      <PageHeader
        title="Products"
        description="Add, edit and categorise menu items, set their recipes, and take them off the POS when they can't be made."
        actions={
          view === "products" ? (
            <Button variant="primary" icon={FiPlus} onClick={() => setEditing("new")} disabled={db.categories.length === 0}>
              Add product
            </Button>
          ) : (
            <Button variant="primary" icon={FiPlus} onClick={() => setEditingCategory("new")}>
              Add category
            </Button>
          )
        }
      />

      <div className="mb-4">
        <Tabs
          label="Section"
          value={view}
          onChange={setView}
          options={[
            { value: "products", label: "Products", count: db.products.length },
            { value: "categories", label: "Categories", count: db.categories.length },
          ]}
        />
      </div>

      {view === "products" ? (
        <Card flush>
          <div className="flex flex-col gap-3 border-b border-(--mgr-line) p-4 lg:flex-row lg:items-center lg:justify-between">
            <Tabs
              label="Filter by availability"
              value={availability}
              onChange={setAvailability}
              options={[
                { value: "all", label: "All", count: inFilters.length },
                { value: "available", label: "Available", count: inFilters.filter((p) => p.is_available).length },
                { value: "unavailable", label: "Unavailable", count: inFilters.filter((p) => !p.is_available).length },
              ]}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <SearchInput value={query} onChange={setQuery} placeholder="Search products" className="sm:w-60" />
              <Select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="sm:w-44"
              >
                <option value="all">All categories</option>
                {db.categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                ))}
              </Select>
            </div>
          </div>

          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Category</Th>
                <Th className="text-right">Price</Th>
                <Th>Stock</Th>
                <Th>Available</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const recipe = recipes.get(p.product_id) ?? [];
                const makeable = makeableCount(recipe, ingredients);
                return (
                  <tr key={p.product_id} className="hover:bg-(--mgr-canvas)/50">
                    <Td>
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span
                            aria-hidden
                            className="grid size-10 shrink-0 place-items-center rounded-lg bg-(--mgr-accent)/12 text-xs font-semibold"
                          >
                            {initials(p.product_name)}
                          </span>
                        )}
                        <div className="max-w-64 min-w-0">
                          <p className="font-medium">{p.product_name}</p>
                          <p className="truncate text-xs text-(--mgr-muted)">{p.description || "No description"}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <select
                        aria-label={`Category for ${p.product_name}`}
                        value={p.category_id}
                        onChange={(e) => recategorize(p, Number(e.target.value))}
                        className={`${INPUT_BASE} w-36`}
                      >
                        {db.categories.map((c) => (
                          <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                        ))}
                      </select>
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatPeso(p.price)}
                      {p.has_sizes && <span className="block text-xs text-(--mgr-muted)">{SIZE_HINT}</span>}
                    </Td>
                    <Td>
                      {recipe.length === 0 ? (
                        <Badge tone="neutral">No recipe</Badge>
                      ) : makeable <= 0 ? (
                        <Badge tone="danger" dot>Out of stock</Badge>
                      ) : (
                        <span className="text-sm text-(--mgr-muted)">Enough for {formatNumber(makeable)}</span>
                      )}
                    </Td>
                    <Td>
                      <Toggle
                        checked={p.is_available}
                        onChange={(v) => setAvailable(p, v)}
                        label={`${p.product_name} available`}
                        hideLabel
                      />
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <RowAction icon={FiEdit2} label={`Edit ${p.product_name}`} onClick={() => setEditing(p)} />
                        <RowAction icon={FiTrash2} label={`Delete ${p.product_name}`} danger onClick={() => setDeleting(p)} />
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {visible.length === 0 && <EmptyRow colSpan={6}>No products match these filters.</EmptyRow>}
            </tbody>
          </Table>
        </Card>
      ) : (
        <Card flush>
          <Table>
            <thead>
              <tr>
                <Th>Category</Th>
                <Th className="text-right">Products</Th>
                <Th className="text-right">Available</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {db.categories.map((c) => {
                const products = db.products.filter((p) => p.category_id === c.category_id);
                return (
                  <tr key={c.category_id} className="hover:bg-(--mgr-canvas)/50">
                    <Td>
                      <div className="flex items-center gap-3">
                        {c.image_url ? (
                          <img src={c.image_url} alt="" className="size-9 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-(--mgr-accent)/12 text-xs font-semibold">
                            {initials(c.category_name)}
                          </span>
                        )}
                        <span className="font-medium">{c.category_name}</span>
                      </div>
                    </Td>
                    <Td className="text-right tabular-nums">{products.length}</Td>
                    <Td className="text-right text-(--mgr-muted) tabular-nums">{products.filter((p) => p.is_available).length}</Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <RowAction icon={FiEdit2} label={`Edit ${c.category_name}`} onClick={() => setEditingCategory(c)} />
                        <RowAction
                          icon={FiTrash2}
                          label={`Delete ${c.category_name}`}
                          danger
                          onClick={() => setDeletingCategory(c)}
                        />
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {db.categories.length === 0 && <EmptyRow colSpan={4}>No categories yet. Add one to start building the menu.</EmptyRow>}
            </tbody>
          </Table>
        </Card>
      )}

      <ProductModal
        key={`product-${editing === null ? "closed" : editing === "new" ? "new" : editing.product_id}`}
        product={editing}
        onClose={() => setEditing(null)}
        onSave={saveProduct}
      />

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        size="sm"
        title={deletingOrders ? `Can't delete ${deleting?.product_name}` : `Delete ${deleting?.product_name ?? ""}?`}
        description={
          deletingOrders
            ? `It appears in ${formatNumber(deletingOrders)} past order lines, which must keep pointing at it. Mark it unavailable to take it off the POS instead.`
            : "It's removed from the menu along with its recipe. This can't be undone."
        }
        footer={
          deletingOrders ? (
            <>
              <Button onClick={() => setDeleting(null)}>Close</Button>
              {deleting?.is_available && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setAvailable(deleting, false);
                    setDeleting(null);
                  }}
                >
                  Mark unavailable
                </Button>
              )}
            </>
          ) : (
            <>
              <Button onClick={() => setDeleting(null)}>Cancel</Button>
              <Button variant="danger" onClick={confirmDelete}>
                Delete product
              </Button>
            </>
          )
        }
      />

      <CategoryModal
        key={`category-${editingCategory === null ? "closed" : editingCategory === "new" ? "new" : editingCategory.category_id}`}
        category={editingCategory}
        onClose={() => setEditingCategory(null)}
        onSave={saveCategory}
      />

      <Modal
        open={deletingCategory !== null}
        onClose={() => setDeletingCategory(null)}
        size="sm"
        title={categoryProducts ? `Can't delete ${deletingCategory?.category_name}` : `Delete ${deletingCategory?.category_name ?? ""}?`}
        description={
          categoryProducts
            ? `It still has ${categoryProducts} ${categoryProducts === 1 ? "product" : "products"}. Move them to another category first.`
            : "This can't be undone."
        }
        footer={
          categoryProducts ? (
            <Button onClick={() => setDeletingCategory(null)}>Close</Button>
          ) : (
            <>
              <Button onClick={() => setDeletingCategory(null)}>Cancel</Button>
              <Button variant="danger" onClick={confirmDeleteCategory}>
                Delete category
              </Button>
            </>
          )
        }
      />
    </>
  );
}

interface ProductModalProps {
  product: Product | "new" | null;
  onClose: () => void;
  onSave: (form: ProductForm, recipe: RecipeLine[]) => void;
}

interface DraftLine {
  key: number;
  ingredient_id: string;
  quantity: string;
}

function ProductModal({ product, onClose, onSave }: ProductModalProps) {
  const { db } = useManagerData();
  const existing = product === "new" ? null : product;
  const [form, setForm] = useState<ProductForm>(() => ({
    category_id: existing?.category_id ?? db.categories[0]?.category_id ?? 0,
    product_name: existing?.product_name ?? "",
    description: existing?.description ?? "",
    image_url: existing?.image_url ?? null,
    price: existing?.price ?? 0,
    is_available: existing?.is_available ?? true,
    has_sizes: existing?.has_sizes ?? true,
  }));
  const [lines, setLines] = useState<DraftLine[]>(() =>
    db.product_ingredients
      .filter((r) => existing && r.product_id === existing.product_id)
      .map((r, i) => ({ key: i, ingredient_id: String(r.ingredient_id), quantity: String(r.quantity_required) })),
  );
  const [nextKey, setNextKey] = useState(lines.length);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const activeIngredients = db.ingredients.filter((i) => i.is_active);
  const unitOf = (id: string) => db.ingredients.find((i) => String(i.ingredient_id) === id)?.unit_of_measure ?? "";

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = form.product_name.trim();
    const taken = db.products.some(
      (p) => p.product_name.toLowerCase() === name.toLowerCase() && p.product_id !== existing?.product_id,
    );
    if (taken) return setError(`There's already a product called ${name}.`);
    const filled = lines.filter((l) => l.ingredient_id);
    if (new Set(filled.map((l) => l.ingredient_id)).size !== filled.length) {
      return setError("Each ingredient can only appear once in the recipe.");
    }
    if (filled.some((l) => !(Number(l.quantity) > 0))) return setError("Recipe quantities must be more than zero.");
    onSave(
      {
        ...form,
        product_name: name,
        description: form.description?.trim() || null,
      },
      filled.map((l) => ({ ingredient_id: Number(l.ingredient_id), quantity_required: Number(l.quantity) })),
    );
  };

  return (
    <Modal
      open={product !== null}
      onClose={onClose}
      size="lg"
      title={existing ? `Edit ${existing.product_name}` : "Add product"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="product-form">
            {existing ? "Save changes" : "Add product"}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          <Input
            required
            maxLength={100}
            value={form.product_name}
            onChange={(e) => set("product_name", e.target.value)}
            autoComplete="off"
          />
        </Field>
        <Field label="Category">
          <Select value={form.category_id} onChange={(e) => set("category_id", Number(e.target.value))}>
            {db.categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
            ))}
          </Select>
        </Field>
        <Field label={form.has_sizes ? "Price, tall (₱)" : "Price (₱)"}>
          <Input
            type="number"
            required
            min={0}
            step="0.01"
            value={form.price}
            onChange={(e) => set("price", Number(e.target.value))}
          />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <TextArea rows={2} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <ImageField label="Image" value={form.image_url} onChange={(url) => set("image_url", url)} className="sm:col-span-2" />
        <div className="space-y-4 sm:col-span-2">
          <Toggle
            checked={form.has_sizes}
            onChange={(v) => set("has_sizes", v)}
            label="Sold in sizes"
            description={`The price above is for tall. ${SIZE_HINT}.`}
          />
          <Toggle
            checked={form.is_available}
            onChange={(v) => set("is_available", v)}
            label="Available on the POS"
            description="Switch off when it's sold out or seasonal."
          />
        </div>

        <fieldset className="sm:col-span-2">
          <legend className="text-xs font-medium">Recipe</legend>
          <p className="mt-0.5 text-xs text-(--mgr-muted)">
            What one {form.has_sizes ? "tall " : ""}serving uses. Completed orders deduct this from inventory.
          </p>
          <ul className="mt-3 space-y-2">
            {lines.map((l) => (
              <li key={l.key} className="flex items-center gap-2">
                <select
                  aria-label="Ingredient"
                  value={l.ingredient_id}
                  onChange={(e) =>
                    setLines(lines.map((x) => (x.key === l.key ? { ...x, ingredient_id: e.target.value } : x)))
                  }
                  className={`${INPUT_BASE} min-w-0 flex-1`}
                >
                  <option value="">Choose an ingredient</option>
                  {activeIngredients.map((i) => (
                    <option key={i.ingredient_id} value={i.ingredient_id}>{i.ingredient_name}</option>
                  ))}
                </select>
                <input
                  aria-label="Quantity"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={l.quantity}
                  onChange={(e) => setLines(lines.map((x) => (x.key === l.key ? { ...x, quantity: e.target.value } : x)))}
                  className={`${INPUT_BASE} w-24 shrink-0`}
                />
                <span className="w-10 text-xs text-(--mgr-muted)">{unitOf(l.ingredient_id)}</span>
                <RowAction icon={FiX} label="Remove ingredient" onClick={() => setLines(lines.filter((x) => x.key !== l.key))} />
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            variant="ghost"
            icon={FiPlus}
            className="mt-2"
            onClick={() => {
              setLines([...lines, { key: nextKey, ingredient_id: "", quantity: "" }]);
              setNextKey(nextKey + 1);
            }}
          >
            Add ingredient
          </Button>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-red-700 sm:col-span-2">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

interface CategoryModalProps {
  category: Category | "new" | null;
  onClose: () => void;
  onSave: (form: Omit<Category, "category_id">) => void;
}

function CategoryModal({ category, onClose, onSave }: CategoryModalProps) {
  const { db } = useManagerData();
  const existing = category === "new" ? null : category;
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState(existing?.image_url ?? null);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("category_name")).trim();
    const taken = db.categories.some(
      (c) => c.category_name.toLowerCase() === name.toLowerCase() && c.category_id !== existing?.category_id,
    );
    if (taken) return setError(`There's already a ${name} category.`);
    onSave({ category_name: name, image_url: image });
  };

  return (
    <Modal
      open={category !== null}
      onClose={onClose}
      size="sm"
      title={existing ? `Edit ${existing.category_name}` : "Add category"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="category-form">
            {existing ? "Save changes" : "Add category"}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <Input name="category_name" required maxLength={50} defaultValue={existing?.category_name} autoComplete="off" />
        </Field>
        <ImageField label="Image" value={image} onChange={setImage} />
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
