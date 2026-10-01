import { useEffect, useState } from "react";

/** `value`, once it has stopped changing for `delayMs`; keeps search boxes from querying per keystroke. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}
