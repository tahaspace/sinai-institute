// Service Worker Registration

export interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void
  onSuccess?: (registration: ServiceWorkerRegistration) => void
  onError?: (error: Error) => void
}

export async function registerServiceWorker(
  config: ServiceWorkerConfig = {}
): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.log("[PWA] Service Worker not supported")
    return undefined
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    })

    console.log("[PWA] Service Worker registered:", registration.scope)

    // Check for updates on registration
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing

      if (!newWorker) return

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed") {
          if (navigator.serviceWorker.controller) {
            // New update available
            console.log("[PWA] New content available, refresh to update")
            config.onUpdate?.(registration)
          } else {
            // Content cached for offline use
            console.log("[PWA] Content cached for offline use")
            config.onSuccess?.(registration)
          }
        }
      })
    })

    // Handle controller change (refresh after update)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log("[PWA] Controller changed, reloading...")
      window.location.reload()
    })

    return registration
  } catch (error) {
    console.error("[PWA] Service Worker registration failed:", error)
    config.onError?.(error as Error)
    return undefined
  }
}

export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const success = await registration.unregister()
    console.log("[PWA] Service Worker unregistered:", success)
    return success
  } catch (error) {
    console.error("[PWA] Service Worker unregistration failed:", error)
    return false
  }
}

export function skipWaiting(): void {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" })
  }
}

export function clearCache(): void {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "CLEAR_CACHE" })
  }
}
