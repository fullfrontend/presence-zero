import Link from 'next/link'
import { Logo } from './logo'
import { Button } from './button'
export function MarketingNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-line/60 bg-base/70 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
        <Logo />
        <div className="ml-auto hidden items-center gap-6 text-sm text-dim sm:flex">
          <Link href="/#how" className="hover:text-text">How it works</Link>
          <Link href="/#features" className="hover:text-text">Features</Link>
          <Link href="/#faq" className="hover:text-text">FAQ</Link>
          <a href="https://github.com/its-tahir/presence-zero" className="hover:text-text">GitHub ★</a>
        </div>
        <Button href="/app" className="ml-auto sm:ml-0">Open app</Button>
      </nav>
    </header>
  )
}
