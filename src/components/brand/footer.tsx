export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-semibold tracking-tight">TN<span className="text-lime">.</span></p>
          <p className="mt-2 max-w-sm text-sm text-dim">A lead finder, not a spam tool. Self-host it and keep your list private.</p>
          <p className="mt-4 max-w-sm text-sm text-dim">
            Want it white-labeled, hosted, or extended for your business?{' '}
            <a href="mailto:hello@its-tahir.com" className="text-lime underline-offset-4 hover:underline">hello@its-tahir.com</a>
          </p>
        </div>
        <div className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
          <a href="mailto:hello@its-tahir.com" className="hover:text-text">hello@its-tahir.com</a>
          <a href="https://its-tahir.com" className="hover:text-text">its-tahir.com</a>
          <a href="https://its-tahir.com/throughline" className="hover:text-text">Throughline</a>
          <a href="https://its-tahir.com/anilense" className="hover:text-text">AniLense</a>
          <a href="https://github.com/its-tahir/presence-zero" className="hover:text-text">GitHub · MIT</a>
        </div>
      </div>
    </footer>
  )
}
