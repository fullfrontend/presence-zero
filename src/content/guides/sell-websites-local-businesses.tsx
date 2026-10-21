import Link from 'next/link'
import type { Guide } from './types'

export const sellWebsitesToLocalBusinesses: Guide = {
  slug: 'how-to-sell-websites-to-local-businesses',
  title: 'How to Sell Websites to Local Businesses (Scripts & Objections)',
  seoTitle: 'How to Sell Websites to Local Businesses (+ Scripts)',
  description:
    'How to sell websites to local businesses: what to pitch, scripts for calls, visits and email, pricing models, and answers to the most common objections.',
  shortTitle: 'Sell websites to local businesses',
  primaryKeyword: 'how to sell websites to local businesses',
  keywords: [
    'how to sell websites to local businesses',
    'how to sell websites to small businesses',
    'selling websites to local businesses',
    'cold call script for web design',
    'selling ai websites to local businesses',
    'is selling websites to small businesses profitable',
  ],
  published: '2026-10-21',
  updated: '2026-10-21',
  readMinutes: 12,
  tldr:
    'Owners don’t buy websites. They buy more calls, more bookings and looking legitimate when someone searches for them. Lead with what a customer sees today when they search the business name, show a quick mockup, bring an available domain, quote one clear price, and have honest answers ready for "word of mouth is enough" and "I have a Facebook page".',
  sections: [
    {
      id: 'what-they-buy',
      heading: 'What local businesses are actually buying',
      content: (
        <>
          <p>
            A plumber doesn&rsquo;t want a website. They want the phone to ring with the right jobs. Frame
            everything you say around outcomes the owner already cares about:
          </p>
          <ul>
            <li><strong>Being found</strong>{' '}when someone searches &ldquo;plumber near me&rdquo; at 7 a.m. with water on the floor.</li>
            <li><strong>Looking legitimate</strong>{' '}when a customer who heard about them searches their name.</li>
            <li><strong>Fewer repetitive calls</strong>{' '}asking for hours, prices or the service area.</li>
            <li><strong>Owning their presence</strong>{' '}instead of renting it from a directory or a social network.</li>
          </ul>
          <p>
            Technology, frameworks and page speed scores belong in your work, not your pitch.
          </p>
        </>
      ),
    },
    {
      id: 'right-leads',
      heading: 'Start with the right leads',
      content: (
        <>
          <p>
            Selling gets much easier when you only talk to businesses that are busy and visibly lack a web presence.
            Look for a solid review count and rating, a listed phone number, and no website, a{' '}
            <Link href="/guides/parked-domains-and-dead-websites">dead or parked one</Link>, or an available matching
            domain. Our guide on{' '}
            <Link href="/guides/how-to-find-businesses-without-websites">finding businesses without websites</Link>{' '}
            covers free ways to build that list. <Link href="/">PresenceZero</Link>{' '}automates it and scores each lead
            so you start with the best ones.
          </p>
        </>
      ),
    },
    {
      id: 'scripts',
      heading: 'Opening scripts that don’t sound like spam',
      content: (
        <>
          <p>
            Every script below uses something specific to that business. Replace the bracketed parts every time. If
            you can&rsquo;t fill them in, you haven&rsquo;t done enough research on that lead yet.
          </p>
          <h3>Phone</h3>
          <blockquote>
            &ldquo;Hi, is this [owner name]? I&rsquo;m [your name], a web designer here in [city]. I was looking at
            [business] on Google: [rating] stars from [count] reviews, which is great. But when I searched for you,
            there&rsquo;s no website, and [businessname].com is actually still available. I put together a quick
            sketch of what a simple site could look like. Could I show you in ten minutes later this week?&rdquo;
          </blockquote>
          <h3>Walk-in</h3>
          <blockquote>
            &ldquo;I won&rsquo;t keep you. I&rsquo;m a local web designer, and I made this for you [show phone]. It&rsquo;s
            your reviews and photos on a one-page site. If you like it, here&rsquo;s my card. If not, no problem.&rdquo;
          </blockquote>
          <h3>Personal email or contact form</h3>
          <blockquote>
            <p>Subject: [Business] — your Google listing links to a dead page</p>
            <p>
              Hi [name], your listing on Google links to [old-domain], which currently shows [&ldquo;this domain is for
              sale&rdquo; / an error]. Customers who tap it hit a dead end. I&rsquo;m a web designer in [city] and
              sketched a replacement using your reviews. Happy to send it over, no obligation. — [your name], [phone]
            </p>
          </blockquote>
          <p>
            Send these one at a time. Volume isn&rsquo;t the goal; relevance is. PresenceZero drafts a
            plain-language opening angle from each lead&rsquo;s real signals as a starting point, and you adapt it.
          </p>
        </>
      ),
    },
    {
      id: 'mockup',
      heading: 'Show a mockup, not a portfolio',
      content: (
        <>
          <p>
            Owners find it hard to picture &ldquo;a website&rdquo;. They find it easy to react to <em>their</em>{' '}
            website. A rough one-page mockup with their business name, two or three photos from their listing,
            their best review and a big tap-to-call button takes well under an hour with a template, and it does
            more selling than anything you can say.
          </p>
          <p>
            Keep it deliberately unfinished. The point is &ldquo;this could be yours by next week&rdquo;, not giving
            away the work.
          </p>
        </>
      ),
    },
    {
      id: 'pricing',
      heading: 'How to price websites for local businesses',
      content: (
        <>
          <p>The three common models, and when each fits:</p>
          <table>
            <thead>
              <tr><th>Model</th><th>How it works</th><th>Best for</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>One-time build</td>
                <td>A single project fee; the owner handles hosting afterwards.</td>
                <td>Owners who distrust subscriptions or have someone technical in the family.</td>
              </tr>
              <tr>
                <td>Build + care plan</td>
                <td>A setup fee plus a monthly fee for hosting, updates, backups and small edits.</td>
                <td>Most local businesses, and your recurring revenue.</td>
              </tr>
              <tr>
                <td>Website subscription</td>
                <td>No setup fee, a higher monthly fee, and a minimum term.</td>
                <td>Owners whose cash flow makes upfront costs the main objection.</td>
              </tr>
            </tbody>
          </table>
          <p>
            Prices vary too much by market to quote here. Ask what one new customer is worth to the business and
            price so the site pays for itself with a handful of jobs. Put your price in writing on a single page,
            and include the domain registration in the owner&rsquo;s name.
          </p>
        </>
      ),
    },
    {
      id: 'objections',
      heading: 'Answering the most common objections',
      content: (
        <>
          <table>
            <thead>
              <tr><th>They say</th><th>A good answer</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>&ldquo;Word of mouth is enough.&rdquo;</td>
                <td>
                  &ldquo;It clearly works: [count] reviews! But when people hear about you, the first thing they do is
                  search your name. Right now they find [what they find]. A site makes sure word of mouth lands.&rdquo;
                </td>
              </tr>
              <tr>
                <td>&ldquo;I have a Facebook page.&rdquo;</td>
                <td>
                  &ldquo;Keep it! A site doesn&rsquo;t replace it, it gives you something you own that shows up in Google
                  and doesn&rsquo;t need a login to view. We can link the two.&rdquo;
                </td>
              </tr>
              <tr>
                <td>&ldquo;It&rsquo;s too expensive.&rdquo;</td>
                <td>
                  &ldquo;What&rsquo;s a typical job worth to you? If the site brings in [two or three] jobs a year it has
                  paid for itself. We can also spread it monthly.&rdquo;
                </td>
              </tr>
              <tr>
                <td>&ldquo;My nephew is going to do it.&rdquo;</td>
                <td>&ldquo;Great, here&rsquo;s the domain that&rsquo;s still free, grab it before someone else does. If plans change, call me.&rdquo;</td>
              </tr>
              <tr>
                <td>&ldquo;I don&rsquo;t have time.&rdquo;</td>
                <td>&ldquo;That&rsquo;s the point. I write it, use your existing photos and reviews, and you approve it in one call.&rdquo;</td>
              </tr>
            </tbody>
          </table>
          <p>
            &ldquo;My nephew&rdquo; and &ldquo;not right now&rdquo; are real answers. Be gracious, leave the mockup with
            them, and move on. Plenty of these turn into calls six months later.
          </p>
        </>
      ),
    },
    {
      id: 'ai-websites',
      heading: 'Selling AI-built websites: what changes and what doesn’t',
      content: (
        <>
          <p>
            AI site builders have cut the time it takes to produce a decent small-business site. That makes the
            build cheaper. It doesn&rsquo;t make the <em>sale</em>{' '}easier. What owners still pay for is someone who
            finds them, understands their business, writes copy that sounds like them, sets up the domain and their
            Google profile, and is there when something breaks.
          </p>
          <p>
            Use AI to make the mockup and first draft faster, and be honest that you do. Compete on outcomes and
            service, not on hours. If your whole pitch is &ldquo;I&rsquo;ll generate you a site&rdquo;, the owner will
            soon ask why they shouldn&rsquo;t do it themselves.
          </p>
        </>
      ),
    },
    {
      id: 'profitable',
      heading: 'Is selling websites to small businesses still profitable?',
      content: (
        <>
          <p>
            It can be, if you keep acquisition cheap and revenue recurring. One-off builds won by heavy discounting
            rarely add up. A steady flow of well-qualified local leads, a repeatable template for your niche, and
            care plans that keep paying after launch usually do. Track how many leads you contact, meetings you get
            and deals you close. Those three numbers show you where to improve.
          </p>
          <p>
            For building that steady flow of leads, see{' '}
            <Link href="/guides/how-to-get-web-design-clients">how to get web design clients</Link>.
          </p>
        </>
      ),
    },
  ],
  faqs: [
    {
      q: 'What should I say when cold calling a business about a website?',
      a: 'Introduce yourself as a local web designer, mention one specific thing (their reviews, what customers see when they search them, an available domain), say you have prepared a quick sketch, and ask for ten minutes later in the week. Keep it under thirty seconds.',
    },
    {
      q: 'How do I convince a business owner they need a website?',
      a: 'Don’t argue in the abstract. Show them what a customer sees today when they search the business name, show a mockup with their own reviews and photos, and tie the site to calls and bookings. Let them decide.',
    },
    {
      q: 'Should the client own their domain?',
      a: 'Yes. Register the domain in the business owner’s name. It builds trust, it’s the ethical default, and it removes a common objection about being locked in.',
    },
  ],
  related: [
    'how-to-get-web-design-clients',
    'how-to-find-businesses-without-websites',
    'parked-domains-and-dead-websites',
  ],
}
