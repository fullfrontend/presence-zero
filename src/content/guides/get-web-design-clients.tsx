import Link from 'next/link'
import type { Guide } from './types'

export const getWebDesignClients: Guide = {
  slug: 'how-to-get-web-design-clients',
  title: 'How to Get Web Design Clients: A Local-First Playbook',
  seoTitle: 'How to Get Web Design Clients (Free Lead Playbook)',
  description:
    'A practical playbook for getting web design clients: pick a niche, build a free lead list, research each business, and reach out one-to-one without spamming.',
  shortTitle: 'Get web design clients',
  primaryKeyword: 'how to get web design clients',
  keywords: [
    'how to get web design clients',
    'web design leads',
    'web design leads free',
    'find clients for web design',
    'leads for web designers',
    'how to get web development clients',
    'how to get web design clients fast',
  ],
  published: '2026-10-21',
  updated: '2026-10-21',
  readMinutes: 10,
  tldr:
    'The most reliable way for a freelancer or small agency to get web design clients is to go local: choose one niche in one area, build a list of businesses with no website or a broken one, research each lead for five minutes, and contact a handful a day personally with a specific offer. Buying lead lists and mass emailing are the slow road.',
  sections: [
    {
      id: 'why-local',
      heading: 'Why local businesses are the best first web design clients',
      content: (
        <>
          <p>
            Most advice on getting web design clients points you at marketplaces, social media or your portfolio
            site. Those work eventually. When you need your next client <em>this month</em>, local businesses have
            three advantages:
          </p>
          <ul>
            <li>
              <strong>The need is visible.</strong>{' '}You can see from a map listing whether a business has a website.
              You don&rsquo;t have to guess.
            </li>
            <li>
              <strong>Less competition per lead.</strong>{' '}A dentist with no website isn&rsquo;t getting ten agency
              pitches a week. A funded SaaS startup is.
            </li>
            <li>
              <strong>Trust is cheaper.</strong>{' '}&ldquo;I&rsquo;m a web designer here in town&rdquo; opens doors that
              a cold email from across the world doesn&rsquo;t.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'niche',
      heading: 'Step 1: Pick one niche and one area',
      content: (
        <>
          <p>
            &ldquo;Small businesses&rdquo; isn&rsquo;t a niche. &ldquo;Independent plumbers in the east end&rdquo; is.
            Narrowing down does three things for you: your examples become relevant (&ldquo;here&rsquo;s a site I
            built for another plumber&rdquo;), your pitch gets sharper with every conversation, and referrals travel
            faster because trades talk to each other.
          </p>
          <p>Good starter niches have three traits:</p>
          <ul>
            <li>customers search for them on their phone at the moment they need them (trades, salons, food);</li>
            <li>a single new customer is worth enough to pay for a site quickly (dentists, contractors, clinics);</li>
            <li>plenty of them are still offline. Scan a few categories and compare before you commit.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'lead-list',
      heading: 'Step 2: Build a free list of web design leads',
      content: (
        <>
          <p>
            Your best leads are businesses with <strong>no website, a dead one, or a parked domain</strong>, and
            with enough reviews to show they&rsquo;re busy. You can build that list for free in a few ways, all
            covered step by step in{' '}
            <Link href="/guides/how-to-find-businesses-without-websites">how to find businesses without websites</Link>
            :
          </p>
          <ul>
            <li>Google Maps by hand: complete data, but slow.</li>
            <li>An OpenStreetMap query: fast and keyless, with patchier coverage.</li>
            <li>Chamber of commerce lists, licensing boards and directories.</li>
            <li>
              A lead finder such as <Link href="/">PresenceZero</Link>, which runs the search, checks each website,
              checks matching domains and scores the results for you.
            </li>
          </ul>
          <p>
            Aim for a short list of strong leads, not a long list of weak ones. Twenty well-researched leads will
            beat 2,000 rows from a purchased list.
          </p>
        </>
      ),
    },
    {
      id: 'buying-leads',
      heading: 'Should you buy web design leads?',
      content: (
        <>
          <p>
            &ldquo;Web design leads for sale&rdquo; services sell lists, usually businesses scraped from Maps with the
            website field empty. The problems:
          </p>
          <ul>
            <li>
              <strong>They aren&rsquo;t exclusive.</strong>{' '}The same list goes to many buyers, so the business may
              hear the same pitch several times a week.
            </li>
            <li>
              <strong>They go stale.</strong>{' '}Businesses close, get sites or change numbers, and a list from three
              months ago has drifted.
            </li>
            <li>
              <strong>They&rsquo;re rarely checked.</strong>{' '}&ldquo;No website field&rdquo; isn&rsquo;t the same as
              &ldquo;no website&rdquo;, and you only find out after you&rsquo;ve called.
            </li>
          </ul>
          <p>
            Building your own list costs you an hour, gives you leads nobody else is working, and teaches you the
            market.
          </p>
        </>
      ),
    },
    {
      id: 'research',
      heading: 'Step 3: Research each lead for five minutes',
      content: (
        <>
          <p>Before you contact anyone, collect three or four specifics you can mention:</p>
          <ol>
            <li>
              <strong>Their reputation.</strong>{' '}Rating, review count, and one thing customers keep praising
              (&ldquo;everyone mentions how fast you respond&rdquo;).
            </li>
            <li>
              <strong>What a customer sees today</strong>{' '}when they search the business name: a directory page, a
              dead link, a domain-for-sale page.
            </li>
            <li>
              <strong>Whether the obvious domain is free.</strong>{' '}If <code>theirname.com</code>{' '}is available, say so.
              If it&rsquo;s parked or taken, find a good alternative before you call.
            </li>
            <li>
              <strong>Who their competitors are</strong>{' '}and whether those competitors have sites.
            </li>
          </ol>
          <p>
            PresenceZero puts most of this on the lead&rsquo;s row: a score breakdown, the website verdict with its
            exact reason, available domains, and a suggested opening angle drawn from that lead&rsquo;s real data.
          </p>
        </>
      ),
    },
    {
      id: 'outreach',
      heading: 'Step 4: Reach out one-to-one, not in bulk',
      content: (
        <>
          <p>
            Ranked roughly by how well they work for local businesses:
          </p>
          <ol>
            <li>
              <strong>Walk in</strong>{' '}at a quiet hour (not the lunch rush). Bring a phone with a one-page mockup of
              their site.
            </li>
            <li>
              <strong>Phone</strong>{' '}mid-morning or mid-afternoon. Be brief, specific, and ask for ten minutes later
              in the week, not a sale on the spot.
            </li>
            <li>
              <strong>A personal email or contact-form message</strong>{' '}naming their business, one specific
              observation, and one concrete offer. Write each one yourself.
            </li>
          </ol>
          <p>
            Skip mass cold email. It gets ignored, it hurts your domain&rsquo;s deliverability, and anti-spam laws
            such as CAN-SPAM (US), CASL (Canada) and the UK and EU e-privacy rules restrict it. Scripts and objection
            handling are in{' '}
            <Link href="/guides/how-to-sell-websites-to-local-businesses">how to sell websites to local businesses</Link>
            .
          </p>
        </>
      ),
    },
    {
      id: 'offer',
      heading: 'Step 5: Make an offer that’s easy to say yes to',
      content: (
        <>
          <p>An offer that converts is concrete and low-risk for the business:</p>
          <ul>
            <li>
              <strong>Show, don&rsquo;t describe.</strong>{' '}A rough homepage using their name, photos from their
              listing and their best review is worth more than any pitch deck.
            </li>
            <li>
              <strong>Bring the domain.</strong>{' '}&ldquo;<code>smithplumbing.com</code>{' '}is available, and I can register it
              in your name today&rdquo; turns an abstract idea into a next step.
            </li>
            <li>
              <strong>Use a clear price.</strong>{' '}One setup fee plus an optional monthly care plan (hosting, updates,
              small edits) is easy to understand and builds recurring revenue.
            </li>
            <li>
              <strong>Remove the work.</strong>{' '}You write the copy, pull the photos and connect their Maps profile.
              Busy owners say no to homework.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'follow-up',
      heading: 'Step 6: Follow up, track, and ask for referrals',
      content: (
        <>
          <p>
            Most yeses come after the first contact. Follow up once or twice over the next couple of weeks, each
            time with something new (the finished mockup, a competitor&rsquo;s new site), then stop. Keep a single
            status per lead (new, contacted, interested, won, lost) and a note on what was said. That&rsquo;s all
            the CRM you need until you have a pipeline worth a real one.
          </p>
          <p>
            Once a client is happy, ask who else they know. Trades refer trades, and a referral from a satisfied
            plumber gets you an electrician&rsquo;s attention far faster than any cold contact.
          </p>
        </>
      ),
    },
    {
      id: 'other-channels',
      heading: 'Other channels that compound over time',
      content: (
        <>
          <p>Local prospecting gets you clients now. These channels bring them in later:</p>
          <ul>
            <li>
              <strong>Case studies.</strong>{' '}&ldquo;New site for a 4.8-star bakery: calls up after launch&rdquo;, with
              the owner&rsquo;s permission.
            </li>
            <li>
              <strong>Partnerships</strong>{' '}with accountants, sign makers, printers and photographers who already
              serve small businesses.
            </li>
            <li>
              <strong>Your own Google Business Profile</strong>, so local owners searching &ldquo;web designer near
              me&rdquo; find you.
            </li>
            <li>
              <strong>Communities.</strong>{' '}Answer real questions in local business groups and on Reddit without
              pitching. People hire who they recognise.
            </li>
          </ul>
        </>
      ),
    },
  ],
  faqs: [
    {
      q: 'Where can I find web design leads for free?',
      a: 'Google Maps listings with no website, OpenStreetMap queries for businesses missing a website tag, chamber of commerce and licensing directories, and free open-source lead finders like PresenceZero, which also checks each website and scores the lead.',
    },
    {
      q: 'How do I get my first web design client with no portfolio?',
      a: 'Build two or three sample sites for real local businesses in your chosen niche, such as mockups for leads on your list, and use them as your portfolio. Offer your first clients a clear, modest price in exchange for a testimonial and permission to show the work.',
    },
    {
      q: 'Is cold calling good for web design clients?',
      a: 'It can work well for local businesses when calls are short, specific and personal: mention their reviews, what customers see when they search for them, and an available domain. Ask for a short meeting, not a sale.',
    },
  ],
  related: [
    'how-to-find-businesses-without-websites',
    'how-to-sell-websites-to-local-businesses',
    'check-domain-availability-rdap',
  ],
}
