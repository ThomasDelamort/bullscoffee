import { FaMapMarkerAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import HeroImage from "../Home/Hero/HeroImage";
import { LOGO_MARK, type HeroAssetFile } from "../Home/Hero/hero.config";
import { FOCUS_RING } from "./fields";

const TODAY_SPECIAL = {
  name: "Choco Loco Specialty",
  price: "₱185",
  note: "Rich Belgian Cream",
  image: "cup-2.png",
} as const satisfies { name: string; price: string; note: string; image: HeroAssetFile };

/** Logo tile + wordmark; links back to the home page. */
export function BrandMark({ tone }: { tone: "light" | "dark" }) {
  return (
    <Link to="/" className={`flex w-fit items-center gap-4 rounded-2xl ${FOCUS_RING}`}>
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 shadow-[0_8px_28px_-4px_rgb(232_163_60/0.55)]">
        <HeroImage file={LOGO_MARK} alt="" placeholderShape="circle" className="size-11 object-contain" />
      </span>
      <span className="flex flex-col">
        <span
          className={`text-2xl leading-tight font-extrabold tracking-wide uppercase ${tone === "dark" ? "text-[#FBF3E8]" : "text-stone-900"}`}
        >
          Bull's Coffee
        </span>
        <span className="text-xs font-bold tracking-[0.14em] text-amber-500 uppercase">Cebu's Finest • NU Cebu</span>
      </span>
    </Link>
  );
}

/** Left half of the auth page: brand story, today's special and campus footer. Hidden on small screens. */
export default function BrandPanel() {
  const year = new Date().getFullYear();

  return (
    <aside className="auth-brand-panel hidden flex-col gap-10 p-10 text-[#FBF3E8] lg:flex xl:p-12">
      <BrandMark tone="dark" />

      <div className="flex flex-col gap-5">
        <h1 className="text-4xl leading-[1.15] font-extrabold tracking-tight text-balance xl:text-5xl">
          Fuel Your Day with Cebu’s Premium Brews.
        </h1>
        <p className="max-w-md text-base leading-relaxed text-stone-300/80">
          Sign in to claim loyalty points, order ahead for NU Cebu campus pickup, and access exclusive daily student
          specials.
        </p>
      </div>

      <div className="mt-auto flex items-center gap-5 rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10 backdrop-blur-sm">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-amber-900/40">
          <HeroImage file={TODAY_SPECIAL.image} alt="" className="size-16 scale-150 object-contain" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs font-bold tracking-[0.14em] text-amber-500 uppercase">Today's Special</span>
          <span className="truncate text-lg font-bold text-white">{TODAY_SPECIAL.name}</span>
          <span className="truncate text-sm text-stone-300/80">
            {TODAY_SPECIAL.price} • {TODAY_SPECIAL.note}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-stone-400">
        <span>© {year} Bull's Coffee PH</span>
        <span className="flex items-center gap-1.5">
          <FaMapMarkerAlt aria-hidden className="text-amber-500" />
          NU Cebu Campus
        </span>
      </div>
    </aside>
  );
}
