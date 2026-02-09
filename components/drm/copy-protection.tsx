"use client"

import { useEffect, useCallback, ReactNode } from "react"
import { toast } from "sonner"

interface CopyProtectionProps {
  children: ReactNode
  preventCopy?: boolean
  preventPrint?: boolean
  preventScreenshot?: boolean
  preventRightClick?: boolean
  showWarning?: boolean
  warningMessage?: string
}

export function CopyProtection({
  children,
  preventCopy = true,
  preventPrint = true,
  preventScreenshot = true,
  preventRightClick = true,
  showWarning = true,
  warningMessage = "هذا المحتوى محمي. لا يمكن نسخه أو طباعته.",
}: CopyProtectionProps) {
  const showProtectionWarning = useCallback(() => {
    if (showWarning) {
      toast.error(warningMessage)
    }
  }, [showWarning, warningMessage])

  useEffect(() => {
    // Prevent copy
    const handleCopy = (e: ClipboardEvent) => {
      if (preventCopy) {
        e.preventDefault()
        showProtectionWarning()
      }
    }

    // Prevent print (Ctrl+P)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent print
      if (preventPrint && e.ctrlKey && e.key === "p") {
        e.preventDefault()
        showProtectionWarning()
      }

      // Prevent screenshot (PrintScreen)
      if (preventScreenshot && e.key === "PrintScreen") {
        e.preventDefault()
        showProtectionWarning()
      }

      // Prevent developer tools
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key === "I")) {
        e.preventDefault()
        showProtectionWarning()
      }
    }

    // Prevent right click
    const handleContextMenu = (e: MouseEvent) => {
      if (preventRightClick) {
        e.preventDefault()
        showProtectionWarning()
      }
    }

    // Prevent drag
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault()
    }

    // Add event listeners
    document.addEventListener("copy", handleCopy)
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("dragstart", handleDragStart)

    // Add CSS to prevent selection if copy is prevented
    if (preventCopy) {
      document.body.style.userSelect = "none"
    }

    // Cleanup
    return () => {
      document.removeEventListener("copy", handleCopy)
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("dragstart", handleDragStart)
      document.body.style.userSelect = ""
    }
  }, [preventCopy, preventPrint, preventScreenshot, preventRightClick, showProtectionWarning])

  return (
    <div className="drm-protected" data-protected="true">
      {children}
    </div>
  )
}
