import { SectionTag } from '@/components/brand/section-tag'
import { HeadlineRule } from '@/components/brand/headline-rule'

export function Ethics() {
  return (
    <section id="ethics" className="border-t border-line bg-surface/40">
      <div className="mx-auto max-w-3xl px-6 py-24 text-center lg:py-32">
        <div className="flex justify-center">
          <SectionTag>{'// THE LINE'}</SectionTag>
        </div>
        <h2 className="mt-4 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
          A lead finder. Never a spam tool.
        </h2>
        <div className="mx-auto"><HeadlineRule /></div>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-dim">
          PresenceZero finds businesses and checks domains — it does not send email, message anyone,
          or scrape contacts for outreach. What you do with your exported list is your business.
          Bulk email is not, and will never be, a feature of this project.
        </p>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-dim">
          Your sources stay your own. PresenceZero never proxies or resells data: OpenStreetMap is open
          data, CSV is your list, and the optional Google and Apify sources run on your account, your
          key, and their terms. We name that plainly rather than bury it.
        </p>
      </div>
    </section>
  )
}
