import { useClerk, useUser } from "@clerk/clerk-react";
import { useEffect, type ReactNode } from "react";
import { FiLogOut, FiX } from "react-icons/fi";
import { LuLayoutGrid, LuPanelLeftClose, LuPanelLeftOpen, LuReceipt } from "react-icons/lu";
import { Link } from "react-router-dom";
import HeroImage from "../../Home/Hero/HeroImage";
import { LOGO_MARK } from "../../Home/Hero/hero.config";
import CategoryIcon from "../components/CategoryIcon";
import { FOCUS_RING } from "../components/styles";
import { useCategories, useCurrentEmployee, useProducts } from "../api/catalog";
import type { EmployeeRole } from "../types";
import { formatTime, fullName, initials } from "../utils/format";
import { useNow } from "../utils/useNow";

export type CategoryChoice = number | "all";

interface SideBarProps {
  /** Drawer state below the lg breakpoint; the sidebar is always shown above it. */
  open: boolean;
  onClose: () => void;
  /** Desktop only: shrinks to an icon rail. The mobile drawer always shows labels. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
  category: CategoryChoice;
  onCategoryChange: (category: CategoryChoice) => void;
  /** Pending orders: kiosk ones to charge plus paid ones to hand over. */
  openOrderCount: number;
  /** Some of them are kiosk orders waiting to be charged. */
  ordersNeedPayment: boolean;
  ordersOpen: boolean;
  onOpenOrders: () => void;
}

const ROLE_LABELS: Record<EmployeeRole, string> = { cashier: "Cashier", manager: "Manager", admin: "Admin" };

