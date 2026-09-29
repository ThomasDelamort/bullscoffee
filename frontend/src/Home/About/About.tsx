import { animate, motion, useInView, useMotionValue, useScroll, useTransform } from "motion/react";
import { useEffect, useId, useRef } from "react";
import "../Hero/hero.css";
import HeroImage from "../Hero/HeroImage";
import { usePrefersReducedMotion } from "../Hero/useHeroCycle";
import { CREAM, ESPRESSO, GOLD } from "../theme";
import DiveStage from "./DiveStage";
import WordReveal from "./WordReveal";

const STORY =
  "Bull's Coffee started with a simple idea: rich aromas, exceptional beans, and a cup worth slowing down for. Every frappé is blended to order and served with a grin, just like our bulldog's.";

const STATS = [
  { value: 10, suffix: "+", label: "Unique coffees" },
  { value: 20, suffix: "K+", label: "Loyal customers" },
  { value: 100, suffix: "%", label: "Premium Arabica beans" },
] as const;

export default function About() {
  const headingId = useId();
  const still = usePrefersReducedMotion();

  return (
    <section
      id="about"
      aria-labelledby={headingId}
      style={{ backgroundColor: ESPRESSO, color: CREAM }}
    >
      {!still && <DiveStage headingId={headingId} />}

      <div className="relative overflow-clip">
        <DriftingBeans still={still} />
        <div className="relative mx-auto grid w-[min(92vw,72rem)] gap-16 py-24 sm:py-32 lg:grid-cols-[1.5fr_1fr] lg:gap-24">
          <div>
            {still && (
              <>
                <p className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: GOLD }}>
                  About us
                </p>
                <h2 id={headingId} className="hero-display mt-3 mb-8 text-6xl uppercase sm:text-7xl">
                  Our <span style={{ color: GOLD }}>story.</span>
                </h2>
              </>
            )}
            <WordReveal
              text={STORY}
              still={still}
              className="text-[clamp(1.6rem,3.4vw,2.9rem)] leading-[1.2] font-semibold tracking-tight"
            />
          </div>

          <dl className="grid content-end gap-10 sm:grid-cols-3 lg:grid-cols-1">
            {STATS.map((stat) => (
              <Stat key={stat.label} {...stat} still={still} />
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

interface StatProps {
  value: number;
  suffix: string;
  label: string;
  still: boolean;
}

/** Counts up the first time it scrolls into view. */
function Stat({ value, suffix, label, still }: StatProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const count = useMotionValue(still ? value : 0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    if (!inView || still) return;
    const controls = animate(count, value, { duration: 1.6, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [inView, still, count, value]);

  return (
    <div ref={ref} className="flex flex-col-reverse gap-2 border-t border-current/15 pt-5">
      <dt className="text-xs font-bold tracking-[0.2em] uppercase opacity-70">{label}</dt>
      <dd className="hero-display text-6xl leading-none sm:text-7xl" style={{ color: GOLD }}>
        <span className="sr-only">
          {value}
          {suffix}
        </span>
        <span aria-hidden>
          <motion.span>{rounded}</motion.span>
          {suffix}
        </span>
      </dd>
    </div>
  );
}

function DriftingBeans({ still }: { still: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-20%", "25%"]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-15, 25]);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0">
      <motion.div
        className="absolute top-[8%] right-[-14%] w-[min(38rem,75vw)] opacity-25 will-change-transform"
        style={still ? undefined : { y, rotate }}
      >
        <HeroImage file="beans.png" alt="" className="w-full select-none" />
      </motion.div>
    </div>
  );
}
