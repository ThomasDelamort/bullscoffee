import { SignedIn, SignedOut, useClerk, useUser } from "@clerk/clerk-react";
import { useEffect } from "react";
import { FiLogIn, FiLogOut, FiX } from "react-icons/fi";
import { LuPanelLeftClose, LuPanelLeftOpen } from "react-icons/lu";
import { Link, NavLink } from "react-router-dom";
import { AUTH_PATHS } from "../../AuthPage";
import HeroImage from "../../Home/Hero/HeroImage";
import { BRAND_GOLD, LOGO_MARK } from "../../Home/Hero/hero.config";
import { FOCUS_RING } from "../components/styles";
import { adminPath } from "../routes";
import { initials } from "../utils/format";
import { ADMIN_NAV } from "./nav";

interface LeftSideBarProps {
  /** Drawer state below the lg breakpoint; the sidebar is always shown above it. */
  open: boolean;
  onClose: () => void;
  /** Desktop only: shrinks to an icon rail. The mobile drawer always shows labels. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function LeftSideBar({ open, onClose, collapsed, onToggleCollapsed }: LeftSideBarProps) {
  // Rail-only classes; every one is lg-prefixed so the mobile drawer is unaffected.
  const rail = (classes: string) => (collapsed ? classes : "");

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        id="admin-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-(--admin-ink) text-(--admin-cream) transition-[translate,width] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          collapsed ? "lg:w-[4.5rem]" : "lg:w-64"
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className={`flex items-center justify-between gap-2 px-5 pt-5 pb-4 ${rail("lg:justify-center lg:px-0")}`}>
          <Link
            to={adminPath("dashboard")}
            onClick={onClose}
            className={`flex min-w-0 items-center gap-2.5 rounded-md ${FOCUS_RING} ${rail("lg:hidden")}`}
          >
            <HeroImage
              file={LOGO_MARK}
              alt=""
              placeholderShape="circle"
              className="size-9 shrink-0 object-contain"
            />
            <span className="leading-tight whitespace-nowrap">
              <span className="hero-display block text-lg tracking-wide uppercase" style={{ color: BRAND_GOLD }}>
                Bull's Coffee
              </span>
              <span className="block text-[11px] font-medium tracking-[0.2em] uppercase opacity-60">
                Admin console
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            aria-controls="admin-sidebar"
            className={`group relative hidden size-9 shrink-0 place-items-center rounded-lg text-(--admin-cream)/60 transition-colors hover:bg-white/10 hover:text-white lg:grid ${FOCUS_RING}`}
          >
            {collapsed ? (
              <LuPanelLeftOpen aria-hidden className="size-4" />
            ) : (
              <LuPanelLeftClose aria-hidden className="size-4" />
            )}
            {collapsed && <RailTooltip label="Expand sidebar" />}
          </button>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className={`grid size-9 place-items-center rounded-lg hover:bg-white/10 lg:hidden ${FOCUS_RING}`}
          >
            <FiX aria-hidden className="size-5" />
          </button>
        </div>

        <nav aria-label="Admin" className={`flex-1 overflow-y-auto px-3 pb-4 ${rail("lg:overflow-visible")}`}>
          {ADMIN_NAV.map((group, i) => (
            <div key={group.label} className="mt-4 first:mt-1">
              <p className={`px-3 pb-1.5 text-[11px] font-semibold tracking-wider uppercase opacity-45 ${rail("lg:hidden")}`}>
                {group.label}
              </p>
              {collapsed && i > 0 && <div aria-hidden className="mx-2 mb-3 hidden h-px bg-white/10 lg:block" />}
              <ul className="flex flex-col gap-0.5">
                {group.items.map(({ page, label, icon: Icon }) => (
                  <li key={page}>
                    <NavLink
                      to={adminPath(page)}
                      end={page === "dashboard"}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${FOCUS_RING} ${rail(
                          "lg:justify-center lg:px-0",
                        )} ${
                          isActive
                            ? "bg-white/10 font-medium text-white"
                            : "text-(--admin-cream)/75 hover:bg-white/5 hover:text-white"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-(--admin-gold)" />
                          )}
                          <Icon
                            aria-hidden
                            className={`size-4 shrink-0 ${isActive ? "text-(--admin-gold)" : ""}`}
                          />
                          <span className={`whitespace-nowrap ${rail("lg:sr-only")}`}>{label}</span>
                          {collapsed && <RailTooltip label={label} />}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <SignedIn>
            <AccountFooter collapsed={collapsed} />
          </SignedIn>
          <SignedOut>
            <Link
              to={AUTH_PATHS["sign-in"]}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/5 ${FOCUS_RING} ${rail(
                "lg:justify-center lg:px-0",
              )}`}
            >
              <FiLogIn aria-hidden className="size-4 shrink-0" />
              <span className={rail("lg:sr-only")}>Sign in</span>
              {collapsed && <RailTooltip label="Sign in" />}
            </Link>
          </SignedOut>
        </div>
      </aside>
    </>
  );
}

/** Label beside a rail icon on hover or keyboard focus. The link already carries the name for screen readers. */
function RailTooltip({ label }: { label: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-full z-50 ml-3 hidden -translate-y-1/2 rounded-md bg-(--admin-ink) px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 lg:block"
    >
      {label}
    </span>
  );
}

function AccountFooter({ collapsed }: { collapsed: boolean }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Admin";

  return (
    <div className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${collapsed ? "lg:flex-col lg:gap-2 lg:px-0" : ""}`}>
      {user?.imageUrl ? (
        <img src={user.imageUrl} alt="" title={collapsed ? name : undefined} className="size-9 shrink-0 rounded-full object-cover" />
      ) : (
        <span
          title={collapsed ? name : undefined}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-(--admin-gold) text-sm font-semibold text-(--admin-ink)"
        >
          {initials(name)}
        </span>
      )}
      <div className={`min-w-0 flex-1 ${collapsed ? "lg:hidden" : ""}`}>
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs opacity-60">Administrator</p>
      </div>
      <button
        type="button"
        aria-label="Log out"
        title="Log out"
        onClick={() => void signOut({ redirectUrl: "/" })}
        className={`grid size-9 shrink-0 place-items-center rounded-lg opacity-75 hover:bg-white/10 hover:opacity-100 ${FOCUS_RING}`}
      >
        <FiLogOut aria-hidden className="size-4" />
      </button>
    </div>
  );
}
