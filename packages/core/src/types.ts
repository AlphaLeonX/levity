/**
 * Levity - Lightweight cross-device sync library
 * Type definitions
 */

/** Source of a state change */
export type ChangeSource = 'local' | 'remote';

/** Quota information */
export interface QuotaInfo {
  used: number;
  total: number;
  percent: number;
}

/** Conflict resolution context */
export interface ConflictContext<T> {
  local: T;
  remote: T;
  key: string;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
}

/** Store configuration options */
export interface StoreOptions<T extends Record<string, unknown>> {
  /** Initial state values with types */
  initial: T;

  /** Storage key prefix (default: 'levity') */
  prefix?: string;

  /** Debounce delay for writes in ms (default: 300) */
  debounce?: number;

  /** Custom conflict resolution handler */
  onConflict?: <K extends keyof T>(
    context: ConflictContext<T[K]>
  ) => T[K];

  /** Quota warning callback */
  onQuotaWarning?: (quota: QuotaInfo) => void;

  /** Quota warning threshold percentage (default: 80) */
  quotaWarningThreshold?: number;
}

/** Subscriber callback for single key */
export type KeySubscriber<T> = (value: T, source: ChangeSource) => void;

/** Subscriber callback for all changes */
export type AllSubscriber<T> = (
  state: T,
  changedKeys: (keyof T)[],
  source: ChangeSource
) => void;

/** Unsubscribe function */
export type Unsubscribe = () => void;

/** The store interface returned by createStore */
export interface Store<T extends Record<string, unknown>> {
  /** Get a single value by key */
  get<K extends keyof T>(key: K): T[K];

  /** Get all state values */
  getAll(): T;

  /** Set a single value by key */
  set<K extends keyof T>(key: K, value: T[K]): Promise<void>;

  /** Set multiple values at once */
  setAll(partial: Partial<T>): Promise<void>;

  /** Subscribe to changes on a specific key */
  subscribe<K extends keyof T>(
    key: K,
    callback: KeySubscriber<T[K]>
  ): Unsubscribe;

  /** Subscribe to all state changes */
  subscribeAll(callback: AllSubscriber<T>): Unsubscribe;

  /** Get storage quota information */
  getQuota(): Promise<QuotaInfo>;

  /** Initialize store (loads from storage) */
  init(): Promise<void>;

  /** Check if store is ready */
  isReady(): boolean;
}

/** Internal metadata stored alongside state */
export interface StoreMeta {
  version: number;
  updatedAt: number;
}

/** Chrome storage change event */
export interface StorageChange<T = unknown> {
  oldValue?: T;
  newValue?: T;
}

/** Chrome storage API interface (subset we use) */
export interface ChromeStorageSync {
  get(keys: string[] | Record<string, unknown>): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  getBytesInUse(keys?: string[] | null): Promise<number>;
  QUOTA_BYTES: number;
}

export interface ChromeStorageOnChanged {
  addListener(
    callback: (
      changes: Record<string, StorageChange>,
      areaName: string
    ) => void
  ): void;
  removeListener(
    callback: (
      changes: Record<string, StorageChange>,
      areaName: string
    ) => void
  ): void;
}
