import { SectionTag } from '@/components/brand/section-tag'
import { HeadlineRule } from '@/components/brand/headline-rule'
import { Button } from '@/components/brand/button'

export function WorkWithMe() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <SectionTag>{'// WORK WITH ME'}</SectionTag>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Prefer it built for you?</h2>
      <HeadlineRule />
      <p className="mt-6 max-w-2xl text-lg text-dim">
        PresenceZero is open-source and self-hostable. If you&apos;d rather have it white-labeled, hosted, or
        extended for your agency&apos;s exact workflow, I build custom lead-gen tooling for web studios and agencies.
      </p>
      <div className="mt-8">
        <Button href="mailto:hello@its-tahir.com">Get in touch</Button>
      </div>
    </section>
  )
}
