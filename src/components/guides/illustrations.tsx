import type { CSSProperties, ReactNode } from 'react'
import { PresenceBadge } from '@/components/app/presence-badge'
import { ScaleToFit } from './scale-to-fit'

/*
 * One illustration per guide, built from the product's own vocabulary (presence
 * badges, probe reasons, RDAP responses, scores) rather than stock art. CSS-only:
 * each plays one orchestrated sequence on load and settles on a meaningful final
 * frame — which is also what reduced-motion users and `still` thumbnails see.
 */

type Props = { still?: boolean; decorative?: boolean }
const d = (s: number): CSSProperties => ({ animationDelay: `${s}s` })

function Frame({ still, decorative, label, children }: Props & { label: string; children: ReactNode }) {
  // Inside a link (cards, thumbnails) the art is decorative: the link text names it.
  const a11y = still || decorative ? { 'aria-hidden': true as const } : { role: 'img', 'aria-label': label }
  return (
    <div
      {...a11y}
      className={`pzg @container relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-line bg-[#0d0e10] ${still ? 'pzg-still' : ''}`}
    >
      {children}
    </div>
  )
}

/* ---- 1. Map scan: a sweep passes over a city grid and pins resolve into verdicts ---- */
const PINS = [
  { x: 14, y: 22, s: 'none', name: "Joe's Bakery" },
  { x: 38, y: 58, s: 'alive' },
  { x: 90, y: 14, s: 'dead', name: 'Rivera Plumbing' },
  { x: 24, y: 74, s: 'alive' },
  { x: 80, y: 46, s: 'parked', name: 'Bloom Florist' },
  { x: 52, y: 82, s: 'alive' },
  { x: 70, y: 70, s: 'none', name: 'Kim Auto Repair' },
  { x: 46, y: 36, s: 'alive' },
] as const

export function MapScanArt({ still, decorative }: Props) {
  return (
    <Frame still={still} decorative={decorative} label="A scan sweeping a city map and marking businesses with no, dead or parked websites">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
        <g stroke="rgba(250,250,250,0.07)" strokeWidth="10" fill="none" strokeLinecap="round">
          <path d="M-10 110 C 90 90, 180 140, 410 100" />
          <path d="M120 -10 C 140 100, 100 200, 150 310" />
          <path d="M260 -10 L 300 310" />
        </g>
        <g stroke="rgba(250,250,250,0.04)" strokeWidth="1">
          {Array.from({ length: 9 }, (_, i) => <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="300" />)}
          {Array.from({ length: 7 }, (_, i) => <line key={`h${i}`} x1="0" y1={i * 50} x2="400" y2={i * 50} />)}
        </g>
      </svg>
      <div className="pzg-sweep absolute inset-y-0 w-24" aria-hidden="true" />
      {PINS.map((p, i) => {
        const delay = 0.3 + (p.x / 100) * 1.6
        const lead = p.s !== 'alive'
        return (
          <div key={i} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <span className="absolute -left-1.5 -top-1.5 block h-3 w-3 rounded-full bg-white/25" />
            <span
              className={`pzg-pop absolute -left-1.5 -top-1.5 block h-3 w-3 rounded-full ${lead ? 'bg-lime pzg-ping' : 'bg-white/40'}`}
              style={d(delay)}
            />
            {lead && 'name' in p && (
              <div className={`pzg-rise absolute -top-3 ${p.x > 50 ? 'right-3 flex-row-reverse' : 'left-3'} hidden @sm:flex items-center gap-2 whitespace-nowrap rounded-md border border-line bg-base/90 px-2 py-1 text-[11px] text-text shadow-lg`} style={d(delay + 0.15)}>
                {p.name}
                <PresenceBadge status={p.s} />
              </div>
            )}
          </div>
        )
      })}
    </Frame>
  )
}

