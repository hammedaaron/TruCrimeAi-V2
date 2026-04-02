import { get, set, del } from 'idb-keyval';

export const storage = {
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await get(key);
      if (value === undefined) return null;
      return value as T;
    } catch (e) {
      console.error(`Failed to get item ${key} from IndexedDB`, e);
      // Fallback to localStorage if IndexedDB fails
      const localValue = localStorage.getItem(key);
      if (localValue) {
        try {
          return JSON.parse(localValue) as T;
        } catch (err) {
          return null;
        }
      }
      return null;
    }
  },

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await set(key, value);
    } catch (e) {
      console.error(`Failed to set item ${key} in IndexedDB`, e);
      // Fallback to localStorage, but handle QuotaExceededError
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        console.warn(`LocalStorage also failed for ${key}`, err);
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await del(key);
    } catch (e) {
      console.error(`Failed to remove item ${key} from IndexedDB`, e);
    }
    localStorage.removeItem(key);
  }
};
