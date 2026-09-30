import { SignedIn, SignedOut, useClerk, useUser } from "@clerk/clerk-react";
import { useEffect } from "react";
import { FiLogIn, FiLogOut, FiX } from "react-icons/fi";
import { Link, NavLink } from "react-router-dom";
import { AUTH_PATHS } from "../../AuthPage";
import HeroImage from "../../Home/Hero/HeroImage";
import { LOGO_MARK } from "../../Home/Hero/hero.config";
import { FOCUS_RING } from "../components/styles";
import { useManagerData } from "../data/dataContext";
import { stockState } from "../data/selectors";
import { managerPath, type ManagerPage } from "../routes";
import { initials } from "../utils/format";
import { MANAGER_NAV } from "./nav";

interface LeftSideBarProps {
  /** Drawer state below the lg breakpoint; the sidebar is always shown above it. */
  open: boolean;
  onClose: () => void;
}

/** Counts that need the manager's attention, shown next to their nav item. */
function useAttentionCounts(): Partial<Record<ManagerPage, number>> {
  const { db } = useManagerData();
  return {
    orders: db.orders.filter((o) => o.order_status === "pending").length,
    feedback: db.feedback.filter((f) => f.status === "new").length,
    inventory: db.ingredients.filter((i) => i.is_active && stockState(i) !== "in").length,
  };
}

export default function LeftSideBar({ open, onClose }: LeftSideBarProps) {
  const counts = useAttentionCounts();

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
        id="manager-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-(--mgr-ink) text-(--mgr-cream) transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-4">
          <Link to={managerPath("dashboard")} onClick={onClose} className={`flex items-center gap-2.5 rounded-md ${FOCUS_RING}`}>
            <HeroImage file={LOGO_MARK} alt="" placeholderShape="circle" className="size-9 shrink-0 object-contain" />
            <span className="leading-tight">
              <span className="manager-display block text-lg tracking-wide text-(--mgr-mint) uppercase">
                Bull's Coffee
              </span>
              <span className="block text-[11px] font-medium tracking-[0.2em] uppercase opacity-60">
                Manager console
              </span>
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className={`grid size-9 place-items-center rounded-lg hover:bg-white/10 lg:hidden ${FOCUS_RING}`}
          >
            <FiX aria-hidden className="size-5" />
          </button>
        </div>

        <nav aria-label="Manager" className="flex-1 overflow-y-auto px-3 pb-4">
          {MANAGER_NAV.map((group) => (
            <div key={group.label} className="mt-4 first:mt-1">
              <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider uppercase opacity-45">
                {group.label}
              </p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map(({ page, label, icon: Icon }) => {
                  const count = counts[page];
                  return (
                    <li key={page}>
                      <NavLink
                        to={managerPath(page)}
                        end={page === "dashboard"}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${FOCUS_RING} ${
                            isActive
                              ? "bg-white/10 font-medium text-white"
                              : "text-(--mgr-cream)/75 hover:bg-white/5 hover:text-white"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-(--mgr-mint)" />
                            )}
                            <Icon aria-hidden className={`size-4 shrink-0 ${isActive ? "text-(--mgr-mint)" : ""}`} />
                            <span className="flex-1">{label}</span>
                            {count ? (
                              <span className="rounded-full bg-(--mgr-mint) px-1.5 text-[11px] font-semibold text-(--mgr-ink) tabular-nums">
                                {count}
                                <span className="sr-only"> need attention</span>
                              </span>
                            ) : null}
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <SignedIn>
            <AccountFooter />
          </SignedIn>
          <SignedOut>
            <Link
              to={AUTH_PATHS["sign-in"]}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/5 ${FOCUS_RING}`}
            >
              <FiLogIn aria-hidden className="size-4" />
              Sign in
            </Link>
          </SignedOut>
        </div>
      </aside>
    </>
  );
}

function AccountFooter() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Manager";

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
      {user?.imageUrl ? (
        <img src={user.imageUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-(--mgr-mint) text-sm font-semibold text-(--mgr-ink)">
          {initials(name)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs opacity-60">Store manager</p>
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
