import AsyncStorage from "@react-native-async-storage/async-storage"

const memory = new Map<string, string>()

export const storage = {
  getString: (key: string): string | undefined => memory.get(key),
  getNumber: (key: string): number | undefined => {
    const value = memory.get(key)
    if (value == null) return undefined
    const parsed = Number(value)
    return Number.isNaN(parsed) ? undefined : parsed
  },
  set: (key: string, value: string | number | boolean): void => {
    const stringValue = String(value)
    memory.set(key, stringValue)
    void AsyncStorage.setItem(key, stringValue)
  },
  delete: (key: string): void => {
    memory.delete(key)
    void AsyncStorage.removeItem(key)
  },
  clearAll: (): void => {
    memory.clear()
    void AsyncStorage.clear()
  },
  getAllKeys: (): string[] => Array.from(memory.keys()),
}

export async function hydrateStorage(keys: string[]): Promise<void> {
  const values = await AsyncStorage.multiGet(keys)
  values.forEach(([key, value]) => {
    if (value != null) memory.set(key, value)
  })
}

/**
 * Loads a string from storage.
 *
 * @param key The key to fetch.
 */
export async function loadString(key: string): Promise<string | null> {
  const memoryValue = storage.getString(key)
  if (memoryValue != null) return memoryValue
  const value = await AsyncStorage.getItem(key)
  if (value != null) memory.set(key, value)
  return value
}

/**
 * Saves a string to storage.
 *
 * @param key The key to fetch.
 * @param value The value to store.
 */
export function saveString(key: string, value: string): boolean {
  try {
    storage.set(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * Loads something from storage and runs it thru JSON.parse.
 *
 * @param key The key to fetch.
 */
export async function load<T>(key: string): Promise<T | null> {
  const almostThere = await loadString(key)
  if (almostThere == null) return null
  try {
    return JSON.parse(almostThere) as T
  } catch {
    return almostThere as T
  }
}

/**
 * Saves an object to storage.
 *
 * @param key The key to fetch.
 * @param value The value to store.
 */
export function save(key: string, value: unknown): boolean {
  try {
    saveString(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/**
 * Removes something from storage.
 *
 * @param key The key to kill.
 */
export function remove(key: string): void {
  storage.delete(key)
}

/**
 * Burn it all to the ground.
 */
export function clear(): void {
  storage.clearAll()
}
