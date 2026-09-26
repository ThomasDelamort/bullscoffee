import { BRAND_GOLD, HILL_INK } from "./hero.config";

const BADGES = [
  { value: "10+", label: "Unique Coffee" },
  { value: "20K+", label: "Loyal Customers" },
  { value: "100%", label: "Premium Arabica Beans" },
] as const;

function Hill() {
  return (
    <section className="relative z-10 mx-auto my-11 flex w-[min(92vw,64rem)] flex-col items-center gap-4 px-6 pt-[5cqh] sm:flex-row sm:justify-between sm:gap-4 sm:pt-[6cqh] md:gap-6">
      <p
        className="order-2 max-w-xs text-center text-xs font-bold uppercase tracking-wide sm:order-1 sm:max-w-56 sm:text-left"
        style={{ color: HILL_INK }}
      >
        Explore a realm of rich aromas with our exclusive coffee selection. At
        Fresh Brewed, we harness the essence of nature's best beans to deliver
        you a truly exceptional experience.
      </p>

      <div className="order-1 flex shrink-0 items-center gap-2 sm:order-2">
        <button
          type="button"
          className="rounded-full px-6 py-3 text-sm font-extrabold uppercase shadow-md transition-transform hover:scale-105"
          style={{ backgroundColor: BRAND_GOLD, color: HILL_INK }}
        >
          Order Now
        </button>
      </div>

      <div className="order-3 hidden shrink-0 items-center gap-4 sm:flex">
        {BADGES.map((badge) => (
          <div key={badge.label} className="text-center">
            <p className="text-sm font-extrabold" style={{ color: HILL_INK }}>
              {badge.value}
            </p>
            <p
              className="max-w-16 text-[9px] font-semibold uppercase tracking-wide opacity-70"
              style={{ color: HILL_INK }}
            >
              {badge.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Hill;
