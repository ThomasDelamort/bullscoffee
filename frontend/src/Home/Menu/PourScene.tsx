import { motion, useTransform, type MotionValue } from "motion/react";
import HeroImage from "../Hero/HeroImage";
import { CREAM, ESPRESSO, GOLD } from "../theme";

interface PourSceneProps {
  /** 0 → 1 as the coffee rises. */
  fill: MotionValue<number>;
  /** Sideways travel once the flavors start moving past, in px (≤ 0). */
  trackX: MotionValue<number>;
  stageHeight: number;
  /** The copy seen through the coffee: cream text, beans sunk and dimmed. */
  submerged?: boolean;
  headingId?: string;
}

/**
 * The menu's opening headline between two bean clusters. It's drawn once on
 * the white page and again inside the liquid; both copies share the same
 * motion so they line up exactly where the surface cuts between them.
 */
export default function PourScene({
  fill,
  trackX,
  stageHeight: h,
  submerged = false,
  headingId,
}: PourSceneProps) {
  const textY = useTransform(fill, [0, 1], [h * 0.05, -h * 0.05]);
  const backX = useTransform(trackX, (x) => x * 0.7);
  const backY = useTransform(fill, [0, 1], [h * 0.2, -h * 0.3]);
  const backRotate = useTransform(fill, [0, 1], [0, 28]);
  const frontX = useTransform(trackX, (x) => x * 1.35);
  const frontY = useTransform(fill, [0, 1], [h * 0.45, -h * 0.55]);
  const frontRotate = useTransform(fill, [0, 1], [0, -40]);

  return (
    <div
      aria-hidden={submerged || undefined}
      className="absolute inset-0"
      style={{ color: submerged ? CREAM : ESPRESSO }}
    >
      <motion.div
        className={`absolute top-[4%] left-[-12%] w-[max(16rem,44vmin)] will-change-transform ${submerged ? "opacity-25" : ""}`}
        style={{ x: backX, y: backY, rotate: backRotate }}
      >
        <HeroImage file="beans.png" alt="" className="w-full select-none" />
      </motion.div>

      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center will-change-transform"
        style={{ x: trackX, y: textY }}
      >
        <p className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: GOLD }}>
          The menu
        </p>
        <h2
          id={headingId}
          className="hero-display mt-4 text-[min(20vw,31svh)] leading-[0.82] uppercase"
        >
          Poured
          <br />
          <span style={{ color: GOLD }}>fresh.</span>
        </h2>
        <p className="mt-6 max-w-xs text-sm font-medium opacity-75 sm:max-w-sm sm:text-base">
          Five signature frappés, blended to order. Keep scrolling for a taste.
        </p>
      </motion.div>

      <motion.div
        className={`absolute right-[-14%] bottom-[-10%] w-[max(20rem,62vmin)] will-change-transform ${submerged ? "opacity-30" : ""}`}
        style={{ x: frontX, y: frontY, rotate: frontRotate }}
      >
        <HeroImage file="beans.png" alt="" className="w-full -scale-x-100 select-none" />
      </motion.div>
    </div>
  );
}
