import { useId } from "react";
import "../Hero/hero.css";
import HeroImage from "../Hero/HeroImage";
import { heroPalette } from "../Hero/palette";
import { CREAM, ESPRESSO, GOLD } from "../theme";
import FlavorInfo from "./FlavorInfo";
import { MENU_ITEMS } from "./menu.config";

/** The menu without scroll effects, for visitors who prefer reduced motion. */
export default function StaticMenu() {
  const headingId = useId();

  return (
    <section
      id="menu"
      aria-labelledby={headingId}
      style={{ backgroundColor: ESPRESSO, color: CREAM }}
    >
      <header className="mx-auto w-[min(92vw,72rem)] py-20 text-center sm:py-28">
        <p className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: GOLD }}>
          The menu
        </p>
        <h2 id={headingId} className="hero-display mt-4 text-6xl uppercase sm:text-8xl">
          Poured <span style={{ color: GOLD }}>fresh.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-sm opacity-75">
          Five signature frappés, blended to order.
        </p>
      </header>

      {MENU_ITEMS.map((item, i) => {
        const ink = heroPalette(item.background).ink;
        const itemHeadingId = `${headingId}-${item.id}`;
        return (
          <article
            key={item.id}
            aria-labelledby={itemHeadingId}
            style={{ backgroundColor: item.background, color: ink }}
          >
            <div className="mx-auto grid w-[min(92vw,64rem)] items-center gap-6 py-12 sm:grid-cols-2 sm:py-16">
              <HeroImage
                file={item.cup}
                alt=""
                className="mx-auto aspect-1/2 h-[min(60svh,28rem)] object-cover"
              />
              <div>
                <FlavorInfo item={item} index={i} headingId={itemHeadingId} ink={ink} />
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