export default function SideBar({
  open,
  onClose,
  collapsed,
  onToggleCollapsed,
  category,
  onCategoryChange,
  openOrderCount,
  ordersNeedPayment,
  ordersOpen,
  onOpenOrders,
}: SideBarProps) {
  const categories = useCategories();
  const products = useProducts();
  const countIn = (categoryId: number) => products.data?.filter((p) => p.category_id === categoryId).length;
  // Rail-only classes; every one is lg-prefixed so the mobile drawer is unaffected.
  const rail = (classes: string) => (collapsed ? classes : "");

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  const pick = (choice: CategoryChoice) => {
    onCategoryChange(choice);
    onClose();
  };

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        id="pos-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-(--pos-line) bg-(--pos-panel) transition-[translate,width] duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 ${
          collapsed ? "lg:w-16" : "lg:w-56"
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className={`flex h-16 shrink-0 items-center justify-between gap-2 px-4 ${rail("lg:justify-center lg:px-0")}`}>
          <Link to="/" className={`flex min-w-0 items-center gap-2.5 rounded-md ${FOCUS_RING} ${rail("lg:hidden")}`}>
            <HeroImage file={LOGO_MARK} alt="Bull's Coffee" placeholderShape="circle" className="size-8 shrink-0 object-contain" />
            <span className="leading-tight whitespace-nowrap">
              <span className="block text-sm font-semibold">Bull's Coffee</span>
              <span className="block text-xs text-(--pos-muted)">Register</span>
            </span>
          </Link>
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            aria-controls="pos-sidebar"
            onClick={onToggleCollapsed}
            className={`group relative hidden size-9 shrink-0 place-items-center rounded-lg text-(--pos-muted) hover:bg-white/5 hover:text-(--pos-ink) lg:grid ${FOCUS_RING}`}
          >
            {collapsed ? (
              <LuPanelLeftOpen aria-hidden className="size-4" />
            ) : (
              <LuPanelLeftClose aria-hidden className="size-4" />
            )}
            <RailTooltip label={collapsed ? "Expand sidebar" : "Collapse sidebar"} />
          </button>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className={`grid size-9 place-items-center rounded-lg text-(--pos-muted) hover:bg-white/5 hover:text-(--pos-ink) lg:hidden ${FOCUS_RING}`}
          >
            <FiX aria-hidden className="size-5" />
          </button>
        </div>

        <div className="px-2 pb-1">
          <RailItem
            label="Orders"
            icon={<LuReceipt aria-hidden className="size-4 shrink-0" />}
            meta={openOrderCount || undefined}
            highlight={ordersNeedPayment}
            active={ordersOpen}
            collapsed={collapsed}
            onClick={() => {
              onOpenOrders();
              onClose();
            }}
          />
        </div>

        <nav aria-label="Menu categories" className={`pos-scroll flex-1 overflow-y-auto px-2 py-2 ${rail("lg:overflow-visible")}`}>
          <p className={`px-3 pb-2 text-[11px] font-medium tracking-wider text-(--pos-muted)/80 uppercase ${rail("lg:hidden")}`}>
            Menu
          </p>
          <ul className="flex flex-col gap-0.5">
            <li>
              <RailItem
                label="All items"
                icon={<LuLayoutGrid aria-hidden className="size-4 shrink-0" />}
                meta={products.data?.length}
                active={category === "all"}
                collapsed={collapsed}
                onClick={() => pick("all")}
              />
            </li>
            {categories.data?.map((c) => (
              <li key={c.category_id}>
                <RailItem
                  label={c.category_name}
                  icon={<CategoryIcon category={c} className="size-4 shrink-0" />}
                  meta={countIn(c.category_id)}
                  active={category === c.category_id}
                  collapsed={collapsed}
                  onClick={() => pick(c.category_id)}
                />
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-(--pos-line) p-2">
          <CashierFooter collapsed={collapsed} />
        </div>
      </aside>
    </>
  );
}

interface RailItemProps {
  label: string;
  icon: ReactNode;
  /** Shown at the right when expanded, and in the tooltip when collapsed. */
  meta?: string | number;
  /** Draws the eye to meta: something needs the cashier. */
  highlight?: boolean;
  active?: boolean;
  collapsed: boolean;
  onClick: () => void;
}

function RailItem({ label, icon, meta, highlight, active, collapsed, onClick }: RailItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${FOCUS_RING} ${
        collapsed ? "lg:justify-center lg:px-0" : ""
      } ${
        active
          ? "bg-white/[0.07] font-medium text-(--pos-ink)"
          : "text-(--pos-muted) hover:bg-white/5 hover:text-(--pos-ink)"
      }`}
    >
      {active && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-(--pos-gold)" />}
      <span className={`relative ${active ? "text-(--pos-gold)" : ""}`}>
        {icon}
        {highlight && collapsed && (
          <span aria-hidden className="absolute -top-1 -right-1 hidden size-2 rounded-full bg-(--pos-gold) lg:block" />
        )}
      </span>
      <span className={`flex-1 truncate text-left ${collapsed ? "lg:sr-only" : ""}`}>{label}</span>
      {meta !== undefined && (
        <span
          className={`text-xs tabular-nums ${collapsed ? "lg:sr-only" : ""} ${
            highlight
              ? "grid h-5 min-w-5 place-items-center rounded-full bg-(--pos-gold) px-1.5 font-semibold text-(--pos-canvas)"
              : "text-(--pos-muted)/80"
          }`}
        >
          {meta}
        </span>
      )}
      {collapsed && <RailTooltip label={meta !== undefined ? `${label} · ${meta}` : label} />}
    </button>
  );
}

/** Label beside a rail icon on hover or keyboard focus; the button already carries the name for screen readers. */
function RailTooltip({ label }: { label: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-full z-50 ml-3 hidden -translate-y-1/2 rounded-md bg-(--pos-raised) px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-(--pos-ink) opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 lg:block"
    >
      {label}
    </span>
  );
}

function CashierFooter({ collapsed }: { collapsed: boolean }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const me = useCurrentEmployee();
  const now = useNow();
  const name = (me.data && fullName(me.data)) || user?.fullName || user?.primaryEmailAddress?.emailAddress || "Cashier";
  const role = me.data ? ROLE_LABELS[me.data.employee_role] : "Staff";

  return (
    <div className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${collapsed ? "lg:flex-col lg:gap-2 lg:px-0" : ""}`}>
      {user?.imageUrl ? (
        <img src={user.imageUrl} alt="" title={collapsed ? name : undefined} className="size-8 shrink-0 rounded-full object-cover" />
      ) : (
        <span
          title={collapsed ? name : undefined}
          className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold"
        >
          {initials(name)}
        </span>
      )}
      <div className={`min-w-0 flex-1 leading-tight ${collapsed ? "lg:hidden" : ""}`}>
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-(--pos-muted) tabular-nums">
          {role} · {formatTime(now)}
        </p>
      </div>
      <button
        type="button"
        aria-label="Log out"
        title="Log out"
        onClick={() => void signOut({ redirectUrl: "/" })}
        className={`grid size-8 shrink-0 place-items-center rounded-lg text-(--pos-muted) hover:bg-white/5 hover:text-(--pos-ink) ${FOCUS_RING}`}
      >
        <FiLogOut aria-hidden className="size-4" />
      </button>
    </div>
  );
}
