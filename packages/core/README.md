# levity

Cross-device sync for Chrome extensions. No backend required.

```bash
npm install levity
```

## Usage

```typescript
import { createStore } from 'levity';

const store = createStore({
  initial: {
    notes: [] as Note[],
    activeId: null as string | null,
  },
});

await store.init();

// read
store.get('notes');
store.getAll();

// write
await store.set('notes', [...]);
await store.setAll({ notes: [...], activeId: '1' });

// subscribe
store.subscribe('notes', (value, source) => {
  // source: 'local' | 'remote'
});
```

## API

### createStore(options)

```typescript
const store = createStore({
  initial: { ... },        // required
  prefix: 'levity',        // storage key prefix
  debounce: 300,           // write delay in ms
  onConflict: (ctx) => {}, // conflict resolver
  onQuotaWarning: (q) => {},
  quotaWarningThreshold: 80,
});
```

### store.get(key)

Returns the value for `key`.

### store.getAll()

Returns the entire state object.

### store.set(key, value)

Sets a single key. Returns a promise.

### store.setAll(partial)

Sets multiple keys. Returns a promise.

### store.subscribe(key, callback)

Subscribes to changes on `key`. Callback receives `(value, source)` where source is `'local'` or `'remote'`.

Returns an unsubscribe function.

### store.subscribeAll(callback)

Subscribes to all changes. Callback receives `(state, changedKeys, source)`.

### store.init()

Loads state from storage and starts sync. Call this before reading/writing.

### store.isReady()

Returns `true` if init has completed.

### store.getQuota()

Returns storage usage:

```typescript
{ used: number, total: number, percent: number }
```

## Conflict Resolution

Default behavior is last-write-wins. To customize:

```typescript
createStore({
  initial: { ... },
  onConflict: ({ local, remote, key, localUpdatedAt, remoteUpdatedAt }) => {
    return remoteUpdatedAt > localUpdatedAt ? remote : local;
  },
});
```

## Limits

Chrome Storage Sync limits:
- Total: ~100KB
- Per key: ~8KB
- Writes: ~120/min

## Troubleshooting

### "chrome is not defined"

Levity requires Chrome extension environment. It won't work in regular web pages.

### Data not syncing

1. Check you're logged into Chrome with same account on both devices
2. Verify Chrome sync is enabled: `chrome://settings/syncSetup`
3. Check quota: `await store.getQuota()`

### Quota exceeded

Chrome Storage Sync has ~100KB limit. Options:

- Store less data
- Use `chrome.storage.local` for large data (no sync)
- Implement data pruning with `onQuotaWarning`

```typescript
createStore({
  initial: { ... },
  onQuotaWarning: (quota) => {
    if (quota.percent > 90) {
      // Prune old data
    }
  },
});
```

### Conflicts losing data

Default is last-write-wins. For important data, implement merge logic:

```typescript
createStore({
  initial: { ... },
  onConflict: ({ local, remote, key }) => {
    if (key === 'notes') {
      // Merge arrays
      return [...new Set([...local, ...remote])];
    }
    return remote;
  },
});
```

## TypeScript

Full type inference from `initial`:

```typescript
const store = createStore({
  initial: {
    count: 0,
    items: [] as string[],
  },
});

store.get('count');  // number
store.get('items');  // string[]
store.set('count', 'wrong');  // Type error
```

## License

MIT
