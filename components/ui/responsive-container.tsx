"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ResponsiveContainerProps {
  children: ReactNode
  className?: string
  as?: "div" | "section" | "main" | "article"
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
  padding?: "none" | "sm" | "md" | "lg"
}

const maxWidthClasses = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  full: "max-w-full",
}

const paddingClasses = {
  none: "",
  sm: "px-4 sm:px-6",
  md: "px-4 sm:px-6 lg:px-8",
  lg: "px-4 sm:px-6 lg:px-8 xl:px-12",
}

export function ResponsiveContainer({
  children,
  className,
  as: Component = "div",
  maxWidth = "xl",
  padding = "md",
}: ResponsiveContainerProps) {
  return (
    <Component
      className={cn(
        "mx-auto w-full",
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </Component>
  )
}

// Responsive Grid Component
interface ResponsiveGridProps {
  children: ReactNode
  className?: string
  cols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: "none" | "sm" | "md" | "lg"
}

const gapClasses = {
  none: "",
  sm: "gap-2 sm:gap-3",
  md: "gap-4 sm:gap-6",
  lg: "gap-6 sm:gap-8",
}

export function ResponsiveGrid({
  children,
  className,
  cols = { default: 1, sm: 2, md: 3, lg: 4 },
  gap = "md",
}: ResponsiveGridProps) {
  const colClasses = [
    cols.default && `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
  ].filter(Boolean).join(" ")

  return (
    <div className={cn("grid", colClasses, gapClasses[gap], className)}>
      {children}
    </div>
  )
}

// Responsive Stack Component
interface ResponsiveStackProps {
  children: ReactNode
  className?: string
  direction?: "vertical" | "horizontal" | "responsive"
  gap?: "none" | "sm" | "md" | "lg"
  align?: "start" | "center" | "end" | "stretch"
  justify?: "start" | "center" | "end" | "between" | "around"
}

const alignClasses = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
}

const justifyClasses = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
}

export function ResponsiveStack({
  children,
  className,
  direction = "vertical",
  gap = "md",
  align = "stretch",
  justify = "start",
}: ResponsiveStackProps) {
  const directionClasses = {
    vertical: "flex-col",
    horizontal: "flex-row",
    responsive: "flex-col md:flex-row",
  }

  return (
    <div
      className={cn(
        "flex",
        directionClasses[direction],
        gapClasses[gap],
        alignClasses[align],
        justifyClasses[justify],
        className
      )}
    >
      {children}
    </div>
  )
}

// Hide/Show on breakpoints
interface ResponsiveVisibilityProps {
  children: ReactNode
  hideOn?: ("mobile" | "tablet" | "desktop")[]
  showOn?: ("mobile" | "tablet" | "desktop")[]
}

export function ResponsiveVisibility({
  children,
  hideOn = [],
  showOn = [],
}: ResponsiveVisibilityProps) {
  const hideClasses = hideOn.map((bp) => {
    switch (bp) {
      case "mobile": return "hidden sm:block"
      case "tablet": return "sm:hidden md:block"
      case "desktop": return "md:hidden"
      default: return ""
    }
  }).join(" ")

  const showClasses = showOn.map((bp) => {
    switch (bp) {
      case "mobile": return "sm:hidden"
      case "tablet": return "hidden sm:block md:hidden"
      case "desktop": return "hidden md:block"
      default: return ""
    }
  }).join(" ")

  return (
    <div className={cn(hideClasses, showClasses)}>
      {children}
    </div>
  )
}


