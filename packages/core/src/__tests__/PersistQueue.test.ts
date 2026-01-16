import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PersistQueue } from '../PersistQueue';
import { resetMockStorage } from '../__mocks__/chrome';

describe('PersistQueue', () => {
  let queue: PersistQueue<{ notes: string[]; count: number }>;

  beforeEach(() => {
    vi.useFakeTimers();
    resetMockStorage();
    queue = new PersistQueue({
      debounce: 100,
      storageKey: 'test:state',
      metaKey: 'test:meta',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('queue', () => {
    it('does not write immediately', () => {
      queue.queue({ notes: ['a'] });
      expect(queue.hasPending()).toBe(true);
    });

    it('writes after debounce delay', async () => {
      queue.queue({ notes: ['a'] });
      vi.advanceTimersByTime(100);
      await queue.flush();
      const result = await chrome.storage.sync.get(['test:state']);
      expect(result['test:state']).toEqual({ notes: ['a'] });
    });

    it('merges multiple queued writes', async () => {
      queue.queue({ notes: ['a'] });
      queue.queue({ count: 5 });
      vi.advanceTimersByTime(100);
      await queue.flush();
      const result = await chrome.storage.sync.get(['test:state']);
      expect(result['test:state']).toEqual({ notes: ['a'], count: 5 });
    });
  });

  describe('flush', () => {
    it('clears pending data', async () => {
      queue.queue({ notes: ['b'] });
      await queue.flush();
      expect(queue.hasPending()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('calls onError callback on failure', async () => {
      const onError = vi.fn();
      const badQueue = new PersistQueue({
        debounce: 100,
        storageKey: 'test:state',
        metaKey: 'test:meta',
        onError,
        maxRetries: 3,
        retryDelay: 1000,
      });

      const originalSet = chrome.storage.sync.set;
      chrome.storage.sync.set = async () => {
        throw new Error('Storage full');
      };

      badQueue.queue({ notes: ['fail'] });
      const flushPromise = badQueue.flush();

      // Advance timers for retry delays (1000ms, 2000ms for attempts 2 and 3)
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await flushPromise;

      expect(onError).toHaveBeenCalled();
      chrome.storage.sync.set = originalSet;
    });
  });

  describe('retry logic', () => {
    it('retries failed writes up to 3 times', async () => {
      let attempts = 0;
      const originalSet = chrome.storage.sync.set;
      chrome.storage.sync.set = async (items) => {
        attempts++;
        if (attempts < 3) throw new Error('Temporary failure');
        return originalSet(items);
      };

      const retryQueue = new PersistQueue({
        debounce: 100,
        storageKey: 'test:state',
        metaKey: 'test:meta',
        maxRetries: 3,
        retryDelay: 1000,
      });

      retryQueue.queue({ notes: ['retry'] });
      const flushPromise = retryQueue.flush();

      // Advance timers for retry delays (1000ms after first failure, 2000ms after second)
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await flushPromise;

      expect(attempts).toBe(3);
      chrome.storage.sync.set = originalSet;
    });
  });
});
