import AsyncStorage from '@react-native-async-storage/async-storage';

const NS = 'kissmobile:';

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(NS + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    // Caching must never break the UI.
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(NS + key);
  } catch {}
}

export type TimedValue<T> = { at: number; value: T };

export async function loadCached<T>(
  key: string,
  ttlMs: number
): Promise<T | null> {
  const entry = await loadJson<TimedValue<T> | null>(key, null);
  if (!entry || !entry.at) return null;
  if (Date.now() - entry.at > ttlMs) return null;
  return entry.value;
}

export async function saveCached<T>(key: string, value: T): Promise<void> {
  await saveJson(key, { at: Date.now(), value });
}
