import Link from 'next/link'
import type { Guide } from './types'
import { CodeBlock } from '@/components/guides/reading-aids'
import { Figure } from '@/components/guides/figure'

const CHECK_COMMANDS = `# 1. Does the domain still resolve?
nslookup smithplumbing.com

# 2. What does the server answer? (status code + redirects)
curl -sIL --max-time 8 https://smithplumbing.com | grep -iE "^HTTP|^location"

# 3. Is it a for-sale page? Look for registrar parking text.
curl -sL --max-time 8 https://smithplumbing.com | grep -ioE "domain (is )?for sale|buy this domain|sedoparking|hugedomains|afternic"`

export const parkedDomainsDeadWebsites: Guide = {
  slug: 'parked-domains-and-dead-websites',
  title: 'Parked Domains and Dead Websites: What They Mean and How to Check',
  seoTitle: 'Parked Domain Meaning & How to Spot a Dead Website',
  description:
    'What a parked domain means, how it differs from a dead website, how to check either in under a minute, and why both often make better sales leads.',
  shortTitle: 'Parked domains & dead websites',
  primaryKeyword: 'parked domain meaning',
  keywords: [
    'parked domain meaning',
    'what is a parked domain',
    'parked domain checker',
    'what does it mean when a domain is parked',
    'how to tell if a website is dead',
    'dead website checker',
  ],
  published: '2026-10-21',
  updated: '2026-10-21',
  readMinutes: 8,
  tldr:
    'A parked domain is registered but not connected to a real website, usually showing a "this domain is for sale" or ad page. A dead website is one that no longer loads: the domain doesn’t resolve, the server refuses or times out, or it returns a server error. When a local business still links to either one, customers hit a dead end, and that makes the business a strong lead.',
  sections: [
    {
      id: 'parked-domain',
      heading: 'What is a parked domain?',
      content: (
        <>
          <p>
            A <strong>parked domain</strong>{' '}is a domain name that someone has registered but not connected to a real
            website or email service. Visit one and you&rsquo;ll typically see one of three things:
          </p>
          <ul>
            <li>a registrar&rsquo;s holding page (&ldquo;this domain was recently registered at…&rdquo;);</li>
            <li>a marketplace listing (&ldquo;this domain is for sale&rdquo;, &ldquo;buy this domain&rdquo;);</li>
            <li>a page of pay-per-click ads related to the domain&rsquo;s words.</li>
          </ul>
          <p>
            Parking itself is normal. People reserve names for future projects, and investors hold names to resell.
            It matters for <em>lead finding</em>{' '}when a business&rsquo;s listing still points at a parked domain. That
            usually means the business let its domain expire and someone else registered it, often to resell.
            Every customer who taps &ldquo;Website&rdquo; on their listing lands on a for-sale page.
          </p>
        </>
      ),
    },
    {
      id: 'dead-website',
      heading: 'What is a dead website?',
      content: (
        <>
          <p>
            A <strong>dead website</strong>{' '}is one that doesn&rsquo;t load at all. The common causes, from most to
            least final:
          </p>
          <ul>
            <li>
              <strong>The domain doesn&rsquo;t resolve.</strong>{' '}DNS returns nothing, usually because the
              registration lapsed or the DNS records were removed.
            </li>
            <li>
              <strong>The connection fails.</strong>{' '}The domain resolves but nothing is listening, often because
              the hosting was cancelled.
            </li>
            <li>
              <strong>It times out.</strong>{' '}The server accepts the request but never answers.
            </li>
            <li>
              <strong>It returns a server error</strong>{' '}(HTTP 5xx), such as a crashed site or a broken hosting
              account.
            </li>
            <li>
              <strong>It redirects in a loop</strong>{' '}or to an invalid address.
            </li>
          </ul>
          <p>
            A page that returns <em>404 Not Found</em>{' '}is technically a working server, so treat it as broken, not
            dead. It&rsquo;s still worth a look by hand.
          </p>
        </>
      ),
    },
    {
      id: 'difference',
      heading: 'Parked vs. dead vs. no website',
      content: (
        <>
          <table>
            <thead>
              <tr><th></th><th>No website</th><th>Dead website</th><th>Parked domain</th></tr>
            </thead>
            <tbody>
              <tr><td>URL on the listing</td><td>None</td><td>Yes, doesn&rsquo;t load</td><td>Yes, loads a placeholder or sale page</td></tr>
              <tr><td>Did they have a site before?</td><td>Usually not</td><td>Yes</td><td>Often yes; domain lapsed</td></tr>
              <tr><td>What customers see</td><td>Directory pages only</td><td>An error</td><td>Someone else&rsquo;s ads or a price tag</td></tr>
              <tr><td>Your opening line</td><td>&ldquo;You don&rsquo;t have a site yet&rdquo;</td><td>&ldquo;Your site is down&rdquo;</td><td>&ldquo;Your old domain is for sale&rdquo;</td></tr>
            </tbody>
          </table>
          <p>
            Dead and parked businesses have already shown they value a website: they paid for one. That makes the
            conversation easier than convincing someone who never had one.
          </p>
        </>
      ),
    },
    {
      id: 'check-manually',
      heading: 'How to check if a website is dead or parked (in under a minute)',
      content: (
        <>
          <p>
            Open the URL in a private browser window first. If you want to be precise, or you&rsquo;re checking
            more than a handful, three terminal commands tell you exactly what&rsquo;s going on:
          </p>
          <CodeBlock code={CHECK_COMMANDS} caption="Terminal (macOS, Linux, WSL)" />
          <ul>
            <li>No address from <code>nslookup</code>{' '}means the domain doesn&rsquo;t resolve, so the site is dead.</li>
            <li>A connection error, a timeout or a <code>5xx</code>{' '}status means the site is dead, at least for now.</li>
            <li>A <code>200</code>{' '}with registrar or marketplace text in the page means the domain is parked.</li>
          </ul>
          <p>
            To see who holds a parked domain, and since when, look it up with RDAP. Our{' '}
            <Link href="/guides/check-domain-availability-rdap">RDAP guide</Link>{' '}shows how, with no key needed.
          </p>
        </>
      ),
    },
    {
      id: 'false-positives',
      heading: 'Avoiding false positives',
      content: (
        <>
          <p>Before telling an owner their site is down, rule out the usual false alarms:</p>
          <ul>
            <li>
              <strong>Temporary outages.</strong>{' '}Retry later the same day. A real dead site stays dead.
            </li>
            <li>
              <strong>A new site on a different domain.</strong>{' '}Search the business name; they may have moved and
              never updated their listing. That&rsquo;s still a useful thing to tell them, but it&rsquo;s a different
              pitch.
            </li>
            <li>
              <strong>Bot protection.</strong>{' '}Some hosts block command-line requests. If the browser loads it,
              it&rsquo;s alive.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'at-scale',
      heading: 'Checking hundreds of business websites automatically',
      content: (
        <>
          <p>
            <Link href="/">PresenceZero</Link>{' '}runs these checks on every business in a scan. It labels each listed
            site <code>none</code>, <code>dead</code>, <code>parked</code>{' '}or <code>alive</code>{' '}and records the exact
            reason, such as &ldquo;DNS lookup failed&rdquo;, &ldquo;Returned HTTP 503&rdquo; or &ldquo;Matched a
            registrar for-sale page&rdquo;. Hover the badge to see it, so you can check every verdict yourself. Sites
            that fail for transient reasons get one automatic retry before they&rsquo;re marked.
          </p>
          <Figure shot="lead-detail" caption="Every verdict carries its reason, so a dead or parked label is checkable, not just asserted." />
          <p>
            The probe is hardened for safety: it only fetches public <code>http(s)</code>{' '}addresses, follows each
            redirect manually, and refuses anything that resolves to a private or internal network address. Try it on
            sample data in the <Link href="/demo">live demo</Link>.
          </p>
        </>
      ),
    },
    {
      id: 'pitch',
      heading: 'How to pitch a business with a dead or parked website',
      content: (
        <>
          <p>
            Lead with the customer&rsquo;s experience, not the technology: &ldquo;When people tap Website on your
            Google listing, they land on a page selling your old domain.&rdquo; It&rsquo;s specific, easy to verify,
            and not a criticism of the owner.
          </p>
          <p>
            Then offer the fix: a new site on a domain they own (if the old one is for sale, tell them the price
            honestly, and suggest a good alternative that&rsquo;s still free), plus updating their listing. More
            scripts are in{' '}
            <Link href="/guides/how-to-sell-websites-to-local-businesses">how to sell websites to local businesses</Link>
            .
          </p>
        </>
      ),
    },
  ],
  faqs: [
    {
      q: 'What does it mean when a domain is parked?',
      a: 'It is registered but not connected to a real website or email. Visitors see a placeholder, an ad page, or a "domain for sale" listing instead of a business site.',
    },
    {
      q: 'Is a parked domain available to buy?',
      a: 'Not to register. Someone already owns it. Some parked domains are listed for sale on marketplaces at a price the owner sets. A domain availability check (RDAP or your registrar) tells you whether it is registered.',
    },
    {
      q: 'How can I tell if a website is down for everyone or just me?',
      a: 'Try it from a different network (for example, mobile data), use a command-line check like curl from another machine, or retry later. If DNS doesn’t resolve or the server keeps returning errors from several places, it’s down for everyone.',
    },
  ],
  related: [
    'check-domain-availability-rdap',
    'how-to-find-businesses-without-websites',
    'how-to-sell-websites-to-local-businesses',
  ],
}
