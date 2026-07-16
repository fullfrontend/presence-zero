import { SectionTag } from '@/components/brand/section-tag'
import { HeadlineRule } from '@/components/brand/headline-rule'
import { Button } from '@/components/brand/button'
import { HeroPipeline } from './hero-pipeline'

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
      <div>
        <SectionTag>{'// SELF-HOSTED LEAD FINDER'}</SectionTag>
        <h1 className="mt-4 text-[clamp(2.75rem,7vw,6rem)] font-semibold leading-[0.95] tracking-tight">
          Find the businesses whose web presence is <span className="text-lime">zero</span>.
        </h1>
        <HeadlineRule />
        <p className="mt-6 max-w-md text-lg text-dim">
          Turn a city and a category into a scored, exportable list of local businesses with no
          website — and the matching domains you can pitch them. Open-source. Bring your own keys.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button href="/demo">Explore live demo</Button>
          <Button href="https://github.com/its-tahir/presence-zero" variant="ghost">Get it on GitHub ★</Button>
          <Button href="#quickstart" variant="link">Run it in 2 minutes →</Button>
        </div>
      </div>
      <HeroPipeline />
    </section>
  )
}
