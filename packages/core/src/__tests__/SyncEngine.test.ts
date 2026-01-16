import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncEngine } from '../SyncEngine';
import { StateManager } from '../StateManager';
import { resetMockStorage } from '../__mocks__/chrome';

describe('SyncEngine', () => {
  let stateManager: StateManager<{ notes: string[]; count: number }>;
  let syncEngine: SyncEngine<{ notes: string[]; count: number }>;

  beforeEach(() => {
    vi.useFakeTimers();
    resetMockStorage();
    stateManager = new StateManager({ notes: [], count: 0 });
    syncEngine = new SyncEngine({
      stateManager,
      storageKey: 'test:state',
      metaKey: 'test:meta',
      initial: { notes: [], count: 0 },
    });
  });

  afterEach(() => {
    syncEngine.stop();
    vi.useRealTimers();
  });

  describe('start/stop', () => {
    it('starts listening for changes', () => {
      syncEngine.start();
      // No error means success
    });

    it('stops listening for changes', () => {
      syncEngine.start();
      syncEngine.stop();
      // No error means success
    });
  });

  describe('remote changes', () => {
    it('updates state when remote changes detected', async () => {
      syncEngine.start();

      // Simulate remote change
      await chrome.storage.sync.set({
        'test:state': { notes: ['remote note'], count: 5 },
      });

      vi.advanceTimersByTime(200);

      expect(stateManager.get('notes')).toEqual(['remote note']);
      expect(stateManager.get('count')).toBe(5);
    });
  });

  describe('conflict resolution', () => {
    it('uses custom conflict resolver', async () => {
      const customEngine = new SyncEngine({
        stateManager,
        storageKey: 'test:state',
        metaKey: 'test:meta',
        initial: { notes: [], count: 0 },
        onConflict: ({ local }) => local, // Always keep local
      });

      stateManager.update('count', 10, 'local');
      customEngine.start();

      await chrome.storage.sync.set({
        'test:state': { notes: [], count: 99 },
      });

      vi.advanceTimersByTime(200);

      expect(stateManager.get('count')).toBe(10); // Local wins
      customEngine.stop();
    });
  });
});
