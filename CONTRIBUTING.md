# Contributing

## Setup

```bash
git clone https://github.com/AlphaLeonX/levity
cd levity
pnpm install
```

## Development

```bash
# Build core library
pnpm --filter levity build

# Run tests
pnpm --filter levity test

# Watch mode
pnpm --filter levity test:watch

# Coverage
pnpm --filter levity test:coverage
```

## Project Structure

```
packages/core/     # Main library
  src/
    createStore.ts    # Public API
    StateManager.ts   # In-memory state
    SyncEngine.ts     # Remote sync
    PersistQueue.ts   # Debounced writes
    __tests__/        # Tests
    __mocks__/        # Chrome API mock

example/           # Demo extension
```

## Pull Requests

1. Fork and create a branch
2. Write tests for new features
3. Run `pnpm test` before submitting
4. Keep commits atomic

## Releasing

Maintainers only:

```bash
cd packages/core
npm version patch  # or minor/major
git push --tags
```

GitHub Actions will publish to npm.
