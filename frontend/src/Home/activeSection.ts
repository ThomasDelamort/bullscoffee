import { useSyncExternalStore } from "react";
import type { NavId } from "./Hero/hero.config";

export const sectionPath = (id: NavId) => (id === "home" ? "/" : `/${id}`);

export const sectionFromPath = (pathname: string): NavId =>
  pathname === "/" ? "home" : (pathname.slice(1) as NavId);

let active: NavId = sectionFromPath(window.location.pathname);
const listeners = new Set<() => void>();

/**
 * Mirrors the section in view into the address bar via the History API rather
 * than React Router's navigate(): a router navigation re-renders the whole page
 * mid-scroll, which shows up as a visible hitch.
 */
export function setActiveSection(id: NavId) {
  if (id === active) return;
  active = id;
  // Keep React Router's own history state (key/idx) so back/forward still work.
  window.history.replaceState(window.history.state, "", sectionPath(id));
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

export function useActiveSection(): NavId {
  return useSyncExternalStore(subscribe, () => active);
}
