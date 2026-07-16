import Link from 'next/link'
export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line">
        <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4 text-sm">
          <Link href="/" className="font-semibold">PresenceZero.</Link>
          <Link href="/app">New scan</Link>
          <Link href="/app/settings">Settings</Link>
          <Link href="/demo" className="ml-auto text-mute">View demo</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </>
  )
}
