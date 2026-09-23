import type { CSSProperties } from "react";
import HeroImage from "./HeroImage";
import { BEAN_FIELD } from "./hero.config";

/**
 * The bean cluster behind the center cup, positioned in cup heights. It
 * drifts slowly only when the user hasn't asked for reduced motion.
 */
export default function FloatingBeans({ className = "" }: { className?: string }) {
  const placement = {
    left: `calc(${BEAN_FIELD.x} * var(--cup-h))`,
    top: `calc(${BEAN_FIELD.y} * var(--cup-h))`,
    width: `calc(${BEAN_FIELD.size} * var(--cup-h))`,
    "--float-y": "calc(var(--cup-h) * -0.02)",
    "--float-rot": "2deg",
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className={`absolute motion-safe:animate-[hero-bean-float_7s_ease-in-out_infinite] ${className}`}
      style={placement}
    >
      <HeroImage
        file={BEAN_FIELD.file}
        alt=""
        placeholderShape="oval"
        className="w-full -translate-1/2 select-none"
      />
    </div>
  );
}
