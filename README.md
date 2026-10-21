# PresenceZero

PresenceZero is a self-hosted application for finding and qualifying local businesses
that may need a website or a redesign. Collect prospects, check their online presence,
inspect the evidence behind a lead score, and export a shortlist for manual follow-up.

The application opens directly at `/app` when you visit `/`. It includes scans,
results and settings, with French (`fr-FR`) and English (`en-US`) interfaces.
There is no marketing homepage or public demo. This fork is based on
[its-tahir/presence-zero](https://github.com/its-tahir/presence-zero) and remains
[MIT licensed](LICENSE).

## Start locally

Use **Node.js 22+** and npm. A local SQLite database is created automatically;
OpenStreetMap and CSV import work without API keys.

```bash
git clone https://github.com/fullfrontend/presence-zero.git
cd presence-zero
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Keep the server running while scans
process; the browser can be closed. This is a single-operator application without
built-in authentication, so keep its deployment private.

For Docker, SearXNG, persistent storage and upgrades, follow the
[deployment guide](guides/DEPLOYMENT.md).

## Configure the application

Use **Settings** for scan defaults, provider keys, optional search and local AI.
For environment-based defaults, copy the example before editing it:

```bash
cp .env.example .env
```

Configuration priority is **saved Settings → environment → application defaults**.
Each Settings field shows its source and can return to environment inheritance.
Settings changes apply at the next scan step; environment changes require a restart.

Without configuration, the initial location is **Charleroi, Belgique** (`be`).
The example file intentionally keeps the original **blank location / `us`** values;
copying it overrides those application defaults. Set your preferred location there
or in Settings. See [configuration and language preferences](guides/CONFIGURATION.md).

Search and AI are independently **disabled by default**. Providing a key, URL or
model does not activate them. Enable `SEARXNG_ENABLED`, `BRAVE_SEARCH_ENABLED` or
`AI_AUDIT_ENABLED` in `.env`, or override the corresponding switch in Settings.

## Run a scan

1. Choose the location, country code, category and data source.
2. Start the scan. Prospects appear as they are collected, while search, website
   checks, domain checks, phone enrichment and optional AI finish independently.
3. Follow the stage indicators. Pause stops new tasks; tasks already running can
   finish. Resume continues saved work. A scan is done when all stages have settled.
4. Review the table or click a map marker. Expand a result for website, source-listed
   Facebook and source-listing links, score contributions and any audit evidence.
5. Filter and sort, add notes or follow-up statuses, then export the filtered
   results to CSV. Export does not send messages.

Use **Rerun** when you need fresh evidence or want to apply newly enabled search/AI
to a completed scan. Existing evidence is rescored automatically when displayed;
that does not repeat external checks or regenerate reports.

### Choose a data source

| Source | Setup | Category input |
|---|---|---|
| OpenStreetMap | No key; public Nominatim and Overpass services | Supported categories listed in the form |
| CSV | Upload your own list; no key | Taken from the scan or supplied rows |
| Google Places | Your Places API (New) key | Official type autocomplete or free text |
| Apify Maps | Your Apify token and a per-scan place limit | Provider search category |

Google Places is preselected when a usable key is configured. The category
suggestions are bundled and make no autocomplete API request. A selected official
type enables strict type filtering; free text stays supported.

Google, Brave and Apify use your own accounts and their current quotas/billing.
PresenceZero does not pay for or proxy their usage. Apify's default deployment
ceiling is 100 places per scan (`APIFY_MAX_PLACES`); check your provider account
before changing it. OpenStreetMap/CSV, optional self-hosted SearXNG and local Ollama
provide paths that require no paid API key.

CSV accepts these columns; only `name` is required:

```csv
name,address,phone,category,rating,review_count,website,latitude,longitude
```

Leave unknown fields empty. Supplied coordinates place businesses on the map;
missing positions are not guessed. The OSM map has no API key and displays only
results scoring **50 or more**, independently of table filters. Unscored prospects
are excluded until their score reaches that threshold. Businesses at the same position
share a marker showing their score range and a count badge; individual markers show
the lead score. Click to inspect each business. Tiles load from OpenStreetMap with attribution; see its
[tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

## Understand the results

The **lead score /100** measures prospecting priority, not the probability of a sale.
Website need modulates weighted activity, contactability, reputation and domain
readiness. Turning on search or AI adds no points by itself; the evidence they find
can change the score. A found website counts just like a source-listed website.

| Score | Priority |
|---|---|
| 80–100 | Priority prospect |
| 60–79 | Promising prospect |
| 40–59 | Research first |
| 20–39 | Low priority |
| 0–19 | Not a priority |
| Not assessed | Insufficient website evidence; not a rejected prospect |

A missing source URL is **unverified**, not proof that no website exists. Source-listed
Facebook has its own classification; Facebook found only in search is ignored.
Confirmed HTTPS, redirect-loop or hosting setup problems have a distinct
**configuration issue** status and a weighted repair score. A live site without a
verified quality assessment remains unscored. Won, lost and
skipped prospects score zero for new prospecting.

Domain checks prefer the country extension, then `.com`, using public RDAP or DNS
Belgium DAS for `.be`. Unsupported or failed checks remain unknown. Both extensions
can earn the same domain contribution, without doubling it. Read the
[presence, scoring and domain guide](guides/SCORING.md) for the full calculation.

## Add optional enrichment

**Website discovery** searches by business name and address when no independent
website is supplied. SearXNG takes precedence over Brave when configured; it never
falls back to Brave after a failure. Search throttling can extend scans while new
prospects continue to appear. See [search configuration](guides/CONFIGURATION.md)
and [SearXNG operations](guides/DEPLOYMENT.md#searxng-configuration-and-throttling).

**Local AI** uses Ollama with separate light and heavy model roles for evidence
selection, listing summaries and verified website audits. It collects bounded text
and HTML evidence; it does not render websites or measure visual design, actual
mobile layout, Lighthouse performance or accessibility. Operator business profiles
live outside the repository. Follow [local AI setup](guides/LOCAL_AI.md) and the
[model roles and evaluation notes](LOCAL_AI_MODELS.md).

## Documentation and development

- [Configuration](guides/CONFIGURATION.md): precedence, defaults, search and languages.
- [Deployment](guides/DEPLOYMENT.md): Docker, storage, throttling, workers and troubleshooting.
- [Scoring](guides/SCORING.md): presence statuses, weights, levels and domain availability.
- [Local AI](guides/LOCAL_AI.md): Ollama, evidence, qualification and private profiles.
- [Environment reference](.env.example): supported variables and example values.
- [Contributing](CONTRIBUTING.md): architecture, tests and development workflow.

The stack is Next.js, React, TypeScript, Drizzle/libSQL, Tailwind, Leaflet and Vitest.
The domain engine stays framework-free. No bulk email or automatic outreach is
implemented or planned; PresenceZero helps you prepare a shortlist for human review.
