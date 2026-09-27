import { BRAND_GOLD } from "../Hero/hero.config";

export default function Menu() {
  return (
    <section id="menu" className="bg-white py-20 sm:py-28">
      <div className="mx-auto w-[min(92vw,72rem)]">
        <span
          className="text-xs font-bold tracking-[0.2em] uppercase"
          style={{ color: BRAND_GOLD }}
        >
          Our Menu
        </span>

        <h2 className="hero-display mt-3 text-5xl leading-[0.95] text-stone-900 uppercase sm:text-6xl">
          Brewing <span style={{ color: BRAND_GOLD }}>something</span> good.
        </h2>

        <p className="mt-5 max-w-md text-stone-500">
          Our full menu is on its way. Check back soon for drinks, pastries,
          and everything in between.
        </p>
      </div>
    </section>
  );
}
