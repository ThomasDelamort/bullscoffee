import { inkOn } from "../../Home/theme";
import CategoryIcon from "../../POS/components/CategoryIcon";
import type { Category } from "../../POS/types";
import { categoryLook } from "../data/menu";
import { FOCUS_RING } from "../styles";

interface CategoryTabsProps {
  categories: readonly Category[];
  active: number;
  onChange: (categoryId: number) => void;
}

/** One pill per category; scrolls sideways when they don't all fit. */
export default function CategoryTabs({ categories, active, onChange }: CategoryTabsProps) {
  return (
    // Vertical padding keeps the selected pill's shadow inside the scroll box, which would clip it.
    <nav aria-label="Menu categories" className="kiosk-scroll-x -mx-4 overflow-x-auto px-4 pt-1 pb-3 sm:-mx-6 sm:px-6">
      <ul className="flex gap-2.5">
        {categories.map((c) => {
          const { color } = categoryLook(c);
          const selected = c.category_id === active;
          return (
            <li key={c.category_id} className="shrink-0">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(c.category_id)}
                className={`flex h-14 items-center gap-2.5 rounded-full pr-5 pl-1.5 text-base font-bold whitespace-nowrap transition ${FOCUS_RING} ${
                  selected
                    ? "bg-(--k-ink) text-(--k-canvas) shadow-md shadow-black/15"
                    : "bg-(--k-surface) text-(--k-ink) ring-1 ring-(--k-line) hover:ring-(--k-ink)/30"
                }`}
              >
                <span
                  aria-hidden
                  className="grid size-11 place-items-center rounded-full"
                  style={{ background: color, color: inkOn(color) }}
                >
                  <CategoryIcon category={c} className="size-5" strokeWidth={1.75} />
                </span>
                {c.category_name}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
