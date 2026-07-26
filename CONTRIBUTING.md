# Contributing to PresenceZero

Thanks for considering a contribution. PresenceZero is a lead **finder** (not an outreach/CRM tool) — keep that in mind when proposing features.

## Before you open a PR

All four quality gates must pass locally:

```bash
npm test
npm run lint      # 0 problems
npx tsc --noEmit
npm run build
```

CI runs the same four on every push and PR.

## Core isolation rule

`src/core/` is framework-free. It must **never** import `next`, `react`, or anything under `src/app/`. It may only import from `src/core/`, `src/db/`, and the root `scoring.config.ts`. A violation is a defect.

## Adding a data-source provider

This is the main extension point:

1. Implement the `Provider` interface in `src/core/providers/` — one file, one `id`, one `fetchPage(area, cursor, config)` returning `{ businesses, nextCursor }`. Use a factory with injectable `fetchFn = fetch` so tests stay network-free.
2. Add fixtures under `fixtures/` and tests under `tests/core/providers/`.
3. Register it in `src/core/providers/index.ts` via `registerBuiltInProviders()`.
4. Map failures with `ProviderError(msg, recoverable)` so the pipeline can pause vs fail correctly.

See [AGENTS.md](AGENTS.md) for fuller conventions.

## What we will not accept

- Mass cold-email, auto-outreach, or scrape-for-spam features — permanent product ethics line, not a gap.
- Secrets in code, fixtures, or `providerConfig` — keys live in env vars or the `settings` table only.
- Commits that add `Co-Authored-By:` / attribution trailers (project convention).

## Questions

Open an issue on [its-tahir/presence-zero](https://github.com/its-tahir/presence-zero), or email [hello@its-tahir.com](mailto:hello@its-tahir.com) for white-label / custom work.
