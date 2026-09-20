import { describe, expect, it, beforeEach } from "vitest";
import {
  createGateSafeStorage,
  enablePersistWrites,
  resetPersistWritesForTests,
} from "@/lib/persist/storage";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    raw: map,
  };
}

describe("gate-safe persist storage", () => {
  beforeEach(() => {
    resetPersistWritesForTests();
  });

  it("does not write until rehydrate enables it", () => {
    const mem = memoryStorage();
    const previous = globalThis.window;
    (globalThis as { window?: unknown }).window = {
      localStorage: mem,
    };
    try {
      const storage = createGateSafeStorage();
      expect(storage).toBeDefined();
      storage!.setItem("k", { state: { wiped: true }, version: 1 });
      expect(mem.raw.get("k")).toBeUndefined();

      enablePersistWrites();
      storage!.setItem("k", { state: { kept: true }, version: 1 });
      expect(mem.raw.get("k")).toContain("kept");
    } finally {
      if (previous === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window?: unknown }).window = previous;
      }
    }
  });
});
