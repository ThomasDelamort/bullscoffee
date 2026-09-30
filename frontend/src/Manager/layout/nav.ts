import type { IconType } from "react-icons";
import {
  FiBarChart2,
  FiCalendar,
  FiClipboard,
  FiClock,
  FiCoffee,
  FiGrid,
  FiMessageSquare,
  FiPackage,
  FiShoppingCart,
  FiTag,
  FiTruck,
  FiUsers,
} from "react-icons/fi";
import { MANAGER_BASE_PATH, managerPath, type ManagerPage } from "../routes";

export interface NavItem {
  page: ManagerPage;
  label: string;
  icon: IconType;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const MANAGER_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ page: "dashboard", label: "Dashboard", icon: FiGrid }],
  },
  {
    label: "Sales",
    items: [
      { page: "pos", label: "Point of Sale", icon: FiShoppingCart },
      { page: "orders", label: "Orders", icon: FiClipboard },
      { page: "discounts", label: "Discounts", icon: FiTag },
      { page: "reports", label: "Sales Reports", icon: FiBarChart2 },
      { page: "feedback", label: "Customer Feedback", icon: FiMessageSquare },
    ],
  },
  {
    label: "Menu",
    items: [{ page: "products", label: "Products", icon: FiCoffee }],
  },
  {
    label: "Staff",
    items: [
      { page: "staff", label: "Cashiers", icon: FiUsers },
      { page: "schedule", label: "Schedules", icon: FiCalendar },
      { page: "attendance", label: "Attendance", icon: FiClock },
    ],
  },
  {
    label: "Supply",
    items: [
      { page: "inventory", label: "Inventory", icon: FiPackage },
      { page: "suppliers", label: "Suppliers", icon: FiTruck },
    ],
  },
];

const ALL_ITEMS = MANAGER_NAV.flatMap((group) => group.items);

/** The nav item for the current URL, e.g. to title the top bar. */
export function navItemFor(pathname: string): NavItem | undefined {
  const trimmed = pathname.replace(/\/+$/, "");
  if (trimmed === MANAGER_BASE_PATH) return ALL_ITEMS[0];
  return ALL_ITEMS.find(
    (item) => item.page !== "dashboard" && trimmed.startsWith(managerPath(item.page)),
  );
}
