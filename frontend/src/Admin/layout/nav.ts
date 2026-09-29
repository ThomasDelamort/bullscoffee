import type { IconType } from "react-icons";
import {
  FiActivity,
  FiArchive,
  FiBell,
  FiCreditCard,
  FiDatabase,
  FiFileText,
  FiGrid,
  FiLifeBuoy,
  FiMapPin,
  FiSettings,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import { ADMIN_BASE_PATH, adminPath, type AdminPage } from "../routes";

export interface NavItem {
  page: AdminPage;
  label: string;
  icon: IconType;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const ADMIN_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ page: "dashboard", label: "Dashboard", icon: FiGrid }],
  },
  {
    label: "Access",
    items: [
      { page: "users", label: "Users", icon: FiUsers },
      { page: "roles", label: "Roles & Permissions", icon: FiShield },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { page: "health", label: "System Health", icon: FiActivity },
      { page: "logs", label: "Activity Logs", icon: FiFileText },
      { page: "tickets", label: "Support Tickets", icon: FiLifeBuoy },
    ],
  },
  {
    label: "Operations",
    items: [
      { page: "branches", label: "Branches", icon: FiMapPin },
      { page: "payments", label: "Payment Gateway", icon: FiCreditCard },
      { page: "notifications", label: "Notifications", icon: FiBell },
    ],
  },
  {
    label: "Data",
    items: [
      { page: "backups", label: "Backup & Restore", icon: FiDatabase },
      { page: "archive", label: "Archive & Export", icon: FiArchive },
    ],
  },
  {
    label: "System",
    items: [{ page: "settings", label: "Settings", icon: FiSettings }],
  },
];

const ALL_ITEMS = ADMIN_NAV.flatMap((group) => group.items);

/** The nav item for the current URL, e.g. to title the top bar. */
export function navItemFor(pathname: string): NavItem | undefined {
  const trimmed = pathname.replace(/\/+$/, "");
  if (trimmed === ADMIN_BASE_PATH) return ALL_ITEMS[0];
  return ALL_ITEMS.find(
    (item) => item.page !== "dashboard" && trimmed.startsWith(adminPath(item.page)),
  );
}
