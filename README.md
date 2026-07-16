# PresenceZero

**Find businesses whose web presence is zero.**

PresenceZero scans a location and business category, then flags the businesses that have no website, a dead one, or a domain squatted by a parking page — the businesses most likely to want (and pay for) a new site. For each lead it checks whether a matching domain name is still available, scores the opportunity from 0–100, and gives you a filterable table you can work from and export to CSV. It's a self-hosted, bring-your-own-API-key lead *finder*, not an outreach or CRM tool.

<!-- screenshot: docs pending -->

## Features

- **Pluggable providers** — Google Places (bring your own API key), OpenStreetMap (Nominatim + Overpass, no key required), or CSV import of a list you already have.
- **Website presence classification** — every lead is probed and labeled `none` (no website on file), `dead` (unreachable / 5xx), `parked` (for-sale / parking-page patterns detected), or `alive` — or `probe_failed` if the probe itself errored.
- **Domain availability check** — generates likely domain candidates from the business name and checks them via RDAP (no API key needed) to see if the exact-match domain is free to register.
- **0–100 opportunity scoring** — ranks leads by how much they need (and how easy it would be to sell) a new web presence. Fully configurable, see [Scoring](#scoring).
- **Lead pipeline statuses** — `new → contacted → replied → won | lost`, plus `skipped`, with a single note field per lead.
- **CSV export** — take the results anywhere.
- **Free-tier philosophy** — every dependency runs on a free tier. Providers are bring-your-own-key; RDAP and OpenStreetMap need no key at all. Self-host on a Raspberry Pi with Docker, or deploy to Vercel's Hobby tier with a free Turso database.

## Quick start — Docker

```bash
docker build -t presencezero .
docker run -v ./data:/data -p 3000:3000 presencezero
```

Open `http://localhost:3000`. The SQLite database lives at `./data/presencezero.db` on the host, so it survives container restarts and upgrades.

## Quick start — Vercel + Turso

PresenceZero uses SQLite via [libSQL](https://turso.tech/libsql), so it runs equally well against a local file or a hosted [Turso](https://turso.tech) database — Turso's free tier is generous enough for personal/small-team use.

1. Create a free Turso database (`turso db create presencezero`, or via the Turso dashboard) and grab its `libsql://` URL and an auth token.
2. Deploy this repo to Vercel and set two environment variables:
   - `DATABASE_URL` — your Turso `libsql://...` URL
   - `DATABASE_AUTH_TOKEN` — the token you generated
3. Deploy. Migrations run against the Turso database the same way they do locally.

**No auth.** PresenceZero ships without a login screen — anyone with the URL can use it and see your leads. Keep your deployment URL private (don't share it publicly, don't link it from a public page) until auth lands as a feature.

## Data sources

**Google Places** — go to the [Google Cloud Console](https://console.cloud.google.com/), create a project, and enable **"Places API (New)"** (the classic Places API will not work — the field mask this app requests is New-API-only). Create an API key restricted to that API and add it under Settings in the app, or set it as the `GOOGLE_PLACES_API_KEY` environment variable. Google's free tier covers a meaningful number of monthly searches before billing kicks in.

**OpenStreetMap** — no key required, backed by the public Nominatim (geocoding) and Overpass (data) APIs. Currently supported categories: `restaurant`, `cafe`, `bar`, `dentist`, `bakery`, `hairdresser`, `butcher`, `florist`, `plumber`, `electrician`, `carpenter`. More can be added by extending the tag map in `src/core/providers/osm.ts`.

**CSV import** — bring your own list. Expected header row:

```
name,address,phone,category,rating,review_count,website
```

Only `name` is required; every other column is optional and left blank if unknown.

## Scoring

Every lead gets a score out of 100, built from weighted signals. Defaults live in `scoring.config.ts`:

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

## Ethics

PresenceZero is a lead **finder**, not a spam tool. It has no bulk-email, auto-outreach, or scraping-for-spam features, and none are planned — that's a permanent design decision, not a missing feature. The intended workflow is: find a short list of genuinely underserved local businesses, then reach out yourself, like a human, because you have something worth offering them.

## Contributing

Adding a new lead-source provider is a single, contained change:

1. Implement the `Provider` interface (`src/core/providers/provider.ts`) — one file, one `id`, one `fetchPage(area, cursor, config)` method returning `{ businesses, nextCursor }`.
2. Add fixtures under `fixtures/` and tests under `tests/` that exercise it against those fixtures (no live network calls in tests).
3. Register it in `src/core/providers/index.ts`'s `registerBuiltInProviders()`.

`src/core/` is plain TypeScript with no Next.js or React imports — providers, probes, scoring, and the pipeline all run and test independently of the web app.

## License

MIT — see [LICENSE](LICENSE).
