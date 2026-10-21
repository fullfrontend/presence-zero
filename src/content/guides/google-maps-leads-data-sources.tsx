import Link from 'next/link'
import type { Guide } from './types'
import { CodeBlock } from '@/components/guides/reading-aids'

export const googleMapsLeadsDataSources: Guide = {
  slug: 'google-maps-leads-free-data-sources',
  title: 'Google Maps Leads for Free: 4 Data Sources Compared',
  seoTitle: 'Google Maps Leads for Free: 4 Data Sources Compared',
  description:
    'Free alternatives to a Google Maps scraper for local leads: the Places API, Apify, OpenStreetMap and CSV import, compared on coverage, cost and setup.',
  shortTitle: 'Free Google Maps lead sources',
  primaryKeyword: 'google maps leads free',
  keywords: [
    'google maps scraper free',
    'google maps lead finder',
    'google maps leads',
    'google maps leads extractor',
    'apify google maps scraper',
    'openstreetmap business data',
    'overpass api',
  ],
  published: '2026-10-21',
  updated: '2026-10-21',
  readMinutes: 9,
  tldr:
    'You don’t need a scraper to get local business data. The Google Places API gives the best coverage under your own key and Google’s monthly free usage. Apify’s Google Maps actor is the easiest to set up and comes with $5 of monthly free credit. OpenStreetMap is completely free and keyless but patchier. And CSV lets you bring a list from anywhere. PresenceZero supports all four.',
  sections: [
    {
      id: 'why-not-scrape',
      heading: 'Why not just use a free Google Maps scraper?',
      content: (
        <>
          <p>
            Search for &ldquo;google maps scraper free&rdquo; and you&rsquo;ll find browser extensions and GitHub
            scripts that drive a browser through Maps. They work until they don&rsquo;t: Maps changes its markup,
            your IP gets throttled, and automated scraping of Google Maps is against Google&rsquo;s terms of service.
          </p>
          <p>
            The good news is that you rarely need one. There are sanctioned, stable sources for the same data, and
            for lead finding you only need a handful of fields: name, address, phone, website, rating and review
            count.
          </p>
        </>
      ),
    },
    {
      id: 'compare',
      heading: 'The four sources at a glance',
      content: (
        <>
          <table>
            <thead>
              <tr><th>Source</th><th>Cost</th><th>Setup</th><th>Coverage</th><th>Ratings &amp; reviews</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Google Places API</td>
                <td>Your key; Google&rsquo;s monthly free usage, then pay-as-you-go</td>
                <td>Cloud project, billing account, API key</td>
                <td>Best</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>Apify Google Maps actor</td>
                <td>About $0.004 per place; $5 free credit every month</td>
                <td>One API token</td>
                <td>Best (Google Maps data)</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>OpenStreetMap</td>
                <td>Free</td>
                <td>None</td>
                <td>Varies a lot by area</td>
                <td>No</td>
              </tr>
              <tr>
                <td>CSV import</td>
                <td>Free</td>
                <td>None</td>
                <td>Whatever you bring</td>
                <td>If your file has them</td>
              </tr>
            </tbody>
          </table>
          <p>
            Costs as of October 2026. Check each provider&rsquo;s pricing page for current rates, since they change.
          </p>
        </>
      ),
    },
    {
      id: 'places-api',
      heading: 'Google Places API: best coverage, your own key',
      content: (
        <>
          <p>
            The <a href="https://developers.google.com/maps/documentation/places/web-service/text-search">Places API
            (New) Text Search</a>{' '}takes a query like &ldquo;plumbers in Ottawa&rdquo; and returns businesses with the
            fields you ask for, in pages. Google Maps Platform includes a monthly free usage allowance per API. A
            personal lead-finding habit usually fits inside it, but check the current pricing for your volume.
          </p>
          <p>Two tips if you use it directly:</p>
          <ul>
            <li>
              <strong>Use a tight field mask.</strong>{' '}You&rsquo;re billed by the most expensive field you request, so
              only ask for what you need.
            </li>
            <li>
              <strong>Restrict your key</strong>{' '}to the Places API, and set a budget alert in Google Cloud.
            </li>
          </ul>
          <p>
            In PresenceZero you paste the key on the Settings page (it&rsquo;s stored in your own local database) or set{' '}
            <code>GOOGLE_PLACES_API_KEY</code>.
          </p>
        </>
      ),
    },
    {
      id: 'apify',
      heading: 'Apify Google Maps scraper: easiest setup',
      content: (
        <>
          <p>
            <a href="https://apify.com/compass/crawler-google-places">Apify&rsquo;s Google Maps actor</a>{' '}runs the
            collection on Apify&rsquo;s infrastructure and returns structured results. You only need one API token,
            with no Cloud project or billing setup. At about $0.004 per place, Apify&rsquo;s monthly $5 free credit
            covers roughly 1,250 places. When the credit runs out, runs simply stop. Review Apify&rsquo;s terms for
            your use case.
          </p>
          <p>
            The thing to watch is cost control. Many actor options are billed extras, and leaving the result cap empty
            means &ldquo;scrape everything&rdquo;. PresenceZero sends only a fixed, minimal set of options and always
            sets a cap (100 places by default), so a scan can&rsquo;t quietly run up a bill.
          </p>
        </>
      ),
    },
    {
      id: 'openstreetmap',
      heading: 'OpenStreetMap: completely free and keyless',
      content: (
        <>
          <p>
            OpenStreetMap data is open (ODbL licensed) and queryable with the free{' '}
            <a href="https://wiki.openstreetmap.org/wiki/Overpass_API">Overpass API</a>. To geocode the city, use{' '}
            <a href="https://nominatim.org/">Nominatim</a>. No account or key is needed, which makes it the best
            starting point.
          </p>
          <p>The trade-offs:</p>
          <ul>
            <li>
              <strong>Coverage depends on local mappers.</strong>{' '}Before you trust a scan, check your area on{' '}
              <a href="https://www.openstreetmap.org/">openstreetmap.org</a>{' '}and see whether the businesses you know
              are there.
            </li>
            <li>
              <strong>No ratings or reviews,</strong>{' '}so scores lean more on web presence and domain availability.
            </li>
            <li>
              <strong>Categories are tags.</strong>{' '}You search <code>craft=plumber</code>, not free text.
              PresenceZero maps 23 everyday categories (restaurants, cafes, dentists, salons, plumbers,
              electricians, gyms and more) and understands plurals and synonyms like &ldquo;salon&rdquo; or
              &ldquo;coffee shop&rdquo;.
            </li>
            <li>
              <strong>Shared, volunteer-run servers.</strong>{' '}Keep queries modest and expect the occasional busy
              response. Wait and retry.
            </li>
          </ul>
          <p>
            For a ready-made query that finds businesses with no website tag, see{' '}
            <Link href="/guides/how-to-find-businesses-without-websites#openstreetmap">method 2 of our main guide</Link>.
          </p>
        </>
      ),
    },
    {
      id: 'csv',
      heading: 'CSV import: bring a list from anywhere',
      content: (
        <>
          <p>
            Have a chamber-of-commerce export, a licence registry download, or a list from another tool? Import it.
            PresenceZero expects a header row:
          </p>
          <CodeBlock code="name,address,phone,category,rating,review_count,website" caption="CSV header row" />
          <p>
            Only <code>name</code>{' '}is required. Every row then goes through the same website check, domain check and
            scoring as a scan, which turns a raw list into a ranked one.
          </p>
        </>
      ),
    },
    {
      id: 'which',
      heading: 'Which source should you use?',
      content: (
        <ul>
          <li><strong>Just trying it out?</strong>{' '}OpenStreetMap: zero setup, zero cost.</li>
          <li><strong>Want Google-quality data with the least setup?</strong>{' '}Apify, on its free monthly credit.</li>
          <li><strong>Running scans regularly at volume?</strong>{' '}The Places API with your own key and a budget alert.</li>
          <li><strong>Already have a list?</strong>{' '}CSV.</li>
        </ul>
      ),
    },
  ],
  faqs: [
    {
      q: 'Is there a free Google Maps scraper?',
      a: 'Browser-based scrapers exist, but scraping Google Maps breaks Google’s terms and tends to break often. Free alternatives include the Places API’s monthly free usage, Apify’s $5 monthly free credit, OpenStreetMap (free and keyless), and importing a CSV you already have.',
    },
    {
      q: 'Can I get businesses without websites from Google Maps data?',
      a: 'Yes. Request the website field along with the business data, keep the rows where it is empty, then verify them, since a missing field doesn’t always mean there’s no site. A lead finder like PresenceZero also checks listed sites to catch dead and parked ones.',
    },
    {
      q: 'Is OpenStreetMap data allowed for commercial use?',
      a: 'OSM data is licensed under the ODbL, which allows commercial use with attribution and share-alike terms for derived databases. The public Nominatim and Overpass servers also have usage policies, so keep request volumes modest.',
    },
  ],
  related: [
    'how-to-find-businesses-without-websites',
    'check-domain-availability-rdap',
    'how-to-get-web-design-clients',
  ],
}
