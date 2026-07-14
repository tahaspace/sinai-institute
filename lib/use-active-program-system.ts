"use client"

import { useSyncExternalStore } from "react"

/**
 * Active academic-system context (Dual-system Phase 4). The header program switcher (institute
 * layout) persists the selected program's system in localStorage (`activeProgramSystem`) and fires
 * an `academic-system-changed` event. Screens read it via this hook to branch UI (annual vs
 * credit-hours). Uses useSyncExternalStore → SSR-safe (server snapshot = CREDIT_HOURS), live updates,
 * no effect-setState.
 */
export type ActiveSystem = "CREDIT_HOURS" | "ANNUAL"
export const ACTIVE_SYSTEM_EVENT = "academic-system-changed"

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  window.addEventListener("storage", cb)
  window.addEventListener(ACTIVE_SYSTEM_EVENT, cb)
  return () => {
    window.removeEventListener("storage", cb)
    window.removeEventListener(ACTIVE_SYSTEM_EVENT, cb)
  }
}

export function useActiveProgramSystem(): ActiveSystem {
  return useSyncExternalStore(
    subscribe,
    () => (typeof window !== "undefined" && window.localStorage.getItem("activeProgramSystem") === "ANNUAL" ? "ANNUAL" : "CREDIT_HOURS"),
    () => "CREDIT_HOURS" as ActiveSystem,
  )
}
