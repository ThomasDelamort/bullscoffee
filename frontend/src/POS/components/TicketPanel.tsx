import { useState, type Ref } from "react";
import type { IconType } from "react-icons";
import {
  FiCheckCircle,
  FiEdit3,
  FiMinus,
  FiPlus,
  FiShoppingBag,
  FiTrash2,
} from "react-icons/fi";
import { LuPanelRightClose, LuPanelRightOpen } from "react-icons/lu";
import { goToCheckout, usePaymentOptions } from "../../checkout/api";
import { errorMessage } from "../../lib/api";
import { useDiscounts } from "../api/catalog";
import { usePlaceOrder } from "../api/orders";
import { useStartCheckout } from "../api/payments";
import type { Ticket } from "../data/useTicket";
import type { Customer, Discount, Tender } from "../types";
import { formatPeso, round2 } from "../utils/format";
import {
  describeDiscount,
  discountFor,
  paymentProblem,
  SIZES,
  subtotalOf,
  TENDER_LABELS,
} from "../utils/pricing";
import CustomerPicker from "./CustomerPicker";
import Modal from "./Modal";
import PaymentFields from "./PaymentFields";
import { buttonClass, FOCUS_RING, INPUT_CLASS, segmentClass } from "./styles";
import { useToast } from "./toastContext";

type DiscountChoice = "none" | "custom" | number;

interface Receipt {
  orderId: number;
  total: number;
  method: Tender;
  tendered: number;
}

const LABEL = "mb-1 block text-xs text-(--pos-muted)";

interface TicketPanelProps {
  ticket: Ticket;
  ref?: Ref<HTMLElement>;
  /** Desktop only: shrinks to a narrow rail. Below lg the panel always shows in full. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/** The walk-in order being rung up: line items, discount, payment and the charge button. */
export default function TicketPanel({
  ticket,
  ref,
  collapsed,
  onToggleCollapsed,
}: TicketPanelProps) {
  const discounts = useDiscounts();
  const placeOrder = usePlaceOrder();
  const startCheckout = useStartCheckout();
  const paymentOptions = usePaymentOptions();
  const onlineMethods = paymentOptions.data?.online
    ? paymentOptions.data.methods
    : [];
  const notify = useToast();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [discountChoice, setDiscountChoice] = useState<DiscountChoice>("none");
  const [customDiscount, setCustomDiscount] = useState("");
  const [idChecked, setIdChecked] = useState(false);
  const [method, setMethod] = useState<Tender>("cash");
  const [tendered, setTendered] = useState("");
  const [noteOpen, setNoteOpen] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const { lines } = ticket;
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);

  const subtotal = subtotalOf(
    lines.map((l) => ({ quantity: l.quantity, selling_price: l.price })),
  );
  const discount =
    typeof discountChoice === "number"
      ? discounts.data?.find((d) => d.discount_id === discountChoice)
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

  const eligible = (d: Discount) =>
    d.eligibility !== "university_id" || Boolean(customer?.university_id);
  const needsIdCheck = discount?.eligibility === "government_id";
  const problem =
    lines.length === 0
      ? "Add items to start an order."
      : typeof discountChoice === "number" && !discount
        ? "That discount was switched off. Pick another one."
        : discount && !eligible(discount)
          ? `${discount.discount_name} needs a customer with a university ID.`
          : needsIdCheck && !idChecked
            ? "Confirm you've checked the senior citizen or PWD ID."
            : method === "online" && onlineMethods.length === 0
              ? "Online payment is switched off. Pick another way to pay."
              : paymentProblem(total, method, tendered);
  // Online, the order is placed unpaid and the customer is sent to PayMongo; leaving the page shows as busy.
  const openingCheckout = startCheckout.isPending || startCheckout.isSuccess;
  const busy = placeOrder.isPending || openingCheckout;

