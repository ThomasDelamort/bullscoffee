import { useState, type Ref } from "react";
import type { IconType } from "react-icons";
import { FiCheckCircle, FiEdit3, FiMinus, FiPlus, FiShoppingBag, FiTrash2 } from "react-icons/fi";
import { LuPanelRightClose, LuPanelRightOpen } from "react-icons/lu";
import { usePosData } from "../data/posContext";
import type { Ticket } from "../data/useTicket";
import type { Discount, PaymentMethod } from "../types";
import { formatPeso, fullName, round2 } from "../utils/format";
import {
  cashSuggestions,
  describeDiscount,
  discountFor,
  PAYMENT_METHOD_LABELS,
  SIZES,
  subtotalOf,
} from "../utils/pricing";
import Modal from "./Modal";
import { buttonClass, FOCUS_RING, INPUT_CLASS, segmentClass } from "./styles";
import { useToast } from "./toastContext";

type DiscountChoice = "none" | "custom" | number;

interface Receipt {
  orderId: number;
  total: number;
  method: PaymentMethod;
  tendered: number;
}

const PAYMENT_METHODS: readonly PaymentMethod[] = ["cash", "card", "e_wallet"];
const LABEL = "mb-1 block text-xs text-(--pos-muted)";

interface TicketPanelProps {
  ticket: Ticket;
  ref?: Ref<HTMLElement>;
  /** Desktop only: shrinks to a narrow rail. Below lg the panel always shows in full. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/** The walk-in order being rung up: line items, discount, payment and the charge button. */
export default function TicketPanel({ ticket, ref, collapsed, onToggleCollapsed }: TicketPanelProps) {
  const { db, placeOrder } = usePosData();
  const notify = useToast();

  const [customerId, setCustomerId] = useState<number | null>(null);
  const [discountChoice, setDiscountChoice] = useState<DiscountChoice>("none");
  const [customDiscount, setCustomDiscount] = useState("");
  const [idChecked, setIdChecked] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [tendered, setTendered] = useState("");
  const [noteOpen, setNoteOpen] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const { lines } = ticket;
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);
  const customer = db.customers.find((c) => c.customer_id === customerId);

  const subtotal = subtotalOf(lines.map((l) => ({ quantity: l.quantity, selling_price: l.price })));
  const discount = typeof discountChoice === "number" ? db.discounts.find((d) => d.discount_id === discountChoice) : undefined;
  const discountAmount =
    discountChoice === "custom"
      ? discountFor({ kind: "fixed", value: Number(customDiscount) || 0 }, subtotal)
      : discount
        ? discountFor(discount, subtotal)
        : 0;
  const total = round2(subtotal - discountAmount);
  const cash = Number(tendered) || 0;
  const change = round2(cash - total);

  const eligible = (d: Discount) => d.eligibility !== "university_id" || Boolean(customer?.university_id);
  const needsIdCheck = discount?.eligibility === "government_id";
  const problem =
    lines.length === 0
      ? "Add items to start an order."
      : discount && !eligible(discount)
        ? "The student discount needs a customer with a university ID."
        : needsIdCheck && !idChecked
          ? "Confirm you've checked the senior citizen or PWD ID."
          : method === "cash" && total > 0 && cash < total
            ? "Enter the cash received."
            : null;

  const reset = () => {
    ticket.clear();
    setCustomerId(null);
    setDiscountChoice("none");
    setCustomDiscount("");
    setIdChecked(false);
    setMethod("cash");
    setTendered("");
    setNoteOpen(null);
  };

  const charge = () => {
    if (problem) return;
    const orderId = placeOrder({
      customer_id: customerId,
      discount_id: discount?.discount_id ?? null,
      discount_amount: discountAmount,
      payment_method: method,
      items: lines.map((l) => ({
        product_id: l.product.product_id,
        quantity: l.quantity,
        size: l.size,
        selling_price: l.price,
        special_instructions: l.note.trim() || null,
      })),
    });
    setReceipt({ orderId, total, method, tendered: method === "cash" ? cash : total });
    reset();
    notify(`Order #${orderId} sent to the bar.`);
  };

