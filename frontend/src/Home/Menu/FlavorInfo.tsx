import { Link } from "react-router-dom";
import { KIOSK_BASE_PATH } from "../../kiosk/routes";
import { formatPrice, type MenuItem } from "./menu.config";

interface FlavorInfoProps {
  item: MenuItem;
  index: number;
  headingId: string;
  /** Text color that reads on the flavor's background. */
  ink: string;
}

export default function FlavorInfo({ item, index, headingId, ink }: FlavorInfoProps) {
  return (
    <>
      <p className="text-[11px] font-bold tracking-[0.25em] uppercase opacity-70">
        {String(index + 1).padStart(2, "0")} · {item.tagline}
      </p>
      <h3
        id={headingId}
        className="hero-display mt-2 text-[2.6rem] leading-[0.9] uppercase md:text-[min(4vw,3.75rem)]"
      >
        {item.name}
      </h3>
      <p className="mt-3 max-w-sm text-sm leading-relaxed opacity-80">{item.description}</p>
      <div className="mt-5 flex items-center gap-4">
        <p className="text-2xl font-extrabold tabular-nums">
          <span className="sr-only">Price: </span>
          {formatPrice(item.price)}
        </p>
        <Link
          to={KIOSK_BASE_PATH}
          className="rounded-full px-5 py-2.5 text-sm font-extrabold uppercase shadow-md transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          style={{ backgroundColor: ink, color: item.background }}
        >
          Order now
        </Link>
      </div>
    </>
  );
}
