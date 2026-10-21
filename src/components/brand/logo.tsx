import Link from 'next/link'
export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/app" className={`font-semibold tracking-tight text-text ${className}`}>
      PresenceZero<span className="text-lime">.</span>
    </Link>
  )
}
