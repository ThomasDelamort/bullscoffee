import { useMemo, useState } from "react";
import { FiDollarSign, FiDownload, FiShoppingBag, FiTag, FiXCircle } from "react-icons/fi";
import Button from "../components/Button";
import Card from "../components/Card";
import BarChart from "../components/charts/BarChart";
import ChartCard from "../components/charts/ChartCard";
import LineChart from "../components/charts/LineChart";
import { Input } from "../components/Field";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { PAYMENT_METHOD_LABELS } from "../components/status";
import { EmptyRow, Table, Td, Th } from "../components/Table";
import Tabs from "../components/Tabs";
import { useManagerData } from "../data/dataContext";
import { describeItems, isSale, itemsOf, lookups, productSales, salesTotals, STORE_HOURS } from "../data/selectors";
import type { Order, SeriesPoint } from "../types";
import { groupBy, sumBy } from "../utils/collections";
import { downloadCsv } from "../utils/csv";
import { addDays, dayKey, daysInMonth, fromDayKey, monthKey } from "../utils/dates";
import {
  formatChange,
  formatHourShort,
  formatMonth,
  formatNumber,
  formatPeso,
  formatPesoWhole,
  fullName,
  round2,
} from "../utils/format";

type Period = "daily" | "monthly";

function previousMonth(key: string): string {
  const d = fromDayKey(`${key}-01`);
  d.setMonth(d.getMonth() - 1);
  return monthKey(d);
}

