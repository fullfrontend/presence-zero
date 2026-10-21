# Deployment and background processing

[Back to README](../README.md) · [Configuration](CONFIGURATION.md) · [Local AI](LOCAL_AI.md)

PresenceZero needs a persistent Node server. Closing a browser tab is safe; stopping
the server pauses processing until a worker runs again. A Turso database does not
make a serverless deployment a background worker. The embedded worker is disabled
on Vercel. There is no built-in authentication: keep the instance private.

## Run the full Docker stack

Docker Desktop or Docker Engine with Compose must be running. Use Node.js 22+ for
the launcher and run commands from the repository root. Search remains disabled
until enabled in Settings or `.env`, even though the stack starts SearXNG.

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

## Run only SearXNG in Docker

Keep your existing local app and scans:

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

## SearXNG configuration and throttling

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

## Routine operations

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

## Application-only container

SearXNG is optional. To run only PresenceZero:

```bash
docker build -t presencezero .
mkdir -p data
docker run --name presencezero --restart unless-stopped \
  --env-file .env -e HOSTNAME=0.0.0.0 -e DATABASE_URL=file:/data/presencezero.db \
  -v "$(pwd)/data:/data" -p 127.0.0.1:3000:3000 presencezero
```

Create `.env` from the example first, or omit `--env-file .env` to use application
defaults. This bind-mounted database is separate from both the local development
database and the Compose named volume. The image uses Next.js standalone output;
its command starts `server.js`, not `next start`.

## Database and upgrades

Local development uses `file:presencezero.db` unless overridden. A persistent server
may instead use a Turso/libSQL URL and `DATABASE_AUTH_TOKEN`. The supplied Compose
stack explicitly selects its local volume database; change that deployment configuration
if you want a hosted database there.

Migrations run through `getDb()` on startup. Stop the app before copying a local
SQLite database and its journal files, or use a SQLite-aware backup. Preserve the
Docker volume, external prompt profiles and your local configuration separately.
Update the checkout, run `npm ci`, then rebuild/restart the deployment. Never delete
the database to resolve a missing table or column. Confirm which `DATABASE_URL` and
application instance produced the error; old local and Docker instances may use
different databases. Startup also repairs the known legacy `scan_jobs.result` column.

## Background stages and concurrency

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
IDs prevent duplicate persisted prospects. Most failed tasks get two attempts in total; search jobs get three. Failures preserve already collected prospects.

Pause stops new tasks; in-flight tasks finish and save safely. Resume uses the saved
cursor and queue. Provider pauses still let previously collected prospects finish.
The scan completes when collection and all its enrichment tasks have settled.
`PRESENCEZERO_WORKER_ENABLED=false` disables the worker on this server (restart
required); use it only if another persistent server processes the same database.

## Troubleshooting

| Symptom | Check |
|---|---|
| Changed `.env` has no effect | The field's source in Settings; restore environment inheritance, then restart the server. |
| New prospects appear but enrichment waits | Per-stage progress, search cooldown and worker concurrency. Collection runs independently. |
| Scan does not advance after closing the terminal | Keep a persistent server running; check `PRESENCEZERO_WORKER_ENABLED`. |
| CAPTCHA despite a language change | Upstream engine restrictions; adjust local engines and allow the shared cooldown to expire. |
| Ollama unavailable in Docker | Host reachability, server bind address and `host.docker.internal`; see the AI guide. |
| Domain stays unknown | Registry support, rate limits and outbound TCP 4343 for `.be`; unknown is not available. |
| Old results lack coordinates or new audit evidence | Use Rerun to collect fresh evidence; score recalculation alone does not re-enrich a scan. |

The app fetches external websites with SSRF controls, bounded reads and redirects.
AI collection additionally validates and pins public IPs, respects robots.txt and
stores bounded evidence. These controls do not replace private deployment. Map tiles
are fetched by the browser from OpenStreetMap; the map needs internet access and
must retain attribution and follow its tile policy.
