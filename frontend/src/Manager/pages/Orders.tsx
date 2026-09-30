import { useMemo, useState } from "react";
import { FiCheck, FiDownload, FiEye, FiX } from "react-icons/fi";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import { Select } from "../components/Field";
import Modal from "../components/Modal";
import OrderDetailsModal from "../components/OrderDetailsModal";
import PageHeader from "../components/PageHeader";
import RowAction from "../components/RowAction";
import SearchInput from "../components/SearchInput";
import { ORDER_STATUS, PAYMENT_METHOD_LABELS } from "../components/status";
import { EmptyRow, Table, Td, Th } from "../components/Table";
import Tabs from "../components/Tabs";
import { useToast } from "../components/toastContext";
import { useManagerData } from "../data/dataContext";
import { describeItems, lookups } from "../data/selectors";
import type { Order, OrderStatus } from "../types";
import { groupBy } from "../utils/collections";
import { downloadCsv } from "../utils/csv";
import { addDays, dayKey, startOfDay } from "../utils/dates";
import { formatDateTime, formatPeso, formatRelative, fullName } from "../utils/format";

type StatusFilter = OrderStatus | "all";
type Range = "today" | "yesterday" | "7d" | "30d" | "all";

const RANGES: Record<Range, { label: string; from: number; to: number }> = {
  today: { label: "Today", from: 0, to: 0 },
  yesterday: { label: "Yesterday", from: 1, to: 1 },
  "7d": { label: "Last 7 days", from: 6, to: 0 },
  "30d": { label: "Last 30 days", from: 29, to: 0 },
  all: { label: "All time", from: Infinity, to: 0 },
};

const PAGE_SIZE = 50;

