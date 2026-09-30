import { useCallback, useState } from "react";
import { FiExternalLink, FiMenu, FiPlus } from "react-icons/fi";
import { Link, Outlet, useLocation } from "react-router-dom";
import ToastProvider from "../components/ToastProvider";
import { buttonClass, FOCUS_RING } from "../components/styles";
import ManagerDataProvider from "../data/ManagerDataProvider";
import { managerPath } from "../routes";
import LeftSideBar from "./LeftSideBar";
import { navItemFor } from "./nav";
import "../manager.css";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const current = navItemFor(useLocation().pathname);

  return (
    <div className="manager-root flex min-h-screen bg-(--mgr-canvas) text-(--mgr-ink)">
      <ManagerDataProvider>
        <ToastProvider>
          <LeftSideBar open={sidebarOpen} onClose={closeSidebar} />

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-(--mgr-line) bg-(--mgr-canvas)/85 px-4 backdrop-blur sm:px-6 lg:px-8">
              <button
                type="button"
                aria-label="Open menu"
                aria-expanded={sidebarOpen}
                aria-controls="manager-sidebar"
                onClick={() => setSidebarOpen(true)}
                className={`-ml-1 grid size-10 place-items-center rounded-lg hover:bg-(--mgr-ink)/5 lg:hidden ${FOCUS_RING}`}
              >
                <FiMenu aria-hidden className="size-5" />
              </button>

              <p className="min-w-0 truncate text-sm">
                <span className="text-(--mgr-muted)">Manager</span>
                {current && (
                  <>
                    <span aria-hidden className="mx-2 text-(--mgr-muted)">/</span>
                    <span className="font-medium">{current.label}</span>
                  </>
                )}
              </p>

              <div className="ml-auto flex items-center gap-2">
                {current?.page !== "pos" && (
                  <Link to={managerPath("pos")} className={buttonClass("primary", "sm")}>
                    <FiPlus aria-hidden className="size-3.5" />
                    New order
                  </Link>
                )}
                <Link to="/" className={buttonClass("secondary", "sm")}>
                  <FiExternalLink aria-hidden className="size-3.5" />
                  <span className="hidden sm:inline">View storefront</span>
                  <span className="sr-only sm:hidden">Storefront</span>
                </Link>
              </div>
            </header>

            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <Outlet />
            </main>
          </div>
        </ToastProvider>
      </ManagerDataProvider>
    </div>
  );
}
