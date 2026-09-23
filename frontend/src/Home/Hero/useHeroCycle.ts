import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Ever-increasing step counter for the flavor rotation. Callers derive the
 * active flavor with `step % count`; never wrapping keeps the wheel angle
 * monotonic so it always turns clockwise. Ticks are skipped while the tab is
 * hidden.
 */
export function useHeroCycle(intervalMs: number): number {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') setStep((s) => s + 1);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return step;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}
