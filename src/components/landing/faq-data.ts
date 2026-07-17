export const FAQ_ITEMS: { q: string; a: string }[] = [
  { q: 'Is PresenceZero free?', a: 'Yes — it is open-source (MIT) and self-hosted. It runs fully free on OpenStreetMap and CSV with no keys at all; RDAP domain checks need no key. Optional sources (Google Places, Apify) use your own account and free tier.' },
  { q: 'Does it send cold emails?', a: 'No. PresenceZero is a lead finder, not an outreach or CRM tool. It never sends mail — that is a permanent design line.' },
  { q: 'Where does the business data come from?', a: 'OpenStreetMap (free, no key), your own CSV import, Google Places (your API key), or Apify’s Google Maps scraper (your Apify account). OpenStreetMap and CSV need no account at all.' },
  { q: 'Do I need to pay for Apify?', a: 'No. Apify is optional — OpenStreetMap and CSV are free and keyless. If you do use it, Apify’s free plan renews $5 of credit every month (about 1,250 places, roughly 25 scans of 50), needs no credit card, and simply stops when the credit runs out. PresenceZero never charges you per lead and never proxies the call — it is your account and your quota.' },
  { q: 'How is the 0–100 score calculated?', a: 'From web presence (none/dead/parked), review count and rating, whether the exact .com is available, and whether a phone number exists.' },
  { q: 'Can I try it without installing?', a: 'Yes — the live demo shows a real, read-only result set. To run your own scans, self-host in about two minutes.' },
]
