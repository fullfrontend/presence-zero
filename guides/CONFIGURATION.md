# Configuration and website discovery

[Back to README](../README.md) · [Deployment](DEPLOYMENT.md) · [Local AI](LOCAL_AI.md)

## Configuration precedence

The **Settings** page groups General, Data sources, Website discovery and Local AI.
Saved settings take priority over `.env`; this includes API keys, search/AI enable
switches, model roles, scan defaults, throttling, audit limits and qualification.
Each field shows its source. Choose **Customize in Settings** to override it, or
**Use environment / default** to restore inheritance. Advanced options are folded.

Changes persist in the local database and apply at the next scan step without a
restart. A running step finishes using the settings it started with. Completed
reports are preserved. Saved API keys take priority over environment
keys; choose **Use environment key** to restore the environment credential.
**Disable this key** explicitly suppresses even an environment key. API responses
only expose whether credentials exist, never their values or private prompt contents.

The database connection, Docker ports, `PRESENCEZERO_WORKER_ENABLED`,
`APIFY_MAX_PLACES` deployment ceiling and `AI_PROMPTS_DIR` private directory
remain environment-only. Restart or
recreate the app after changing environment defaults. Settings does not edit `.env`.
The private profile ID is editable; profile files stay outside the repository.
The interface language selected in a browser still takes priority over its default.

## Defaults for a new scan

With no location variables or saved overrides, the application starts with
**Charleroi, Belgique** and country code **be**. The committed `.env.example`
intentionally preserves the original example values: **blank location** and **us**.
Copying that file therefore changes the initial form. To use Charleroi explicitly:

```dotenv
PRESENCEZERO_DEFAULT_LOCATION="Charleroi, Belgique"
PRESENCEZERO_DEFAULT_COUNTRY_CODE=be
```

The country code controls domain candidates as well as provider location context.
Users can edit the form for each scan. Google Places is preselected when an effective
Google API key is configured; otherwise OpenStreetMap is available without a key.

## Enable optional search

Search and AI have separate switches. A configured URL, model or API key alone does
not enable either feature. Saved Settings overrides also apply to these switches.

For a local SearXNG instance:

```dotenv
SEARXNG_ENABLED=true
SEARXNG_URL=http://127.0.0.1:8080
```

For Brave Search:

```dotenv
BRAVE_SEARCH_ENABLED=true
BRAVE_SEARCH_API_KEY=your-own-key
```

SearXNG takes priority when enabled with a URL. A failure does not fall back to
Brave. Set the relevant switch to `false` to retain credentials without using it.
See [Docker and throttling](DEPLOYMENT.md#searxng-configuration-and-throttling).

## How discovery interprets results

A missing website in OSM or Google Places means **unverified**, not confirmed absence of a website.

Each eligible business is searched by name and address. Businesses with an
independent website already listed, or without an address, are not searched.
Brave uses one request per eligible business, with an eight-second request timeout;
SearXNG additionally follows the shared throttle and retry rules in the deployment guide.

Discovery conservatively requires a branded hostname, matching business name,
and street/building number/locality evidence in the search snippets. Multiple
matching hostnames, missing evidence, directories, and search failures remain
unverified. This heuristic can miss legitimate sites; it is not proof of ownership
or of absence. A selected site passes through the existing SSRF-protected probe
and scoring pipeline. Its discovery source is recorded in the presence tooltip.
Live sites without a verified website audit remain unscored; qualified audited opportunities can appear in the leads-only view.

Completed scans are snapshots: use **Rerun** after enabling discovery to create a
fresh scan. Automated tests use synthetic search fixtures and never the network.

Facebook links count only when supplied by the source listing (including OSM's
Facebook tags) or identified from its supplied URL. A Facebook result from search
is ignored for scoring. A discovered independent website is probed and used in the
same score calculation as a source-listed website. See [presence and scoring](SCORING.md).

## Interface and report languages

The interface supports **French (`fr-FR`)** and **American English (`en-US`)**.
Use the language selector in the navigation bar. The preference is saved in a
`pz-locale` cookie for one year and applies throughout the app, without
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

## Complete reference

[`.env.example`](../.env.example) documents all supported environment settings.
[Settings definitions](../src/config/settings.ts) list the fields that can be
overridden in the application. Secrets remain in the environment or database;
Settings never writes them back into the repository.
