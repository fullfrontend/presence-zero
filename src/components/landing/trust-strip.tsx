const CHIPS = [
  'Open source',
  'Self-hosted',
  'Free OSM + CSV',
  'BYO keys',
  'No mass outreach',
] as const

export function TrustStrip() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-4 lg:pb-8">
      <ul className="flex flex-wrap items-center gap-2" aria-label="Product highlights">
        {CHIPS.map((label) => (
          <li
            key={label}
            className="rounded-md border border-line px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-mute"
          >
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}
