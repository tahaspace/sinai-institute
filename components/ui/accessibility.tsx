"use client"

import { ReactNode, useEffect, useRef, useState, KeyboardEvent } from "react"
import { cn } from "@/lib/utils"

// Skip to main content link
export function SkipToContent({ 
  targetId = "main-content",
  label = "تخطي إلى المحتوى الرئيسي"
}: {
  targetId?: string
  label?: string
}) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:right-4 focus:z-[9999] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {label}
    </a>
  )
}

// Visually hidden but accessible to screen readers
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return (
    <span className="sr-only">
      {children}
    </span>
  )
}

// Announce changes to screen readers
export function LiveRegion({
  children,
  mode = "polite",
  atomic = true,
}: {
  children: ReactNode
  mode?: "polite" | "assertive" | "off"
  atomic?: boolean
}) {
  return (
    <div
      role="status"
      aria-live={mode}
      aria-atomic={atomic}
      className="sr-only"
    >
      {children}
    </div>
  )
}

// Focus trap for modals and dialogs
export function FocusTrap({
  children,
  active = true,
}: {
  children: ReactNode
  active?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!active) return

    const container = containerRef.current
    if (!container) return

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Tab") return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    // Focus first element on mount
    firstElement?.focus()

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [active])

  return (
    <div ref={containerRef}>
      {children}
    </div>
  )
}

// Keyboard navigable list
interface KeyboardListProps {
  children: ReactNode
  className?: string
  onSelect?: (index: number) => void
  orientation?: "vertical" | "horizontal"
}

export function KeyboardList({
  children,
  className,
  onSelect,
  orientation = "vertical",
}: KeyboardListProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  const handleKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const items = listRef.current?.querySelectorAll('[role="option"], [role="menuitem"]')
    if (!items) return

    const isVertical = orientation === "vertical"
    const nextKey = isVertical ? "ArrowDown" : "ArrowRight"
    const prevKey = isVertical ? "ArrowUp" : "ArrowLeft"

    switch (e.key) {
      case nextKey:
        e.preventDefault()
        setActiveIndex((prev) => Math.min(prev + 1, items.length - 1))
        break
      case prevKey:
        e.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, 0))
        break
      case "Home":
        e.preventDefault()
        setActiveIndex(0)
        break
      case "End":
        e.preventDefault()
        setActiveIndex(items.length - 1)
        break
      case "Enter":
      case " ":
        e.preventDefault()
        onSelect?.(activeIndex)
        break
    }
  }

  useEffect(() => {
    const items = listRef.current?.querySelectorAll('[role="option"], [role="menuitem"]')
    const activeItem = items?.[activeIndex] as HTMLElement
    activeItem?.focus()
  }, [activeIndex])

  return (
    <ul
      ref={listRef}
      role="listbox"
      className={className}
      onKeyDown={handleKeyDown}
      aria-orientation={orientation}
    >
      {children}
    </ul>
  )
}

// Accessible icon button
interface IconButtonProps {
  icon: ReactNode
  label: string
  onClick?: () => void
  className?: string
  disabled?: boolean
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
}

export function IconButton({
  icon,
  label,
  onClick,
  className,
  disabled = false,
  size = "md",
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-md",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-colors hover:bg-muted",
        sizeClasses[size],
        className
      )}
    >
      {icon}
      <VisuallyHidden>{label}</VisuallyHidden>
    </button>
  )
}

// Accessible heading with proper hierarchy
interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6
  children: ReactNode
  className?: string
  id?: string
}

export function Heading({ level, children, className, id }: HeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements
  
  const defaultClasses = {
    1: "text-4xl font-bold",
    2: "text-3xl font-bold",
    3: "text-2xl font-bold",
    4: "text-xl font-semibold",
    5: "text-lg font-semibold",
    6: "text-base font-medium",
  }

  return (
    <Tag id={id} className={cn(defaultClasses[level], className)}>
      {children}
    </Tag>
  )
}

// Color contrast checker component (for dev/testing)
export function ContrastChecker({
  foreground,
  background,
}: {
  foreground: string
  background: string
}) {
  const [ratio, setRatio] = useState<number | null>(null)

  useEffect(() => {
    // Simple luminance calculation
    const getLuminance = (hex: string) => {
      const rgb = parseInt(hex.replace("#", ""), 16)
      const r = ((rgb >> 16) & 0xff) / 255
      const g = ((rgb >> 8) & 0xff) / 255
      const b = (rgb & 0xff) / 255
      
      const adjust = (c: number) => 
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      
      return 0.2126 * adjust(r) + 0.7152 * adjust(g) + 0.0722 * adjust(b)
    }

    const l1 = getLuminance(foreground)
    const l2 = getLuminance(background)
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    
    setRatio((lighter + 0.05) / (darker + 0.05))
  }, [foreground, background])

  const passesAA = ratio !== null && ratio >= 4.5
  const passesAAA = ratio !== null && ratio >= 7

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center gap-4 mb-2">
        <div
          className="w-8 h-8 rounded border"
          style={{ backgroundColor: foreground }}
        />
        <span>on</span>
        <div
          className="w-8 h-8 rounded border"
          style={{ backgroundColor: background }}
        />
      </div>
      <p className="text-sm">
        Contrast Ratio: <strong>{ratio?.toFixed(2)}:1</strong>
      </p>
      <p className={cn("text-sm", passesAA ? "text-green-600" : "text-red-600")}>
        WCAG AA: {passesAA ? "✓ Pass" : "✗ Fail"}
      </p>
      <p className={cn("text-sm", passesAAA ? "text-green-600" : "text-red-600")}>
        WCAG AAA: {passesAAA ? "✓ Pass" : "✗ Fail"}
      </p>
    </div>
  )
}


