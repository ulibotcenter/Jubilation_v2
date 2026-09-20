import { createJSONStorage, type PersistStorage } from "zustand/middleware";

/**
 * Writes are blocked until the first rehydrate finishes. Otherwise a
 * mount-time set() (theme, nav) can persist the in-memory defaults and
 * wipe a completed gate / cleared seed.
 */
let persistWritesEnabled = false;

export function enablePersistWrites(): void {
  persistWritesEnabled = true;
}

export function resetPersistWritesForTests(): void {
  persistWritesEnabled = false;
}

export function createGateSafeStorage(): PersistStorage<unknown> | undefined {
  if (typeof window === "undefined") return undefined;
  const inner = createJSONStorage(() => window.localStorage);
  if (!inner) return undefined;
  return {
    getItem: (name) => inner.getItem(name),
    setItem: (name, value) => {
      if (!persistWritesEnabled) return;
      return inner.setItem(name, value);
    },
    removeItem: (name) => inner.removeItem(name),
  };
}
