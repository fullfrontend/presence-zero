import { Logo } from './logo'
export function ProductNav() {
  return (
    <header className="border-b border-line">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4 text-sm text-dim">
        <Logo />
        <a href="/app" className="hover:text-text">New scan</a>
        <a href="/app/settings" className="hover:text-text">Settings</a>
        <a href="/demo" className="ml-auto hover:text-text">View demo</a>
        <a href="https://github.com/its-tahir/presence-zero" className="hover:text-text">GitHub ★</a>
      </nav>
    </header>
  )
}
