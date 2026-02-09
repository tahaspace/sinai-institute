"use client"

import { useTheme as useNextTheme } from "next-themes"
import { useEffect, useState } from "react"

export function useTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useNextTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && (theme === "dark" || (theme === "system" && systemTheme === "dark"))
  const isLight = mounted && (theme === "light" || (theme === "system" && systemTheme === "light"))

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark")
  }

  return {
    theme,
    setTheme,
    resolvedTheme,
    systemTheme,
    isDark,
    isLight,
    toggleTheme,
    mounted,
  }
}

