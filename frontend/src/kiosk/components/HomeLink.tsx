import { FiHome } from "react-icons/fi";
import { Link } from "react-router-dom";
import { FOCUS_RING } from "../styles";

/** The quieter way out of the dark end-of-order screens, under their main button. */
export default function HomeLink() {
  return (
    <Link
      to="/"
      className={`mt-3 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full px-8 text-base font-extrabold tracking-wide uppercase ring-1 ring-white/25 transition ring-inset hover:bg-white/10 active:scale-[0.98] ${FOCUS_RING}`}
    >
      <FiHome aria-hidden className="size-5" strokeWidth={2.5} />
      Back to home
    </Link>
  );
}
