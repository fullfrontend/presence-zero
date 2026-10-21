import Link from 'next/link'
import type { Guide } from './types'
import { CodeBlock } from '@/components/guides/reading-aids'

const CURL_CHECK = `# 404 = no registration found (likely available)
# 200 = registered (taken)
curl -s -o /dev/null -w "%{http_code}\\n" -L https://rdap.org/domain/smithplumbing.com`

const JS_CHECK = `// Node 18+ / any modern runtime: no key, no SDK
async function isAvailable(domain) {
  const res = await fetch(\`https://rdap.org/domain/\${domain}\`, { redirect: 'follow' })
  if (res.status === 404) return true    // not registered
  if (res.ok) return false               // registered
  return null                            // rate-limited, unsupported TLD, or error: unknown
}`

export const checkDomainAvailabilityRdap: Guide = {
  slug: 'check-domain-availability-rdap',
  title: 'How to Check Domain Availability for Free with RDAP',
  seoTitle: 'Check Domain Availability Free with RDAP (No API Key)',
  description:
    'Check if a domain is available for free with RDAP, the successor to WHOIS. No API key: copy-paste curl and JavaScript examples, caveats and rate limits.',
  shortTitle: 'Check domain availability (RDAP)',
  primaryKeyword: 'check if domain is available',
  keywords: [
    'check if domain is available',
    'domain availability checker',
    'domain availability api',
    'rdap lookup',
    'rdap lookup api',
    'rdap vs whois',
    'free domain availability api',
  ],
  published: '2026-10-21',
  updated: '2026-10-21',
  readMinutes: 8,
  tldr:
    'Request https://rdap.org/domain/example.com. A 404 means the registry has no record, so the domain is very likely available; a 200 means it is registered. RDAP is free, needs no API key, and returns structured JSON. Treat any other response as "unknown", be polite (about one request per second), and confirm with a registrar before you promise a domain to anyone.',
  sections: [
    {
      id: 'what-is-rdap',
      heading: 'What is RDAP?',
      content: (
        <>
          <p>
            The <strong>Registration Data Access Protocol (RDAP)</strong>{' '}is the standard way to look up who has
            registered a domain name. It&rsquo;s the official successor to WHOIS, and ICANN requires accredited
            registries and registrars for generic top-level domains (<code>.com</code>, <code>.net</code>,{' '}
            <code>.org</code>{' '}and the newer gTLDs) to support it. Many country-code registries do too.
          </p>
          <p>
            For our purposes, an RDAP lookup answers one question very cheaply: <em>is this domain registered?</em>
          </p>
        </>
      ),
    },
    {
      id: 'rdap-vs-whois',
      heading: 'RDAP vs. WHOIS',
      content: (
        <table>
          <thead>
            <tr><th></th><th>WHOIS</th><th>RDAP</th></tr>
          </thead>
          <tbody>
            <tr><td>Response format</td><td>Free-form text, different per registry</td><td>Structured JSON</td></tr>
            <tr><td>Transport</td><td>Port 43, plain text</td><td>HTTPS</td></tr>
            <tr><td>&ldquo;Not found&rdquo; signal</td><td>A text string that varies by registry</td><td>HTTP <code>404</code></td></tr>
            <tr><td>Finding the right server</td><td>Know which server to ask</td><td>IANA bootstrap file, or a redirector like rdap.org</td></tr>
            <tr><td>Status for gTLDs</td><td>Being phased out</td><td>The required standard</td></tr>
          </tbody>
        </table>
      ),
    },
    {
      id: 'check-curl',
      heading: 'Check if a domain is available with one command',
      content: (
        <>
          <p>
            <a href="https://about.rdap.org/">rdap.org</a>{' '}is a free redirector. It looks up which registry runs a
            TLD and forwards your request there, so you don&rsquo;t need to know the right server:
          </p>
          <CodeBlock code={CURL_CHECK} caption="Terminal" />
          <p>
            Drop the <code>-o /dev/null -w …</code>{' '}part to see the full JSON for a registered domain:
            registrar, creation and expiry dates, nameservers and status codes such as{' '}
            <code>client transfer prohibited</code>.
          </p>
        </>
      ),
    },
    {
      id: 'check-code',
      heading: 'A free domain availability API in five lines of code',
      content: (
        <>
          <p>
            Because RDAP is just HTTPS and JSON, you don&rsquo;t need a paid domain availability API for basic checks:
          </p>
          <CodeBlock code={JS_CHECK} caption="JavaScript / TypeScript" />
          <p>
            The three-way result is deliberate. A failed check isn&rsquo;t the same as &ldquo;taken&rdquo;, and treating
            errors as &ldquo;unavailable&rdquo; hides good domains from you. PresenceZero stores the same three
            states: available, taken, and &ldquo;check failed&rdquo;.
          </p>
        </>
      ),
    },
    {
      id: 'caveats',
      heading: 'Caveats: when "404" doesn’t mean you can buy it',
      content: (
        <ul>
          <li>
            <strong>Unsupported TLDs.</strong>{' '}Some country-code registries don&rsquo;t offer RDAP yet. Check the{' '}
            <a href="https://data.iana.org/rdap/dns.json">IANA RDAP bootstrap file</a>: if a TLD isn&rsquo;t listed, an
            error says nothing about availability.
          </li>
          <li>
            <strong>Reserved and premium names.</strong>{' '}A registry can withhold a name, or price it far above
            normal, without it being &ldquo;registered&rdquo;. RDAP may report not-found while your registrar shows a
            premium price.
          </li>
          <li>
            <strong>Recently dropped domains.</strong>{' '}Domains in redemption or pending-delete aren&rsquo;t available
            to register yet, even though they no longer work.
          </li>
          <li>
            <strong>Race conditions.</strong>{' '}Availability can change at any moment. The registrar&rsquo;s checkout
            is the final word.
          </li>
        </ul>
      ),
    },
    {
      id: 'politeness',
      heading: 'Rate limits and being a good citizen',
      content: (
        <>
          <p>
            RDAP servers are public infrastructure, and many rate-limit aggressively. If you check domains in bulk:
          </p>
          <ul>
            <li>keep to roughly <strong>one request per second</strong>{' '}overall;</li>
            <li>back off exponentially when you get <code>429 Too Many Requests</code>;</li>
            <li>
              <strong>cache results</strong>: &ldquo;taken&rdquo; rarely changes, so cache it for weeks;
              &ldquo;available&rdquo; can change, so cache it for about a day.
            </li>
          </ul>
          <p>
            That&rsquo;s exactly how PresenceZero&rsquo;s RDAP checker behaves: a global one-per-second throttle,
            exponential backoff on 429s, and a shared cache (24 hours for available, 30 days for taken), so the same
            domain is never looked up twice across scans.
          </p>
        </>
      ),
    },
    {
      id: 'business-domains',
      heading: 'Finding the right domain for a business name',
      content: (
        <>
          <p>
            When you&rsquo;re pitching a website, the domain you check should be the one the owner would pick
            themselves. A simple recipe:
          </p>
          <ol>
            <li>Lowercase the name and strip accents and punctuation (&ldquo;Café Élise&rdquo; becomes <code>cafeelise</code>).</li>
            <li>Turn <code>&amp;</code>{' '}into &ldquo;and&rdquo;.</li>
            <li>Drop trailing legal suffixes such as Inc, LLC, Ltd, Corp or GmbH.</li>
            <li>Try both the full form and a compact one without stop words (&ldquo;the&rdquo;, &ldquo;and&rdquo;, &ldquo;of&rdquo;).</li>
            <li>Check <code>.com</code>{' '}first, then the business&rsquo;s country domain (<code>.ca</code>, <code>.co.uk</code>…).</li>
          </ol>
          <p>
            An available exact-match <code>.com</code>{' '}is one of the strongest openers you can bring to a pitch, which
            is why it carries its own weight in PresenceZero&rsquo;s{' '}
            <Link href="/guides/how-to-find-businesses-without-websites#prioritize">lead score</Link>.
          </p>
        </>
      ),
    },
  ],
  faqs: [
    {
      q: 'Is there a free domain availability API?',
      a: 'Yes. RDAP is free and needs no key: request https://rdap.org/domain/<name> and read the HTTP status (404 means not registered, 200 means registered). Keep to about one request per second and cache results.',
    },
    {
      q: 'Is RDAP replacing WHOIS?',
      a: 'Yes, for generic TLDs. ICANN requires gTLD registries and registrars to support RDAP, and it is the standard going forward. Some country-code registries still offer WHOIS only.',
    },
    {
      q: 'Why does a domain show as available but cost a lot at checkout?',
      a: 'It is likely a registry premium or reserved name. RDAP shows whether a name is registered, not its price, so always confirm with a registrar.',
    },
  ],
  related: [
    'parked-domains-and-dead-websites',
    'how-to-find-businesses-without-websites',
    'google-maps-leads-free-data-sources',
  ],
}
