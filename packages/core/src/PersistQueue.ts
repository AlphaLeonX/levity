/// <reference types="chrome-types" />
/**
 * PersistQueue - Debounced persistence to Chrome Storage
 */

export interface PersistQueueOptions {
  debounce: number;
  storageKey: string;
  metaKey: string;
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
}

export class PersistQueue<T extends Record<string, unknown>> {
  private pendingData: Partial<T> | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private isFlushing = false;
  private options: Required<Omit<PersistQueueOptions, 'onError'>> & Pick<PersistQueueOptions, 'onError'>;

  constructor(options: PersistQueueOptions) {
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      ...options,
    };
  }

  queue(data: Partial<T>): void {
    this.pendingData = {
      ...this.pendingData,
      ...data,
    } as Partial<T>;

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.flush();
    }, this.options.debounce);
  }

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

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.options.maxRetries; attempt++) {
      try {
        const result = await chrome.storage.sync.get([this.options.storageKey]);
        const currentState = (result[this.options.storageKey] as T) || {};

        const newState = {
          ...currentState,
          ...dataToWrite,
        };

        await chrome.storage.sync.set({
          [this.options.storageKey]: newState,
          [this.options.metaKey]: {
            version: 1,
            updatedAt: Date.now(),
          },
        });

        this.isFlushing = false;
        return; // Success
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.options.maxRetries - 1) {
          await this.delay(this.options.retryDelay * (attempt + 1));
        }
      }
    }

    // All retries failed
    this.pendingData = {
      ...dataToWrite,
      ...this.pendingData,
    } as Partial<T>;

    if (this.options.onError) {
      this.options.onError(lastError!);
    } else {
      console.error('[Levity] Persist error after retries:', lastError);
    }

    this.isFlushing = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  hasPending(): boolean {
    return this.pendingData !== null;
  }

  isBusy(): boolean {
    return this.isFlushing;
  }
}
