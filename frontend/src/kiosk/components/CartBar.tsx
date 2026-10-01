import { AnimatePresence, motion } from "motion/react";
import { FiChevronUp, FiShoppingBag } from "react-icons/fi";
import { formatPeso } from "../../POS/utils/format";
import { FOCUS_RING } from "../styles";

interface CartBarProps {
  count: number;
  total: number;
  onOpen: () => void;
}

/** Floats at the bottom once the order has something in it; tapping it opens the order. */
export default function CartBar({ count, total, onOpen }: CartBarProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: "120%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "120%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6"
        >
          <button
            type="button"
            onClick={onOpen}
            aria-haspopup="dialog"
            className={`pointer-events-auto mx-auto flex w-full max-w-2xl items-center gap-4 rounded-[1.75rem] bg-(--k-ink) p-3 pr-4 text-left text-(--k-canvas) shadow-[0_24px_50px_-18px_rgba(42,26,16,0.75)] transition active:scale-[0.99] sm:pr-5 ${FOCUS_RING}`}
          >
            {/* Re-keyed on every change so the bag gives a little bounce as items go in. */}
            <motion.span
              key={count}
              initial={{ scale: 0.82 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 520, damping: 14 }}
              className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-(--k-gold) text-(--k-ink)"
            >
              <FiShoppingBag aria-hidden className="size-6" strokeWidth={2.25} />
              <span className="absolute -top-2 -right-2 grid h-6 min-w-6 place-items-center rounded-full bg-(--k-canvas) px-1.5 text-xs font-extrabold text-(--k-ink) tabular-nums ring-2 ring-(--k-ink)">
                {count}
              </span>
            </motion.span>

            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold tracking-[0.2em] text-(--k-gold) uppercase">Your order</span>
              <span className="block truncate text-base font-semibold">
                {count} {count === 1 ? "item" : "items"}
                <span className="hidden opacity-60 sm:inline"> · Tap to review</span>
              </span>
            </span>

            <span className="text-xl font-extrabold tabular-nums sm:text-2xl">{formatPeso(total)}</span>
            <span aria-hidden className="hidden size-10 shrink-0 place-items-center rounded-full bg-white/10 sm:grid">
              <FiChevronUp className="size-5" strokeWidth={2.5} />
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
