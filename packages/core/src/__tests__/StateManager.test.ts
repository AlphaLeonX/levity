import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateManager } from '../StateManager';

describe('StateManager', () => {
  let manager: StateManager<{ count: number; name: string }>;

  beforeEach(() => {
    manager = new StateManager({ count: 0, name: 'test' });
  });

  describe('get', () => {
    it('returns initial value', () => {
      expect(manager.get('count')).toBe(0);
      expect(manager.get('name')).toBe('test');
    });
  });

  describe('getAll', () => {
    it('returns copy of state', () => {
      const state = manager.getAll();
      expect(state).toEqual({ count: 0, name: 'test' });
      state.count = 999;
      expect(manager.get('count')).toBe(0);
    });
  });

  describe('update', () => {
    it('updates single key', () => {
      manager.update('count', 5, 'local');
      expect(manager.get('count')).toBe(5);
    });

    it('notifies key subscribers', () => {
      const callback = vi.fn();
      manager.subscribe('count', callback);
      manager.update('count', 10, 'local');
      expect(callback).toHaveBeenCalledWith(10, 'local');
    });

    it('does not notify if value unchanged', () => {
      const callback = vi.fn();
      manager.subscribe('count', callback);
      manager.update('count', 0, 'local');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('updateMultiple', () => {
    it('updates multiple keys', () => {
      manager.updateMultiple({ count: 5, name: 'updated' }, 'remote');
      expect(manager.get('count')).toBe(5);
      expect(manager.get('name')).toBe('updated');
    });
  });

  describe('subscribe', () => {
    it('returns unsubscribe function', () => {
      const callback = vi.fn();
      const unsub = manager.subscribe('count', callback);
      manager.update('count', 1, 'local');
      expect(callback).toHaveBeenCalledTimes(1);
      unsub();
      manager.update('count', 2, 'local');
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribeAll', () => {
    it('notifies on any change', () => {
      const callback = vi.fn();
      manager.subscribeAll(callback);
      manager.update('count', 1, 'local');
      expect(callback).toHaveBeenCalledWith(
        { count: 1, name: 'test' },
        ['count'],
        'local'
      );
    });
  });

  describe('replaceState', () => {
    it('replaces entire state', () => {
      const changed = manager.replaceState({ count: 99, name: 'new' }, 'remote');
      expect(changed).toEqual(['count', 'name']);
      expect(manager.getAll()).toEqual({ count: 99, name: 'new' });
    });
  });
});
