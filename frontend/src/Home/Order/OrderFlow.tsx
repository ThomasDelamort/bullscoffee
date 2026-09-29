import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useId, useRef, type ReactNode } from "react";
import "../Hero/hero.css";
import { MENU_ITEMS } from "../Menu/menu.config";
import { CREAM, ESPRESSO, GOLD } from "../theme";
import Drips from "./Drips";
import OrderCta from "./OrderCta";
import { CustomizeVisual, PickupVisual, PickVisual } from "./StepVisuals";

interface Step {
  title: string;
  body: string;
  visual: ReactNode;
  background: string;
  ink: string;
  accent: string;
}

const STEPS: Step[] = [
  {
    title: "Pick your brew",
    body: "Browse the line-up and choose your favorite, or try something new.",
    visual: <PickVisual />,
    background: ESPRESSO,
    ink: CREAM,
    accent: GOLD,
  },
  {
    title: "Make it yours",
    body: "Choose your size, milk and sweetness. Add an extra shot if it's that kind of day.",
    visual: <CustomizeVisual />,
    background: GOLD,
    ink: ESPRESSO,
    accent: ESPRESSO,
  },
  {
    title: "Skip the line",
    body: "Pay with GCash, Maya or card, then grab your cup at the counter the moment it's ready.",
    visual: <PickupVisual />,
    background: "#FFFFFF",
    ink: ESPRESSO,
    accent: GOLD,
  },
];

export default function OrderFlow() {
  const headingId = useId();
  const stackRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: stackRef, offset: ["start start", "end end"] });

  return (
    <section
      id="order"
      aria-labelledby={headingId}
      className="relative"
      style={{ backgroundColor: CREAM, color: ESPRESSO }}
    >
      <Drips color={MENU_ITEMS[MENU_ITEMS.length - 1].background} />

      <header className="mx-auto w-[min(92vw,68rem)] pt-36 sm:pt-44">
        <p className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: GOLD }}>
          How to order
        </p>
        <h2
          id={headingId}
          className="hero-display mt-3 text-[clamp(3.5rem,10vw,8rem)] leading-[0.85] uppercase"
        >
          Skip the
          <br />
          <span style={{ color: GOLD }}>line.</span>
        </h2>
        <p className="mt-5 max-w-md text-stone-600">
          Three steps from craving to cup. Order ahead and it's ready when you are.
        </p>
      </header>

      <ol ref={stackRef} className="relative">
        {STEPS.map((step, i) => (
          <StepCard key={step.title} step={step} index={i} total={STEPS.length} progress={scrollYProgress} />
        ))}
      </ol>

      <OrderCta />
    </section>
  );
}

interface StepCardProps {
  step: Step;
  index: number;
  total: number;
  progress: MotionValue<number>;
}

/** Cards pin in turn and stack; each one shrinks back as the next slides over it. */
function StepCard({ step, index, total, progress }: StepCardProps) {
  const scale = useTransform(progress, [index / total, 1], [1, 1 - (total - 1 - index) * 0.05]);

  return (
    <li className="sticky top-0 flex h-svh items-center justify-center">
      <motion.article
        className="group relative grid h-[min(78svh,36rem)] w-[min(92vw,68rem)] origin-top grid-rows-[auto_minmax(0,1fr)] gap-6 overflow-hidden rounded-[2rem] p-7 shadow-[0_-12px_40px_rgb(42_26_16/0.14)] sm:p-10 md:grid-cols-[1fr_1.1fr] md:grid-rows-1 md:items-center md:gap-10 md:p-14"
        style={{
          scale,
          top: `calc(${index} * 1.75rem)`,
          backgroundColor: step.background,
          color: step.ink,
        }}
      >
        <div>
          <p className="hero-display text-6xl leading-none sm:text-8xl" style={{ color: step.accent }}>
            {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="hero-display mt-4 text-4xl uppercase sm:text-5xl">{step.title}</h3>
          <p className="mt-3 max-w-sm text-sm leading-relaxed opacity-80 sm:text-base">{step.body}</p>
        </div>
        <div aria-hidden className="relative h-full min-h-0">
          {step.visual}
        </div>
      </motion.article>
    </li>
  );
}
