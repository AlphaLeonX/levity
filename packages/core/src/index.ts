/**
 * Levity - Lightweight cross-device sync library
 *
 * @example
 * ```typescript
 * import { createStore } from 'levity';
 *
 * const store = createStore({
 *   initial: {
 *     notes: [] as Note[],
 *     activeId: null as string | null,
 *   }
 * });
 *
 * await store.init();
 * await store.set('notes', [...]);
 * store.subscribe('notes', (notes, source) => {
 *   console.log('Notes updated from:', source);
 * });
 * ```
 */

export { createStore } from './createStore';

export type {
  Store,
  StoreOptions,
  ChangeSource,
  QuotaInfo,
  ConflictContext,
  KeySubscriber,
  AllSubscriber,
  Unsubscribe,
} from './types';
