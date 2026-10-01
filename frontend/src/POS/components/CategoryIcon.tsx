import { createElement } from "react";
import type { IconType } from "react-icons";
import { LuCoffee, LuCookie, LuCroissant, LuCupSoda, LuMilk, LuUtensils } from "react-icons/lu";
import type { Category } from "../types";

/** Category icons, keyed by category_name; anything new falls back to a plate. */
const ICONS: Record<string, IconType> = {
  Espresso: LuCoffee,
  "Frappés": LuCupSoda,
  "Non-Coffee": LuMilk,
  Pastries: LuCroissant,
  Snacks: LuCookie,
};

interface CategoryIconProps {
  category: Pick<Category, "category_name"> | undefined;
  className?: string;
  strokeWidth?: number;
}

export default function CategoryIcon({ category, className, strokeWidth }: CategoryIconProps) {
  const icon = (category && ICONS[category.category_name]) || LuUtensils;
  return createElement(icon, { "aria-hidden": true, className, strokeWidth });
}
