/// <reference types="chrome-types" />
/**
 * createStore - Main entry point for Levity
 */

import { StateManager } from './StateManager';
import { SyncEngine } from './SyncEngine';
import { PersistQueue } from './PersistQueue';
import type { Store, StoreOptions, QuotaInfo } from './types';

const STORAGE_KEY_PREFIX = 'levity';
const DEFAULT_DEBOUNCE = 300;
const DEFAULT_QUOTA_WARNING = 80;
const CHROME_SYNC_QUOTA = 102400; // ~100KB

/**
 * Create a synchronized store
 */
export function createStore<T extends Record<string, unknown>>(
  options: StoreOptions<T>
): Store<T> {
  const prefix = options.prefix ?? STORAGE_KEY_PREFIX;
  const storageKey = `${prefix}:state`;
  const metaKey = `${prefix}:meta`;
  const debounce = options.debounce ?? DEFAULT_DEBOUNCE;
  const quotaThreshold = options.quotaWarningThreshold ?? DEFAULT_QUOTA_WARNING;

  // Core components
  const stateManager = new StateManager<T>(options.initial);

  const persistQueue = new PersistQueue<T>({
    debounce,
    storageKey,
    metaKey,
  });

  const syncEngine = new SyncEngine<T>({
    stateManager,
    storageKey,
    metaKey,
    initial: options.initial,
    onConflict: options.onConflict,
  });

  let isReady = false;

  // Check quota and warn if needed
  async function checkQuota(): Promise<void> {
    if (!options.onQuotaWarning) return;

    try {
      const quota = await getQuota();
      if (quota.percent >= quotaThreshold) {
        options.onQuotaWarning(quota);
      }
    } catch {
      // Ignore quota check errors
    }
  }

  // Get quota information
  async function getQuota(): Promise<QuotaInfo> {
    const used = await chrome.storage.sync.getBytesInUse();
    const total = CHROME_SYNC_QUOTA;
    return {
      used,
      total,
      percent: Math.round((used / total) * 100 * 10) / 10,
    };
  }

  // Initialize: load from storage
  async function init(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get([storageKey]);
      const storedState = result[storageKey] as T | undefined;

      if (storedState) {
        // Merge stored state with initial (to handle new keys)
        const merged = { ...options.initial, ...storedState };
        stateManager.replaceState(merged, 'remote');
      }

      // Start listening for remote changes
      syncEngine.start();
      isReady = true;

      // Check quota after init
      await checkQuota();
    } catch (error) {
      console.error('[Levity] Init error:', error);
      // Still mark as ready with initial state
      isReady = true;
    }
  }

  // The store interface
  const store: Store<T> = {
    get<K extends keyof T>(key: K): T[K] {
      return stateManager.get(key);
    },

    getAll(): T {
      return stateManager.getAll();
    },

    async set<K extends keyof T>(key: K, value: T[K]): Promise<void> {
      // Update in-memory state
      stateManager.update(key, value, 'local');
      syncEngine.updateLocalMeta();

      // Queue for persistence
      syncEngine.markLocalWrite();
      persistQueue.queue({ [key]: value } as unknown as Partial<T>);
      await persistQueue.flush();

      // Check quota
      await checkQuota();
    },

    async setAll(partial: Partial<T>): Promise<void> {
      // Update in-memory state
      stateManager.updateMultiple(partial, 'local');
      syncEngine.updateLocalMeta();

      // Queue for persistence
      syncEngine.markLocalWrite();
      persistQueue.queue(partial);
      await persistQueue.flush();

      // Check quota
      await checkQuota();
    },

    subscribe<K extends keyof T>(key: K, callback: (value: T[K], source: 'local' | 'remote') => void) {
      return stateManager.subscribe(key, callback);
    },

    subscribeAll(callback) {
      return stateManager.subscribeAll(callback);
    },

    getQuota,

    init,

    isReady(): boolean {
      return isReady;
    },
  };

  return store;
}
