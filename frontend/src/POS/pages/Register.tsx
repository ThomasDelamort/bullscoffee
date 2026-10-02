import { useCallback, useEffect, useRef, useState } from "react";
import { FiMenu, FiShoppingBag } from "react-icons/fi";
import { LuReceipt } from "react-icons/lu";
import HeroImage from "../../Home/Hero/HeroImage";
import { LOGO_MARK } from "../../Home/Hero/hero.config";
import { localDay, useTodaysOrders } from "../api/orders";
import MenuPanel from "../components/MenuPanel";
import OrderDetailsModal from "../components/OrderDetailsModal";
import OrdersPanel from "../components/OrdersPanel";
import { FOCUS_RING } from "../components/styles";
import TicketPanel from "../components/TicketPanel";
import { isPaid, type OrderFilter } from "../data/selectors";
import { useTicket } from "../data/useTicket";
import SideBar, { type CategoryChoice } from "../layout/SideBar";
import { useSidebarCollapsed } from "../layout/useSidebarCollapsed";
import { formatPeso } from "../utils/format";
import { useNow } from "../utils/useNow";

/**
 * The cashier's single screen: sidebar | menu | walk-in ticket, with today's
 * orders in a drawer on the right. On desktop the sidebar and the ticket each
 * collapse to a narrow rail; below lg the sidebar becomes a drawer and the
 * ticket drops under the menu.
 */
export default function Register() {
  const ticket = useTicket();
  const [category, setCategory] = useState<CategoryChoice>("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed("bulls:pos-sidebar-collapsed");
  const [ticketCollapsed, toggleTicketCollapsed] = useSidebarCollapsed("bulls:pos-ticket-collapsed");
  const ticketRef = useRef<HTMLElement>(null);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [openOrderId, setOpenOrderId] = useState<number | null>(null);

  const now = useNow();
  const today = localDay(now);
  const orders = useTodaysOrders(today);
  const pending = (orders.data ?? []).filter((o) => o.order_status === "pending");
  const needPayment = pending.some((o) => !isPaid(o));

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const closeOrders = useCallback(() => setOrdersOpen(false), []);

  useEffect(() => {
    // The order modal handles its own Escape.
    if (!ordersOpen || openOrderId !== null) return;
    const closeOnEscape = (e: KeyboardEvent) => e.key === "Escape" && closeOrders();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [ordersOpen, openOrderId, closeOrders]);

  const itemCount = ticket.lines.reduce((n, l) => n + l.quantity, 0);
  const ticketTotal = ticket.lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  return (
    <div className="flex min-h-dvh lg:h-dvh">
      <SideBar
        open={sidebarOpen}
        onClose={closeSidebar}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        category={category}
        onCategoryChange={setCategory}
        openOrderCount={pending.length}
        ordersNeedPayment={needPayment}
        ordersOpen={ordersOpen}
        onOpenOrders={() => setOrdersOpen(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-(--pos-line) bg-(--pos-panel)/95 px-3 backdrop-blur lg:hidden">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={sidebarOpen}
            aria-controls="pos-sidebar"
            onClick={() => setSidebarOpen(true)}
            className={`grid size-10 place-items-center rounded-lg text-(--pos-muted) hover:bg-white/5 hover:text-(--pos-ink) ${FOCUS_RING}`}
          >
            <FiMenu aria-hidden className="size-5" />
          </button>
          <HeroImage file={LOGO_MARK} alt="" placeholderShape="circle" className="size-7 object-contain" />
          <span className="text-sm font-semibold">Register</span>
          <button
            type="button"
            aria-label={`Orders, ${pending.length} open`}
            aria-expanded={ordersOpen}
            aria-controls="pos-orders"
            onClick={() => setOrdersOpen(true)}
            className={`relative ml-auto grid size-10 place-items-center rounded-lg text-(--pos-muted) hover:bg-white/5 hover:text-(--pos-ink) ${FOCUS_RING}`}
          >
            <LuReceipt aria-hidden className="size-5" />
            {pending.length > 0 && (
              <span
                aria-hidden
                className={`absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold tabular-nums ${
                  needPayment ? "bg-(--pos-gold) text-(--pos-canvas)" : "bg-white/15 text-(--pos-ink)"
                }`}
              >
                {pending.length}
              </span>
            )}
          </button>
        </header>

        <div
          className={`flex-1 transition-[grid-template-columns] duration-200 lg:grid lg:min-h-0 ${
            ticketCollapsed ? "lg:grid-cols-[minmax(0,1fr)_4rem]" : "lg:grid-cols-[minmax(0,1fr)_21rem]"
          }`}
        >
          <div className={`pos-scroll lg:overflow-y-auto ${itemCount > 0 ? "pb-20 lg:pb-0" : ""}`}>
            <MenuPanel category={category} onAdd={ticket.add} countOf={ticket.countOf} />
          </div>

          <TicketPanel
            ref={ticketRef}
            ticket={ticket}
            collapsed={ticketCollapsed}
            onToggleCollapsed={toggleTicketCollapsed}
          />
        </div>
      </div>

      {itemCount > 0 && (
        // Below lg the ticket sits under the whole menu.
        <button
          type="button"
          onClick={() => ticketRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className={`fixed inset-x-4 bottom-4 z-20 flex items-center justify-between rounded-xl bg-(--pos-gold) px-4 py-3 text-sm font-semibold text-(--pos-canvas) shadow-xl lg:hidden ${FOCUS_RING}`}
        >
          <span className="flex items-center gap-2">
            <FiShoppingBag aria-hidden className="size-4" />
            Review order · {itemCount}
          </span>
          <span className="tabular-nums">{formatPeso(ticketTotal)}</span>
        </button>
      )}

      <div
        aria-hidden
        onClick={closeOrders}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity ${ordersOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        id="pos-orders"
        aria-label="Today's orders"
        inert={!ordersOpen}
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-(--pos-line) bg-(--pos-panel) shadow-2xl transition-transform duration-200 ${
          ordersOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <OrdersPanel
          orders={orders.data}
          error={orders.data ? null : orders.error}
          onRetry={() => void orders.refetch()}
          today={today}
          now={now}
          filter={orderFilter}
          onFilterChange={setOrderFilter}
          onOpenOrder={setOpenOrderId}
          onClose={closeOrders}
        />
      </aside>

      <OrderDetailsModal key={openOrderId ?? "closed"} orderId={openOrderId} onClose={() => setOpenOrderId(null)} />
    </div>
  );
}