/* ---- 2. RDAP terminal: a lookup is typed, a 404 comes back, the domain lights up ---- */
export function RdapTerminalArt({ still, decorative }: Props) {
  return (
    <Frame still={still} decorative={decorative} label="A terminal running an RDAP lookup that returns 404, meaning the domain is available">
      <div className="absolute inset-4 flex flex-col rounded-xl border border-line bg-base/80 @md:inset-6">
        <div className="flex gap-1.5 border-b border-line px-3 py-2.5" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-white/15" /><span className="h-2 w-2 rounded-full bg-white/15" /><span className="h-2 w-2 rounded-full bg-white/15" />
        </div>
        <div className="flex-1 space-y-2 p-4 font-mono text-[11px] leading-relaxed @md:text-xs">
          <p className="text-mute"><span className="text-lime">$</span>{' '}
            <span className="pzg-type inline-block max-w-full overflow-hidden whitespace-nowrap align-bottom" style={{ '--pzg-ch': 37 } as CSSProperties}>curl rdap.org/domain/smithplumbing.com</span>
          </p>
          <p className="pzg-rise text-dim" style={d(1.9)}>HTTP/2 <span className="text-lime">404</span> Not Found</p>
          <p className="pzg-rise text-mute" style={d(2.2)}>{'{ "errorCode": 404, "title": "Not Found" }'}</p>
          <p className="text-mute"><span className="text-lime">$</span>{' '}
            <span className="pzg-type inline-block overflow-hidden whitespace-nowrap align-bottom" style={{ '--pzg-ch': 30, animationDelay: '2.6s' } as CSSProperties}>curl rdap.org/domain/smith.com</span>
          </p>
          <p className="pzg-rise text-dim" style={d(4.1)}>HTTP/2 200 OK <span className="text-mute">(registered)</span></p>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line p-3">
          <span className="pzg-pop inline-flex items-center gap-2 rounded-md border border-lime/50 bg-lime/10 px-2.5 py-1 font-mono text-[11px] text-lime" style={d(2.3)}>
            <span className="h-1.5 w-1.5 rounded-full bg-lime" aria-hidden="true" />smithplumbing.com is available
          </span>
          <span className="pzg-pop inline-flex items-center gap-2 rounded-md border border-line px-2.5 py-1 font-mono text-[11px] text-mute" style={d(4.3)}>
            smith.com is taken
          </span>
        </div>
      </div>
    </Frame>
  )
}

/* ---- 3. Probe verdicts: listed URLs are fetched one by one and get a reasoned verdict ---- */
const PROBES = [
  { url: 'joesbakery.ca', s: 'dead', why: 'DNS lookup failed' },
  { url: 'bloomflorist.com', s: 'parked', why: 'Matched a registrar for-sale page' },
  { url: 'riveraplumbing.net', s: 'dead', why: 'Returned HTTP 503' },
  { url: 'citydental.ca', s: 'alive', why: 'Responded normally' },
] as const

export function ProbeVerdictArt({ still, decorative }: Props) {
  return (
    <Frame still={still} decorative={decorative} label="Listed business websites being checked and labelled dead, parked or alive with the reason">
      <div className="absolute inset-4 flex flex-col justify-center gap-2.5 @md:inset-6">
        {PROBES.map((p, i) => (
          <div key={p.url} className="pzg-rise flex items-center gap-3 rounded-lg border border-line bg-base/70 px-3 py-2.5" style={d(0.2 + i * 0.55)}>
            <span className="relative h-4 w-4 shrink-0" aria-hidden="true">
              <span className="pzg-spinner absolute inset-0 rounded-full border-2 border-white/15 border-t-lime" style={d(0.2 + i * 0.55)} />
              <span className={`pzg-pop absolute inset-1 rounded-full ${p.s === 'alive' ? 'bg-white/30' : 'bg-lime'}`} style={d(0.75 + i * 0.55)} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[11px] text-text @md:text-xs">{p.url}</p>
              <p className="pzg-rise truncate text-[11px] text-mute" style={d(0.8 + i * 0.55)}>{p.why}</p>
            </div>
            <span className="pzg-pop" style={d(0.8 + i * 0.55)}><PresenceBadge status={p.s} /></span>
          </div>
        ))}
      </div>
    </Frame>
  )
}

/* ---- 4. Lead funnel: a scan narrows to the few leads worth a personal call ---- */
const STAGES = [
  { label: 'Businesses scanned', n: 120, w: 100 },
  { label: 'No, dead or parked site', n: 34, w: 62 },
  { label: 'Score 70 or higher', n: 11, w: 34 },
  { label: 'Contacted personally', n: 6, w: 20 },
  { label: 'New client', n: 1, w: 8 },
] as const

export function FunnelArt({ still, decorative }: Props) {
  return (
    <Frame still={still} decorative={decorative} label="Illustrative funnel: 120 businesses scanned narrows to one new web design client">
      <div className="absolute inset-5 flex flex-col justify-center gap-3 @md:inset-8">
        {STAGES.map((s, i) => (
          <div key={s.label}>
            <div className="mb-1 flex items-baseline justify-between text-[11px] @md:text-xs">
              <span className="text-dim">{s.label}</span>
              <span className={`tabular-nums ${i === STAGES.length - 1 ? 'text-lime' : 'text-text'}`}>{s.n}</span>
            </div>
            <div className="h-2 rounded-full bg-white/5">
              <div
                className={`pzg-grow h-full rounded-full ${i === STAGES.length - 1 ? 'bg-lime' : i >= 2 ? 'bg-lime/60' : 'bg-white/25'}`}
                style={{ width: `${s.w}%`, ...d(0.2 + i * 0.35) }}
              />
            </div>
          </div>
        ))}
      </div>
    </Frame>
  )
}