export default function Orders() {
  const { db, completeOrder, cancelOrder } = useManagerData();
  const notify = useToast();
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [range, setRange] = useState<Range>("today");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [viewing, setViewing] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState<Order | null>(null);

  const maps = useMemo(() => lookups(db), [db]);
  const itemsByOrder = useMemo(() => groupBy(db.order_items, (i) => i.order_id), [db.order_items]);
  const paymentsByOrder = useMemo(() => groupBy(db.payments, (p) => p.order_id), [db.payments]);

  // Pending orders are a live queue, so they ignore the date range.
  const inRange = useMemo(() => {
    const { from, to } = RANGES[range];
    const today = startOfDay(new Date());
    const start = from === Infinity ? "" : dayKey(addDays(today, -from));
    const end = dayKey(addDays(today, -to));
    return db.orders.filter((o) => {
      if (o.order_status === "pending") return true;
      const key = dayKey(o.ordered_at);
      return key >= start && key <= end;
    });
  }, [db.orders, range]);

  const customerName = (o: Order) => {
    const c = o.customer_id === null ? undefined : maps.customers.get(o.customer_id);
    return c ? fullName(c) : "Walk-in";
  };

  const matching = inRange.filter((o) => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    return !q || String(o.order_id).includes(q) || customerName(o).toLowerCase().includes(q);
  });
  const count = (s: OrderStatus) => matching.filter((o) => o.order_status === s).length;
  const visible = matching
    .filter((o) => status === "all" || o.order_status === status)
    .sort((a, b) =>
      status === "pending" ? a.ordered_at.localeCompare(b.ordered_at) : b.ordered_at.localeCompare(a.ordered_at),
    );

  const complete = (o: Order) => {
    completeOrder(o.order_id);
    notify(`Order #${o.order_id} completed. Stock was updated.`);
  };

  const confirmCancel = () => {
    if (!cancelling) return;
    cancelOrder(cancelling.order_id);
    notify(`Order #${cancelling.order_id} cancelled.`, "info");
    setCancelling(null);
    setViewing(null);
  };

  const exportCsv = () => {
    downloadCsv(
      `orders-${range}-${dayKey(new Date())}.csv`,
      visible.map((o) => ({
        order_id: o.order_id,
        ordered_at: o.ordered_at,
        status: o.order_status,
        customer: customerName(o),
        cashier: fullName(maps.employees.get(o.employee_id) ?? { first_name: "", last_name: "" }).trim(),
        items: describeItems(itemsByOrder.get(o.order_id) ?? [], maps.products),
        discount: o.discount_amount,
        total: o.total_amount,
        payment: (paymentsByOrder.get(o.order_id) ?? []).map((p) => PAYMENT_METHOD_LABELS[p.payment_method]).join(" + "),
      })),
    );
  };

  const viewed = viewing === null ? undefined : db.orders.find((o) => o.order_id === viewing);
  const paidForCancel = cancelling
    ? (paymentsByOrder.get(cancelling.order_id) ?? []).reduce((sum, p) => sum + p.amount_paid, 0)
    : 0;

  return (
    <>
      <PageHeader
        title="Orders"
        description="Work the queue, look up past orders and cancel mistakes. Completing an order deducts its recipe from stock."
        actions={
          <Button icon={FiDownload} onClick={exportCsv} disabled={visible.length === 0}>
            Export CSV
          </Button>
        }
      />

      <Card flush>
        <div className="flex flex-col gap-3 border-b border-(--mgr-line) p-4 xl:flex-row xl:items-center xl:justify-between">
          <Tabs
            label="Filter by status"
            value={status}
            onChange={(s) => {
              setStatus(s);
              setLimit(PAGE_SIZE);
            }}
            options={[
              { value: "pending", label: "Queue", count: count("pending") },
              { value: "completed", label: "Completed", count: count("completed") },
              { value: "cancelled", label: "Cancelled", count: count("cancelled") },
              { value: "all", label: "All", count: matching.length },
            ]}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput value={query} onChange={setQuery} placeholder="Order # or customer" className="sm:w-56" />
            <Select
              aria-label="Date range"
              value={range}
              onChange={(e) => {
                setRange(e.target.value as Range);
                setLimit(PAGE_SIZE);
              }}
              className="sm:w-40"
              disabled={status === "pending"}
              title={status === "pending" ? "The queue always shows every pending order" : undefined}
            >
              {Object.entries(RANGES).map(([value, r]) => (
                <option key={value} value={value}>{r.label}</option>
              ))}
            </Select>
          </div>
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Items</Th>
              <Th>Handled by</Th>
              <Th className="text-right">Total</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {visible.slice(0, limit).map((o) => {
              const s = ORDER_STATUS[o.order_status];
              const cashier = maps.employees.get(o.employee_id);
              const pending = o.order_status === "pending";
              return (
                <tr key={o.order_id} className="hover:bg-(--mgr-canvas)/50">
                  <Td>
                    <p className="font-medium">#{o.order_id}</p>
                    <p className="text-xs text-(--mgr-muted)">
                      {pending ? formatRelative(o.ordered_at) : formatDateTime(o.ordered_at)}
                    </p>
                  </Td>
                  <Td>{customerName(o)}</Td>
                  <Td className="max-w-72 truncate text-(--mgr-muted)">
                    {describeItems(itemsByOrder.get(o.order_id) ?? [], maps.products)}
                  </Td>
                  <Td className="text-(--mgr-muted)">{cashier ? fullName(cashier) : "—"}</Td>
                  <Td className="text-right tabular-nums">
                    {formatPeso(o.total_amount)}
                    {o.discount_amount > 0 && (
                      <span className="block text-xs text-(--mgr-muted)">−{formatPeso(o.discount_amount)} disc.</span>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={s.tone} dot>{s.label}</Badge>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <RowAction icon={FiEye} label={`View order #${o.order_id}`} onClick={() => setViewing(o.order_id)} />
                      {pending && (
                        <>
                          <RowAction icon={FiCheck} label={`Complete order #${o.order_id}`} onClick={() => complete(o)} />
                          <RowAction icon={FiX} label={`Cancel order #${o.order_id}`} danger onClick={() => setCancelling(o)} />
                        </>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <EmptyRow colSpan={7}>{status === "pending" ? "The queue is clear." : "No orders match these filters."}</EmptyRow>
            )}
          </tbody>
        </Table>
        {visible.length > limit && (
          <div className="flex items-center justify-between gap-3 px-5 py-3 text-sm text-(--mgr-muted)">
            <span>
              Showing {limit} of {visible.length}
            </span>
            <Button size="sm" onClick={() => setLimit(limit + PAGE_SIZE)}>
              Show more
            </Button>
          </div>
        )}
      </Card>

      <OrderDetailsModal
        orderId={viewing}
        onClose={() => setViewing(null)}
        footer={
          viewed?.order_status === "pending" && (
            <>
              <Button variant="danger" icon={FiX} onClick={() => setCancelling(viewed)}>
                Cancel order
              </Button>
              <Button
                variant="primary"
                icon={FiCheck}
                onClick={() => {
                  complete(viewed);
                  setViewing(null);
                }}
              >
                Mark completed
              </Button>
            </>
          )
        }
      />

      <Modal
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        size="sm"
        title={`Cancel order #${cancelling?.order_id ?? ""}?`}
        description={
          paidForCancel > 0
            ? `The customer already paid ${formatPeso(paidForCancel)}. Refund it before cancelling. Cancelled orders don't count toward sales.`
            : "Cancelled orders don't count toward sales."
        }
        footer={
          <>
            <Button onClick={() => setCancelling(null)}>Keep order</Button>
            <Button variant="danger" onClick={confirmCancel}>
              Cancel order
            </Button>
          </>
        }
      />
    </>
  );
}
