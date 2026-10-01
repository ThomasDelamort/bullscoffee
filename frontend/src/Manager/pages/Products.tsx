import { useMemo, useState, type FormEvent } from "react";
import { FiEdit2, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { ApiError, errorMessage } from "../../lib/api";
import {
  useCategories,
  useDeleteCategory,
  useDeleteProduct,
  useProducts,
  useRecipe,
  useRecipes,
  useSaveCategory,
  useSaveProduct,
  useUpdateProduct,
  type ProductFields,
} from "../api/catalog";
import type { ImageChange } from "../api/forms";
import { useIngredients } from "../api/inventory";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Field, Input, Select, TextArea } from "../components/Field";
import ImageField from "../components/ImageField";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { ErrorNotice, Loading, LoadingRow } from "../components/QueryState";
import RowAction from "../components/RowAction";
import SearchInput from "../components/SearchInput";
import { INPUT_BASE } from "../components/styles";
import { EmptyRow, Table, Td, Th } from "../components/Table";
import Tabs from "../components/Tabs";
import Toggle from "../components/Toggle";
import { useNotifyError, useToast } from "../components/toastContext";
import { makeableCount } from "../data/selectors";
import type { Category, Ingredient, Product, ProductIngredient } from "../types";
import { indexBy } from "../utils/collections";
import { formatNumber, formatPeso, initials } from "../utils/format";
import { SIZES } from "../utils/pricing";
import { useImageDraft } from "../utils/useImageDraft";

type View = "products" | "categories";
type Availability = "all" | "available" | "unavailable";
type RecipeLine = Pick<ProductIngredient, "ingredient_id" | "quantity_required">;

const SIZE_HINT = SIZES.filter((s) => s.upcharge)
  .map((s) => `${s.label} +₱${s.upcharge}`)
  .join(", ");

