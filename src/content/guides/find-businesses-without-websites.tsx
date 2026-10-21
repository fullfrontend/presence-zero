import Link from 'next/link'
import type { Guide } from './types'
import { CodeBlock } from '@/components/guides/reading-aids'
import { Figure } from '@/components/guides/figure'

const OVERPASS_QUERY = `[out:json][timeout:60];
area["name"="Ottawa"]["boundary"="administrative"]->.city;
nwr["craft"="plumber"]
   [!"website"][!"contact:website"]
   (area.city);
out center tags;`

export const findBusinessesWithoutWebsites: Guide = {
  slug: 'how-to-find-businesses-without-websites',
  title: 'How to Find Businesses Without Websites (4 Free Methods)',
  seoTitle: 'How to Find Businesses Without Websites (Free, 2026)',
  description:
    'Four free ways to find local businesses without websites: Google Maps, OpenStreetMap queries, directories, and an open-source lead finder that scores them.',
  shortTitle: 'Find businesses without websites',
  primaryKeyword: 'how to find businesses without websites',
  keywords: [
    'how to find businesses without websites',
    'find businesses without websites free',
    'how to find businesses without websites on google maps',
    'businesses without websites near me',
    'local businesses without websites',
    'businesses without websites finder',
    'no website leads',
  ],
  published: '2026-10-21',
  updated: '2026-10-21',
  readMinutes: 11,
  tldr:
    'Search a category and city on Google Maps and note listings with no "Website" button; query OpenStreetMap for businesses missing a website tag; or cross-check local directories. Then verify each one, because "no website listed" often just means "not linked". A lead finder like PresenceZero automates all three steps, also catches dead and parked sites, and scores each lead from 0 to 100.',
  sections: [
    {
      id: 'what-counts',
      heading: 'What counts as a "business without a website"?',
      content: (
        <>
          <p>
            Before you build a list, decide what you are actually looking for. In practice there are four
            different situations, and only some of them are good leads:
          </p>
          <ul>
            <li>
              <strong>No website at all.</strong>{' '}The business listing has no URL and a search for the business
              name turns up only directory pages. This is the classic lead.
            </li>
            <li>
              <strong>A dead website.</strong>{' '}A URL is listed, but the domain no longer resolves, the server
              refuses the connection, or it returns an error. The owner once paid for a site and let it lapse,
              which makes them easy to talk to: they already believe they need one.
            </li>
            <li>
              <strong>A parked website.</strong>{' '}The listed URL loads a registrar&rsquo;s &ldquo;this domain is for
              sale&rdquo; page. Often the domain expired and someone else picked it up. See{' '}
              <Link href="/guides/parked-domains-and-dead-websites">parked domains and dead websites</Link>{' '}for how to
              recognise both.
            </li>
            <li>
              <strong>Social-only.</strong>{' '}The &ldquo;website&rdquo; is a Facebook or Instagram page. Some people count
              these as leads; others don&rsquo;t. It depends on what you sell.
            </li>
          </ul>
          <p>
            The first three share one property that matters for selling: the business has no web address it
            controls that works. That is the gap you are offering to close.
          </p>
        </>
      ),
    },
    {
      id: 'google-maps',
      heading: 'Method 1: Find businesses without websites on Google Maps (by hand)',
      content: (
        <>
          <p>
            Google Maps is where most people start, because its business data is the most complete. It is free,
            and slow.
          </p>
          <ol>
            <li>
              Search for a category and a place, e.g. <code>plumbers in Ottawa</code>. Narrow the area by zooming in;
              Maps only lists businesses in the visible region.
            </li>
            <li>
              Open each result. A listing with a site shows a <strong>Website</strong>{' '}button next to Directions and
              Call. A listing without one simply doesn&rsquo;t have it.
            </li>
            <li>
              For each listing with no button, copy the name, phone number, rating and review count into a
              spreadsheet.
            </li>
            <li>
              Pan to the next neighbourhood and repeat. Maps caps how many results it shows per search, so large
              cities need many small searches.
            </li>
          </ol>
          <p>
            <strong>Pros:</strong>{' '}the best coverage you can get for free, with ratings and review counts that
            help you rank leads. <strong>Cons:</strong>{' '}it takes a minute or two per listing, so a list of 50
            qualified leads can eat an afternoon. You also only see what is listed. A business can have a working
            website that simply isn&rsquo;t linked on its profile.
          </p>
          <p>
            Avoid automating this with a browser bot. Google&rsquo;s terms don&rsquo;t allow scraping Maps, and the
            official <a href="https://developers.google.com/maps/documentation/places/web-service/overview">Places API</a>{' '}
            gives you the same data legitimately. We compare the options in{' '}
            <Link href="/guides/google-maps-leads-free-data-sources">free Google Maps lead sources</Link>.
          </p>
        </>
      ),
    },
    {
      id: 'openstreetmap',
      heading: 'Method 2: Query OpenStreetMap for businesses missing a website',
      content: (
        <>
          <p>
            <a href="https://www.openstreetmap.org/">OpenStreetMap</a>{' '}(OSM) is a free, openly licensed map that
            volunteers edit. Businesses in OSM carry tags such as <code>craft=plumber</code>{' '}or{' '}
            <code>shop=bakery</code>, and many also have a <code>website</code>{' '}tag. That means you can ask for every
            business of a given type that <em>doesn&rsquo;t</em>{' '}have one.
          </p>
          <p>
            Paste this into <a href="https://overpass-turbo.eu/">overpass-turbo.eu</a>{' '}and press Run. It lists
            plumbers in Ottawa with no website tag:
          </p>
          <CodeBlock code={OVERPASS_QUERY} caption="Overpass QL · overpass-turbo.eu" />
          <p>
            Swap the city name and the tag (<code>amenity=dentist</code>, <code>shop=hairdresser</code>,{' '}
            <code>shop=florist</code>…) to target a different niche. Export the result as GeoJSON or CSV from the
            Export menu.
          </p>
          <p>
            <strong>Pros:</strong>{' '}free, no account, no key, no scraping, and a single query returns a whole city.{' '}
            <strong>Cons:</strong>{' '}coverage varies a lot. Some towns are mapped in detail and others barely at all,
            and a missing <code>website</code>{' '}tag often means nobody added it yet, not that the business has no
            site. Treat OSM results as a <em>candidate</em>{' '}list that you still need to verify.
          </p>
        </>
      ),
    },
    {
      id: 'directories',
      heading: 'Method 3: Cross-check local directories and registries',
      content: (
        <>
          <p>
            Directories are slower than a query, but they find businesses the map providers miss, especially
            trades and home services that don&rsquo;t have a storefront:
          </p>
          <ul>
            <li>
              <strong>Chamber of commerce and business association member lists.</strong>{' '}Members often get a
              directory entry. Entries with no URL are worth a look.
            </li>
            <li>
              <strong>Licensing boards.</strong>{' '}Electricians, plumbers, contractors and many health professions
              have public licence registries. Licensed, active, and invisible online is a strong combination.
            </li>
            <li>
              <strong>Yelp, Yellow Pages and niche directories.</strong>{' '}Useful for confirming a business is still
              operating, and for spotting ones whose only online presence is the directory page itself.
            </li>
            <li>
              <strong>New business registrations.</strong>{' '}Many regions publish recent incorporations. New
              businesses are the most likely to need a first website.
            </li>
          </ul>
          <p>
            Whatever you find, save it in a consistent format (name, address, phone, category, website). A CSV with
            those columns imports straight into PresenceZero, so you can verify and score a hand-built list the same
            way as a scan.
          </p>
        </>
      ),
    },
    {
      id: 'automate',
      heading: 'Method 4: Use a lead finder to automate it',
      content: (
        <>
          <p>
            The first three methods share one weakness: finding a business that has no website listed is the easy
            half. The other half is checking each one, and that is where most of the time goes. A lead finder does
            both in one pass.{' '}
            <Link href="/">PresenceZero</Link>{' '}is a free, open-source one you run yourself:
          </p>
          <ol>
            <li>
              <strong>Pick a location, a category and a data source.</strong>{' '}OpenStreetMap and CSV need no key at
              all. Google Places and Apify use your own account.
            </li>
            <li>
              <strong>It probes every listed website</strong>{' '}and labels it <code>none</code>, <code>dead</code>,{' '}
              <code>parked</code>{' '}or <code>alive</code>. Hover a label to see the exact reason, for example
              &ldquo;DNS lookup failed&rdquo; or &ldquo;Returned HTTP 503&rdquo;.
            </li>
            <li>
              <strong>It checks matching domains</strong>{' '}such as <code>smithplumbing.com</code>{' '}through RDAP, the
              free official registration lookup, so you know before you pitch whether the obvious name is still
              available.
            </li>
            <li>
              <strong>It scores each lead from 0 to 100</strong>{' '}on presence, reviews, rating, phone number and
              domain availability, and sorts the hottest to the top.
            </li>
            <li>
              <strong>You filter, add notes, and export to CSV or JSON</strong>{' '}for your own CRM.
            </li>
          </ol>
          <Figure shot="demo-expand" caption="Expanding a lead shows why it scored what it did, plus an opening angle drawn from its real signals." />
          <p>
            You can click through a real result set in the <Link href="/demo">live demo</Link>{' '}without installing
            anything. Paid hosted tools do the same job for a monthly fee or a per-lead price; see{' '}
            <Link href="/alternatives">how they compare</Link>.
          </p>
          <p>
            One limit to know about: PresenceZero treats any listed URL that loads, a Facebook page included, as{' '}
            <code>alive</code>. If social-only businesses are your target, filter them out of the export by URL.
          </p>
        </>
      ),
    },
    {
      id: 'verify',
      heading: 'How to verify a business really has no website',
      content: (
        <>
          <p>
            Every source above has false positives. Before you contact anyone, spend thirty seconds on three
            checks:
          </p>
          <ol>
            <li>
              <strong>Search the exact business name plus the city.</strong>{' '}If a site comes up that isn&rsquo;t
              linked from the listing, that&rsquo;s a different pitch (&ldquo;your Maps profile doesn&rsquo;t link to
              your site&rdquo;), not a new-website pitch.
            </li>
            <li>
              <strong>Check the obvious domain.</strong>{' '}Look up <code>businessname.com</code>{' '}and your country&rsquo;s
              domain with RDAP. If it is registered, open it. It may be their site, a parked page, or someone else
              entirely. Our <Link href="/guides/check-domain-availability-rdap">RDAP guide</Link>{' '}shows how to do this
              for free.
            </li>
            <li>
              <strong>Load any listed URL yourself.</strong>{' '}A site that is down today may be back tomorrow. If it
              fails, try again later before calling it dead.
            </li>
          </ol>
        </>
      ),
    },
    {
      id: 'prioritize',
      heading: 'Which businesses without websites are worth contacting first?',
      content: (
        <>
          <p>
            Not every business without a website is a good lead. The ones most likely to say yes usually have:
          </p>
          <ul>
            <li>
              <strong>Real customers.</strong>{' '}A healthy review count shows an active business with money coming
              in. A listing with zero reviews may have closed.
            </li>
            <li>
              <strong>A good rating.</strong>{' '}Owners with a 4.5-star reputation have something to show off, and a
              website is where they can show it.
            </li>
            <li>
              <strong>A phone number.</strong>{' '}You need a way to reach them, and a number means they want to be
              contacted.
            </li>
            <li>
              <strong>An available matching domain.</strong>{' '}&ldquo;I checked, and smithplumbing.com is still
              available&rdquo; is a concrete, useful opening line.
            </li>
          </ul>
          <p>
            These are the signals PresenceZero&rsquo;s score is built from, and the weights are in a single config
            file you can retune for your market. If you work through a list by hand, sorting by review count and
            then by rating gets you most of the way.
          </p>
        </>
      ),
    },
    {
      id: 'near-me',
      heading: 'Finding businesses without websites near you',
      content: (
        <>
          <p>
            Searches for &ldquo;businesses without websites near me&rdquo; are popular for a reason: local is an
            advantage. You can visit in person, you know the neighbourhoods, and &ldquo;I&rsquo;m a web designer
            here in town&rdquo; earns more trust than an email from a stranger.
          </p>
          <p>
            Start with your own city and the trades that rely most on being found: plumbers, electricians,
            cleaners, salons, restaurants, auto repair. Then work outward to nearby towns, where competition among
            web designers is usually lower.
          </p>
        </>
      ),
    },
    {
      id: 'next-steps',
      heading: 'What to do once you have the list',
      content: (
        <>
          <p>
            A list is only the start. Reach out to a few businesses at a time, as a person, with something specific
            to offer. Mass cold email gets ignored, damages your sender reputation, and in many places breaks
            anti-spam law. That is also why PresenceZero deliberately has no outreach features.
          </p>
          <p>
            For the next steps, read{' '}
            <Link href="/guides/how-to-get-web-design-clients">how to get web design clients</Link>{' '}and{' '}
            <Link href="/guides/how-to-sell-websites-to-local-businesses">
              how to sell websites to local businesses
            </Link>
            , which includes opening scripts and answers to the objections you will hear most.
          </p>
        </>
      ),
    },
  ],
  faqs: [
    {
      q: 'Is there a free tool to find businesses without websites?',
      a: 'Yes. PresenceZero is free and open-source (MIT). It runs on OpenStreetMap or your own CSV with no API key, checks each listed website, and checks matching domain availability through RDAP. You can also do it by hand with Google Maps or an Overpass query on OpenStreetMap.',
    },
    {
      q: 'How do I find businesses without websites on Google Maps?',
      a: 'Search a category and city, open each result, and look for listings without a "Website" button. Record the name, phone, rating and review count. Then verify by searching the business name, because some businesses have a site that is not linked on their profile.',
    },
    {
      q: 'How many local businesses don’t have a website?',
      a: 'It varies a lot by country, city and industry. Trades and home services tend to have the highest share without a site. Rather than relying on a headline statistic, scan your own niche and city. That number is the one that matters for your pipeline.',
    },
    {
      q: 'Is it legal to contact businesses I find this way?',
      a: 'Contacting a business one-to-one about a relevant service is normal practice, but rules on unsolicited commercial email differ by country (for example CAN-SPAM in the US and CASL in Canada). Keep outreach personal, identify yourself, honour opt-outs, and check the rules where you and the business operate.',
    },
  ],
  related: [
    'how-to-get-web-design-clients',
    'parked-domains-and-dead-websites',
    'google-maps-leads-free-data-sources',
  ],
}
