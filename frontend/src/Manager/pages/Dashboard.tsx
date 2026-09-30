import { useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheck,
  FiClipboard,
  FiPackage,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import BarChart from "../components/charts/BarChart";
import ChartCard from "../components/charts/ChartCard";
import LineChart from "../components/charts/LineChart";
import OrderDetailsModal from "../components/OrderDetailsModal";
import PageHeader from "../components/PageHeader";
import Stars from "../components/Stars";
import StatCard from "../components/StatCard";
import { STOCK_STATE } from "../components/status";
import { buttonClass, FOCUS_RING } from "../components/styles";
import { useToast } from "../components/toastContext";
import { useManagerData } from "../data/dataContext";
import { describeItems, isSale, lookups, salesTotals, STORE_HOURS, stockState } from "../data/selectors";
import { managerPath } from "../routes";
import type { SeriesPoint } from "../types";
import { groupBy } from "../utils/collections";
import { addDays, dayKey, startOfDay } from "../utils/dates";
import {
  formatChange,
  formatHourShort,
  formatNumber,
  formatPeso,
  formatPesoWhole,
  formatRelative,
  formatShortDate,
  formatTime,
  fullName,
} from "../utils/format";
import { formatClock, parseSchedule, worksOn } from "../utils/schedule";

export default function Dashboard() {
  const { db, completeOrder } = useManagerData();
  const notify = useToast();
  const [openOrder, setOpenOrder] = useState<number | null>(null);

  const now = new Date();
  const today = dayKey(now);
  const maps = useMemo(() => lookups(db), [db]);
  const byDay = useMemo(() => groupBy(db.orders, (o) => dayKey(o.ordered_at)), [db.orders]);
  const itemsByOrder = useMemo(() => groupBy(db.order_items, (i) => i.order_id), [db.order_items]);

  const todayOrders = byDay.get(today) ?? [];
  const todayTotals = salesTotals(todayOrders);
  const sameTimeYesterday = addDays(now, -1);
  const yesterdaySoFar = (byDay.get(dayKey(sameTimeYesterday)) ?? []).filter(
    (o) => new Date(o.ordered_at) <= sameTimeYesterday,
  );
  const salesChange = formatChange(todayTotals.net, salesTotals(yesterdaySoFar).net);

  const pending = db.orders
    .filter((o) => o.order_status === "pending")
    .sort((a, b) => a.ordered_at.localeCompare(b.ordered_at));

  const alerts = db.ingredients
    .filter((i) => i.is_active && stockState(i) !== "in")
    .sort((a, b) => a.current_quantity / (a.minimum_stock_level || 1) - b.current_quantity / (b.minimum_stock_level || 1));
  const outIds = new Set(alerts.filter((i) => stockState(i) === "out").map((i) => i.ingredient_id));
  const blocked = db.products.filter(
    (p) =>
      p.is_available &&
      db.product_ingredients.some((r) => r.product_id === p.product_id && outIds.has(r.ingredient_id)),
  );

  const onShift = db.attendance_logs.filter((l) => !l.time_out && dayKey(l.time_in) === today);
  const scheduledToday = db.employees.filter(
    (e) => e.employee_status === "active" && worksOn(parseSchedule(e.work_schedule), now),
  );
  const latestFeedback = [...db.feedback].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 4);

  const salesSeries: SeriesPoint[] = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(startOfDay(now), i - 13);
    return { label: formatShortDate(d), value: salesTotals(byDay.get(dayKey(d)) ?? []).net };
  });
  const hourly: SeriesPoint[] = STORE_HOURS.map((h) => ({
    label: formatHourShort(h),
    value: todayOrders.filter((o) => isSale(o) && new Date(o.ordered_at).getHours() === h).length,
  }));

  const complete = (orderId: number) => {
    completeOrder(orderId);
    notify(`Order #${orderId} completed. Stock was updated.`);
  };

  return (
    <>
      <PageHeader title="Dashboard" description="Today's sales, the order queue, stock and staff at a glance." />

      {blocked.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-900 ring-1 ring-red-200">
          <FiAlertTriangle aria-hidden className="size-5 shrink-0" />
          <p className="flex-1">
            <span className="font-semibold">{[...outIds].map((id) => maps.ingredients.get(id)?.ingredient_name).join(", ")}</span>{" "}
            {outIds.size === 1 ? "is" : "are"} out of stock, so {blocked.map((p) => p.product_name).join(", ")} can't be
            made.
          </p>
          <Link to={managerPath("suppliers")} className={buttonClass("secondary", "sm")}>
            Record a delivery
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sales today"
          value={formatPeso(todayTotals.net)}
          hint={salesChange ? `${salesChange} vs this time yesterday` : "No sales yesterday to compare"}
          icon={FiTrendingUp}
        />
        <StatCard
          label="Orders today"
          value={formatNumber(todayTotals.orders)}
          hint={pending.length ? `${pending.length} waiting in the queue` : "Queue is clear"}
          icon={FiClipboard}
        />
        <StatCard
          label="Staff on shift"
          value={onShift.length}
          hint={`${scheduledToday.length} scheduled today`}
          icon={FiUsers}
        />
        <StatCard
          label="Stock alerts"
          value={alerts.length}
          hint={outIds.size ? `${outIds.size} out of stock` : "Nothing out of stock"}
          icon={FiPackage}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <ChartCard
            title="Net sales"
            description="Last 14 days, after discounts"
            data={salesSeries}
            columns={["Day", "Net sales"]}
            format={formatPesoWhole}
          >
            <LineChart data={salesSeries} label="Net sales over the last 14 days" format={formatPesoWhole} xLabelEvery={2} />
          </ChartCard>
        </div>
        <div className="xl:col-span-2">
          <ChartCard
            title="Orders by hour"
            description="Today, excluding cancelled"
            data={hourly}
            columns={["Hour", "Orders"]}
            format={formatNumber}
          >
            <BarChart data={hourly} label="Orders per hour today" format={formatNumber} />
          </ChartCard>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card
          className="xl:col-span-3"
          title="Order queue"
          description="Paid and waiting to be handed over, oldest first"
          flush
          actions={<ViewAll to={managerPath("orders")} />}
        >
          {pending.length ? (
            <ul className="divide-y divide-(--mgr-line)">
              {pending.slice(0, 6).map((order) => {
                const customer = order.customer_id === null ? undefined : maps.customers.get(order.customer_id);
                return (
                  <li key={order.order_id} className="flex items-center gap-3 px-5 py-3">
                    <button
                      type="button"
                      onClick={() => setOpenOrder(order.order_id)}
                      className={`min-w-0 flex-1 rounded-md text-left ${FOCUS_RING}`}
                    >
                      <p className="truncate text-sm font-medium">
                        #{order.order_id} · {customer ? fullName(customer) : "Walk-in"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-(--mgr-muted)">
                        {describeItems(itemsByOrder.get(order.order_id) ?? [], maps.products)}
                      </p>
                    </button>
                    <span className="hidden text-xs whitespace-nowrap text-(--mgr-muted) sm:block">
                      {formatRelative(order.ordered_at)}
                    </span>
                    <Button size="sm" icon={FiCheck} onClick={() => complete(order.order_id)}>
                      Complete
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-(--mgr-muted)">No orders waiting.</p>
          )}
        </Card>

        <Card className="xl:col-span-2" title="Stock alerts" flush actions={<ViewAll to={managerPath("inventory")} />}>
          {alerts.length ? (
            <ul className="divide-y divide-(--mgr-line)">
              {alerts.slice(0, 6).map((i) => {
                const state = STOCK_STATE[stockState(i)];
                return (
                  <li key={i.ingredient_id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{i.ingredient_name}</p>
                      <p className="text-xs text-(--mgr-muted) tabular-nums">
                        {formatNumber(i.current_quantity)} / {formatNumber(i.minimum_stock_level)} {i.unit_of_measure} minimum
                      </p>
                    </div>
                    <Badge tone={state.tone} dot>{state.label}</Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-(--mgr-muted)">Everything is above its minimum.</p>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3" title="Latest feedback" flush actions={<ViewAll to={managerPath("feedback")} />}>
          <ul className="divide-y divide-(--mgr-line)">
            {latestFeedback.map((f) => {
              const customer = f.customer_id === null ? undefined : maps.customers.get(f.customer_id);
              return (
                <li key={f.feedback_id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Stars rating={f.rating} />
                    <span className="text-xs text-(--mgr-muted)">{formatRelative(f.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm">{f.comment}</p>
                  <p className="mt-0.5 text-xs text-(--mgr-muted)">{customer ? fullName(customer) : "Anonymous"}</p>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="xl:col-span-2" title="Today's staff" flush actions={<ViewAll to={managerPath("attendance")} />}>
          <ul className="divide-y divide-(--mgr-line)">
            {scheduledToday.map((e) => {
              const shift = parseSchedule(e.work_schedule);
              const log = db.attendance_logs.find((l) => l.employee_id === e.employee_id && dayKey(l.time_in) === today);
              return (
                <li key={e.employee_id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{fullName(e)}</p>
                    <p className="text-xs text-(--mgr-muted)">
                      {shift ? `${formatClock(shift.start)} – ${formatClock(shift.end)}` : e.work_schedule}
                    </p>
                  </div>
                  {log ? (
                    log.time_out ? (
                      <Badge tone="neutral">Left {formatTime(log.time_out)}</Badge>
                    ) : (
                      <Badge tone="success" dot>In since {formatTime(log.time_in)}</Badge>
                    )
                  ) : (
                    <Badge tone="neutral">Not clocked in</Badge>
                  )}
                </li>
              );
            })}
            {scheduledToday.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-(--mgr-muted)">Nobody is scheduled today.</li>
            )}
          </ul>
        </Card>
      </div>

      <OrderDetailsModal
        orderId={openOrder}
        onClose={() => setOpenOrder(null)}
        footer={
          openOrder !== null &&
          db.orders.find((o) => o.order_id === openOrder)?.order_status === "pending" && (
            <Button
              variant="primary"
              icon={FiCheck}
              onClick={() => {
                complete(openOrder);
                setOpenOrder(null);
              }}
            >
              Mark completed
            </Button>
          )
        }
      />
    </>
  );
}

function ViewAll({ to }: { to: string }) {
  return (
    <Link to={to} className={buttonClass("ghost", "sm")}>
      View all <FiArrowRight aria-hidden className="size-3.5" />
    </Link>
  );
}
