// Network Status Management

export type NetworkStatus = "online" | "offline" | "slow"

export interface NetworkInfo {
  status: NetworkStatus
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g"
  downlink?: number
  rtt?: number
  saveData?: boolean
}

// Check if online
export function isOnline(): boolean {
  if (typeof window === "undefined") return true
  return navigator.onLine
}

// Get detailed network info
export function getNetworkInfo(): NetworkInfo {
  if (typeof window === "undefined") {
    return { status: "online" }
  }

  const info: NetworkInfo = {
    status: navigator.onLine ? "online" : "offline",
  }

  // Check Network Information API
  const connection = (navigator as Navigator & { 
    connection?: {
      effectiveType: string
      downlink: number
      rtt: number
      saveData: boolean
    }
  }).connection

  if (connection) {
    info.effectiveType = connection.effectiveType as NetworkInfo["effectiveType"]
    info.downlink = connection.downlink
    info.rtt = connection.rtt
    info.saveData = connection.saveData

    // Determine if connection is slow
    if (
      info.effectiveType === "slow-2g" ||
      info.effectiveType === "2g" ||
      info.rtt > 1000
    ) {
      info.status = "slow"
    }
  }

  return info
}

// Check connection quality
export function isSlowConnection(): boolean {
  const info = getNetworkInfo()
  return info.status === "slow" || info.effectiveType === "slow-2g" || info.effectiveType === "2g"
}

// Create network status observer
export function observeNetworkStatus(
  callback: (status: NetworkStatus) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {}
  }

  const handleOnline = () => callback("online")
  const handleOffline = () => callback("offline")

  window.addEventListener("online", handleOnline)
  window.addEventListener("offline", handleOffline)

  // Also observe connection changes
  const connection = (navigator as Navigator & { 
    connection?: EventTarget & {
      addEventListener: (type: string, listener: EventListener) => void
      removeEventListener: (type: string, listener: EventListener) => void
    }
  }).connection

  const handleConnectionChange = () => {
    const info = getNetworkInfo()
    callback(info.status)
  }

  if (connection) {
    connection.addEventListener("change", handleConnectionChange)
  }

  // Initial call
  callback(isOnline() ? "online" : "offline")

  // Cleanup function
  return () => {
    window.removeEventListener("online", handleOnline)
    window.removeEventListener("offline", handleOffline)
    if (connection) {
      connection.removeEventListener("change", handleConnectionChange)
    }
  }
}

// Wait for online
export function waitForOnline(): Promise<void> {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve()
      return
    }

    const handleOnline = () => {
      window.removeEventListener("online", handleOnline)
      resolve()
    }

    window.addEventListener("online", handleOnline)
  })
}