export default function Products() {
  const notify = useToast();
  const notifyError = useNotifyError();
  const [view, setView] = useState<View>("products");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availability, setAvailability] = useState<Availability>("all");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  /** The server's reason when it refuses a delete (the product has been ordered). */
  const [deleteBlocked, setDeleteBlocked] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | "new" | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const productsQuery = useProducts();
  const categoriesQuery = useCategories();
  const ingredientsQuery = useIngredients();
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const productIds = useMemo(() => products.map((p) => p.product_id), [products]);
  const { recipes } = useRecipes(productIds);
  const ingredients = useMemo(() => indexBy(ingredientsQuery.data ?? [], (i) => i.ingredient_id), [ingredientsQuery.data]);
  const categoryNames = useMemo(() => indexBy(categories, (c) => c.category_id), [categories]);

  const updateProduct = useUpdateProduct();
  const saveProduct = useSaveProduct();
  const deleteProduct = useDeleteProduct();
  const saveCategory = useSaveCategory();
  const deleteCategory = useDeleteCategory();

  const inFilters = products.filter((p) => {
    const q = query.trim().toLowerCase();
    return (
      (categoryFilter === "all" || String(p.category_id) === categoryFilter) &&
      (!q || p.product_name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q))
    );
  });
  const visible = inFilters.filter(
    (p) => availability === "all" || (availability === "available") === p.is_available,
  );

  const closeEditor = () => {
    setEditing(null);
    saveProduct.reset();
  };

  const submitProduct = (fields: ProductFields, image: ImageChange, recipe: RecipeLine[]) => {
    const productId = editing === "new" || editing === null ? null : editing.product_id;
    saveProduct.mutate(
      { productId, fields, image, recipe },
      {
        onSuccess: () => {
          notify(productId === null ? `${fields.product_name} added to the menu.` : `${fields.product_name} updated.`);
          closeEditor();
        },
      },
    );
  };

  const setAvailable = (p: Product, is_available: boolean) =>
    updateProduct.mutate(
      { productId: p.product_id, changes: { is_available } },
      {
        onSuccess: () =>
          notify(is_available ? `${p.product_name} is back on the menu.` : `${p.product_name} is hidden from the POS.`),
        onError: notifyError,
      },
    );

  const recategorize = (p: Product, category_id: number) =>
    updateProduct.mutate(
      { productId: p.product_id, changes: { category_id } },
      {
        onSuccess: () => notify(`${p.product_name} moved to ${categoryNames.get(category_id)?.category_name}.`),
        onError: notifyError,
      },
    );

  const closeDelete = () => {
    setDeleting(null);
    setDeleteBlocked(null);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteProduct.mutate(deleting.product_id, {
      onSuccess: () => {
        notify(`${deleting.product_name} deleted.`);
        closeDelete();
      },
      // 409: it's been ordered, and order_items must keep pointing at it.
      onError: (error) =>
        error instanceof ApiError && error.status === 409 ? setDeleteBlocked(error.message) : notifyError(error),
    });
  };

  const closeCategoryEditor = () => {
    setEditingCategory(null);
    saveCategory.reset();
  };

  const submitCategory = (category_name: string, image: ImageChange) => {
    const categoryId = editingCategory === "new" || editingCategory === null ? null : editingCategory.category_id;
    saveCategory.mutate(
      { categoryId, category_name, image },
      {
        onSuccess: () => {
          notify(categoryId === null ? `${category_name} category created.` : `${category_name} category updated.`);
          closeCategoryEditor();
        },
      },
    );
  };

  const confirmDeleteCategory = () => {
    if (!deletingCategory) return;
    deleteCategory.mutate(deletingCategory.category_id, {
      onSuccess: () => {
        notify(`${deletingCategory.category_name} category deleted.`);
        setDeletingCategory(null);
      },
      onError: notifyError,
    });
  };

  const categoryProducts = deletingCategory
    ? products.filter((p) => p.category_id === deletingCategory.category_id).length
    : 0;
  const failed = productsQuery.error ?? categoriesQuery.error;

  return (
    <>
      <PageHeader
        title="Products"
        description="Add, edit and categorise menu items, set their recipes, and take them off the POS when they can't be made."
        actions={
          view === "products" ? (
            <Button variant="primary" icon={FiPlus} onClick={() => setEditing("new")} disabled={categories.length === 0}>
              Add product
            </Button>
          ) : (
            <Button variant="primary" icon={FiPlus} onClick={() => setEditingCategory("new")}>
              Add category
            </Button>
          )
        }
      />

      {failed && (
        <ErrorNotice
          className="mb-4"
          title="Couldn't load the menu"
          error={failed}
          onRetry={() => void Promise.all([productsQuery.refetch(), categoriesQuery.refetch()])}
        />
      )}

      <div className="mb-4">
        <Tabs
          label="Section"
          value={view}
          onChange={setView}
          options={[
            { value: "products", label: "Products", count: products.length },
            { value: "categories", label: "Categories", count: categories.length },
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
                {categories.map((c) => (
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
              {productsQuery.isPending && <LoadingRow colSpan={6} label="Loading products…" />}
              {visible.map((p) => {
                const recipe = recipes.get(p.product_id);
                const makeable = recipe ? makeableCount(recipe, ingredients) : 0;
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
                        {categories.map((c) => (
                          <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                        ))}
                      </select>
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatPeso(p.price)}
                      {p.has_sizes && <span className="block text-xs text-(--mgr-muted)">{SIZE_HINT}</span>}
                    </Td>
                    <Td>
                      {!recipe || !ingredientsQuery.data ? (
                        <span className="text-sm text-(--mgr-muted)">…</span>
                      ) : recipe.length === 0 ? (
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
              {productsQuery.isSuccess && visible.length === 0 && (
                <EmptyRow colSpan={6}>No products match these filters.</EmptyRow>
              )}
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
              {categoriesQuery.isPending && <LoadingRow colSpan={4} label="Loading categories…" />}
              {categories.map((c) => {
                const inCategory = products.filter((p) => p.category_id === c.category_id);
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
                    <Td className="text-right tabular-nums">{inCategory.length}</Td>
                    <Td className="text-right text-(--mgr-muted) tabular-nums">{inCategory.filter((p) => p.is_available).length}</Td>
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
              {categoriesQuery.isSuccess && categories.length === 0 && (
                <EmptyRow colSpan={4}>No categories yet. Add one to start building the menu.</EmptyRow>
              )}
            </tbody>
          </Table>
        </Card>
      )}

      <ProductModal
        key={`product-${editing === null ? "closed" : editing === "new" ? "new" : editing.product_id}`}
        product={editing}
        products={products}
        categories={categories}
        ingredients={ingredientsQuery.data ?? []}
        saving={saveProduct.isPending}
        serverError={saveProduct.error ? errorMessage(saveProduct.error) : null}
        onClose={closeEditor}
        onSave={submitProduct}
      />

      <Modal
        open={deleting !== null}
        onClose={closeDelete}
        size="sm"
        title={deleteBlocked ? `Can't delete ${deleting?.product_name}` : `Delete ${deleting?.product_name ?? ""}?`}
        description={deleteBlocked ?? "It's removed from the menu along with its recipe. This can't be undone."}
        footer={
          deleteBlocked ? (
            <>
              <Button onClick={closeDelete}>Close</Button>
              {deleting?.is_available && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setAvailable(deleting, false);
                    closeDelete();
                  }}
                >
                  Mark unavailable
                </Button>
              )}
            </>
          ) : (
            <>
              <Button onClick={closeDelete}>Cancel</Button>
              <Button variant="danger" onClick={confirmDelete} disabled={deleteProduct.isPending}>
                {deleteProduct.isPending ? "Deleting…" : "Delete product"}
              </Button>
            </>
          )
        }
      />

      <CategoryModal
        key={`category-${editingCategory === null ? "closed" : editingCategory === "new" ? "new" : editingCategory.category_id}`}
        category={editingCategory}
        categories={categories}
        saving={saveCategory.isPending}
        serverError={saveCategory.error ? errorMessage(saveCategory.error) : null}
        onClose={closeCategoryEditor}
        onSave={submitCategory}
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
              <Button variant="danger" onClick={confirmDeleteCategory} disabled={deleteCategory.isPending}>
                {deleteCategory.isPending ? "Deleting…" : "Delete category"}
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
  products: readonly Product[];
  categories: readonly Category[];
  ingredients: readonly Ingredient[];
  saving: boolean;
  serverError: string | null;
  onClose: () => void;
  onSave: (fields: ProductFields, image: ImageChange, recipe: RecipeLine[]) => void;
}

/** Loads the product's recipe first, so the form starts from what's saved. */
function ProductModal(props: ProductModalProps) {
  const { product, saving, onClose } = props;
  const existing = product === "new" ? null : product;
  const recipe = useRecipe(existing?.product_id ?? null);
  const ready = existing === null || recipe.isSuccess;

  return (
    <Modal
      open={product !== null}
      onClose={onClose}
      size="lg"
      title={existing ? `Edit ${existing.product_name}` : "Add product"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="product-form" disabled={!ready || saving}>
            {saving ? "Saving…" : existing ? "Save changes" : "Add product"}
          </Button>
        </>
      }
    >
      {ready ? (
        <ProductForm {...props} existing={existing} recipe={recipe.data ?? []} />
      ) : recipe.error ? (
        <ErrorNotice title="Couldn't load the recipe" error={recipe.error} onRetry={() => void recipe.refetch()} />
      ) : (
        <Loading label="Loading recipe…" />
      )}
    </Modal>
  );
}

interface DraftLine {
  key: number;
  ingredient_id: string;
  quantity: string;
}

function ProductForm({
  existing,
  recipe,
  products,
  categories,
  ingredients,
  serverError,
  onSave,
}: ProductModalProps & { existing: Product | null; recipe: readonly ProductIngredient[] }) {
  const [form, setForm] = useState<ProductFields>(() => ({
    category_id: existing?.category_id ?? categories[0]?.category_id ?? 0,
    product_name: existing?.product_name ?? "",
    description: existing?.description ?? "",
    price: existing?.price ?? 0,
    is_available: existing?.is_available ?? true,
    has_sizes: existing?.has_sizes ?? true,
  }));
  const image = useImageDraft(existing?.image_url ?? null);
  const [lines, setLines] = useState<DraftLine[]>(() =>
    recipe.map((r, i) => ({ key: i, ingredient_id: String(r.ingredient_id), quantity: String(r.quantity_required) })),
  );
  const [nextKey, setNextKey] = useState(lines.length);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ProductFields>(key: K, value: ProductFields[K]) => setForm((f) => ({ ...f, [key]: value }));
  const activeIngredients = ingredients.filter((i) => i.is_active);
  const unitOf = (id: string) => ingredients.find((i) => String(i.ingredient_id) === id)?.unit_of_measure ?? "";

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = form.product_name.trim();
    const taken = products.some(
      (p) => p.product_name.toLowerCase() === name.toLowerCase() && p.product_id !== existing?.product_id,
    );
    if (taken) return setError(`There's already a product called ${name}.`);
    const filled = lines.filter((l) => l.ingredient_id);
    if (new Set(filled.map((l) => l.ingredient_id)).size !== filled.length) {
      return setError("Each ingredient can only appear once in the recipe.");
    }
    if (filled.some((l) => !(Number(l.quantity) > 0))) return setError("Recipe quantities must be more than zero.");
    setError(null);
    onSave(
      { ...form, product_name: name, description: form.description?.trim() || null },
      image.change,
      filled.map((l) => ({ ingredient_id: Number(l.ingredient_id), quantity_required: Number(l.quantity) })),
    );
  };

  const shownError = error ?? serverError;

  return (
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
          {categories.map((c) => (
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
      <ImageField label="Image" value={image.preview} onChange={image.onChange} className="sm:col-span-2" />
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
          What one {form.has_sizes ? "tall " : ""}serving uses. The POS uses it to tell how many can still be made.
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

      {shownError && (
        <p role="alert" className="text-sm text-red-700 sm:col-span-2">
          {shownError}
        </p>
      )}
    </form>
  );
}

interface CategoryModalProps {
  category: Category | "new" | null;
  categories: readonly Category[];
  saving: boolean;
  serverError: string | null;
  onClose: () => void;
  onSave: (categoryName: string, image: ImageChange) => void;
}

function CategoryModal({ category, categories, saving, serverError, onClose, onSave }: CategoryModalProps) {
  const existing = category === "new" ? null : category;
  const [error, setError] = useState<string | null>(null);
  const image = useImageDraft(existing?.image_url ?? null);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("category_name")).trim();
    const taken = categories.some(
      (c) => c.category_name.toLowerCase() === name.toLowerCase() && c.category_id !== existing?.category_id,
    );
    if (taken) return setError(`There's already a ${name} category.`);
    setError(null);
    onSave(name, image.change);
  };

  const shownError = error ?? serverError;

  return (
    <Modal
      open={category !== null}
      onClose={onClose}
      size="sm"
      title={existing ? `Edit ${existing.category_name}` : "Add category"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="category-form" disabled={saving}>
            {saving ? "Saving…" : existing ? "Save changes" : "Add category"}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <Input name="category_name" required maxLength={50} defaultValue={existing?.category_name} autoComplete="off" />
        </Field>
        <ImageField label="Image" value={image.preview} onChange={image.onChange} />
        {shownError && (
          <p role="alert" className="text-sm text-red-700">
            {shownError}
          </p>
        )}
      </form>
    </Modal>
  );
}
