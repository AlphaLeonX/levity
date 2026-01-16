import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStore } from '../createStore';
import { resetMockStorage } from '../__mocks__/chrome';

interface TestState {
  notes: string[];
  activeId: string | null;
}

describe('createStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetMockStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('creates store with initial state', async () => {
      const store = createStore<TestState>({
        initial: { notes: [], activeId: null },
      });

      await store.init();

      expect(store.get('notes')).toEqual([]);
      expect(store.get('activeId')).toBeNull();
      expect(store.isReady()).toBe(true);
    });

    it('loads existing data from storage', async () => {
      await chrome.storage.sync.set({
        'levity:state': { notes: ['existing'], activeId: '1' },
      });

      const store = createStore<TestState>({
        initial: { notes: [], activeId: null },
      });

      await store.init();

      expect(store.get('notes')).toEqual(['existing']);
      expect(store.get('activeId')).toBe('1');
    });
  });

  describe('get/set', () => {
    it('sets and gets values', async () => {
      const store = createStore<TestState>({
        initial: { notes: [], activeId: null },
      });
      await store.init();

      await store.set('notes', ['a', 'b']);
      expect(store.get('notes')).toEqual(['a', 'b']);
    });

    it('persists to storage', async () => {
      const store = createStore<TestState>({
        initial: { notes: [], activeId: null },
      });
      await store.init();

      await store.set('notes', ['persisted']);
      vi.advanceTimersByTime(500);

      const result = await chrome.storage.sync.get(['levity:state']);
      expect((result['levity:state'] as TestState).notes).toEqual(['persisted']);
    });
  });

  describe('setAll', () => {
    it('sets multiple values', async () => {
      const store = createStore<TestState>({
        initial: { notes: [], activeId: null },
      });
      await store.init();

      await store.setAll({ notes: ['x'], activeId: 'x1' });

      expect(store.get('notes')).toEqual(['x']);
      expect(store.get('activeId')).toBe('x1');
    });
  });

  describe('subscribe', () => {
    it('notifies on local changes', async () => {
      const store = createStore<TestState>({
        initial: { notes: [], activeId: null },
      });
      await store.init();

      const callback = vi.fn();
      store.subscribe('notes', callback);

      await store.set('notes', ['new']);

      expect(callback).toHaveBeenCalledWith(['new'], 'local');
    });
  });

  describe('getQuota', () => {
    it('returns quota info', async () => {
      const store = createStore<TestState>({
        initial: { notes: [], activeId: null },
      });
      await store.init();

      const quota = await store.getQuota();

      expect(quota).toHaveProperty('used');
      expect(quota).toHaveProperty('total');
      expect(quota).toHaveProperty('percent');
    });
  });

  describe('custom prefix', () => {
    it('uses custom storage prefix', async () => {
      const store = createStore<TestState>({
        initial: { notes: [], activeId: null },
        prefix: 'myapp',
      });
      await store.init();

      await store.set('notes', ['custom']);
      vi.advanceTimersByTime(500);

      const result = await chrome.storage.sync.get(['myapp:state']);
      expect(result['myapp:state']).toBeDefined();
    });
  });
});
