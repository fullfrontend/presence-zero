export const FAQ_ITEMS: { q: string; a: string }[] = [
  { q: 'Is PresenceZero free?', a: 'Yes — it is open-source (MIT) and self-hosted. You bring your own API keys and run on free tiers; RDAP domain checks need no key.' },
  { q: 'Does it send cold emails?', a: 'No. PresenceZero is a lead finder, not an outreach or CRM tool. It never sends mail — that is a permanent design line.' },
  { q: 'Where does the business data come from?', a: 'Google Places (your API key), OpenStreetMap (free, no key), or your own CSV import.' },
  { q: 'How is the 0–100 score calculated?', a: 'From web presence (none/dead/parked), review count and rating, whether the exact .com is available, and whether a phone number exists.' },
  { q: 'Can I try it without installing?', a: 'Yes — the live demo shows a real, read-only result set. To run your own scans, self-host in about two minutes.' },
]
