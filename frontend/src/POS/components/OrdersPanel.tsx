import { useMemo, type ReactNode } from "react";
import { FiX } from "react-icons/fi";
import { errorMessage } from "../../lib/api";
import { useCompleteOrder } from "../api/orders";
import { isPaid, itemSummary, shiftSummary, type OrderFilter } from "../data/selectors";
import type { Order } from "../types";
import { formatLongDate, formatPeso, formatRelative, round2 } from "../utils/format";
import { SOURCE } from "./status";
import { ErrorNotice, Loading } from "./QueryState";
import { buttonClass, FOCUS_RING, segmentClass } from "./styles";
import { useToast } from "./toastContext";

interface OrdersPanelProps {
  /** Today's orders and yesterday's still pending; undefined while loading. */
  orders: Order[] | undefined;
  error: unknown;
  onRetry: () => void;
  /** The register's local YYYY-MM-DD. */
  today: string;
  now: Date;
  filter: OrderFilter;
  onFilterChange: (filter: OrderFilter) => void;
  onOpenOrder: (orderId: number) => void;
  onClose: () => void;
}

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "counter", label: SOURCE.counter.label },
  { value: "kiosk", label: SOURCE.kiosk.label },
];

/** The shift's numbers (sales, discounts given) and every order, the ones needing the cashier first. */
export default function OrdersPanel({
  orders,
  error,
  onRetry,
  today,
  now,
  filter,
  onFilterChange,
  onOpenOrder,
  onClose,
}: OrdersPanelProps) {
  const completeOrder = useCompleteOrder();
  const notify = useToast();
  const rows = useMemo(() => orders ?? [], [orders]);
  const summary = useMemo(() => shiftSummary(rows, today), [rows, today]);

  const visible = rows.filter((o) => filter === "all" || o.order_source === filter);
  // Oldest first among open orders: they've waited longest.
  const oldestFirst = (a: Order, b: Order) => a.ordered_at.localeCompare(b.ordered_at);
  const pending = visible.filter((o) => o.order_status === "pending");
  const toCharge = pending.filter((o) => !isPaid(o)).sort(oldestFirst);
  const toHandOver = pending.filter(isPaid).sort(oldestFirst);
  const closed = visible.filter((o) => o.order_status !== "pending").sort((a, b) => b.ordered_at.localeCompare(a.ordered_at));
  const countFor = (f: OrderFilter) => rows.filter((o) => f === "all" || o.order_source === f).length;

  const complete = (order: Order) =>
    completeOrder.mutate(order.order_id, {
      onSuccess: () => notify(`Order #${order.order_id} completed.`),
      onError: (e) => notify(errorMessage(e), "error"),
    });

  return (
    <div className="pos-scroll flex h-full flex-col overflow-y-auto">
      <section aria-labelledby="pos-shift-heading" className="px-5 pb-5">
        <div className="flex h-16 items-center justify-between gap-2">
          <h2 id="pos-shift-heading" className="text-base font-semibold">
            Today
            <span className="ml-2 text-sm font-normal text-(--pos-muted)">{formatLongDate(now)}</span>
          </h2>
          <button
            type="button"
            aria-label="Close orders"
            onClick={onClose}
            className={`-mr-2 grid size-9 place-items-center rounded-lg text-(--pos-muted) hover:bg-white/5 hover:text-(--pos-ink) ${FOCUS_RING}`}
          >
            <FiX aria-hidden className="size-5" />
          </button>
        </div>

        <p className="text-xs text-(--pos-muted)">Net sales</p>
        <p className="text-3xl font-semibold tabular-nums">{orders ? formatPeso(summary.netSales) : "—"}</p>
        <p className="mt-0.5 text-xs text-(--pos-muted) tabular-nums">
          {summary.orderCount} paid orders
          {summary.orderCount > 0 && ` · avg ${formatPeso(round2(summary.netSales / summary.orderCount))}`}
        </p>

        <dl className="mt-4 divide-y divide-white/[0.06] text-sm">
          <Row label={SOURCE.counter.label} value={formatPeso(summary.bySource.counter.sales)} hint={summary.bySource.counter.count} />
          <Row label={SOURCE.kiosk.label} value={formatPeso(summary.bySource.kiosk.sales)} hint={summary.bySource.kiosk.count} />
          <Row label="Discounts given" value={`− ${formatPeso(summary.discountTotal)}`} hint={summary.discountedCount} />
          {summary.discountsByName.map((d) => (
            <Row key={d.name} label={d.name} value={`− ${formatPeso(d.amount)}`} hint={`×${d.count}`} nested />
          ))}
        </dl>
      </section>

      <div className="sticky top-0 z-10 bg-(--pos-panel)/95 px-5 py-2 backdrop-blur">
        <div role="group" aria-label="Order source" className="grid grid-cols-3 gap-1 rounded-lg bg-white/[0.04] p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => onFilterChange(f.value)}
              className={segmentClass(filter === f.value)}
            >
              {f.label} <span className="opacity-60 tabular-nums">{countFor(f.value)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-5 px-5 pt-3 pb-5">
        {error ? <ErrorNotice title="Couldn't load orders" error={error} onRetry={onRetry} /> : null}
        {!orders && !error && <Loading label="Loading orders…" />}
        {orders && (
          <>
            {toCharge.length > 0 && (
              <OrderGroup title="To charge" count={toCharge.length} empty="">
                {toCharge.map((o) => (
                  <OrderRow key={o.order_id} order={o} now={now} onOpen={() => onOpenOrder(o.order_id)} action="Charge" />
                ))}
              </OrderGroup>
            )}
            <OrderGroup title="To hand over" count={toHandOver.length} empty="Nothing waiting.">
              {toHandOver.map((o) => (
                <OrderRow
                  key={o.order_id}
                  order={o}
                  now={now}
                  onOpen={() => onOpenOrder(o.order_id)}
                  action="Served"
                  onAction={() => complete(o)}
                />
              ))}
            </OrderGroup>
            <OrderGroup title="Earlier" count={closed.length} empty="No finished orders yet.">
              {closed.map((o) => (
                <OrderRow key={o.order_id} order={o} now={now} onOpen={() => onOpenOrder(o.order_id)} />
              ))}
            </OrderGroup>
          </>
        )}
      </div>
    </div>
  );
}

interface RowProps {
  label: string;
  value: string;
  hint: number | string;
  nested?: boolean;
}

function Row({ label, value, hint, nested }: RowProps) {
  return (
    <div className={`flex items-baseline gap-2 py-1.5 ${nested ? "pl-3 text-xs text-(--pos-muted)" : ""}`}>
      <dt className={`flex-1 ${nested ? "" : "text-(--pos-muted)"}`}>{label}</dt>
      <dd className="w-8 text-right text-xs text-(--pos-muted) tabular-nums">{hint}</dd>
      <dd className="w-24 text-right tabular-nums">{value}</dd>
    </div>
  );
}

function OrderGroup({ title, count, empty, children }: { title: string; count: number; empty: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-[11px] font-medium tracking-wider text-(--pos-muted) uppercase">
        {title} <span className="tabular-nums">· {count}</span>
      </h3>
      {count ? (
        <ul className="divide-y divide-white/[0.06]">{children}</ul>
      ) : (
        <p className="py-2 text-xs text-(--pos-muted)">{empty}</p>
      )}
    </section>
  );
}

interface OrderRowProps {
  order: Order;
  now: Date;
  onOpen: () => void;
  /** Label for the row's button. Without onAction it opens the order instead. */
  action?: string;
  onAction?: () => void;
}

function OrderRow({ order, now, onOpen, action, onAction }: OrderRowProps) {
  const pending = order.order_status === "pending";
  const cancelled = order.order_status === "cancelled";
  const source = SOURCE[order.order_source];
  const unpaid = pending && !isPaid(order);

  return (
    <li className={`flex items-start gap-3 py-3 ${pending ? "" : "opacity-60"}`}>
      <span
        aria-hidden
        className={`mt-1.5 size-2 shrink-0 rounded-full ${
          pending ? (order.order_source === "kiosk" ? "bg-(--pos-sky)" : "bg-(--pos-gold)") : "bg-white/15"
        }`}
      />
      <button type="button" onClick={onOpen} className={`-my-1 min-w-0 flex-1 rounded-md py-1 text-left ${FOCUS_RING}`}>
        <span className="flex items-baseline gap-2">
          <span className="text-sm font-medium tabular-nums">#{order.order_id}</span>
          <span className={`text-xs ${source.color}`}>{source.label}</span>
          <span className={`ml-auto text-sm tabular-nums ${cancelled ? "line-through" : ""}`}>
            {formatPeso(order.total_amount)}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-(--pos-ink)/80">{itemSummary(order)}</span>
        <span className="mt-0.5 block truncate text-xs text-(--pos-muted)">
          {[
            cancelled && "Cancelled",
            unpaid && "Not paid yet",
            order.customer_name,
            formatRelative(order.ordered_at, now),
            order.discount_amount > 0 && `${order.discount_name ?? "Custom"} − ${formatPeso(order.discount_amount)}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </button>
      {pending && action && (
        <button
          type="button"
          onClick={onAction ?? onOpen}
          className={`${buttonClass(unpaid ? "primary" : "secondary", "sm")} mt-0.5`}
        >
          {action}
        </button>
      )}
    </li>
  );
}
