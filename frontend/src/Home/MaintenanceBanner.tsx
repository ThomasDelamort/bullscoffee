import { FiTool } from "react-icons/fi";
import { usePublicSettings } from "../lib/publicSettings";

/** Pinned to the bottom of the storefront while an admin has maintenance mode on. */
export default function MaintenanceBanner() {
  const { data } = usePublicSettings();
  if (!data?.maintenance_mode) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 bg-amber-100 px-4 py-3 text-center text-sm font-medium text-amber-950 shadow-[0_-4px_16px_rgba(0,0,0,0.12)]"
    >
      <FiTool aria-hidden className="size-4 shrink-0" />
      <span>{data.maintenance_message}</span>
    </div>
  );
}