export default function Reports() {
  const { db } = useManagerData();
  const now = new Date();
  const [period, setPeriod] = useState<Period>("daily");
  const [day, setDay] = useState(dayKey(now));
  const [month, setMonth] = useState(monthKey(now));

  const maps = useMemo(() => lookups(db), [db]);
  const daily = period === "daily";

  const report = useMemo(() => {
    const now = new Date();
    const inProgress = daily ? day === dayKey(now) : month === monthKey(now);
    const prevKey = daily ? dayKey(addDays(fromDayKey(day), -1)) : previousMonth(month);
    const orders = db.orders.filter((o) => (daily ? dayKey(o.ordered_at) === day : monthKey(o.ordered_at) === month));

    // An unfinished day or month is compared with the same point in the previous one.
    const previous = db.orders.filter((o) => {
      const at = new Date(o.ordered_at);
      if (daily) {
        if (dayKey(at) !== prevKey) return false;
        return !inProgress || at.getHours() * 60 + at.getMinutes() <= now.getHours() * 60 + now.getMinutes();
      }
      if (monthKey(at) !== prevKey) return false;
      return !inProgress || at.getDate() <= now.getDate();
    });

    const sales = orders.filter(isSale);
    const items = itemsOf(db, sales);
    const saleIds = new Set(sales.map((o) => o.order_id));

    const series: SeriesPoint[] = daily
      ? STORE_HOURS.map((h) => ({
          label: formatHourShort(h),
          value: round2(sumBy(sales.filter((o) => new Date(o.ordered_at).getHours() === h), (o) => o.total_amount)),
        }))
      : Array.from({ length: daysInMonth(month) }, (_, i) => {
          const d = i + 1;
          return {
            label: String(d),
            value: round2(sumBy(sales.filter((o) => new Date(o.ordered_at).getDate() === d), (o) => o.total_amount)),
          };
        });

    const products = productSales(items);
    const byCategory = [...groupBy(products, (p) => maps.products.get(p.product_id)?.category_id ?? 0)]
      .map(([categoryId, rows]) => ({
        name: maps.categories.get(categoryId)?.category_name ?? "Uncategorised",
        revenue: round2(sumBy(rows, (r) => r.revenue)),
        quantity: sumBy(rows, (r) => r.quantity),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const payments = [...groupBy(db.payments.filter((p) => saleIds.has(p.order_id)), (p) => p.payment_method)]
      .map(([method, rows]) => ({ method, count: rows.length, amount: round2(sumBy(rows, (r) => r.amount_paid)) }))
      .sort((a, b) => b.amount - a.amount);

    const cashiers = [...groupBy(sales, (o) => o.employee_id)]
      .map(([employeeId, rows]) => ({ employeeId, ...salesTotals(rows) }))
      .sort((a, b) => b.net - a.net);

    return {
      inProgress,
      orders,
      sales,
      totals: salesTotals(orders),
      prevTotals: salesTotals(previous),
      cancelled: orders.filter((o) => o.order_status === "cancelled"),
      series,
      products,
      byCategory,
      payments,
      cashiers,
    };
  }, [db, maps, daily, day, month]);

  const { totals, prevTotals } = report;
  const compareTo = daily
    ? report.inProgress
      ? "vs same time yesterday"
      : "vs previous day"
    : report.inProgress
      ? "vs same point last month"
      : "vs previous month";
  const netChange = formatChange(totals.net, prevTotals.net);
  const label = daily
    ? fromDayKey(day).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : formatMonth(fromDayKey(`${month}-01`));
  const fileKey = daily ? day : month;
  const categoryTotal = sumBy(report.byCategory, (c) => c.revenue);
  const paymentTotal = sumBy(report.payments, (p) => p.amount);

  const itemsByOrder = groupBy(itemsOf(db, report.orders), (i) => i.order_id);
  const exportOrders = () =>
    downloadCsv(
      `sales-${fileKey}.csv`,
      report.orders.map((o: Order) => ({
        order_id: o.order_id,
        ordered_at: o.ordered_at,
        status: o.order_status,
        cashier: nameOf(maps.employees.get(o.employee_id)),
        customer: o.customer_id === null ? "Walk-in" : nameOf(maps.customers.get(o.customer_id)),
        items: describeItems(itemsByOrder.get(o.order_id) ?? [], maps.products),
        subtotal: round2(o.total_amount + o.discount_amount),
        discount: o.discount_amount,
        total: o.total_amount,
      })),
    );
  const exportProducts = () =>
    downloadCsv(
      `product-sales-${fileKey}.csv`,
      report.products.map((p) => ({
        product: maps.products.get(p.product_id)?.product_name ?? p.product_id,
        category: maps.categories.get(maps.products.get(p.product_id)?.category_id ?? 0)?.category_name ?? "",
        quantity_sold: p.quantity,
        revenue: p.revenue,
      })),
    );

  const chartTitle = daily ? "Net sales by hour" : "Net sales by day";

  return (
    <>
      <PageHeader
        title="Sales reports"
        description={`${daily ? "Daily" : "Monthly"} report for ${label}. Cancelled orders are left out of sales.`}
        actions={
          <Button icon={FiDownload} onClick={exportOrders} disabled={report.orders.length === 0}>
            Export orders
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs
          label="Report period"
          value={period}
          onChange={setPeriod}
          options={[
            { value: "daily", label: "Daily" },
            { value: "monthly", label: "Monthly" },
          ]}
        />
        {daily ? (
          <Input
            type="date"
            aria-label="Report day"
            value={day}
            max={dayKey(now)}
            onChange={(e) => e.target.value && setDay(e.target.value)}
            className="sm:w-44"
          />
        ) : (
          <Input
            type="month"
            aria-label="Report month"
            value={month}
            max={monthKey(now)}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="sm:w-44"
          />
        )}
        {report.inProgress && <span className="text-xs text-(--mgr-muted)">In progress: figures update as orders come in.</span>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Net sales"
          value={formatPeso(totals.net)}
          hint={netChange ? `${netChange} ${compareTo}` : "Nothing to compare against"}
          icon={FiDollarSign}
        />
        <StatCard
          label="Orders"
          value={formatNumber(totals.orders)}
          hint={`${formatPeso(totals.average)} average order`}
          icon={FiShoppingBag}
        />
        <StatCard
          label="Discounts given"
          value={formatPeso(totals.discounts)}
          hint={`${formatPeso(totals.gross)} gross before discounts`}
          icon={FiTag}
        />
        <StatCard
          label="Cancelled"
          value={report.cancelled.length}
          hint={`${formatPeso(sumBy(report.cancelled, (o) => o.total_amount))} not collected`}
          icon={FiXCircle}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <ChartCard
            title={chartTitle}
            description={label}
            data={report.series}
            columns={[daily ? "Hour" : "Day", "Net sales"]}
            format={formatPesoWhole}
          >
            {daily ? (
              <BarChart data={report.series} label={`${chartTitle}, ${label}`} format={formatPesoWhole} />
            ) : (
              <LineChart data={report.series} label={`${chartTitle}, ${label}`} format={formatPesoWhole} xLabelEvery={5} />
            )}
          </ChartCard>
        </div>

        <Card className="xl:col-span-2" title="Payment methods" description="Collected on orders that weren't cancelled">
          {report.payments.length ? (
            <ul className="space-y-4">
              {report.payments.map((p) => (
                <ShareRow
                  key={p.method}
                  label={PAYMENT_METHOD_LABELS[p.method]}
                  detail={`${formatNumber(p.count)} payments`}
                  value={formatPeso(p.amount)}
                  share={paymentTotal ? p.amount / paymentTotal : 0}
                />
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-(--mgr-muted)">No payments in this period.</p>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card
          className="xl:col-span-3"
          title="Top products"
          description="Line totals before order discounts"
          flush
          actions={
            <Button size="sm" variant="ghost" icon={FiDownload} onClick={exportProducts} disabled={report.products.length === 0}>
              CSV
            </Button>
          }
        >
          <Table>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Product</Th>
                <Th className="text-right">Sold</Th>
                <Th className="text-right">Revenue</Th>
              </tr>
            </thead>
            <tbody>
              {report.products.slice(0, 10).map((p, i) => {
                const product = maps.products.get(p.product_id);
                return (
                  <tr key={p.product_id}>
                    <Td className="text-(--mgr-muted) tabular-nums">{i + 1}</Td>
                    <Td>
                      <p className="font-medium">{product?.product_name}</p>
                      <p className="text-xs text-(--mgr-muted)">
                        {maps.categories.get(product?.category_id ?? 0)?.category_name}
                      </p>
                    </Td>
                    <Td className="text-right tabular-nums">{formatNumber(p.quantity)}</Td>
                    <Td className="text-right tabular-nums">{formatPeso(p.revenue)}</Td>
                  </tr>
                );
              })}
              {report.products.length === 0 && <EmptyRow colSpan={4}>No sales in this period.</EmptyRow>}
            </tbody>
          </Table>
        </Card>

        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card title="Sales by category">
            {report.byCategory.length ? (
              <ul className="space-y-4">
                {report.byCategory.map((c) => (
                  <ShareRow
                    key={c.name}
                    label={c.name}
                    detail={`${formatNumber(c.quantity)} sold`}
                    value={formatPeso(c.revenue)}
                    share={categoryTotal ? c.revenue / categoryTotal : 0}
                  />
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-(--mgr-muted)">No sales in this period.</p>
            )}
          </Card>

          <Card title="Sales by cashier" flush>
            <ul className="divide-y divide-(--mgr-line)">
              {report.cashiers.map((c) => (
                <li key={c.employeeId} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{nameOf(maps.employees.get(c.employeeId))}</p>
                    <p className="text-xs text-(--mgr-muted)">{formatNumber(c.orders)} orders</p>
                  </div>
                  <span className="tabular-nums">{formatPeso(c.net)}</span>
                </li>
              ))}
              {report.cashiers.length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-(--mgr-muted)">No sales in this period.</li>
              )}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

function nameOf(person: { first_name: string; last_name: string } | undefined): string {
  return person ? fullName(person) : "—";
}

interface ShareRowProps {
  label: string;
  detail: string;
  value: string;
  /** 0 to 1. */
  share: number;
}

function ShareRow({ label, detail, value, share }: ShareRowProps) {
  const pct = Math.round(share * 100);
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-(--mgr-grid)" aria-hidden>
        <div className="h-full rounded-full bg-(--mgr-chart)" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-(--mgr-muted)">
        {detail} · {pct}%
      </p>
    </li>
  );
}
