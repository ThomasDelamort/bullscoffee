import { useCallback, useEffect, useState } from "react";

function read(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/** Whether the desktop sidebar is collapsed to an icon rail, remembered per browser. */
export function useSidebarCollapsed(key: string): [collapsed: boolean, toggle: () => void] {
  const [collapsed, setCollapsed] = useState(() => read(key));

  useEffect(() => {
    try {
      localStorage.setItem(key, collapsed ? "1" : "0");
    } catch {
      // Storage blocked (private window etc.): the choice just won't survive a reload.
    }
  }, [key, collapsed]);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);
  return [collapsed, toggle];
}
