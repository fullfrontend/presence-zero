# PresenceZero

**Find local businesses whose web presence is zero — and the domains you can pitch them.**

[![CI](https://github.com/its-tahir/presence-zero/actions/workflows/ci.yml/badge.svg)](https://github.com/its-tahir/presence-zero/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)

**[Live site](https://presencezero.its-tahir.com/)** · **[Live demo](https://presencezero.its-tahir.com/demo)** · **[Quick start](#quick-start)** · **[Contributing](CONTRIBUTING.md)**

PresenceZero is an open-source, self-hosted tool that scans a location and business category, then flags the businesses most likely to need (and buy) a website: the ones with **no site, a dead site, or a domain parked for sale**. For each one it checks whether a **matching domain is still available to register**, scores the opportunity **0–100**, and hands you a filterable, exportable lead list. Bring-your-own-API-key, runs on a persistent Node server or Docker. It's a lead *finder* — not an outreach or CRM tool.

**Who it's for:** freelance web developers, design/marketing/SEO agencies, and domain investors who want a repeatable way to find underserved local businesses instead of hunting Google Maps by hand.

![PresenceZero demo — expand a lead to see the score breakdown and outreach pitch.](public/screenshots/demo-expand.gif)

If this helps you find leads, a star helps others find the project.

![PresenceZero — “Find the businesses whose web presence is zero.” The landing page with a live scored lead preview.](public/screenshots/landing-hero.png)

## How it works

1. **Find** — pick a location + category and a data source (Google Places, Apify (Google Maps), OpenStreetMap, or a CSV you already have). PresenceZero pulls the matching businesses.
2. **Probe** — it visits each listed website and labels it `none`, `dead`, `parked`, or `alive`. The first three are your leads.
3. **Check domains** — for each lead it derives likely domain names from the business name and checks availability via [RDAP](https://about.rdap.org/) (no key needed), surfacing the exact-match `.com`/ccTLD if it's free.
4. **Score** — each lead gets a 0–100 opportunity score (no website + real customers + an available domain = a hot lead). The table sorts hottest-first.
5. **Work the list** — filter, sort, and set a lead status or note. Expand any row for a plain-language **score breakdown** (why it scored what it did) and a **ready-to-personalize outreach angle** you can copy — then export to CSV to take into your own workflow.

## Quick start

### Option A — Run it locally (simplest, ~2 minutes)

You only need [Node.js 20+](https://nodejs.org). No database setup, no API key.

```bash
git clone https://github.com/its-tahir/presence-zero.git
cd presence-zero
npm install
npm run dev
```

Open **http://localhost:3000**. It creates a local SQLite file (`presencezero.db`) automatically and works immediately with the **OpenStreetMap** and **CSV** providers — no key required. Want Google Places too? See [Data sources](#data-sources) and [Environment variables](#environment-variables).

### Option B — Docker (self-host)

```bash
docker build -t presencezero .
docker run -v ./data:/data -p 3000:3000 presencezero
```

Open **http://localhost:3000**. The SQLite database lives at `./data/presencezero.db` on the host, so it survives container restarts and upgrades.

### Hosted database with a persistent server

A persistent Node/Docker server can use a hosted Turso database through
`DATABASE_URL` and `DATABASE_AUTH_TOKEN`. Migrations run automatically at startup.
The background worker requires a running server: Vercel/serverless deployments
alone cannot process scans. The embedded worker is disabled on Vercel.

## Environment variables

**All optional.** With none set, PresenceZero runs locally against a SQLite file and works with the OpenStreetMap and CSV providers. Copy [`.env.example`](.env.example) to `.env` to configure:

```bash
cp .env.example .env
```

| Variable | Default | When you need it |
|---|---|---|
| `DATABASE_URL` | `file:presencezero.db` | Set to a Turso `libsql://…` URL for a hosted database. |
| `DATABASE_AUTH_TOKEN` | — | Only for a hosted libSQL/Turso database. |
| `GOOGLE_PLACES_API_KEY` | — | Only for the Google Places provider (you can also paste the key in the app's **Settings** page). |
| `APIFY_TOKEN` | — | Only for the Apify (Google Maps) provider (you can also paste the token in the app's **Settings** page). |
| `APIFY_MAX_PLACES` | `100` | Advanced: raises the per-scan place ceiling for the Apify provider. Each place costs money — see [Data sources](#data-sources). |
| `PRESENCEZERO_BATCH_SIZE` | `8` | Maximum new background tasks started per scheduling cycle (one second). |

## Data sources

**Google Places** — go to the [Google Cloud Console](https://console.cloud.google.com/), create a project, and enable **"Places API (New)"** (the classic Places API will not work — the field mask this app requests is New-API-only). Create an API key restricted to that API and add it under **Settings** in the app, or set it as the `GOOGLE_PLACES_API_KEY` environment variable. Google's free tier covers a meaningful number of monthly searches before billing kicks in.

**Apify (Google Maps)** — the easiest data source to set up: no Google Cloud project, no field-mask tuning, just one API token from [console.apify.com](https://console.apify.com) (Settings → API & Integrations), pasted into the app's **Settings** page or set as `APIFY_TOKEN`. It runs Apify's `compass/crawler-google-places` actor, which costs **$0.004 per scraped place**. Apify's free plan renews **$5 of credit every month, no credit card required**, which is roughly **1,250 places** — about 12 scans of 100 places, or 25 of 50. Scans simply stop when the credit runs out; nothing is charged beyond it.

**OpenStreetMap** — no key required, backed by the public Nominatim (geocoding) and Overpass (data) APIs. Currently supported categories: `restaurant`, `cafe`, `bar`, `dentist`, `bakery`, `hairdresser`, `butcher`, `florist`, `plumber`, `electrician`, `carpenter`. More can be added by extending the tag map in `src/core/providers/osm.ts`. Along with CSV import below, this remains a fully free, keyless way to run PresenceZero end to end.

**CSV import** — bring your own list. Expected header row:

```
name,address,phone,category,rating,review_count,website
```

Only `name` is required; every other column is optional and left blank if unknown.

## Scoring

Every lead gets a score out of 100, built from weighted signals. Defaults live in [`scoring.config.ts`](scoring.config.ts):

| Signal | Weight |
|---|---|
| No website (`none`) | 40 |
| Dead website | 35 |
| Parked website | 30 |
| Review count (scaled, capped at 50 reviews) | up to 25 |
| Good rating (≥ 4.0) | 10 |
| Exact-match domain available | 15 |
| Has a phone number on file | 10 |

Edit `scoring.config.ts` directly to retune weights for your market — there's no UI for it by design, since it's a one-line config file meant to be forked.

Every lead's score is also **explained per row**: expand a result to see exactly which signals earned which points, plus a deterministic, non-spammy **outreach angle** drafted from that lead's real signals (no site + strong reviews + an available domain) that you can copy and personalize before reaching out.

## Tech stack

Next.js 16 (App Router) · TypeScript (strict) · SQLite via Drizzle ORM + libSQL · Zod · Vitest · Tailwind CSS. The domain engine (`src/core/`) is plain framework-free TypeScript, so providers, probes, scoring, and the scan pipeline run and test independently of the web app.

## Known limitations

- **No built-in auth.** Keep self-hosted and Vercel deployments private — anyone with the URL can use the app and see your leads.
- **Website-probe SSRF is guarded, with a residual caveat.** The presence probe only fetches `http(s)` URLs, follows redirects manually, and DNS-resolves every hop — rejecting private, loopback, link-local, and cloud-metadata (`169.254.169.254`) addresses before making a request. The remaining residual is DNS rebinding (a hostname that resolves to a public IP at validation time and a private one at fetch time); the blast radius stays bounded because the probe only ever reports back `alive`/`dead`/`parked`. Still, don't expose a deployment to untrusted users.
- **Large CSV imports are held in memory for export.** Very large imports (tens of thousands of rows) may use significant memory. The app is intended for realistic local-business-scan sizes, not bulk data processing.

## Ethics

PresenceZero is a lead **finder**, not a spam tool. It has no bulk-email, auto-outreach, or scraping-for-spam features, and none are planned — that's a permanent design decision, not a missing feature. The intended workflow is: find a short list of genuinely underserved local businesses, then reach out yourself, like a human, because you have something worth offering them.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version: quality gates must pass (`npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`); `src/core/` stays framework-free; new providers implement `Provider` and register in `registerBuiltInProviders()`. Mass-outreach features will not be accepted.

## License

MIT — see [LICENSE](LICENSE).


### Optional automatic website discovery

New scans default to **Charleroi, Belgique** (`be`). Set
`PRESENCEZERO_DEFAULT_LOCATION` and `PRESENCEZERO_DEFAULT_COUNTRY_CODE` in `.env`
to change the initial form values, or override them in Settings. Restart the app after changing the environment
(or recreate the app container); no image rebuild is needed for these settings.
A missing website in OSM or
Google Places means **unverified**, not confirmed absence of a website.

Search is disabled by default. Enable Brave Search in Settings or set
`BRAVE_SEARCH_ENABLED=true` in `.env` and
add a **Brave Search API** key in Settings or set `BRAVE_SEARCH_API_KEY` to enable
complementary searches for businesses with no listed website. Powered by
[Brave Search API](https://brave.com/search/api/), using your own account. Set your
Brave spending limit to stay within your free credits. Each eligible business
uses one search request with its name and address (8-second request timeout).
No search is made for a business that already has a website or lacks an address.

Discovery conservatively requires a branded hostname, matching business name,
and street/building number/locality evidence in the search snippets. Multiple
matching hostnames, missing evidence, directories, and search failures remain
unverified. This heuristic can miss legitimate sites; it is not proof of ownership
or of absence. A selected site passes through the existing SSRF-protected probe
and scoring pipeline. Its discovery source is recorded in the presence tooltip.
Live sites score zero and disappear from the leads-only view.

Completed scans are snapshots: use **Rerun** after enabling discovery to create a
fresh scan. Automated tests use synthetic search fixtures and never the network.

### PresenceZero + SearXNG with Docker

SearXNG provides complementary website search without a paid search API key.
It uses upstream search engines, which may rate-limit requests or return incomplete
results. Missing or ambiguous matches remain **UNVERIFIED**. SearXNG takes priority
when `SEARXNG_ENABLED=true` and `SEARXNG_URL` is set; failures never trigger an automatic fallback to Brave.

Enable SearXNG in Settings or with `SEARXNG_ENABLED=true` in `.env`, including for Docker.
Keys and URLs alone never enable searches. Set the corresponding enabled flag to
`false` to disable a provider while keeping its credentials. Restart the app
(or recreate its container) after changes.

**Run everything in Docker** (Docker Desktop / Docker Engine must be running):

```bash
npm run docker:up
```

Open PresenceZero at http://localhost:3000 and SearXNG at http://localhost:8080.
Both ports bind only to localhost. The launcher creates a random SearXNG secret in
`.env.docker` with restricted permissions, preserves it on later runs, and builds
the app. This file is ignored by Git and excluded from Docker build context.
You can set `PRESENCEZERO_PORT=3001` or `SEARXNG_PORT=8081` in `.env.docker` if needed.
Compose passes optional settings from `.env` to the app, but overrides its database
path and SearXNG address for the container network.

Docker uses a **separate persistent database** in the `presencezero-data` volume.
Your existing local `presencezero.db` and scans are untouched. Configure your Google
or Apify keys in the Docker app if needed; OSM needs no key. Do not use `down -v`
unless you intend to delete Docker's saved data.

**Keep your existing local app and scans**, running only SearXNG in Docker:

```bash
npm run docker:search
```

Add this to your existing `.env` (adjust the port if you changed it), then restart
`npm run dev`:

```dotenv
SEARXNG_ENABLED=true
SEARXNG_URL=http://127.0.0.1:8080
```

Settings shows **SearXNG enabled**. Re-run a completed scan to use the new search.
The launcher copies `docker/searxng/settings.example.yml` to
`docker/searxng/settings.yml` on first use. Edit the latter for your language and
engine preferences: it is ignored by Git and Docker builds, and subsequent launches
preserve it. Restart SearXNG after editing it (command below). JSON output must stay enabled.

Searches are serialized per SearXNG instance across scans and app workers sharing
the database. `SEARXNG_MIN_INTERVAL_MS=5000` sets the minimum interval between
request starts. CAPTCHA and rate-limit responses trigger a shared cooldown of at
least `SEARXNG_COOLDOWN_MS=300000` (5 minutes), honoring longer `Retry-After` values.
Blocked searches are rescheduled independently, up to three attempts. Exhausted
searches remain unverified; collection and other enrichment tasks continue. Waiting
for the shared throttle does not consume a retry attempt.
A valid website returned by another engine is kept, while the cooldown still applies
to subsequent requests. Ordinary engine failures remain unverified.

These waits deliberately make scans longer. You can close the scan page; keep the
local/Docker server running.
The existing SQLite/libSQL database stores pacing and cooldown state across app
restarts, so Redis is not required. Changing language alone cannot clear an upstream
CAPTCHA; you can adjust enabled engines in your local settings file.
The website probe retains its existing protection against private/internal URLs;
only the operator-configured search service may be local.

**Operations**:

```bash
# Stop both services, preserving data
npm run docker:down
# SearXNG logs
docker compose --env-file .env.docker logs --tail=100 searxng
# After changing SearXNG settings
docker compose --env-file .env.docker restart searxng
# Check configuration without displaying secrets
node scripts/docker.mjs config
```

The Compose file follows the official SearXNG image's `latest` channel. To update it,
run `docker compose --env-file .env.docker pull searxng`, then `npm run docker:up`
(or `npm run docker:search` for local development).

### Facebook presence

A Facebook URL (including mobile links and redirects to Facebook) is classified
as **FACEBOOK**, rather than a live independent website. These businesses remain
in lead results and exports. The presence factor contributes **25 points**, versus
40 when no site was found after search, 15 for unverified presence, and 0 for a live independent site; other score factors
are unchanged (Facebook maximum: 85/100). Tune this in `scoring.config.ts`.
When search is configured, a listed Facebook page also triggers a search for an
independent website. An inconclusive search preserves the Facebook URL and status.
Re-run existing scans to apply the new classification and scoring.


Presence priority (with other scoring factors equal): **no site found → Facebook
→ unverified website → live independent website**. Presence points are 40, 25,
15 and 0 respectively. `not_found` means a completed search found no matching independent website,
even if it returned directories, social profiles or unrelated results. It is not
proof of absence. Facebook presence is taken from source listings (including OSM
`contact:facebook` / `facebook` tags), never from search results. No search, missing data, ambiguous matches,
errors or unavailable search engines remain `none` (the legacy code for
**UNVERIFIED**). Dead and parked sites retain their separate diagnoses and weights.
Re-run historical scans to refresh stored scores after changing these weights.

### Settings and environment defaults

The **Settings** page groups General, Data sources, Website discovery and Local AI.
Saved settings take priority over `.env`; this includes API keys, search/AI enable
switches, model roles, scan defaults, throttling, audit limits and qualification.
Each field shows its source. Choose **Customize in Settings** to override it, or
**Use environment / default** to restore inheritance. Advanced options are folded.

Changes persist in the local database and apply at the next scan step without a
restart. A running step finishes using the settings it started with. Completed
reports are preserved. Existing saved API keys now take priority over environment
keys; choose **Use environment key** to restore the environment credential.
**Disable this key** explicitly suppresses even an environment key. API responses
only expose whether credentials exist, never their values or private prompt contents.

The database connection, Docker ports, `APIFY_MAX_PLACES` deployment spending
ceiling and `AI_PROMPTS_DIR` private directory remain environment-only. Restart or
recreate the app after changing environment defaults. Settings does not edit `.env`.
The private profile ID is editable; profile files stay outside the repository.
The interface language selected in a browser still takes priority over its default.

### Local AI audits with Ollama

`AI_AUDIT_ENABLED` is the global switch for **all AI features**. Only `true`
in the effective configuration (Settings first, then `.env`) enables the light and heavy models, evidence preparation, lead summaries
and website audits. With `false` or an unset flag, no Ollama requests, AI-specific
crawling or private prompt-profile loading occur, even if models and
`AI_AUDIT_PREPARE_EVIDENCE=true` are configured. Restart the app (or recreate its
container) after changing the flag. Existing saved reports remain visible; normal
website probes, lead scoring and independently enabled search continue to work.

Optional audits bring the business-analysis concepts from Lead Hunter into this
single-operator app: official-site identity checks, bounded evidence collection,
website quality estimates, project briefs, and evidence-backed qualification.
Accounts, teams, automated outreach and platform job infrastructure are outside
this integration. No OpenRouter or paid/cloud AI fallback is used.

1. Install and start [Ollama](https://ollama.com/).
2. Download the selected light and heavy models: `ollama pull qwen3.5:4b-q4_K_M` (about 3.3 GB)
   and `ollama pull qwen3.5:9b-q4_K_M` (about 6.6 GB).
3. Set the following in your local `.env`, then restart PresenceZero:

```dotenv
AI_AUDIT_ENABLED=true
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_LIGHT_MODEL=qwen3.5:4b-q4_K_M
OLLAMA_MODEL=qwen3.5:9b-q4_K_M
AI_AUDIT_LANGUAGE=fr
```

Set `OLLAMA_NO_CLOUD=1` on the **Ollama server** and restart it to disable its
cloud features ([official instructions](https://docs.ollama.com/faq#how-do-i-disable-ollamas-cloud-features)).
PresenceZero refuses the official cloud endpoint and cloud-named models, follows
no inference redirects, sends no API key, and calls only your configured server.
A custom server or model alias remains under your control. The app does not download
models automatically. Settings shows and overrides the configuration; it does not assert that Ollama is healthy.

For the full PresenceZero Docker stack with Ollama running natively on the host,
set `OLLAMA_BASE_URL=http://host.docker.internal:11434` in `.env`. Compose includes
the host-gateway mapping. Ollama must listen on an interface reachable from Docker;
configure its bind address using the official instructions above. On a Mac, native
Ollama can use the host GPU. Keep the service on your private machine/network.

The two model roles are independent. The light model selects exact excerpts from
collected pages and writes listing-only summaries. The heavy model handles verified
website audits and project briefs. Failed/invalid excerpt selection falls back to
the original bounded evidence; it never manufactures a replacement source.
`AI_AUDIT_PREPARE_EVIDENCE=false` skips only the extraction stage. Thinking is off
by default for both bounded JSON tasks; `OLLAMA_LIGHT_THINK` and `OLLAMA_THINK`
configure it independently. Their time, context and output budgets are separate.
See [model selection and validation](LOCAL_AI_MODELS.md) for the researched
choices, alternatives and limitations. Run `npm run ai:evaluate` for an explicit
live Ollama check using synthetic HTML (separate from the network-free tests).

**Behavior.** An audit runs automatically after each business check in new scans.
Completed scans are snapshots: use **Rerun** to add or retry audits. Existing
presence classifications, source-only Facebook rules and lead scores are preserved.
A site that responds is not automatically assumed official: the collected text
must match the business name plus phone or address before website quality is scored.
A mismatch, blocked crawl or insufficient text leaves the audit unverified.
Businesses without a live site receive a contextual summary of the known listing
and presence status, without a fabricated website score or claims of proven absence.

**Evidence.** Up to three HTML pages are fetched by default (home, then selected
same-origin contact/about/services pages). The crawler respects robots.txt, limits
redirects, bytes, text, page count and time, checks every destination, and pins
connections to DNS-validated public IPs. It does not execute JavaScript or load page
assets. Unavailable robots, unsupported content, excessive crawl delays and blocked
URLs fail closed. Text-only/JavaScript-heavy sites can remain unverified. Scripts
and hidden content are removed; remaining content is untrusted input to the model.
Every model finding must cite a collected evidence ID and an exact text/fact quote.
Unsupported or malformed model output is rejected. This grounds quotations; it
does not guarantee that the model's interpretation is correct.

Reports retain the sampled text, HTML facts, requested/final URL, HTTP status,
content type, collection time and SHA-256 of the stored text/facts payload. The
hash identifies the captured excerpt, not the entire original page. Partial reads
are marked. No raw HTML, cookies, screenshots or scraped email lists are stored.

**Scores and reports.** The interface displays one **lead score /100**, using the same
weights whether search and AI are enabled or disabled. Enabling a tool adds no
points or new scoring category. Newly discovered facts can change the score
through the existing factors (for example, finding a live site). AI findings and
recommendations support manual research without adding a second visible score.

For compatibility, downloaded reports and CSV retain technical audit metrics. Website quality (0–100, higher is better) is an AI estimate
from text and HTML signals, not a visual, Lighthouse, speed or accessibility test.
Improvement opportunity is `100 - website quality`. A verified audit above the
configured opportunity threshold appears in **Leads only**, including a live site.
The existing **Min score** filter still applies to the original lead score: keep
it at zero to see live-site opportunities. **Audited websites only** narrows the
view to completed website audits. Expand a finding to inspect the report and
quoted evidence, or download its JSON. CSV export adds audit fields/evidence and
uses the same filters and spreadsheet-injection protection as the UI.

**Configuration.** Every option is documented in `.env.example`:

- `AI_AUDIT_ENABLED`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_LIGHT_MODEL`, `AI_AUDIT_LANGUAGE`;
- `OLLAMA_TIMEOUT_MS`, `OLLAMA_NUM_CTX`, `OLLAMA_NUM_PREDICT`, `OLLAMA_KEEP_ALIVE`, `OLLAMA_THINK`;
- `OLLAMA_LIGHT_TIMEOUT_MS`, `OLLAMA_LIGHT_NUM_CTX`, `OLLAMA_LIGHT_NUM_PREDICT`, `OLLAMA_LIGHT_THINK`, `AI_AUDIT_PREPARE_EVIDENCE`;
- `AI_AUDIT_MAX_PAGES`, `AI_AUDIT_PAGE_TIMEOUT_MS`, `AI_AUDIT_MAX_PAGE_BYTES`,
  `AI_AUDIT_MAX_PAGE_CHARS`, `AI_AUDIT_PAGE_DELAY_MS`;
- `AI_AUDIT_OPPORTUNITY_THRESHOLD`, `AI_AUDIT_MIN_RATING`,
  `AI_AUDIT_MIN_REVIEWS`, `AI_AUDIT_MAX_REVIEWS`;
- `AI_AUDIT_EXCLUDE_ECOMMERCE`, `AI_AUDIT_EXCLUDE_CHAINS`,
  `AI_AUDIT_MIN_BUSINESS_AGE_YEARS`.

Filters affect audits only; they do not delete source businesses. Ecommerce uses
observed cart and checkout links, chains use explicit franchise/chain wording,
and age uses explicit establishment-year claims, never domain-registration age.
These are conservative heuristics, not independently verified company facts.
Unknown age passes the age filter. Rating/review filters use source data.
No competitor/review sentiment is invented when the source has not supplied it.

Audits run in a separate queue, with one concurrent audit by default. Configure
`PRESENCEZERO_CONCURRENCY_AUDIT` (or its Settings override) to change this limit;
Ollama's `OLLAMA_NUM_PARALLEL` controls inference on the model server. Slow audits
never block collection, website checks or searches for other prospects. A model
failure is recorded without changing the successful presence check.
Unit/integration tests use synthetic HTML and Ollama responses without real network calls.


### Private business prompt profiles

The generic, non-proprietary [example](examples/ai-prompts/default.json) is tracked
outside `src/`. Real operator profiles live **outside the repository** and are read
at runtime. No private prompt implementation is imported, bundled or committed.
Create your profile from the example, set its `id`, and configure:

```dotenv
AI_PROMPTS_DIR=/absolute/external/path/presencezero-prompts
AI_PROMPT_PROFILE=my-agency
```

The loader reads `my-agency.json`. Its version-1 schema defines business context
(name, services, target customers, market, tone, priorities and constraints), plus
three task prompts: `evidenceSelection`, `leadSummary`, and `websiteAudit`. Set
`AI_AUDIT_LANGUAGE` for the report language. The profile guides commercial relevance;
it is never treated as evidence about the prospect. For IT maintenance, do not infer
hardware, security or operational problems from a website; use discovery questions.

The file is declarative JSON, capped at 32 KiB. Unknown fields, missing files,
invalid schema, mismatched IDs, path traversal, locations inside the project and
symlinks escaping the selected directory are rejected. There is no code execution,
variable/secret expansion or dynamic prompt-module import. The fixed evidence,
network and output-validation rules remain in application code. Explicitly selecting
a broken private profile fails configuration rather than silently substituting a
generic profile. Edits are read on the next scan step; choose another profile by
changing the environment. Reports store only the profile ID and SHA-256 revision,
not private instructions. The profile contents are sent only to configured Ollama.

Without `AI_PROMPTS_DIR`, only `AI_PROMPT_PROFILE=default` uses the bundled example.
Keep private files owner-readable (for example permissions `0600`) and maintain your
own backup. Do not add them to this repository, even in an ignored source folder.

The Docker launcher reads `.env` and, when `AI_PROMPTS_DIR` is set, includes
`compose.ai-prompts.yaml`. It mounts the external directory read-only at
`/run/presencezero-prompts`; the image contains only the generic example. For manual
Compose use, load `.env` and `.env.docker` and include both Compose files. Use an
absolute host path for the mount, with `AI_PROMPT_PROFILE` selecting the file.

## Interface languages

The interface supports **French (`fr-FR`)** and **American English (`en-US`)**.
Use the language selector in the navigation bar. The preference is saved in a
`pz-locale` cookie for one year and applies throughout the app and demo, without
changing page URLs. Locale selection follows this order:

1. Explicit language selected in this browser.
2. Browser `Accept-Language` preferences (French and English regional variants
   map to `fr-FR` and `en-US`, respecting their priority).
3. `PRESENCEZERO_DEFAULT_LOCALE`, defaulting to `en-US`.

Dates and numbers use the selected regional formats. Displayed timestamps use
UTC, explicitly labeled, to keep server and browser rendering consistent.
Business names, locations, notes, source URLs, collected evidence and existing
AI prose are preserved. The UI language does not restart scans or change scoring,
provider IDs, saved statuses, CSV column names or CSV numeric values.
`AI_AUDIT_LANGUAGE` separately controls **new** Ollama reports; switching the
interface language does not regenerate or translate existing reports. Unknown
external provider errors remain in their original language.

Translation catalogs live in `src/i18n/fr-FR.json` and `src/i18n/en-US.json`.
English source messages serve as keys, with numbered placeholders for dynamic
values. Use `useI18n()` in client components and `getI18n()` on the server. Never
translate identifiers or user/business data. Domain pitch generation accepts an
optional presentation callback and remains framework-free. Tests cover locale
negotiation, catalog placeholders, regional formats and rendered components.

### Background processing

Collected prospects appear immediately, with pending scores and per-stage progress.
Search, website probing, domain availability, phone enrichment and Ollama audits
run as separate durable tasks. Probing waits for the prospect's search; audits wait
for its probe and phone lookup. Other prospects continue independently. Partial
scores can change as evidence arrives; pending prospects stay visible in the lead list.

Concurrency limits are configurable through Settings or
`PRESENCEZERO_CONCURRENCY_COLLECT=1`, `SEARCH=1`, `PROBE=4`, `DOMAINS=2`,
`PHONE=2`, `AUDIT=1` (each suffix uses the same `PRESENCEZERO_CONCURRENCY_`
prefix). Each limit accepts 1–16 and applies across workers sharing the database.
Search throttling still applies independently of concurrency.

The SQLite/libSQL queue persists across page closes and server restarts. Workers
renew task leases every 15 seconds; abandoned tasks become eligible after 60 seconds.
An external request can repeat after a crash, but lease-protected writes and stable
IDs prevent duplicate persisted prospects. Most failed tasks retry twice; blocked
searches get three attempts. Failures preserve already collected prospects.

Pause stops new tasks; in-flight tasks finish and save safely. Resume uses the saved
cursor and queue. Provider pauses still let previously collected prospects finish.
The scan completes when collection and all its enrichment tasks have settled.
`PRESENCEZERO_WORKER_ENABLED=false` disables the worker on this server (restart
required); use it only if another persistent server processes the same database.

### Scan map

Each scan includes an interactive OpenStreetMap map, without a map API key.
Click a marker to open the business details, links, score and audit. Businesses
sharing coordinates are grouped under one numbered marker and can be selected
individually. The map covers all collected results, independently of table filters;
new positions appear during collection without resetting your zoom.

Coordinates are retained from OSM nodes/centres, Google Places locations and Apify
locations. CSV imports accept optional `latitude` and `longitude` columns. Missing
or invalid positions are counted but never guessed. Older scans need to be rerun
to collect coordinates; no bulk address geocoding is performed.

Map tiles load directly from OpenStreetMap with visible attribution and normal
browser caching; internet access is required. Follow the
[OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/) when hosting.
