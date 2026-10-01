import HeroImage from "../../Home/Hero/HeroImage";
import { inkOn } from "../../Home/theme";
import CategoryIcon from "../../POS/components/CategoryIcon";
import type { Category, Product } from "../../POS/types";
import { categoryLook, cupFor } from "../data/menu";

/** Fanned cups, outer ones tilted back; the middle one sits in front. */
const CUP_POSES = ["-rotate-12 scale-90", "z-10", "rotate-12 scale-90"];

interface CategoryBannerProps {
  category: Category;
  products: readonly Product[];
}

/** The category's name in big type on its flavor color, with its cups (or icon) to one side. */
export default function CategoryBanner({ category, products }: CategoryBannerProps) {
  const { color, tagline } = categoryLook(category);
  const cups = products.flatMap((p) => cupFor(p) ?? []).slice(0, 3);

  return (
    <section
      aria-labelledby="kiosk-category-heading"
      className="relative isolate overflow-hidden rounded-[2rem] px-7 py-9 sm:px-10 sm:py-12"
      style={{ background: color, color: inkOn(color) }}
    >
      <p className="text-xs font-bold tracking-[0.3em] uppercase opacity-80">
        {products.length} {products.length === 1 ? "item" : "items"}
      </p>
      <h1 id="kiosk-category-heading" className="hero-display mt-2 text-6xl leading-[0.9] uppercase sm:text-7xl lg:text-8xl">
        {category.category_name}
      </h1>
      {tagline && <p className="mt-3 max-w-xs text-base opacity-85 sm:text-lg">{tagline}</p>}

      {cups.length > 0 ? (
        // Below md the cups would sit on the text, so the banner goes without.
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-2 -z-10 hidden items-center md:flex lg:right-10">
          {cups.map((flavor, i) => (
            <HeroImage
              key={flavor.id}
              file={flavor.cup}
              alt=""
              className={`-mx-7 aspect-1/2 h-[150%] object-cover ${CUP_POSES[i] ?? ""}`}
            />
          ))}
        </div>
      ) : (
        <CategoryIcon
          category={category}
          strokeWidth={1}
          className="pointer-events-none absolute -right-8 -bottom-10 -z-10 size-56 -rotate-12 opacity-15 sm:right-6 sm:size-72"
        />
      )}
    </section>
  );
}
