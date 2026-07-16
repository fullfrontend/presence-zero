export function DomainChips({ domains }: { domains: { domain: string; available: boolean | null }[] }) {
  const available = domains.filter(d => d.available === true)
  if (available.length === 0) return <span className="text-mute">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {available.map(d => (
        <span key={d.domain} className="rounded border border-lime/30 bg-lime/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-lime">{d.domain}</span>
      ))}
    </div>
  )
}
