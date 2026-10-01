import { useMemo, useRef, useState } from "react";
import type { IconType } from "react-icons";
import {
  FiCheckCircle,
  FiEdit3,
  FiMinus,
  FiPlus,
  FiShoppingCart,
  FiTrash2,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import { useCategories, useProducts, useRecipes } from "../api/catalog";
import { useDiscounts } from "../api/discounts";
import { useIngredients } from "../api/inventory";
import { usePlaceOrder } from "../api/orders";
import Button from "../components/Button";
import Card from "../components/Card";
import CustomerPicker from "../components/CustomerPicker";
import { Field, Input, Select } from "../components/Field";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { ErrorNotice, Loading } from "../components/QueryState";
import SearchInput from "../components/SearchInput";
import { PAYMENT_METHOD_LABELS } from "../components/status";
import { buttonClass, FOCUS_RING, INPUT_CLASS } from "../components/styles";
import Tabs from "../components/Tabs";
import { useNotifyError, useToast } from "../components/toastContext";
import { makeableCount } from "../data/selectors";
import { managerPath } from "../routes";
import type {
  Customer,
  Discount,
  ItemSize,
  PaymentMethod,
  Product,
} from "../types";
import { indexBy } from "../utils/collections";
import { formatPeso, initials, round2 } from "../utils/format";
import {
  describeDiscount,
  discountFor,
  SIZES,
  subtotalOf,
  unitPrice,
} from "../utils/pricing";

interface CartLine {
  key: number;
  product: Product;
  size: ItemSize | null;
  quantity: number;
  note: string;
  noteOpen: boolean;
}

type DiscountChoice = "none" | "custom" | number;

interface Receipt {
  orderId: number;
  total: number;
  method: PaymentMethod;
  tendered: number;
}

const PAYMENT_METHODS: readonly PaymentMethod[] = ["cash", "card", "e_wallet"];
const LOW_STOCK_HINT = 5;

export default function PointOfSale() {
  const notify = useToast();
  const notifyError = useNotifyError();
  const productsQuery = useProducts();
  const categoriesQuery = useCategories();
  const ingredientsQuery = useIngredients();
  const discountsQuery = useDiscounts();
  const placeOrder = usePlaceOrder();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [discountChoice, setDiscountChoice] = useState<DiscountChoice>("none");
  const [customDiscount, setCustomDiscount] = useState("");
  const [idChecked, setIdChecked] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [tendered, setTendered] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const cartRef = useRef<HTMLElement>(null);

  const products = useMemo(
    () => productsQuery.data ?? [],
    [productsQuery.data],
  );
  const categories = categoriesQuery.data ?? [];
  const discounts = discountsQuery.data ?? [];
  const productIds = useMemo(
    () => products.map((p) => p.product_id),
    [products],
  );
  const { recipes } = useRecipes(productIds);
  const ingredients = useMemo(
    () =>
      ingredientsQuery.data
        ? indexBy(ingredientsQuery.data, (i) => i.ingredient_id)
        : null,
    [ingredientsQuery.data],
  );

  const visible = products.filter((p) => {
    const q = query.trim().toLowerCase();
    return (
      (category === "all" || String(p.category_id) === category) &&
      (!q || p.product_name.toLowerCase().includes(q))
    );
  });

  const inCart = (productId: number) =>
    cart
      .filter((l) => l.product.product_id === productId)
      .reduce((sum, l) => sum + l.quantity, 0);
  // Until stock and the recipe are in, don't block the sale on a guess.
  const remaining = (p: Product) => {
    const recipe = recipes.get(p.product_id);
    const makeable =
      recipe && ingredients ? makeableCount(recipe, ingredients) : Infinity;
    return makeable - inCart(p.product_id);
  };

  const lines = cart.map((l) => ({
    ...l,
    price: unitPrice(l.product, l.size),
  }));
  const subtotal = subtotalOf(
    lines.map((l) => ({ quantity: l.quantity, selling_price: l.price })),
  );
  const activeDiscounts = discounts.filter((d) => d.is_active);
  const discount =
    typeof discountChoice === "number"
      ? discounts.find((d) => d.discount_id === discountChoice)
      : undefined;
  const discountAmount =
    discountChoice === "custom"
      ? discountFor(
          { kind: "fixed", value: Number(customDiscount) || 0 },
          subtotal,
        )
      : discount
        ? discountFor(discount, subtotal)
        : 0;
  const total = round2(subtotal - discountAmount);
  const cash = Number(tendered) || 0;
  const change = round2(cash - total);

  const eligible = (d: Discount) =>
    d.eligibility !== "university_id" || Boolean(customer?.university_id);
  const needsIdCheck = discount?.eligibility === "government_id";
  const problem =
    cart.length === 0
      ? "Add items to start an order."
      : discount && !eligible(discount)
        ? "The student discount needs a customer with a university ID."
        : needsIdCheck && !idChecked
          ? "Confirm you've checked the senior citizen or PWD ID."
          : method === "cash" && total > 0 && cash < total
            ? "Enter the cash received."
            : null;

  const add = (product: Product) => {
    const size: ItemSize | null = product.has_sizes ? "tall" : null;
    const same = cart.find(
      (l) =>
        l.product.product_id === product.product_id &&
        l.size === size &&
        !l.note,
    );
    if (same) {
      setCart(
        cart.map((l) => (l === same ? { ...l, quantity: l.quantity + 1 } : l)),
      );
    } else {
      setCart([
        ...cart,
        { key: nextKey, product, size, quantity: 1, note: "", noteOpen: false },
      ]);
      setNextKey(nextKey + 1);
    }
  };

  const patch = (key: number, change: Partial<CartLine>) =>
    setCart((current) =>
      current.map((l) => (l.key === key ? { ...l, ...change } : l)),
    );
  const remove = (key: number) =>
    setCart((current) => current.filter((l) => l.key !== key));

  const reset = () => {
    setCart([]);
    setCustomer(null);
    setDiscountChoice("none");
    setCustomDiscount("");
    setIdChecked(false);
    setMethod("cash");
    setTendered("");
  };

  const checkout = () => {
    if (problem || placeOrder.isPending) return;
    const tenderedAmount = method === "cash" ? cash : total;
    placeOrder.mutate(
      {
        customer_id: customer?.customer_id ?? null,
        discount_amount: discountAmount,
        items: lines.map((l) => ({
          product_id: l.product.product_id,
          quantity: l.quantity,
          size: l.size,
          selling_price: l.price,
          special_instructions: l.note.trim() || null,
        })),
        // Paid at the counter, then queued for the barista. amount_paid must be > 0.
        payment:
          total > 0
            ? { amount_paid: total, payment_method: method }
            : undefined,
        order_status: "pending",
      },
      {
        onSuccess: (order) => {
          // The server works out the total itself; show its figure.
          setReceipt({
            orderId: order.order_id,
            total: order.total_amount,
            method,
            tendered: tenderedAmount,
          });
          reset();
          notify(`Order #${order.order_id} sent to the queue.`);
        },
        onError: notifyError,
      },
    );
  };

  const changeCustomer = (next: Customer | null) => {
    setCustomer(next);
    if (discount?.eligibility === "university_id" && !next?.university_id)
      setDiscountChoice("none");
  };

  const failed = productsQuery.error ?? categoriesQuery.error;

  return (
    <>
      <PageHeader
        title="Point of Sale"
        description="Ring up walk-in orders when the counter is busy. Orders land in the queue as paid and pending."
      />

      {failed && (
        <ErrorNotice
          className="mb-4"
          title="Couldn't load the menu"
          error={failed}
          onRetry={() =>
            void Promise.all([
              productsQuery.refetch(),
              categoriesQuery.refetch(),
            ])
          }
        />
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card flush>
          <div className="flex flex-col gap-3 border-b border-(--mgr-line) p-4">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search the menu"
            />
            <Tabs
              label="Filter by category"
              value={category}
              onChange={setCategory}
              options={[
                { value: "all", label: "All" },
                ...categories.map((c) => ({
                  value: String(c.category_id),
                  label: c.category_name,
                })),
              ]}
            />
          </div>

          <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => {
              const left = remaining(p);
              const soldOut = !p.is_available || left <= 0;
              return (
                <li key={p.product_id}>
                  <button
                    type="button"
                    disabled={soldOut}
                    onClick={() => add(p)}
                    className={`flex h-full w-full flex-col rounded-xl p-3 text-left ring-1 ring-(--mgr-line) transition hover:ring-2 hover:ring-(--mgr-accent) disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:ring-1 disabled:hover:ring-(--mgr-line) ${FOCUS_RING}`}
                  >
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt=""
                        className="aspect-3/2 w-full rounded-lg object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="grid aspect-3/2 w-full place-items-center rounded-lg bg-(--mgr-accent)/12 text-xl font-semibold text-(--mgr-ink)/70"
                      >
                        {initials(p.product_name)}
                      </span>
                    )}
                    <span className="mt-2 text-sm leading-snug font-medium">
                      {p.product_name}
                    </span>
                    <span className="mt-auto pt-1 text-sm text-(--mgr-muted) tabular-nums">
                      {p.has_sizes ? "from " : ""}
                      {formatPeso(p.price)}
                    </span>
                    {!p.is_available ? (
                      <span className="text-xs font-medium text-red-700">
                        Unavailable
                      </span>
                    ) : left <= 0 ? (
                      <span className="text-xs font-medium text-red-700">
                        Out of stock
                      </span>
                    ) : left <= LOW_STOCK_HINT ? (
                      <span className="text-xs font-medium text-amber-700">
                        Only {left} left
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
            {productsQuery.isPending && (
              <li className="col-span-full">
                <Loading label="Loading the menu…" />
              </li>
            )}
            {productsQuery.isSuccess && visible.length === 0 && (
              <li className="col-span-full py-10 text-center text-sm text-(--mgr-muted)">
                No products match.
              </li>
            )}
          </ul>
        </Card>

        <section
          ref={cartRef}
          aria-label="Current order"
          className="flex flex-col overflow-hidden rounded-2xl bg-(--mgr-surface) shadow-sm ring-1 ring-(--mgr-line) lg:sticky lg:top-22 lg:max-h-[calc(100vh-7rem)]"
        >
          <header className="flex items-center justify-between border-b border-(--mgr-line) px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <FiShoppingCart aria-hidden className="size-4" />
              Current order
            </h2>
            {cart.length > 0 && (
              <Button size="sm" variant="ghost" onClick={reset}>
                Clear
              </Button>
            )}
          </header>

          <div className="flex-1 overflow-y-auto">
            {lines.length ? (
              <ul className="divide-y divide-(--mgr-line)">
                {lines.map((l) => (
                  <li key={l.key} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">
                        {l.product.product_name}
                      </p>
                      <p className="text-sm tabular-nums">
                        {formatPeso(l.price * l.quantity)}
                      </p>
                    </div>

                    {l.product.has_sizes && (
                      <div
                        role="radiogroup"
                        aria-label={`Size for ${l.product.product_name}`}
                        className="mt-2 flex gap-1"
                      >
                        {SIZES.map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            role="radio"
                            aria-checked={l.size === s.value}
                            onClick={() => patch(l.key, { size: s.value })}
                            className={`rounded-md px-2 py-1 text-xs font-medium ${FOCUS_RING} ${
                              l.size === s.value
                                ? "bg-(--mgr-ink) text-(--mgr-cream)"
                                : "bg-(--mgr-ink)/5 text-(--mgr-muted) hover:text-(--mgr-ink)"
                            }`}
                          >
                            {s.label}
                            {s.upcharge ? ` +${s.upcharge}` : ""}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-1">
                      <QtyButton
                        label={`One fewer ${l.product.product_name}`}
                        icon={FiMinus}
                        disabled={l.quantity <= 1}
                        onClick={() =>
                          patch(l.key, { quantity: l.quantity - 1 })
                        }
                      />
                      <span
                        className="w-7 text-center text-sm tabular-nums"
                        aria-label="Quantity"
                      >
                        {l.quantity}
                      </span>
                      <QtyButton
                        label={`One more ${l.product.product_name}`}
                        icon={FiPlus}
                        disabled={remaining(l.product) <= 0}
                        onClick={() =>
                          patch(l.key, { quantity: l.quantity + 1 })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => patch(l.key, { noteOpen: !l.noteOpen })}
                        aria-expanded={l.noteOpen}
                        className={`ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs text-(--mgr-muted) hover:text-(--mgr-ink) ${FOCUS_RING}`}
                      >
                        <FiEdit3 aria-hidden className="size-3.5" />
                        {l.note ? "Edit note" : "Note"}
                      </button>
                      <QtyButton
                        label={`Remove ${l.product.product_name}`}
                        icon={FiTrash2}
                        onClick={() => remove(l.key)}
                      />
                    </div>

                    {l.noteOpen ? (
                      <input
                        value={l.note}
                        onChange={(e) => patch(l.key, { note: e.target.value })}
                        placeholder="e.g. less ice, extra hot"
                        aria-label={`Special instructions for ${l.product.product_name}`}
                        className={`${INPUT_CLASS} mt-2 py-1.5 text-xs`}
                      />
                    ) : (
                      l.note && (
                        <p className="mt-1 text-xs text-(--mgr-muted) italic">
                          “{l.note}”
                        </p>
                      )
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-(--mgr-muted)">
                Tap a product to add it.
              </p>
            )}
          </div>

          <div className="space-y-3 border-t border-(--mgr-line) bg-(--mgr-canvas)/50 px-5 py-4">
            <CustomerPicker value={customer} onChange={changeCustomer} />

            <Field
              label="Discount"
              hint={
                discountsQuery.error
                  ? "Preset discounts aren't available right now; a custom amount still works."
                  : undefined
              }
            >
              <Select
                value={String(discountChoice)}
                onChange={(e) => {
                  const v = e.target.value;
                  setDiscountChoice(
                    v === "none" || v === "custom" ? v : Number(v),
                  );
                  setIdChecked(false);
                }}
              >
                <option value="none">No discount</option>
                {activeDiscounts.map((d) => (
                  <option
                    key={d.discount_id}
                    value={d.discount_id}
                    disabled={!eligible(d)}
                  >
                    {d.discount_name} · {describeDiscount(d)}
                    {eligible(d) ? "" : " (needs a student customer)"}
                  </option>
                ))}
                <option value="custom">Custom amount</option>
              </Select>
            </Field>

            {discountChoice === "custom" && (
              <Field label="Discount amount (₱)">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={customDiscount}
                  onChange={(e) => setCustomDiscount(e.target.value)}
                />
              </Field>
            )}

            {needsIdCheck && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={idChecked}
                  onChange={(e) => setIdChecked(e.target.checked)}
                  className="size-4 accent-(--mgr-accent)"
                />
                I've checked the senior citizen or PWD ID
              </label>
            )}

            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-(--mgr-muted)">Subtotal</dt>
                <dd className="tabular-nums">{formatPeso(subtotal)}</dd>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-(--mgr-muted)">Discount</dt>
                  <dd className="tabular-nums">
                    − {formatPeso(discountAmount)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between border-t border-(--mgr-line) pt-1 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPeso(total)}</dd>
              </div>
            </dl>

            <div
              role="radiogroup"
              aria-label="Payment method"
              className="grid grid-cols-3 gap-1 rounded-xl bg-(--mgr-ink)/5 p-1"
            >
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={method === m}
                  onClick={() => setMethod(m)}
                  className={`rounded-lg py-1.5 text-sm font-medium ${FOCUS_RING} ${
                    method === m
                      ? "bg-(--mgr-surface) shadow-sm"
                      : "text-(--mgr-muted) hover:text-(--mgr-ink)"
                  }`}
                >
                  {PAYMENT_METHOD_LABELS[m]}
                </button>
              ))}
            </div>

            {method === "cash" && total > 0 && (
              <div className="flex items-end gap-2">
                <Field label="Cash received (₱)" className="flex-1">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={tendered}
                    onChange={(e) => setTendered(e.target.value)}
                  />
                </Field>
                <Button size="md" onClick={() => setTendered(String(total))}>
                  Exact
                </Button>
              </div>
            )}
            {method === "cash" && cash >= total && total > 0 && (
              <p className="text-sm">
                Change:{" "}
                <span className="font-semibold tabular-nums">
                  {formatPeso(change)}
                </span>
              </p>
            )}

            <Button
              variant="primary"
              className="w-full"
              disabled={problem !== null || placeOrder.isPending}
              onClick={checkout}
            >
              {placeOrder.isPending
                ? "Placing order…"
                : `Charge ${formatPeso(total)}`}
            </Button>
            {problem && cart.length > 0 && (
              <p className="text-xs text-(--mgr-muted)">{problem}</p>
            )}
          </div>
        </section>
      </div>

      {cart.length > 0 && (
        // On narrow screens the cart sits below the whole menu.
        <button
          type="button"
          onClick={() =>
            cartRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
          }
          className={`fixed inset-x-4 bottom-4 z-20 flex items-center justify-between rounded-xl bg-(--mgr-ink) px-4 py-3 text-sm font-medium text-(--mgr-cream) shadow-lg lg:hidden ${FOCUS_RING}`}
        >
          <span className="flex items-center gap-2">
            <FiShoppingCart aria-hidden className="size-4" />
            Review order · {lines.reduce((n, l) => n + l.quantity, 0)} items
          </span>
          <span className="tabular-nums">{formatPeso(total)}</span>
        </button>
      )}

      <Modal
        open={receipt !== null}
        onClose={() => setReceipt(null)}
        size="sm"
        title="Order placed"
        footer={
          <>
            <Link
              to={managerPath("orders")}
              className={buttonClass("secondary")}
            >
              View queue
            </Link>
            <Button variant="primary" onClick={() => setReceipt(null)}>
              Next order
            </Button>
          </>
        }
      >
        {receipt && (
          <div className="text-center">
            <FiCheckCircle
              aria-hidden
              className="mx-auto size-10 text-(--mgr-accent)"
            />
            <p className="mt-3 text-sm text-(--mgr-muted)">Order number</p>
            <p className="manager-display text-4xl tracking-wide">
              #{receipt.orderId}
            </p>
            <dl className="mt-4 space-y-1 text-left text-sm">
              <div className="flex justify-between">
                <dt className="text-(--mgr-muted)">Total</dt>
                <dd className="tabular-nums">{formatPeso(receipt.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-(--mgr-muted)">
                  Paid by {PAYMENT_METHOD_LABELS[receipt.method].toLowerCase()}
                </dt>
                <dd className="tabular-nums">{formatPeso(receipt.tendered)}</dd>
              </div>
              {receipt.method === "cash" && (
                <div className="flex justify-between text-base font-semibold">
                  <dt>Change</dt>
                  <dd className="tabular-nums">
                    {formatPeso(round2(receipt.tendered - receipt.total))}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </Modal>
    </>
  );
}

interface QtyButtonProps {
  label: string;
  icon: IconType;
  onClick: () => void;
  disabled?: boolean;
}

function QtyButton({ label, icon: Icon, onClick, disabled }: QtyButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-7 place-items-center rounded-md ring-1 ring-(--mgr-line) hover:bg-(--mgr-ink)/5 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
    >
      <Icon aria-hidden className="size-3.5" />
    </button>
  );
}
