/**
 * devtools — runtime devtools toggle helpers.
 * Ticket 0270.
 *
 * isDevToolsEnabled() returns true if ANY of:
 *   - import.meta.env.DEV === true  (local Vite dev server)
 *   - URL search contains ?dev=1
 *   - localStorage "cm_devtools" === "1"
 */

export function isDevToolsEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    if (typeof window !== "undefined" && window.location.search.includes("dev=1")) return true;
    if (typeof localStorage !== "undefined" && localStorage.getItem("cm_devtools") === "1")
      return true;
  } catch {
    // SSR / test sandbox with no window — treat as disabled
  }
  return false;
}
