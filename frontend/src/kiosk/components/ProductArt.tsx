import HeroImage from "../../Home/Hero/HeroImage";
import { CREAM, ESPRESSO } from "../../Home/theme";
import CategoryIcon from "../../POS/components/CategoryIcon";
import type { Product } from "../../POS/types";
import { categoryLook, cupFor, useCategoryOf } from "../data/menu";

const ICON_SIZES = {
  thumb: "size-7",
  card: "size-14",
  hero: "size-24",
} as const;

/** The cup PNGs are square with the cup filling ~2/3 of the height, so they're scaled up to fill the box. */
const CUP_SCALES = {
  thumb: "scale-[1.45]",
  card: "scale-[1.45]",
  // The sheet's wide, short header would crop the straw at the full scale.
  hero: "scale-[1.25]",
} as const;

interface ProductArtProps {
  product: Product;
  variant?: keyof typeof ICON_SIZES;
  /** Sets the box size and rounding. */
  className?: string;
}

/**
 * The product's photo when it has one, the storefront cup shot on its flavor
 * color for the signature frappés, or the category icon on a wash of the
 * category's color for everything else.
 */
export default function ProductArt({ product, variant = "card", className = "" }: ProductArtProps) {
  const category = useCategoryOf(product);

  if (product.image_url) {
    return <img src={product.image_url} alt="" draggable={false} className={`object-cover ${className}`} />;
  }

  const flavor = cupFor(product);
  if (flavor) {
    return (
      <span aria-hidden className={`flex items-center justify-center overflow-hidden ${className}`} style={{ background: flavor.background }}>
        <HeroImage file={flavor.cup} alt="" className={`h-full w-auto object-contain ${CUP_SCALES[variant]}`} />
      </span>
    );
  }

  const { color } = categoryLook(category);
  return (
    <span
      aria-hidden
      className={`flex items-center justify-center ${className}`}
      style={{
        background: `color-mix(in srgb, ${color} 38%, ${CREAM})`,
        color: `color-mix(in srgb, ${color} 80%, ${ESPRESSO})`,
      }}
    >
      <CategoryIcon category={category} className={ICON_SIZES[variant]} strokeWidth={1.25} />
    </span>
  );
}
