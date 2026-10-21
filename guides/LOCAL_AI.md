# Local AI and private business profiles

[Back to README](../README.md) · [Configuration](CONFIGURATION.md) · [Model roles and evaluation](../LOCAL_AI_MODELS.md)

## Enable Ollama

`AI_AUDIT_ENABLED` is the global switch for **all AI features**. Only `true`
in the effective configuration (Settings first, then `.env`) enables the light and heavy models, evidence preparation, lead summaries
and website audits. With `false` or an unset flag, no Ollama requests, AI-specific
crawling or private prompt-profile loading occur, even if models and
`AI_AUDIT_PREPARE_EVIDENCE=true` are configured. Restart the app after changing `.env`; Settings changes apply at the next scan step. Existing saved reports remain visible; normal
website probes, lead scoring and independently enabled search continue to work.

Optional audits bring the business-analysis concepts from Lead Hunter into this
single-operator app: official-site identity checks, bounded evidence collection,
website quality estimates, project briefs, and evidence-backed qualification.
Accounts, teams, automated outreach and Lead Hunter platform infrastructure are outside
this integration. No OpenRouter or paid/cloud AI fallback is used.

1. Install and start [Ollama](https://ollama.com/).
2. Download the selected light and heavy models: `ollama pull qwen3.5:4b-q4_K_M`
   and `ollama pull qwen3.5:9b-q4_K_M`.
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
See [model selection and validation](../LOCAL_AI_MODELS.md) for the researched
choices, alternatives and limitations. Run `npm run ai:evaluate` for an explicit
live Ollama check using synthetic HTML (separate from the network-free tests).

## When audits run

When enabled, audits run as independent jobs after the required website and phone checks.
Completed scans are snapshots: use **Rerun** to add or retry audits. Existing
presence classifications and source-only Facebook rules are preserved; verified audit evidence can update the lead score.
A site that responds is not automatically assumed official: the collected text
must match the business name plus phone or address before website quality is scored.
A mismatch, blocked crawl or insufficient text leaves the audit unverified.
Businesses without a live site receive a contextual summary of the known listing
and presence status, without a fabricated website score or claims of proven absence.

## Evidence collection and validation

Up to three HTML pages are fetched by default (home, then selected
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

## Reports and qualification

The [scoring guide](SCORING.md) defines the single lead
score /100. A completed, identity-matched website audit supplies its need multiplier;
failed, skipped, profile-only and unverified reports cannot establish website quality.

Audits consider business relevance, clarity of services and contact paths,
documented barriers, explicit content dates and HTML signals. Recent relevant
content is positive evidence; a copyright year or business founding year is not
a website creation/redesign date. No browser rendering occurs: visual fashion,
actual mobile layout, performance and accessibility remain unassessed.

For compatibility, downloaded reports and CSV retain technical audit metrics. Website quality (0–100, higher is better) is an AI estimate
from text and HTML signals, not a visual, Lighthouse, speed or accessibility test.
Improvement opportunity is `100 - website quality`. A verified audit above the
configured opportunity threshold appears in **Leads only**, including a live site.
The existing **Min score** filter applies to the unified lead score, including verified website improvement potential. **Audited websites only** narrows the
view to completed website audits. Expand a finding to inspect the report and
quoted evidence, or download its JSON. CSV export adds audit fields/evidence and
uses the same filters and spreadsheet-injection protection as the UI.

### Audit limits and filters

[`.env.example`](../.env.example) lists model roles, independent
time/context/output budgets, page limits, report language and qualification filters.
Settings can override these fields. `AI_PROMPTS_DIR` remains deployment-only.

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

## Private business prompt profiles

The generic, non-proprietary [example](../examples/ai-prompts/default.json) is tracked
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
changing Settings or the environment. Reports store only the profile ID and SHA-256 revision,
not private instructions. The profile contents are sent only to configured Ollama.

Without `AI_PROMPTS_DIR`, only `AI_PROMPT_PROFILE=default` uses the bundled example.
Keep private files owner-readable (for example permissions `0600`) and maintain your
own backup. Do not add them to this repository, even in an ignored source folder.

The Docker launcher reads `.env` and, when `AI_PROMPTS_DIR` is set, includes
`compose.ai-prompts.yaml`. It mounts the external directory read-only at
`/run/presencezero-prompts`; the image contains only the generic example. For manual
Compose use, load `.env` and `.env.docker` and include both Compose files. Use an
absolute host path for the mount, with `AI_PROMPT_PROFILE` selecting the file.
