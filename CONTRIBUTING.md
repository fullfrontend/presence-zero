# Contributing to PresenceZero

[README](README.md) explains the operator workflow; [AGENTS.md](AGENTS.md) defines
repository conventions. This is an application-only fork: do not reintroduce a
marketing site, public demo or automatic outreach features.

## Set up and validate

Use Node.js 22+, matching CI and Docker:

```bash
npm ci
npm run dev
```

Before a commit or pull request, run all four gates:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Lint must report zero problems. CI runs these gates on main pushes and pull
requests. Tests use fixtures and injected dependencies, never real providers or
Ollama. `npm run ai:evaluate` is a separate, explicit live Ollama check; see
[model evaluation](LOCAL_AI_MODELS.md).

## Architecture and boundaries

| Location | Responsibility |
|---|---|
| `src/core/providers/` | Business collection through the shared provider interface |
| `src/core/jobs/` | Durable jobs, leases, dependencies, retries and scan progress |
| `src/core/probes/` | Website presence and free domain availability checks |
| `src/core/audit/` | Evidence collection, local model calls, validation and profiles |
| `src/core/scoring.ts`, `src/core/business-score.ts` | One score calculation for processing, UI and export |
| `scoring.config.ts` | Lead weights, need multipliers and score levels |
| `src/db/`, `drizzle/` | Schema, client, startup migration and compatibility |
| `src/server/` | Input validation, settings resolution and worker wiring |
| `src/app/`, `src/components/` | HTTP routes and application interface |
| `src/config/settings.ts`, `src/i18n/` | Settings definitions and translation catalogs |
| `guides/`, `.env.example` | Operator documentation and environment reference |

`src/core/` must never import `next`, `react` or `src/app/`. Internal imports are
limited to core, database code and the root scoring configuration. Keep domain
logic reusable without the UI. The legacy `pipeline.ts` path and durable worker
must agree on classifications and scores.

Collecting prospects must not wait for another prospect's search or audit. Preserve
stable job IDs, lease-protected writes and independent concurrency limits. New
network operations need bounded requests and injectable transports; time-dependent
logic needs injectable clocks and sleeps. Database tests use migrated in-memory
libSQL. Keep response fixtures under `fixtures/`; UI sample rows live under
`tests/fixtures/` and must not enter the application bundle.

## Extend the application

For a provider, implement `Provider.fetchPage(area, cursor, config)` returning
`{ businesses, nextCursor }`, use an injectable fetch factory, register it in
`registerBuiltInProviders()`, and test it with fixtures. Use
`ProviderError(message, recoverable)` to distinguish resumable failures.

For settings, keep environment defaults, override validation, `.env.example` and
operator documentation aligned. Never expose secret values in API responses or
store them in `providerConfig`. Private prompt profiles remain outside the checkout
and are never copied into images. Preserve the global search and AI opt-in rules.

For scoring, use the shared functions for stored updates, read-time recalculation,
filters and CSV. Unknown evidence is distinct from zero. Search-only Facebook must
not affect presence, and enabling a tool must not itself earn points.

For translations, update both `src/i18n/fr-FR.json` and `en-US.json`. Use `useI18n()`
in client components and `getI18n()` on the server. English source messages are
keys; preserve interpolation placeholders. Do not translate identifiers, business
data, notes, evidence or existing model prose. Core presentation helpers accept
translation callbacks without importing the UI.

Preserve Zod validation at API boundaries, CSV formula neutralization, SSRF guards
and bounded evidence collection. Do not treat robots/noindex as authentication.

## Commits and documentation

Use Conventional Commits at meaningful milestones (`feat:`, `fix:`, `docs:`,
`refactor:`, `test:`, `chore:`), without attribution trailers. Keep secrets out of
code, fixtures and commits. Explain the behavior change and validation in the PR.

Keep the README focused on getting started and using the application. Put detailed
operations, configuration, scoring or AI instructions in the corresponding guide
and link them rather than appending duplicate sections. Report issues in
[this fork](https://github.com/fullfrontend/presence-zero/issues).
