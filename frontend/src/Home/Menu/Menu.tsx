import { usePrefersReducedMotion } from "../Hero/useHeroCycle";
import PourShowcase from "./PourShowcase";
import StaticMenu from "./StaticMenu";

export default function Menu() {
  return usePrefersReducedMotion() ? <StaticMenu /> : <PourShowcase />;
}
