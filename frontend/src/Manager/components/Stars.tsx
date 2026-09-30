import { FaStar } from "react-icons/fa";

export default function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className={`inline-flex gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <FaStar aria-hidden key={n} className={`size-3.5 ${n <= rating ? "text-amber-500" : "text-stone-300"}`} />
      ))}
    </span>
  );
}
