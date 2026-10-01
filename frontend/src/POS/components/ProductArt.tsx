import HeroImage from "../../Home/Hero/HeroImage";
import { HERO_FLAVORS } from "../../Home/Hero/hero.config";
import type { Category, Product } from "../types";
import CategoryIcon from "./CategoryIcon";

interface ProductArtProps {
  product: Product;
  category: Category | undefined;
  className?: string;
}

/**
 * Thumbnail for a menu tile: the product's photo when it has one, the
 * storefront's cup shot on its flavor color for the hero frappés, or the
 * category icon for the rest.
 */
export default function ProductArt({ product, category, className = "" }: ProductArtProps) {
  if (product.image_url) {
    return <img src={product.image_url} alt="" className={`object-cover ${className}`} />;
  }

  const flavor = HERO_FLAVORS.find((f) => f.name.toLowerCase() === product.product_name.toLowerCase());
  if (flavor) {
    return (
      <span aria-hidden className={`flex items-center justify-center overflow-hidden ${className}`} style={{ background: flavor.background }}>
        {/* The PNGs are square with the cup filling ~2/3 of the height, so scale it up to fill the box. */}
        <HeroImage file={flavor.cup} alt="" className="h-full w-auto scale-[1.45] object-contain" />
      </span>
    );
  }

  return (
    <span aria-hidden className={`flex items-center justify-center bg-white/[0.05] text-(--pos-muted) ${className}`}>
      <CategoryIcon category={category} className="size-5" strokeWidth={1.75} />
    </span>
  );
}
