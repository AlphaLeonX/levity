/// <reference types="chrome-types" />
/**
 * PersistQueue - Debounced persistence to Chrome Storage
 */

export interface PersistQueueOptions {
  debounce: number;
  storageKey: string;
  metaKey: string;
  onError?: (error: Error) => void;
}

export class PersistQueue<T extends Record<string, unknown>> {
  private pendingData: Partial<T> | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private isFlushing = false;
  private options: PersistQueueOptions;

  constructor(options: PersistQueueOptions) {
    this.options = options;
  }

  /** Queue data for persistence */
  queue(data: Partial<T>): void {
    // Merge with pending data
    this.pendingData = {
      ...this.pendingData,
      ...data,
    } as Partial<T>;

    // Reset debounce timer
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.flush();
    }, this.options.debounce);
  }

  /** Immediately flush pending data */
  async flush(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (!this.pendingData || this.isFlushing) {
      return;
    }

    this.isFlushing = true;
    const dataToWrite = this.pendingData;
    this.pendingData = null;

    try {
      // Get current state from storage
      const result = await chrome.storage.sync.get([this.options.storageKey]);
      const currentState = (result[this.options.storageKey] as T) || {};

      // Merge with pending changes
      const newState = {
        ...currentState,
        ...dataToWrite,
      };

      // Write back to storage
      await chrome.storage.sync.set({
        [this.options.storageKey]: newState,
        [this.options.metaKey]: {
          version: 1,
          updatedAt: Date.now(),
        },
      });
    } catch (error) {
      // Put data back for retry
      this.pendingData = {
        ...dataToWrite,
        ...this.pendingData,
      } as Partial<T>;

      if (this.options.onError) {
        this.options.onError(error as Error);
      } else {
        console.error('[Levity] Persist error:', error);
      }
    } finally {
      this.isFlushing = false;
    }
  }

  /** Check if there's pending data */
  hasPending(): boolean {
    return this.pendingData !== null;
  }

  /** Get flush status */
  isBusy(): boolean {
    return this.isFlushing;
  }
}