  const reset = () => {
    ticket.clear();
    setCustomer(null);
    setDiscountChoice("none");
    setCustomDiscount("");
    setIdChecked(false);
    setMethod("cash");
    setTendered("");
    setNoteOpen(null);
  };

  const checkout = (orderId: number) =>
    startCheckout.mutate(orderId, {
      onSuccess: ({ checkout_url }) => goToCheckout(checkout_url),
      onError: (error) =>
        notify(
          `Order #${orderId} was placed, but online payment couldn't start: ${errorMessage(error)} Take payment from the order list.`,
          "error",
        ),
    });

  const charge = () => {
    if (problem || busy) return;
    const paidBy = method;
    const cash = Number(tendered) || 0;
    const online = paidBy === "online" && total > 0;
    placeOrder.mutate(
      {
        customer_id: customer?.customer_id ?? null,
        discount_id: discount?.discount_id ?? null,
        discount_amount: discountAmount,
        // Paid now, then pending until it's handed over.
        order_status: "pending",
        // Online, PayMongo's webhook records the payment once it clears.
        payment:
          total > 0 && paidBy !== "online"
            ? { amount_paid: total, payment_method: paidBy }
            : undefined,
        items: lines.map((l) => ({
          product_id: l.product.product_id,
          quantity: l.quantity,
          size: l.size,
          selling_price: l.price,
          special_instructions: l.note.trim() || null,
        })),
      },
      {
        onSuccess: (order) => {
          if (online) {
            reset();
            checkout(order.order_id);
            return;
          }
          // The backend prices preset discounts itself, so its total is the one to show.
          setReceipt({
            orderId: order.order_id,
            total: order.total_amount,
            method: paidBy,
            tendered: paidBy === "cash" ? cash : order.total_amount,
          });
          reset();
          notify(`Order #${order.order_id} sent to the bar.`);
        },
        onError: (error) => notify(errorMessage(error), "error"),
      },
    );
  };

  const changeCustomer = (next: Customer | null) => {
    setCustomer(next);
    if (discount?.eligibility === "university_id" && !next?.university_id)
      setDiscountChoice("none");
  };

  // Desktop only: the collapsed panel is a narrow rail. Below lg it always shows in full.
  const hideWhenCollapsed = collapsed ? "lg:hidden" : "";
  const toggleLabel = collapsed
    ? "Expand current order"
    : "Collapse current order";

  return (
    <section
      id="pos-ticket"
      ref={ref}
      aria-label="Current walk-in order"
      className="flex flex-col border-t border-(--pos-line) bg-(--pos-panel) lg:min-h-0 lg:overflow-hidden lg:border-t-0 lg:border-l"
    >
      <header
        className={`flex h-16 shrink-0 items-center gap-2 px-5 ${collapsed ? "lg:justify-center lg:px-0" : "lg:pl-3"}`}
      >
        <button
          type="button"
          aria-label={toggleLabel}
          title={toggleLabel}
          aria-expanded={!collapsed}
          aria-controls="pos-ticket"
          onClick={onToggleCollapsed}
          className={`hidden size-9 shrink-0 place-items-center rounded-lg text-(--pos-muted) hover:bg-white/5 hover:text-(--pos-ink) lg:grid ${FOCUS_RING}`}
        >
          {collapsed ? (
            <LuPanelRightOpen aria-hidden className="size-4" />
          ) : (
            <LuPanelRightClose aria-hidden className="size-4" />
          )}
        </button>
        <h2
          className={`flex-1 truncate text-base font-semibold ${hideWhenCollapsed}`}
        >
          Current order
          {itemCount > 0 && (
            <span className="ml-2 text-sm font-normal text-(--pos-muted) tabular-nums">
              {itemCount}
            </span>
          )}
        </h2>
        {lines.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className={`${buttonClass("ghost", "sm")} ${hideWhenCollapsed}`}
          >
            Clear
          </button>
        )}
      </header>

