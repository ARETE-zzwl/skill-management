# Contributing

Thanks for helping improve Skill Management Demo.

## Development Setup

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Local Workflow

1. Create a focused branch from `main`.
2. Keep changes small and tied to one purpose.
3. Run `npm run typecheck`, `npm test`, and `npm run build` before opening a pull request.
4. Do not commit generated local data such as `.skillmgr/`, `.agents/`, `.claude/`, `dist/`, or `node_modules/`.

## Pull Requests

Please include:

- what changed
- why the change is useful
- how it was tested

For user-facing behavior changes, update `README.md` or add tests that show the expected behavior.
