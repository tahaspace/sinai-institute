// Push Notifications Management

export interface PushNotificationConfig {
  vapidPublicKey?: string
  onPermissionGranted?: () => void
  onPermissionDenied?: () => void
  onSubscriptionSuccess?: (subscription: PushSubscription) => void
  onSubscriptionError?: (error: Error) => void
}

export type PermissionState = "granted" | "denied" | "default" | "unsupported"

// Check if push notifications are supported
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

// Get current permission state
export function getPermissionState(): PermissionState {
  if (!isPushSupported()) return "unsupported"
  return Notification.permission as PermissionState
}

// Request notification permission
export async function requestPermission(): Promise<PermissionState> {
  if (!isPushSupported()) return "unsupported"

  try {
    const permission = await Notification.requestPermission()
    return permission as PermissionState
  } catch (error) {
    console.error("[Push] Permission request failed:", error)
    return "denied"
  }
}

// Subscribe to push notifications
export async function subscribeToPush(
  config: PushNotificationConfig = {}
): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.warn("[Push] Push notifications not supported")
    return null
  }

  try {
    const permission = await requestPermission()

    if (permission === "denied") {
      config.onPermissionDenied?.()
      return null
    }

    if (permission !== "granted") {
      return null
    }

    config.onPermissionGranted?.()

    const registration = await navigator.serviceWorker.ready

    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      console.log("[Push] Existing subscription found")
      return subscription
    }

    // Create new subscription
    const options: PushSubscriptionOptionsInit = {
      userVisibleOnly: true,
    }

    // Add VAPID key if provided
    if (config.vapidPublicKey) {
      options.applicationServerKey = urlBase64ToUint8Array(config.vapidPublicKey)
    }

    subscription = await registration.pushManager.subscribe(options)

    console.log("[Push] New subscription created")
    config.onSubscriptionSuccess?.(subscription)

    return subscription
  } catch (error) {
    console.error("[Push] Subscription failed:", error)
    config.onSubscriptionError?.(error as Error)
    return null
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      console.log("[Push] Unsubscribed successfully")
      return true
    }

    return false
  } catch (error) {
    console.error("[Push] Unsubscribe failed:", error)
    return false
  }
}

// Show local notification
export async function showNotification(
  title: string,
  options: NotificationOptions = {}
): Promise<void> {
  if (!isPushSupported()) return

  const permission = getPermissionState()
  if (permission !== "granted") {
    console.warn("[Push] Notification permission not granted")
    return
  }

  const registration = await navigator.serviceWorker.ready

  await registration.showNotification(title, {
    dir: "rtl",
    lang: "ar",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    vibrate: [100, 50, 100],
    ...options,
  })
}

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}
