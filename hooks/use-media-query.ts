"use client"

import { useState, useEffect } from "react"
import { BREAKPOINTS } from "@/config/constants"

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    
    // Set initial value
    setMatches(media.matches)

    // Create listener
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Add listener
    media.addEventListener("change", listener)

    // Cleanup
    return () => {
      media.removeEventListener("change", listener)
    }
  }, [query])

  return matches
}

// Predefined breakpoint hooks
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`)
}

export function useIsTablet(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`)
}

export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`)
}

export function useIsSmallScreen(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.sm - 1}px)`)
}

export function useIsLargeScreen(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`)
}

// Get current breakpoint
export function useBreakpoint(): "sm" | "md" | "lg" | "xl" | "2xl" {
  const isSm = useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`)
  const isMd = useMediaQuery(`(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`)
  const isLg = useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px) and (max-width: ${BREAKPOINTS.xl - 1}px)`)
  const isXl = useMediaQuery(`(min-width: ${BREAKPOINTS.xl}px) and (max-width: ${BREAKPOINTS["2xl"] - 1}px)`)

  if (isSm) return "sm"
  if (isMd) return "md"
  if (isLg) return "lg"
  if (isXl) return "xl"
  return "2xl"
}

