import { useCallback, useRef, useState } from "react";
import { FiMenu, FiShoppingBag } from "react-icons/fi";
import HeroImage from "../../Home/Hero/HeroImage";
import { LOGO_MARK } from "../../Home/Hero/hero.config";
import MenuPanel from "../components/MenuPanel";
import { FOCUS_RING } from "../components/styles";
import TicketPanel from "../components/TicketPanel";
import { useTicket } from "../data/useTicket";
import SideBar, { type CategoryChoice } from "../layout/SideBar";
import { useSidebarCollapsed } from "../layout/useSidebarCollapsed";
import { formatPeso } from "../utils/format";

/**
 * The cashier's single screen: sidebar | menu | walk-in ticket.
 * On desktop the sidebar and the ticket each collapse to a narrow rail; below lg
 * the sidebar becomes a drawer and the ticket drops under the menu.
 */
export default function Register() {
  const ticket = useTicket();
  const [category, setCategory] = useState<CategoryChoice>("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed("bulls:pos-sidebar-collapsed");
  const [ticketCollapsed, toggleTicketCollapsed] = useSidebarCollapsed("bulls:pos-ticket-collapsed");
  const ticketRef = useRef<HTMLElement>(null);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

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
    </div>
  );
}
