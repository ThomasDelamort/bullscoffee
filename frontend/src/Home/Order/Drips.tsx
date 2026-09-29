import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

/** Drips hanging from the band, as [x, width, length] in a 1200 × 120 box. */
const DRIPS = [
  [70, 26, 64],
  [190, 16, 30],
  [330, 34, 92],
  [470, 20, 42],
  [600, 28, 70],
  [760, 18, 36],
  [880, 32, 84],
  [1010, 22, 48],
  [1130, 26, 60],
] as const;
const BAND = 22;
const SHOULDER = 10;

const PATH =
  DRIPS.reduce((d, [x, w, length]) => {
    const r = w / 2;
    const bottom = BAND + length - r;
    return (
      d +
      `H${x - r - SHOULDER}Q${x - r} ${BAND} ${x - r} ${BAND + SHOULDER}V${bottom}` +
      `A${r} ${r} 0 0 0 ${x + r} ${bottom}V${BAND + SHOULDER}Q${x + r} ${BAND} ${x + r + SHOULDER} ${BAND}`
    );
  }, `M0 0V${BAND}`) + "H1200V0Z";

/** The showcase's last color dripping into the next section, stretching as it scrolls up. */
export default function Drips({ color }: { color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start start"] });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0.35, 1.25]);

  return (
    <motion.div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-[clamp(4rem,10vw,9rem)] origin-top"
      style={{ scaleY }}
    >
      <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="size-full">
        <path d={PATH} fill={color} />
      </svg>
    </motion.div>
  );
}
