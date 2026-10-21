import Link from 'next/link'
import { GUIDES, guidePath } from '@/content/guides'
import { CONTACT_EMAIL, REPO_URL } from '@/lib/site'

const linkCls = 'text-sm text-dim hover:text-text'

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <p className="font-semibold tracking-tight">TN<span className="text-lime">.</span></p>
          <p className="mt-2 max-w-sm text-sm text-dim">A lead finder, not a spam tool. Self-host it and keep your list private.</p>
          <p className="mt-4 max-w-sm text-sm text-dim">
            Want it white-labeled, hosted, or extended for your business?{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-lime underline-offset-4 hover:underline">{CONTACT_EMAIL}</a>
          </p>
        </div>
        <nav aria-label="Guides">
          <p className="text-sm font-medium text-text"><Link href="/guides" className="hover:text-lime">Guides</Link></p>
          <ul className="mt-3 space-y-2">
            {GUIDES.map(g => (
              <li key={g.slug}><Link href={guidePath(g.slug)} className={linkCls}>{g.shortTitle}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Product and links">
          <p className="text-sm font-medium text-text">Product</p>
          <ul className="mt-3 space-y-2">
            <li><Link href="/demo" className={linkCls}>Live demo</Link></li>
            <li><Link href="/alternatives" className={linkCls}>Compare alternatives</Link></li>
            <li><a href={REPO_URL} className={linkCls}>Source on GitHub</a></li>
            <li><a href="https://its-tahir.com" className={linkCls}>its-tahir.com</a></li>
            <li><a href="https://throughline.its-tahir.com/" className={linkCls}>Throughline</a></li>
            <li><a href="https://anitrace.its-tahir.com/" className={linkCls}>AniTrace</a></li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
