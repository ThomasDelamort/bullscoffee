import { useCallback, useState } from "react";
import { FiExternalLink, FiMenu } from "react-icons/fi";
import { Link, Outlet, useLocation } from "react-router-dom";
import ToastProvider from "../components/ToastProvider";
import { buttonClass, FOCUS_RING } from "../components/styles";
import LeftSideBar from "./LeftSideBar";
import { navItemFor } from "./nav";
import "../admin.css";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const current = navItemFor(useLocation().pathname);

  return (
    <div className="admin-root flex min-h-screen bg-(--admin-canvas) text-(--admin-ink)">
      <ToastProvider>
        <LeftSideBar open={sidebarOpen} onClose={closeSidebar} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-(--admin-line) bg-(--admin-canvas)/85 px-4 backdrop-blur sm:px-6 lg:px-8">
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={sidebarOpen}
              aria-controls="admin-sidebar"
              onClick={() => setSidebarOpen(true)}
              className={`-ml-1 grid size-10 place-items-center rounded-lg hover:bg-(--admin-ink)/5 lg:hidden ${FOCUS_RING}`}
            >
              <FiMenu aria-hidden className="size-5" />
            </button>

            <p className="min-w-0 truncate text-sm">
              <span className="text-(--admin-muted)">Admin</span>
              {current && (
                <>
                  <span aria-hidden className="mx-2 text-(--admin-muted)">/</span>
                  <span className="font-medium">{current.label}</span>
                </>
              )}
            </p>

            <Link to="/" className={`ml-auto ${buttonClass("secondary", "sm")}`}>
              <FiExternalLink aria-hidden className="size-3.5" />
              <span className="hidden sm:inline">View storefront</span>
              <span className="sm:hidden">Store</span>
            </Link>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </ToastProvider>
    </div>
  );
}
