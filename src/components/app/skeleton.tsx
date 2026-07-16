export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`pz-skeleton ${className}`} aria-hidden="true" />
}
