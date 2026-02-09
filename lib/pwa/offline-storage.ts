// Offline Storage Management using IndexedDB

const DB_NAME = "edusaas-offline"
const DB_VERSION = 1

interface OfflineRecord<T = unknown> {
  id: string
  data: T
  timestamp: number
  syncStatus: "pending" | "synced" | "failed"
  action: "create" | "update" | "delete"
  endpoint: string
}

// Open IndexedDB database
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB not supported"))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create stores
      if (!db.objectStoreNames.contains("pending-sync")) {
        const syncStore = db.createObjectStore("pending-sync", { keyPath: "id" })
        syncStore.createIndex("syncStatus", "syncStatus", { unique: false })
        syncStore.createIndex("timestamp", "timestamp", { unique: false })
        syncStore.createIndex("endpoint", "endpoint", { unique: false })
      }

      if (!db.objectStoreNames.contains("cached-data")) {
        const cacheStore = db.createObjectStore("cached-data", { keyPath: "key" })
        cacheStore.createIndex("timestamp", "timestamp", { unique: false })
      }

      if (!db.objectStoreNames.contains("user-data")) {
        db.createObjectStore("user-data", { keyPath: "key" })
      }
    }
  })
}

// Store data for offline sync
export async function storeForSync<T>(
  id: string,
  data: T,
  endpoint: string,
  action: "create" | "update" | "delete" = "create"
): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("pending-sync", "readwrite")
    const store = transaction.objectStore("pending-sync")

    const record: OfflineRecord<T> = {
      id,
      data,
      timestamp: Date.now(),
      syncStatus: "pending",
      action,
      endpoint,
    }

    const request = store.put(record)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// Get all pending sync records
export async function getPendingSync(): Promise<OfflineRecord[]> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("pending-sync", "readonly")
    const store = transaction.objectStore("pending-sync")
    const index = store.index("syncStatus")

    const request = index.getAll("pending")

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

// Update sync status
export async function updateSyncStatus(
  id: string,
  status: "synced" | "failed"
): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("pending-sync", "readwrite")
    const store = transaction.objectStore("pending-sync")

    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const record = getRequest.result
      if (record) {
        record.syncStatus = status
        store.put(record)
      }
      resolve()
    }

    getRequest.onerror = () => reject(getRequest.error)
  })
}

// Clear synced records
export async function clearSyncedRecords(): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("pending-sync", "readwrite")
    const store = transaction.objectStore("pending-sync")
    const index = store.index("syncStatus")

    const request = index.openCursor("synced")

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result as IDBCursorWithValue
      if (cursor) {
        cursor.delete()
        cursor.continue()
      } else {
        resolve()
      }
    }

    request.onerror = () => reject(request.error)
  })
}

// Cache data locally
export async function cacheData<T>(key: string, data: T): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("cached-data", "readwrite")
    const store = transaction.objectStore("cached-data")

    const record = {
      key,
      data,
      timestamp: Date.now(),
    }

    const request = store.put(record)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// Get cached data
export async function getCachedData<T>(key: string): Promise<T | null> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("cached-data", "readonly")
    const store = transaction.objectStore("cached-data")

    const request = store.get(key)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const record = request.result
      resolve(record ? record.data : null)
    }
  })
}

// Clear old cached data
export async function clearOldCache(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
  const db = await openDatabase()
  const cutoff = Date.now() - maxAge

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("cached-data", "readwrite")
    const store = transaction.objectStore("cached-data")
    const index = store.index("timestamp")

    const range = IDBKeyRange.upperBound(cutoff)
    const request = index.openCursor(range)

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result as IDBCursorWithValue
      if (cursor) {
        cursor.delete()
        cursor.continue()
      } else {
        resolve()
      }
    }

    request.onerror = () => reject(request.error)
  })
}

// Store user preferences
export async function setUserData<T>(key: string, data: T): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("user-data", "readwrite")
    const store = transaction.objectStore("user-data")

    const request = store.put({ key, data })

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// Get user preferences
export async function getUserData<T>(key: string): Promise<T | null> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("user-data", "readonly")
    const store = transaction.objectStore("user-data")

    const request = store.get(key)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const record = request.result
      resolve(record ? record.data : null)
    }
  })
}
