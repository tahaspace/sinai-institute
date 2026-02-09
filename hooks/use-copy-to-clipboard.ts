"use client"

import { useState, useCallback } from "react"

interface UseCopyToClipboardResult {
  copiedText: string | null
  copy: (text: string) => Promise<boolean>
  reset: () => void
  isSupported: boolean
}

export function useCopyToClipboard(): UseCopyToClipboardResult {
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const isSupported = typeof navigator !== "undefined" && !!navigator.clipboard

  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (!isSupported) {
      console.warn("Clipboard API not supported")
      // Fallback for older browsers
      try {
        const textarea = document.createElement("textarea")
        textarea.value = text
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
        setCopiedText(text)
        return true
      } catch (error) {
        console.error("Failed to copy text:", error)
        return false
      }
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      return true
    } catch (error) {
      console.error("Failed to copy text:", error)
      setCopiedText(null)
      return false
    }
  }, [isSupported])

  const reset = useCallback(() => {
    setCopiedText(null)
  }, [])

  return {
    copiedText,
    copy,
    reset,
    isSupported,
  }
}

