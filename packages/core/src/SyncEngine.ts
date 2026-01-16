/// <reference types="chrome-types" />
/**
 * SyncEngine - Handles remote sync via chrome.storage.onChanged
 */

import type { StateManager } from './StateManager';
import type { ConflictContext, StorageChange, StoreMeta } from './types';

export interface SyncEngineOptions<T extends Record<string, unknown>> {
  stateManager: StateManager<T>;
  storageKey: string;
  metaKey: string;
  initial: T;
  onConflict?: <K extends keyof T>(context: ConflictContext<T[K]>) => T[K];
}

export class SyncEngine<T extends Record<string, unknown>> {
  private options: SyncEngineOptions<T>;
  private localMeta: StoreMeta = { version: 1, updatedAt: 0 };
  private isApplyingRemote = false;
  private listener: ((changes: Record<string, StorageChange>, areaName: string) => void) | null = null;

  constructor(options: SyncEngineOptions<T>) {
    this.options = options;
  }

  /** Start listening for remote changes */
  start(): void {
    if (this.listener) return;

    this.listener = (changes, areaName) => {
      if (areaName !== 'sync') return;

      const stateChange = changes[this.options.storageKey];
      if (stateChange && !this.isApplyingRemote) {
        this.handleRemoteChange(stateChange);
      }
    };

    chrome.storage.onChanged.addListener(this.listener);
  }

  /** Stop listening for remote changes */
  stop(): void {
    if (this.listener) {
      chrome.storage.onChanged.removeListener(this.listener);
      this.listener = null;
    }
  }

  /** Mark that we're about to write locally (prevents echo) */
  markLocalWrite(): void {
    this.isApplyingRemote = true;
    // Reset after a short delay
    setTimeout(() => {
      this.isApplyingRemote = false;
    }, 1000);
  }

  /** Update local metadata timestamp */
  updateLocalMeta(): void {
    this.localMeta.updatedAt = Date.now();
  }

  /** Handle incoming remote changes */
  private handleRemoteChange(change: StorageChange<T>): void {
    if (!change.newValue) return;

    const remoteState = change.newValue;
    const localState = this.options.stateManager.getAll();

    // Resolve conflicts and merge
    const resolvedState = this.resolveConflicts(localState, remoteState);

    // Apply to state manager
    this.isApplyingRemote = true;
    try {
      this.options.stateManager.replaceState(resolvedState, 'remote');
    } finally {
      setTimeout(() => {
        this.isApplyingRemote = false;
      }, 100);
    }
  }

  /** Resolve conflicts between local and remote state */
  private resolveConflicts(local: T, remote: T): T {
    if (!this.options.onConflict) {
      // Default: Last-Write-Wins (remote wins since it's newer)
      return { ...local, ...remote };
    }

    const resolved: Partial<T> = {};
    const allKeys = new Set([
      ...Object.keys(local),
      ...Object.keys(remote),
    ]) as Set<keyof T>;

    for (const key of allKeys) {
      const localValue = local[key];
      const remoteValue = remote[key];

      if (localValue === undefined) {
        resolved[key] = remoteValue;
      } else if (remoteValue === undefined) {
        resolved[key] = localValue;
      } else if (Object.is(localValue, remoteValue)) {
        resolved[key] = localValue;
      } else {
        // Conflict - let user decide
        const context: ConflictContext<T[keyof T]> = {
          local: localValue,
          remote: remoteValue,
          key: key as string,
          localUpdatedAt: this.localMeta.updatedAt,
          remoteUpdatedAt: Date.now(),
        };
        resolved[key] = this.options.onConflict(context);
      }
    }

    return resolved as T;
  }
}
