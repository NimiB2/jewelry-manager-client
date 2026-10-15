// Keeps the receipts that are not saved yet (a missing amount, a suspected duplicate) on this device,
// files included, so closing the screen does not lose them. Best effort: if the browser blocks
// IndexedDB the screen simply works without it.
const DB_NAME = 'receipts-import'
const STORE = 'pending'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'key' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function loadStash<T>(): Promise<T[]> {
  try {
    const db = await open()
    return await new Promise<T[]>((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).getAll()
      request.onsuccess = () => resolve(request.result as T[])
      request.onerror = () => reject(request.error)
    })
  } catch {
    return []
  }
}

// Replaces the stored list with exactly these rows.
export async function saveStash<T extends { key: string }>(rows: T[]): Promise<void> {
  try {
    const db = await open()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      store.clear()
      rows.forEach((row) => store.put(row))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // The list still works in memory.
  }
}