  const changeCustomer = (id: number | null) => {
    setCustomerId(id);
    const next = db.customers.find((c) => c.customer_id === id);
    if (discount?.eligibility === "university_id" && !next?.university_id) setDiscountChoice("none");
  };

  // Desktop only: the collapsed panel is a narrow rail. Below lg it always shows in full.
  const hideWhenCollapsed = collapsed ? "lg:hidden" : "";
  const toggleLabel = collapsed ? "Expand current order" : "Collapse current order";

  return (
    <section
      id="pos-ticket"
      ref={ref}
      aria-label="Current walk-in order"
      className="flex flex-col border-t border-(--pos-line) bg-(--pos-panel) lg:min-h-0 lg:overflow-hidden lg:border-t-0 lg:border-l"
    >
      <header className={`flex h-16 shrink-0 items-center gap-2 px-5 ${collapsed ? "lg:justify-center lg:px-0" : "lg:pl-3"}`}>
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
        <h2 className={`flex-1 truncate text-base font-semibold ${hideWhenCollapsed}`}>
          Current order
          {itemCount > 0 && <span className="ml-2 text-sm font-normal text-(--pos-muted) tabular-nums">{itemCount}</span>}
        </h2>
        {lines.length > 0 && (
          <button type="button" onClick={reset} className={`${buttonClass("ghost", "sm")} ${hideWhenCollapsed}`}>
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
          <span className="text-xs font-semibold tabular-nums">{itemCount}</span>
        </button>
      )}

      <div className={`pos-scroll flex-1 lg:overflow-y-auto ${hideWhenCollapsed}`}>
        {lines.length ? (
          <ul className="divide-y divide-white/[0.06] px-5">
            {lines.map((l) => (
              <li key={l.key} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{l.product.product_name}</p>
                    <p className="text-xs text-(--pos-muted) tabular-nums">{formatPeso(l.price)} each</p>
                  </div>
                  <p className="text-sm tabular-nums">{formatPeso(l.price * l.quantity)}</p>
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
                        {s.upcharge ? <span className="opacity-70"> +{s.upcharge}</span> : null}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-1.5 flex items-center gap-0.5">
                  <QtyButton
                    label={`One fewer ${l.product.product_name}`}
                    icon={FiMinus}
                    disabled={l.quantity <= 1}
                    onClick={() => ticket.patch(l.key, { quantity: l.quantity - 1 })}
                  />
                  <span className="w-7 text-center text-sm tabular-nums" aria-label="Quantity">
                    {l.quantity}
                  </span>
                  <QtyButton
                    label={`One more ${l.product.product_name}`}
                    icon={FiPlus}
                    onClick={() => ticket.patch(l.key, { quantity: l.quantity + 1 })}
                  />
                  <button
                    type="button"
                    onClick={() => setNoteOpen(noteOpen === l.key ? null : l.key)}
                    aria-expanded={noteOpen === l.key}
                    className={`ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs text-(--pos-muted) hover:text-(--pos-ink) ${FOCUS_RING}`}
                  >
                    <FiEdit3 aria-hidden className="size-3.5" />
                    {l.note ? "Edit note" : "Note"}
                  </button>
                  <QtyButton label={`Remove ${l.product.product_name}`} icon={FiTrash2} onClick={() => ticket.remove(l.key)} />
                </div>

                {noteOpen === l.key ? (
                  <input
                    autoFocus
                    value={l.note}
                    onChange={(e) => ticket.patch(l.key, { note: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && setNoteOpen(null)}
                    placeholder="e.g. less ice, oat milk"
                    aria-label={`Special instructions for ${l.product.product_name}`}
                    className={`${INPUT_CLASS} mt-2 py-1.5 text-xs`}
                  />
                ) : (
                  l.note && <p className="mt-1 text-xs text-(--pos-muted) italic">“{l.note}”</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-10 text-sm text-(--pos-muted)">Tap a menu item to start a walk-in order.</p>
        )}
      </div>

      <div className={`space-y-3 border-t border-(--pos-line) px-5 py-4 ${hideWhenCollapsed}`}>
        <div className="grid grid-cols-2 gap-2">
          <label className="min-w-0">
            <span className={LABEL}>Customer</span>
            <select
              value={customerId ?? ""}
              onChange={(e) => changeCustomer(e.target.value ? Number(e.target.value) : null)}
              className={`${INPUT_CLASS} truncate`}
            >
              <option value="">Guest</option>
              {db.customers.map((c) => (
                <option key={c.customer_id} value={c.customer_id}>
                  {fullName(c)}
                  {c.university_id ? " · student" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0">
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
              {db.discounts
                .filter((d) => d.is_active)
                .map((d) => (
                  <option key={d.discount_id} value={d.discount_id} disabled={!eligible(d)}>
                    {d.discount_name} · {describeDiscount(d)}
                    {eligible(d) ? "" : " (needs a student)"}
                  </option>
                ))}
              <option value="custom">Custom amount</option>
            </select>
          </label>
        </div>

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
              <dt className="text-(--pos-muted)">Discount{discount ? ` · ${discount.discount_name}` : ""}</dt>
              <dd className="tabular-nums">− {formatPeso(discountAmount)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-1">
            <dt className="font-medium">Total</dt>
            <dd className="text-2xl font-semibold tabular-nums">{formatPeso(total)}</dd>
          </div>
        </dl>

        <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-3 gap-1 rounded-lg bg-white/[0.04] p-1">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={method === m}
              onClick={() => setMethod(m)}
              className={`${segmentClass(method === m)} py-1.5 text-sm`}
            >
              {PAYMENT_METHOD_LABELS[m]}
            </button>
          ))}
        </div>

        {method === "cash" && total > 0 && (
          <div className="space-y-2">
            <label className="block">
              <span className={LABEL}>Cash received (₱)</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={tendered}
                onChange={(e) => setTendered(e.target.value)}
                className={INPUT_CLASS}
              />
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {cashSuggestions(total).map((amount, i) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setTendered(String(amount))}
                  className={`${buttonClass("ghost", "sm")} bg-white/[0.03] px-1 font-medium tabular-nums`}
                >
                  {i === 0 ? "Exact" : `₱${amount.toLocaleString("en-PH")}`}
                </button>
              ))}
            </div>
            {cash >= total && (
              <p className="flex justify-between text-sm">
                <span className="text-(--pos-muted)">Change</span>
                <span className="font-semibold tabular-nums">{formatPeso(change)}</span>
              </p>
            )}
          </div>
        )}

        <button type="button" disabled={problem !== null} onClick={charge} className={`${buttonClass("primary", "lg")} w-full`}>
          {total > 0 ? `Charge ${formatPeso(total)}` : "Place order"}
        </button>
        {problem && lines.length > 0 && <p className="text-xs text-(--pos-muted)">{problem}</p>}
      </div>

      <Modal
        open={receipt !== null}
        onClose={() => setReceipt(null)}
        size="sm"
        title="Order placed"
        footer={
          <button type="button" autoFocus onClick={() => setReceipt(null)} className={buttonClass("primary")}>
            Next customer
          </button>
        }
      >
        {receipt && (
          <div className="text-center">
            <FiCheckCircle aria-hidden className="mx-auto size-8 text-emerald-300" />
            <p className="mt-3 text-sm text-(--pos-muted)">Order number</p>
            <p className="text-4xl font-semibold tabular-nums">#{receipt.orderId}</p>
            <dl className="mt-5 space-y-1 text-left text-sm">
              <div className="flex justify-between">
                <dt className="text-(--pos-muted)">Total</dt>
                <dd className="tabular-nums">{formatPeso(receipt.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-(--pos-muted)">Paid by {PAYMENT_METHOD_LABELS[receipt.method].toLowerCase()}</dt>
                <dd className="tabular-nums">{formatPeso(receipt.tendered)}</dd>
              </div>
              {receipt.method === "cash" && (
                <div className="flex justify-between border-t border-(--pos-line) pt-1 text-base font-semibold">
                  <dt>Change</dt>
                  <dd className="tabular-nums">{formatPeso(round2(receipt.tendered - receipt.total))}</dd>
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
