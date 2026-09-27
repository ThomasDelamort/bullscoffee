import { BRAND_GOLD } from "../Hero/hero.config";

export default function About() {
  return (
    <section id="about" className="bg-[#FBF3E8] py-20 sm:py-28">
      <div className="mx-auto w-[min(92vw,72rem)]">
        <span
          className="text-xs font-bold tracking-[0.2em] uppercase"
          style={{ color: BRAND_GOLD }}
        >
          About Us
        </span>

        <h2 className="hero-display mt-3 text-5xl leading-[0.95] text-stone-900 uppercase sm:text-6xl">
          Our <span style={{ color: BRAND_GOLD }}>story</span>.
        </h2>

        <p className="mt-5 max-w-md text-stone-500">
          Bull's Coffee started with a simple idea: rich aromas, exceptional
          beans, and a cup worth slowing down for. More of our story is
          coming soon.
        </p>
      </div>
    </section>
  );
}
