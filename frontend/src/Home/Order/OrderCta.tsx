import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import HeroImage from "../Hero/HeroImage";
import { MENU_ITEMS } from "../Menu/menu.config";
import { ESPRESSO, GOLD } from "../theme";

const [, MOCHA, , JAVA_CHIP] = MENU_ITEMS;

const goToMenu = () =>
  document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" });

const BUTTON =
  "rounded-full px-8 py-4 text-lg font-extrabold uppercase transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current";

/** The closing call to action, with two cups drifting past in opposite directions. */
export default function OrderCta() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const leftY = useTransform(scrollYProgress, [0, 1], ["35%", "-30%"]);
  const leftRotate = useTransform(scrollYProgress, [0, 1], [-20, -4]);
  const rightY = useTransform(scrollYProgress, [0, 1], ["-15%", "40%"]);
  const rightRotate = useTransform(scrollYProgress, [0, 1], [4, 22]);

  return (
    <div ref={ref} className="relative overflow-clip px-6 py-32 text-center sm:py-44">
      <motion.div
        aria-hidden
        className="absolute top-[6%] left-[-6%] hidden aspect-1/2 h-[78%] will-change-transform md:block lg:left-[3%]"
        style={{ y: leftY, rotate: leftRotate }}
      >
        <HeroImage file={MOCHA.cup} alt="" className="size-full object-cover" />
      </motion.div>
      <motion.div
        aria-hidden
        className="absolute top-[6%] right-[-6%] hidden aspect-1/2 h-[78%] will-change-transform md:block lg:right-[3%]"
        style={{ y: rightY, rotate: rightRotate }}
      >
        <HeroImage file={JAVA_CHIP.cup} alt="" className="size-full object-cover" />
      </motion.div>

      <div className="relative">
        <h3 className="hero-display text-[clamp(3.5rem,12vw,10rem)] leading-[0.85] uppercase">
          Your cup
          <br />
          <span style={{ color: GOLD }}>is waiting.</span>
        </h3>
        <p className="mx-auto mt-5 max-w-sm text-stone-600">
          Order ahead from any branch and it'll be ready by the time you arrive.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            className={`${BUTTON} shadow-lg`}
            style={{ backgroundColor: GOLD, color: ESPRESSO }}
          >
            Order now
          </button>
          <button type="button" onClick={goToMenu} className={`${BUTTON} ring-2 ring-current ring-inset`}>
            See the menu
          </button>
        </div>
      </div>
    </div>
  );
}