/* ---- 5. Mockup build: the one-page site you show an owner, assembling itself ---- */
export function MockupArt({ still, decorative }: Props) {
  return (
    <Frame still={still} decorative={decorative} label="A one-page website mockup for a local plumber assembling, with an available domain">
      <div className="absolute inset-y-4 left-1/2 w-[46%] -translate-x-1/2 rounded-[1.4rem] border border-line bg-base p-2 @md:inset-y-6">
        <div className="flex h-full flex-col gap-2 overflow-hidden rounded-2xl bg-white/3 p-3">
          <div className="pzg-rise h-14 rounded-lg bg-linear-to-br from-lime/25 to-white/5" style={d(0.2)} />
          <p className="pzg-rise text-[13px] font-semibold leading-tight text-text" style={d(0.5)}>Smith Plumbing</p>
          <p className="pzg-rise text-[10px] text-dim" style={d(0.75)}><span className="text-lime">★★★★★</span> 4.8 from 112 reviews</p>
          <div className="pzg-rise space-y-1" style={d(1)}>
            <div className="h-1.5 w-full rounded bg-white/10" /><div className="h-1.5 w-4/5 rounded bg-white/10" /><div className="h-1.5 w-3/5 rounded bg-white/10" />
          </div>
          <div className="pzg-rise mt-auto rounded-md bg-lime py-1.5 text-center text-[11px] font-medium text-base" style={d(1.3)}>Call now</div>
        </div>
      </div>
      <span className="pzg-pop absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-md border border-lime/50 bg-base/90 px-2.5 py-1 font-mono text-[10px] text-lime @md:bottom-6 @md:right-6 @md:text-[11px]" style={d(1.7)}>
        <span className="h-1.5 w-1.5 rounded-full bg-lime" aria-hidden="true" />smithplumbing.com available
      </span>
      <span className="pzg-pop absolute left-4 top-4 @md:left-6 @md:top-6" style={d(0.1)}><PresenceBadge status="none" /></span>
    </Frame>
  )
}

/* ---- 6. Sources flow: four data sources converge into one scored lead table ---- */
const SOURCES = ['Google Places', 'Apify', 'OpenStreetMap', 'CSV import'] as const
const ROWS = [
  { n: "Joe's Bakery", s: 'none', score: 87 },
  { n: 'Bloom Florist', s: 'parked', score: 71 },
  { n: 'Rivera Plumbing', s: 'dead', score: 64 },
] as const

export function SourcesArt({ still, decorative }: Props) {
  return (
    <Frame still={still} decorative={decorative} label="Google Places, Apify, OpenStreetMap and CSV feeding one scored lead list">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
        {[60, 120, 180, 240].map((y, i) => (
          <path key={y} className="pzg-draw" style={d(0.2 + i * 0.15)} d={`M128 ${y} C 170 ${y}, 170 150, 214 150`} stroke="rgba(198,242,78,0.45)" strokeWidth="1.5" fill="none" pathLength={1} />
        ))}
      </svg>
      <div className="absolute inset-y-0 left-[4%] flex w-[29%] flex-col justify-around py-[8%]">
        {SOURCES.map((s, i) => (
          <span key={s} className="pzg-rise truncate rounded-md border border-line bg-base/80 px-2 py-1.5 text-center text-[10px] text-dim @md:text-[11px]" style={d(i * 0.12)}>{s}</span>
        ))}
      </div>
      <div className="absolute right-[4%] top-1/2 w-[44%] -translate-y-1/2 space-y-1.5 rounded-xl border border-line bg-base/90 p-2.5">
        {ROWS.map((r, i) => (
          <div key={r.n} className="pzg-rise flex items-center gap-2 rounded-md bg-white/3 px-2 py-1.5" style={d(1.1 + i * 0.25)}>
            <span className="w-6 text-[11px] font-semibold tabular-nums text-lime">{r.score}</span>
            <span className="min-w-0 flex-1 truncate text-[10px] text-text @md:text-[11px]">{r.n}</span>
            <span className="hidden @md:inline"><PresenceBadge status={r.s} /></span>
          </div>
        ))}
      </div>
    </Frame>
  )
}

const BY_SLUG: Record<string, (p: Props) => ReactNode> = {
  'how-to-find-businesses-without-websites': MapScanArt,
  'how-to-get-web-design-clients': FunnelArt,
  'how-to-sell-websites-to-local-businesses': MockupArt,
  'parked-domains-and-dead-websites': ProbeVerdictArt,
  'check-domain-availability-rdap': RdapTerminalArt,
  'google-maps-leads-free-data-sources': SourcesArt,
}

export function GuideArt({ slug, still, decorative }: { slug: string } & Props) {
  const Art = BY_SLUG[slug] ?? MapScanArt
  return <Art still={still} decorative={decorative} />
}

/** A still, miniature version of a guide's illustration for cards and lists. */
export function GuideThumb({ slug }: { slug: string }) {
  return <ScaleToFit><GuideArt slug={slug} still /></ScaleToFit>
}
