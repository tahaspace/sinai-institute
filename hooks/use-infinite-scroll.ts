"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface UseInfiniteScrollOptions {
  threshold?: number
  rootMargin?: string
  enabled?: boolean
}

interface UseInfiniteScrollReturn {
  ref: React.RefObject<HTMLDivElement>
  isIntersecting: boolean
  reset: () => void
}

export function useInfiniteScroll(
  onLoadMore: () => void | Promise<void>,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn {
  const { threshold = 0.1, rootMargin = "100px", enabled = true } = options
  
  const ref = useRef<HTMLDivElement>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)
  const loadMoreRef = useRef(onLoadMore)

  // Keep loadMore callback ref updated
  useEffect(() => {
    loadMoreRef.current = onLoadMore
  }, [onLoadMore])

  useEffect(() => {
    if (!enabled) return

    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        setIsIntersecting(entry.isIntersecting)

        if (entry.isIntersecting) {
          loadMoreRef.current()
        }
      },
      {
        threshold,
        rootMargin,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [threshold, rootMargin, enabled])

  const reset = useCallback(() => {
    setIsIntersecting(false)
  }, [])

  return {
    ref,
    isIntersecting,
    reset,
  }
}

// Alternative hook using scroll position
export function useScrollToBottom(
  onReachBottom: () => void,
  options: { offset?: number; enabled?: boolean } = {}
): React.RefObject<HTMLDivElement> {
  const { offset = 100, enabled = true } = options
  const containerRef = useRef<HTMLDivElement>(null)
  const onReachBottomRef = useRef(onReachBottom)

  useEffect(() => {
    onReachBottomRef.current = onReachBottom
  }, [onReachBottom])

  useEffect(() => {
    if (!enabled) return

    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      if (distanceFromBottom <= offset) {
        onReachBottomRef.current()
      }
    }

    container.addEventListener("scroll", handleScroll)

    return () => {
      container.removeEventListener("scroll", handleScroll)
    }
  }, [offset, enabled])

  return containerRef
}

// Hook for window scroll
export function useWindowScroll(
  onReachBottom: () => void,
  options: { offset?: number; enabled?: boolean } = {}
): void {
  const { offset = 100, enabled = true } = options
  const onReachBottomRef = useRef(onReachBottom)

  useEffect(() => {
    onReachBottomRef.current = onReachBottom
  }, [onReachBottom])

  useEffect(() => {
    if (!enabled) return

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      const distanceFromBottom = documentHeight - scrollTop - windowHeight

      if (distanceFromBottom <= offset) {
        onReachBottomRef.current()
      }
    }

    window.addEventListener("scroll", handleScroll)

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [offset, enabled])
}