      {collapsed && itemCount > 0 && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={`${itemCount} items in the current order. Expand to review`}
          title={`${itemCount} items · ${formatPeso(total)}`}
          className={`mx-auto hidden flex-col items-center gap-1 rounded-lg px-2 py-2 text-(--pos-gold) hover:bg-white/5 lg:flex ${FOCUS_RING}`}
        >
          <FiShoppingBag aria-hidden className="size-4" />
          <span className="text-xs font-semibold tabular-nums">
            {itemCount}
          </span>
        </button>
      )}

      <div
        className={`pos-scroll flex-1 lg:overflow-y-auto ${hideWhenCollapsed}`}
      >
        {lines.length ? (
          <ul className="divide-y divide-white/6 px-5">
            {lines.map((l) => (
              <li key={l.key} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {l.product.product_name}
                    </p>
                    <p className="text-xs text-(--pos-muted) tabular-nums">
                      {formatPeso(l.price)} each
                    </p>
                  </div>
                  <p className="text-sm tabular-nums">
                    {formatPeso(l.price * l.quantity)}
                  </p>
                </div>

                {l.product.has_sizes && (
                  <div
                    role="radiogroup"
                    aria-label={`Size for ${l.product.product_name}`}
                    className="mt-2 -ml-2.5 inline-flex gap-0.5"
                  >
                    {SIZES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        role="radio"
                        aria-checked={l.size === s.value}
                        onClick={() => ticket.patch(l.key, { size: s.value })}
                        className={segmentClass(l.size === s.value)}
                      >
                        {s.label}
                        {s.upcharge ? (
                          <span className="opacity-70"> +{s.upcharge}</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-1.5 flex items-center gap-0.5">
                  <QtyButton
                    label={`One fewer ${l.product.product_name}`}
                    icon={FiMinus}
                    disabled={l.quantity <= 1}
                    onClick={() =>
                      ticket.patch(l.key, { quantity: l.quantity - 1 })
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
                    onClick={() =>
                      ticket.patch(l.key, { quantity: l.quantity + 1 })
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setNoteOpen(noteOpen === l.key ? null : l.key)
                    }
                    aria-expanded={noteOpen === l.key}
                    className={`ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs text-(--pos-muted) hover:text-(--pos-ink) ${FOCUS_RING}`}
                  >
                    <FiEdit3 aria-hidden className="size-3.5" />
                    {l.note ? "Edit note" : "Note"}
                  </button>
                  <QtyButton
                    label={`Remove ${l.product.product_name}`}
                    icon={FiTrash2}
                    onClick={() => ticket.remove(l.key)}
                  />
                </div>

                {noteOpen === l.key ? (
                  <input
                    autoFocus
                    value={l.note}
                    onChange={(e) =>
                      ticket.patch(l.key, { note: e.target.value })
                    }
                    onKeyDown={(e) => e.key === "Enter" && setNoteOpen(null)}
                    placeholder="e.g. less ice, oat milk"
                    aria-label={`Special instructions for ${l.product.product_name}`}
                    className={`${INPUT_CLASS} mt-2 py-1.5 text-xs`}
                  />
                ) : (
                  l.note && (
                    <p className="mt-1 text-xs text-(--pos-muted) italic">
                      “{l.note}”
                    </p>
                  )
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-10 text-sm text-(--pos-muted)">
            Tap a menu item to start a walk-in order.
          </p>
        )}
      </div>

      <div
        className={`space-y-3 border-t border-(--pos-line) px-5 py-4 ${hideWhenCollapsed}`}
      >
        <CustomerPicker
          value={customer}
          onChange={changeCustomer}
          labelClassName={LABEL}
        />
        <label className="block">
          <span className={LABEL}>Discount</span>
          <select
            value={String(discountChoice)}
            onChange={(e) => {
              const v = e.target.value;
              setDiscountChoice(v === "none" || v === "custom" ? v : Number(v));
              setIdChecked(false);
            }}
            className={`${INPUT_CLASS} truncate`}
          >
            <option value="none">None</option>
            {discounts.data?.map((d) => (
              <option
                key={d.discount_id}
                value={d.discount_id}
                disabled={!eligible(d)}
              >
                {d.discount_name} · {describeDiscount(d)}
                {eligible(d) ? "" : " (needs a student)"}
              </option>
            ))}
            {discounts.isError && (
              <option disabled value="error">
                Couldn't load discounts
              </option>
            )}
            <option value="custom">Custom amount</option>
          </select>
        </label>

        {discountChoice === "custom" && (
          <label className="block">
            <span className={LABEL}>Discount amount (₱)</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={customDiscount}
              onChange={(e) => setCustomDiscount(e.target.value)}
              className={INPUT_CLASS}
            />
          </label>
        )}

        {needsIdCheck && (
          <label className="flex items-center gap-2 text-sm text-amber-200">
            <input
              type="checkbox"
              checked={idChecked}
              onChange={(e) => setIdChecked(e.target.checked)}
              className="size-4 accent-(--pos-gold)"
            />
            I've checked the senior citizen or PWD ID
          </label>
        )}

        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-(--pos-muted)">Subtotal</dt>
            <dd className="tabular-nums">{formatPeso(subtotal)}</dd>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between">
              <dt className="text-(--pos-muted)">
                Discount{discount ? ` · ${discount.discount_name}` : ""}
              </dt>
              <dd className="tabular-nums">− {formatPeso(discountAmount)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-1">
            <dt className="font-medium">Total</dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {formatPeso(total)}
            </dd>
          </div>
        </dl>

        <PaymentFields
          total={total}
          method={method}
          onMethodChange={setMethod}
          onlineMethods={onlineMethods}
          tendered={tendered}
          onTenderedChange={setTendered}
          labelClassName={LABEL}
        />

        <button
          type="button"
          disabled={problem !== null || busy}
          onClick={charge}
          className={`${buttonClass("primary", "lg")} w-full`}
        >
          {openingCheckout
            ? "Opening checkout…"
            : placeOrder.isPending
              ? "Sending…"
              : total <= 0
                ? "Place order"
                : method === "online"
                  ? `Pay ${formatPeso(total)} online`
                  : `Charge ${formatPeso(total)}`}
        </button>
        {problem && lines.length > 0 && (
          <p className="text-xs text-(--pos-muted)">{problem}</p>
        )}
      </div>

      <Modal
        open={receipt !== null}
        onClose={() => setReceipt(null)}
        size="sm"
        title="Order placed"
        footer={
          <button
            type="button"
            autoFocus
            onClick={() => setReceipt(null)}
            className={buttonClass("primary")}
          >
            Next customer
          </button>
        }
      >
        {receipt && (
          <div className="text-center">
            <FiCheckCircle
              aria-hidden
              className="mx-auto size-8 text-emerald-300"
            />
            <p className="mt-3 text-sm text-(--pos-muted)">Order number</p>
            <p className="text-4xl font-semibold tabular-nums">
              #{receipt.orderId}
            </p>
            <dl className="mt-5 space-y-1 text-left text-sm">
              <div className="flex justify-between">
                <dt className="text-(--pos-muted)">Total</dt>
                <dd className="tabular-nums">{formatPeso(receipt.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-(--pos-muted)">
                  Paid by {TENDER_LABELS[receipt.method].toLowerCase()}
                </dt>
                <dd className="tabular-nums">{formatPeso(receipt.tendered)}</dd>
              </div>
              {receipt.method === "cash" && (
                <div className="flex justify-between border-t border-(--pos-line) pt-1 text-base font-semibold">
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
    </section>
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
      className={`grid size-7 place-items-center rounded-md text-(--pos-muted) hover:bg-white/[0.07] hover:text-(--pos-ink) disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent ${FOCUS_RING}`}
    >
      <Icon aria-hidden className="size-3.5" />
    </button>
  );
}
