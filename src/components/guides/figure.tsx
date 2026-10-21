import Image from 'next/image'

const SHOTS = {
  'demo-expand': { src: '/screenshots/demo-expand.gif', w: 960, h: 600, alt: 'PresenceZero results table: a lead row expands to show its 0–100 score breakdown and a suggested outreach angle' },
  'lead-detail': { src: '/screenshots/demo-lead-detail.png', w: 1440, h: 900, alt: 'PresenceZero lead detail panel with presence verdict, available domains and score factors' },
  'landing': { src: '/screenshots/landing-hero.png', w: 1884, h: 899, alt: 'PresenceZero landing page with a live scored lead preview' },
} as const

export type ShotName = keyof typeof SHOTS

/** A real product screenshot inside a guide, framed like an app window. */
export function Figure({ shot, caption }: { shot: ShotName; caption: string }) {
  const s = SHOTS[shot]
  return (
    <figure className="not-prose my-8 -mx-1 sm:mx-0">
      <div className="overflow-hidden rounded-xl border border-line bg-[#0d0e10] shadow-[0_30px_80px_-40px_rgba(198,242,78,0.25)]">
        <div className="flex gap-1.5 border-b border-line px-3 py-2" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-white/15" /><span className="h-2 w-2 rounded-full bg-white/15" /><span className="h-2 w-2 rounded-full bg-white/15" />
        </div>
        <Image
          src={s.src}
          width={s.w}
          height={s.h}
          alt={s.alt}
          sizes="(min-width: 1024px) 680px, 100vw"
          className="h-auto w-full"
          unoptimized={s.src.endsWith('.gif')}
        />
      </div>
      <figcaption className="mt-3 text-sm text-mute">{caption}</figcaption>
    </figure>
  )
}
