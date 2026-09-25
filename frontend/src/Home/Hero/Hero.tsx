import type { CSSProperties } from "react";
import CoffeeShowcase from "./CoffeeShowcase";
import CoffeeWatermark from "./CoffeeWatermark";
import Navbar from "./Navbar";
// import Hill from "./Hill";
import {
  CUP_BOX_ASPECT,
  CUP_FILL,
  CYCLE_INTERVAL_MS,
  HERO_FLAVORS,
  HILL_COLOR,
  TRANSITION_EASING,
  TRANSITION_MS,
} from "./hero.config";
import { heroPalette } from "./palette";
import { useHeroCycle, usePrefersReducedMotion } from "./useHeroCycle";
import "./hero.css";

/**
 * Layout tokens, all relative to the hero itself (it's a size container):
 * --cup-h       visible height of the center cup; beans, wheel and headline
 *               scale from it (the image frame is --cup-frame-h, padding included)
 * --scene-y     center cup's vertical center, placed so its base overlaps the hill
 * --headline-y  "COFFEE" center: behind the cup, lifted above it on portrait
 *               screens where the cup would otherwise hide it
 * --hill-y      top of the hill; the CTA fills the hill from the cup's base down
 */
const LAYOUT = [
  "[container-type:size]",
  "[--hill-y:65cqh]",
  "[--cup-h:min(59cqh,95cqw)]",
  "[--scene-y:calc(74cqh_-_var(--cup-h)/2)]",
  "[--headline-y:calc(var(--scene-y)_-_0.12*var(--cup-h))]",
  "[@media(max-aspect-ratio:4/5)]:[--headline-y:calc(var(--scene-y)_-_0.42*var(--cup-h))]",
].join(" ");

export default function Hero(): React.JSX.Element {
  const step = useHeroCycle(CYCLE_INTERVAL_MS);
  const reduceMotion = usePrefersReducedMotion();
  const flavor = HERO_FLAVORS[step % HERO_FLAVORS.length];
  const palette = heroPalette(flavor.background);

  return (
    <>
      <section
        id="home"
        className={`relative isolate h-svh min-h-144 overflow-hidden transition-colors duration-(--hero-dur) ease-(--hero-ease) ${LAYOUT}`}
        style={
          {
            "--hero-dur": `${TRANSITION_MS}ms`,
            "--hero-ease": TRANSITION_EASING,
            "--cup-box-aspect": CUP_BOX_ASPECT,
            "--cup-frame-h": `calc(var(--cup-h) / ${CUP_FILL})`,
            backgroundColor: flavor.background,
            color: palette.ink,
          } as CSSProperties
        }
      >
        <CoffeeWatermark color={palette.watermark} />

        <h1 className="hero-display pointer-events-none absolute top-(--headline-y) left-1/2 z-10 -translate-1/2 text-[min(31cqw,calc(var(--cup-h)*1.05))] leading-[0.8] whitespace-nowrap text-white uppercase select-none [text-shadow:0_0.03em_0.08em_rgb(0_0_0/0.12)]">
          <span className="sr-only">Bull's Coffee</span>
          <span aria-hidden="true">Coffee</span>
        </h1>

        <div
          className="absolute top-(--hill-y) left-[-25%] z-20 h-[86%] w-[150%] rounded-[50%]"
          style={{ backgroundColor: HILL_COLOR }}
        >
          {/* <Hill /> */}
        </div>

        <CoffeeShowcase step={step} reduceMotion={reduceMotion} />

        <Navbar surface={palette.surface} />
      </section>
    </>
  );
}
