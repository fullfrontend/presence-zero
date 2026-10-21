# Presence, lead scores and domains

[Back to README](../README.md) · [Search configuration](CONFIGURATION.md) · [Local AI](LOCAL_AI.md)

## Read the presence status first

| Status | Meaning |
|---|---|
| `not_found` | A completed search found no matching independent website; this is not proof of absence. |
| `facebook` | A source-listed Facebook presence, without a verified independent site. Search-only Facebook results do not count. |
| `none` | Unverified website presence: no usable source website and no conclusive search. |
| `dead` | The supplied or discovered site failed the website probe's availability checks. |
| `parked` | The probe identified a parked domain. |
| `alive` | The site responds; a verified audit is needed to assess its improvement need. |
| `probe_failed` | The check could not establish presence. This is not a confirmed dead site. |

A live response does not prove that the site belongs to the business. Website
identity matching is part of the optional AI audit's evidence checks.

## Calculate prospecting priority

The score is prospecting priority, not a probability of closing a sale. All weights and levels live in [`scoring.config.ts`](../scoring.config.ts).

| Signal | Maximum contribution |
|---|---|
| Website need | 45 |
| Activity (review volume, capped at 100) | 20 |
| Direct contact (phone) | 20 |
| Reputation (rating, supported by at least 10 reviews) | 10 |
| Domain readiness (existing live site or exact national domain or .com available) | 5 |

**Formula:** need × (45 + activity + contact + reputation + domain readiness).
Need is 100% for no site found after search, 95% for a dead site, 90% for a parked site,
75% for source-listed Facebook, and 40% for unverified absence. For a live site with a
completed, identity-matched audit it is `(100 − website quality) / 100`.
Thus popularity cannot compensate for a good website with little improvement need.
Missing commercial evidence earns no points; missing website assessment remains unscored,
not zero. Won, lost and skipped prospects score zero for new prospecting.

80–100: priority; 60–79: promising; 40–59: research first; 20–39: low priority;
0–19: not a priority. 100 requires all favorable observable signals, without claiming
knowledge of budget or buying intent. These weights target website creation/redesign;
they do not infer an IT maintenance need from unavailable evidence.
Historical results and exports are recalculated from stored evidence on read.

Every lead's score is also **explained per row**: expand a result to see exactly which signals earned which points, plus a deterministic, non-spammy **outreach angle** drafted from that lead's real signals (no site + strong reviews + an available domain) that you can copy and personalize before reaching out.

### Contribution details

Activity contributes 0 points with no reviews, 4 from 1 review, 8 from 5,
13 from 20, 17 from 50 and 20 from 100. Reputation contributes up to 10:
`10 × clamp((rating − 3) / 1.5, 0, 1) × clamp(reviewCount / 10, 0, 1)`.
These contributions, like phone and domain readiness, are multiplied by need.

For example, a business with no site found and no other evidence scores 45.
With 100 reviews, a rating of 4.5, a phone and an available exact domain, it scores
100. With those same commercial signals and a verified website quality of 90,
it scores 10. Missing website assessment is displayed as **not assessed**, not 0.
Rounded contributions always add up to the displayed total.

Enabling search or AI adds no points by itself. New evidence can change a score;
for example, finding a working website replaces an earlier absence assumption.
The AI qualification threshold controls inclusion in **Leads only** for audited
live sites; it is not an extra score bonus. Notes and follow-up status remain
available even when a lead is no longer a prospecting priority.

## Check matching domains for free

Candidates use the scan country code first (`be` → `.be`, `fr` → `.fr`, `us` → `.us`,
`gb` → `.uk`), with `.com` as an additional option. The exact national name and exact
`.com` earn the same domain-readiness contribution, capped at 5 points together.
Suggested domains also prefer the national extension when available.

No paid API or API key is required. Checks use public [RDAP](https://about.rdap.org/)
registries and, for `.be`, the [DNS Belgium DAS service](https://docs.dnsbelgium.be/be/general/whoisanddas.html)
on TCP port 4343. Belgium requests are spaced by at least 1.5 seconds per application
process; confirmed results are cached. Unsupported extensions, blocked connections,
rate limits and inconclusive responses remain unknown, never “available”. A missing
DNS record alone is not proof that a domain can be registered.
The old availability cache is bypassed after this update; rerun old scans to refresh
previously recorded domain checks. Multiple application processes share the registry's
IP-based limits, so rate limiting can still produce unknown results.

RDAP support depends on the national registry. `.fr`, `.ca`, `.re` and `.yt`
are routed through registry RDAP services; `.be` uses the dedicated DAS path.
There is no generic WHOIS fallback for extensions without RDAP support, including
`.ch` and `.lu` at the time this integration was documented. Coverage can evolve
with the [IANA bootstrap registry](https://data.iana.org/rdap/dns.json).
Confirmed available results are cached for 24 hours, occupied domains for 30 days.
These are registration checks, not a guarantee that an unused domain is available
at a particular price or that the business owns a registered candidate.
