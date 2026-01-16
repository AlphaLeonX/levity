/**
 * StateManager - In-memory state management with subscriptions
 */

import type { ChangeSource, KeySubscriber, AllSubscriber, Unsubscribe } from './types';

export class StateManager<T extends Record<string, unknown>> {
  private state: T;
  private keySubscribers: Map<keyof T, Set<KeySubscriber<unknown>>> = new Map();
  private allSubscribers: Set<AllSubscriber<T>> = new Set();

  constructor(initial: T) {
    this.state = { ...initial };
  }

  /** Get a single value */
  get<K extends keyof T>(key: K): T[K] {
    return this.state[key];
  }

  /** Get entire state */
  getAll(): T {
    return { ...this.state };
  }

  /** Update a single value and notify subscribers */
  update<K extends keyof T>(key: K, value: T[K], source: ChangeSource): void {
    const oldValue = this.state[key];
    if (Object.is(oldValue, value)) return;

    this.state[key] = value;
    this.notifyKey(key, value, source);
    this.notifyAll([key], source);
  }

  /** Update multiple values and notify subscribers */
  updateMultiple(partial: Partial<T>, source: ChangeSource): void {
    const changedKeys: (keyof T)[] = [];

    for (const key of Object.keys(partial) as (keyof T)[]) {
      const value = partial[key] as T[keyof T];
      if (!Object.is(this.state[key], value)) {
        this.state[key] = value;
        changedKeys.push(key);
        this.notifyKey(key, value, source);
      }
    }

    if (changedKeys.length > 0) {
      this.notifyAll(changedKeys, source);
    }
  }

  /** Replace entire state (used for remote sync) */
  replaceState(newState: T, source: ChangeSource): (keyof T)[] {
    const changedKeys: (keyof T)[] = [];

    for (const key of Object.keys(newState) as (keyof T)[]) {
      if (!Object.is(this.state[key], newState[key])) {
        changedKeys.push(key);
      }
    }

    this.state = { ...newState };

    for (const key of changedKeys) {
      this.notifyKey(key, this.state[key], source);
    }

    if (changedKeys.length > 0) {
      this.notifyAll(changedKeys, source);
    }

    return changedKeys;
  }

  /** Subscribe to a specific key */
  subscribe<K extends keyof T>(key: K, callback: KeySubscriber<T[K]>): Unsubscribe {
    if (!this.keySubscribers.has(key)) {
      this.keySubscribers.set(key, new Set());
    }
    this.keySubscribers.get(key)!.add(callback as KeySubscriber<unknown>);

    return () => {
      this.keySubscribers.get(key)?.delete(callback as KeySubscriber<unknown>);
    };
  }

  /** Subscribe to all changes */
  subscribeAll(callback: AllSubscriber<T>): Unsubscribe {
    this.allSubscribers.add(callback);
    return () => {
      this.allSubscribers.delete(callback);
    };
  }

  private notifyKey<K extends keyof T>(key: K, value: T[K], source: ChangeSource): void {
    const subscribers = this.keySubscribers.get(key);
    if (subscribers) {
      for (const callback of subscribers) {
        try {
          callback(value, source);
        } catch (e) {
          console.error('[Levity] Subscriber error:', e);
        }
      }
    }
  }

  private notifyAll(changedKeys: (keyof T)[], source: ChangeSource): void {
    for (const callback of this.allSubscribers) {
      try {
        callback(this.getAll(), changedKeys, source);
      } catch (e) {
        console.error('[Levity] Subscriber error:', e);
      }
    }
  }
}
