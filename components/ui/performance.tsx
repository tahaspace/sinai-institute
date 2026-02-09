"use client"

import { ReactNode, useState, useEffect, useRef, Suspense } from "react"
import Image from "next/image"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

// Lazy loading wrapper with fallback
interface LazyLoadProps {
  children: ReactNode
  fallback?: ReactNode
  threshold?: number
  rootMargin?: string
}

export function LazyLoad({
  children,
  fallback = <Skeleton className="w-full h-48" />,
  threshold = 0.1,
  rootMargin = "100px",
}: LazyLoadProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return (
    <div ref={ref}>
      {isVisible ? children : fallback}
    </div>
  )
}

// Optimized Image Component
interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
  className?: string
  sizes?: string
  quality?: number
  placeholder?: "blur" | "empty"
  blurDataURL?: string
  onLoad?: () => void
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  priority = false,
  className,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  quality = 75,
  placeholder = "empty",
  blurDataURL,
  onLoad,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState(false)

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  if (error) {
    return (
      <div className={cn(
        "bg-muted flex items-center justify-center text-muted-foreground",
        className
      )}>
        <span className="text-sm">صورة غير متاحة</span>
      </div>
    )
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {!isLoaded && (
        <Skeleton className="absolute inset-0" />
      )}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        sizes={sizes}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={handleLoad}
        onError={() => setError(true)}
      />
    </div>
  )
}

// Virtual list for large data sets
interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => ReactNode
  className?: string
  overscan?: number
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const totalHeight = items.length * itemHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = items.slice(startIndex, endIndex)
  const offsetY = startIndex * itemHeight

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Debounced input for performance
interface DebouncedInputProps {
  value: string
  onChange: (value: string) => void
  delay?: number
  placeholder?: string
  className?: string
}

export function DebouncedInput({
  value: initialValue,
  onChange,
  delay = 300,
  placeholder,
  className,
}: DebouncedInputProps) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay, onChange])

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
    />
  )
}

// Memoized component wrapper
interface MemoizedProps {
  children: ReactNode
  deps: unknown[]
}

export function Memoized({ children, deps }: MemoizedProps) {
  const ref = useRef<ReactNode>(null)
  const prevDeps = useRef<unknown[]>(deps)

  const depsChanged = deps.some((dep, i) => dep !== prevDeps.current[i])

  if (depsChanged || !ref.current) {
    ref.current = children
    prevDeps.current = deps
  }

  return <>{ref.current}</>
}

// Progressive loading component
interface ProgressiveLoadProps {
  lowQualitySrc: string
  highQualitySrc: string
  alt: string
  className?: string
}

export function ProgressiveLoad({
  lowQualitySrc,
  highQualitySrc,
  alt,
  className,
}: ProgressiveLoadProps) {
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc)
  const [isHighQualityLoaded, setIsHighQualityLoaded] = useState(false)

  useEffect(() => {
    const img = new window.Image()
    img.src = highQualitySrc
    img.onload = () => {
      setCurrentSrc(highQualitySrc)
      setIsHighQualityLoaded(true)
    }
  }, [highQualitySrc])

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={cn(
        "transition-all duration-500",
        !isHighQualityLoaded && "blur-sm scale-105",
        className
      )}
    />
  )
}

// Prefetch link component
interface PrefetchLinkProps {
  href: string
  children: ReactNode
  className?: string
  prefetchOnHover?: boolean
}

export function PrefetchLink({
  href,
  children,
  className,
  prefetchOnHover = true,
}: PrefetchLinkProps) {
  const prefetched = useRef(false)

  const handleMouseEnter = () => {
    if (prefetchOnHover && !prefetched.current) {
      const link = document.createElement("link")
      link.rel = "prefetch"
      link.href = href
      document.head.appendChild(link)
      prefetched.current = true
    }
  }

  return (
    <a
      href={href}
      className={className}
      onMouseEnter={handleMouseEnter}
    >
      {children}
    </a>
  )
}

// Performance metrics display (development only)
export function PerformanceMetrics() {
  const [metrics, setMetrics] = useState<{
    fcp?: number
    lcp?: number
    fid?: number
    cls?: number
  }>({})

  useEffect(() => {
    if (typeof window === "undefined") return

    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      const fcp = entries.find((e) => e.name === "first-contentful-paint")
      if (fcp) {
        setMetrics((prev) => ({ ...prev, fcp: fcp.startTime }))
      }
    })
    fcpObserver.observe({ entryTypes: ["paint"] })

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      const lastEntry = entries[entries.length - 1]
      setMetrics((prev) => ({ ...prev, lcp: lastEntry.startTime }))
    })
    lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] })

    return () => {
      fcpObserver.disconnect()
      lcpObserver.disconnect()
    }
  }, [])

  if (process.env.NODE_ENV !== "development") return null

  return (
    <div className="fixed bottom-4 left-4 p-4 bg-black/80 text-white text-xs rounded-lg z-[9999]">
      <h4 className="font-bold mb-2">Performance Metrics</h4>
      <div className="space-y-1">
        <p>FCP: {metrics.fcp?.toFixed(0) || "..."} ms</p>
        <p>LCP: {metrics.lcp?.toFixed(0) || "..."} ms</p>
      </div>
    </div>
  )
}


