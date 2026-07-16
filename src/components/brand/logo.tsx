import Link from 'next/link'
export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`font-semibold tracking-tight text-text ${className}`}>
      PresenceZero<span className="text-lime">.</span>
    </Link>
  )
}
