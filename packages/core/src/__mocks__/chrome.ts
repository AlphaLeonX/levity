const storage: Record<string, unknown> = {};
const listeners: Array<(changes: Record<string, unknown>, area: string) => void> = [];

export const chrome = {
  storage: {
    sync: {
      get: async (keys: string[] | Record<string, unknown>) => {
        if (Array.isArray(keys)) {
          const result: Record<string, unknown> = {};
          for (const key of keys) {
            if (key in storage) result[key] = storage[key];
          }
          return result;
        }
        const result: Record<string, unknown> = { ...keys };
        for (const key of Object.keys(keys)) {
          if (key in storage) result[key] = storage[key];
        }
        return result;
      },
      set: async (items: Record<string, unknown>) => {
        const changes: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(items)) {
          changes[key] = { oldValue: storage[key], newValue: value };
          storage[key] = value;
        }
        listeners.forEach((cb) => cb(changes, 'sync'));
      },
      getBytesInUse: async () => {
        return JSON.stringify(storage).length;
      },
      QUOTA_BYTES: 102400,
    },
    onChanged: {
      addListener: (cb: (changes: Record<string, unknown>, area: string) => void) => {
        listeners.push(cb);
      },
      removeListener: (cb: (changes: Record<string, unknown>, area: string) => void) => {
        const idx = listeners.indexOf(cb);
        if (idx > -1) listeners.splice(idx, 1);
      },
    },
  },
};

// Reset helper for tests
export function resetMockStorage() {
  for (const key of Object.keys(storage)) delete storage[key];
  listeners.length = 0;
}

// Expose globally
(globalThis as unknown as { chrome: typeof chrome }).chrome = chrome;
