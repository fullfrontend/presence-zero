# AGENTS.md — Development guide for AI agents & contributors

Conventions for working in the PresenceZero codebase. Read this before making changes.
For what the product *is* and how to run it, see [README.md](README.md).

## What this project is (one line)

An open-source, self-hosted tool that finds local businesses with no/dead/parked websites,
checks domains via RDAP/DNS Belgium DAS, optionally audits sites with local Ollama,
scores prospecting priority 0–100, and exports CSV. The root opens the application.

## Golden rule: `src/core/` is framework-free

The domain engine lives in `src/core/` and **must never import `next`, `react`, or anything
under `src/app/`**. It may only import from within `src/core/`, from `src/db/`, and from the
root `scoring.config.ts`. This keeps the engine testable in isolation and portable (a future
CLI / npm package is a refactor, not a rewrite). CI/reviewers treat a violation as a defect.

## Directory map

```
src/core/          Framework-free engine — DO NOT import next/react/app here
  providers/       Pluggable data sources (Google Places, Apify, OSM, CSV) behind one interface
  probes/          Website presence probe, domain-candidate generation, RDAP/DAS checkers
  scoring.ts       Lead scoring (weights in /scoring.config.ts)
  jobs/            Durable asynchronous collection and enrichment, leases and retries
  audit/           Bounded evidence, Ollama roles and external private profiles
  business-score.ts Shared evidence-to-score adapter for workers, routes and export
  pipeline.ts      Legacy resumable pipeline (kept consistent with durable jobs)
src/db/            Drizzle schema + libSQL client (SQLite locally, Turso hosted)
src/server/        Zod validation + pipeline dependency wiring for routes
src/app/           Next.js App Router — pages + API routes (UI/HTTP layer only)
src/components/    React client components
tests/             Vitest — mirrors src/ layout
fixtures/          Recorded API responses; tests run against these, never the network
drizzle/           Generated SQL migrations (committed; run at startup by getDb())
guides/            Operator guides linked from README
examples/ai-prompts/ Generic profile only; private profiles live outside the repository
```

## Development workflow

```bash
npm ci              # Node.js 22+, matching CI and Docker
npm run dev          # http://localhost:3000 (SQLite file, OSM + CSV work with no key)
npm test             # Vitest
npm run lint         # ESLint — must report 0 problems
npx tsc --noEmit     # Type check — must be clean
npm run build        # Next production build — must compile
```

## Quality gates (all must pass before a commit/PR)

1. `npm test` — full suite green, output pristine (no stray warnings).
2. `npm run lint` — **0 problems.** Production code is strict; `any` is allowed only under
   `tests/**`. Prefix intentionally-unused args with `_`.
3. `npx tsc --noEmit` — no type errors.
4. `npm run build` — compiles (also what CI runs, alongside the three above).

CI (`.github/workflows/ci.yml`) runs all four on every push and PR.

## Testing conventions

- **Tests never hit the real network.** Every unit that makes HTTP calls takes an injectable
  `fetchFn: typeof fetch` (default `fetch`); tests pass fakes/fixtures. Time-dependent code
  takes injectable `now`/`sleep`. DB tests use a `:memory:` libSQL database migrated from
  `drizzle/`.
- Tests must verify real behavior, not mock the unit under test. Prefer TDD (write the failing
  test first). Keep fixtures under `fixtures/`.

## Commit & PR conventions

- Use Conventional Commit prefixes: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`.
- Commit at **meaningful milestones**, not every tiny change.
- **Do not add `Co-Authored-By:` or other attribution trailers** to commit messages.
- Never commit secrets. API keys live in env vars or the local database, never in code,
  fixtures, or `providerConfig`.

## Adding a data-source provider (the main extension point)

1. Implement the `Provider` interface (`src/core/providers/provider.ts`): one file, one `id`,
   one `fetchPage(area, cursor, config)` returning `{ businesses, nextCursor }`. Use a factory
   `createXProvider(fetchFn = fetch)` so it's testable with an injected fetch.
2. Add fixtures under `fixtures/` and a test under `tests/core/providers/` that runs against
   them (no live network).
3. Register it in `src/core/providers/index.ts`'s `registerBuiltInProviders()`.
4. Map recoverable vs. non-recoverable failures with `ProviderError(msg, recoverable)` — the
   pipeline uses this to decide pause-vs-fail.

## Product principles (these constrain what PRs are accepted)

- **Free-tier & bring-your-own-key.** The project never proxies or pays for external calls.
  Everything must run on a free tier; provider API keys are always the user's own.
  Paid-but-free-tier sources (Apify) are acceptable only as opt-in, using the user's own
  account, with a hard per-scan cost ceiling and every billable add-on disabled.
- **A finder, not a spam tool.** No bulk-email, auto-outreach, or scrape-for-spam features
  will be accepted — this is a permanent design decision, not a gap.
- **No built-in auth (yet).** A deployment is single-operator; treat any hosted instance as
  private. Don't assume multi-tenant/auth exists.

## Security notes

- Validate all API input with Zod at the route boundary (`src/server/validation.ts`).
- The CSV export neutralizes spreadsheet formula-injection and escapes fields — keep it that
  way if you touch `src/app/api/scans/[id]/export/route.ts`.
- The website probe fetches arbitrary user/provider URLs (bounded read, no body returned).
  Don't widen its output surface without considering SSRF.

## Configuration

All environment variables are documented in [`.env.example`](.env.example). Saved
Settings overrides take precedence over environment values and application defaults.
Search and AI require independent opt-in; models, URLs and keys alone do not enable them.
See [configuration](guides/CONFIGURATION.md) and [deployment](guides/DEPLOYMENT.md)
for inheritance, deployment-only fields, worker behavior and persistence.
