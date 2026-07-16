import Link from 'next/link'
type Variant = 'primary' | 'ghost' | 'link'
const STYLES: Record<Variant, string> = {
  primary: 'bg-lime text-base hover:brightness-105 font-medium',
  ghost: 'border border-line text-text hover:border-lime/60',
  link: 'text-dim hover:text-text underline-offset-4 hover:underline',
}
export function Button(
  { href, variant = 'primary', className = '', children, ...rest }:
  { href?: string; variant?: Variant; className?: string; children: React.ReactNode } &
  React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const base = variant === 'link'
    ? `inline-flex items-center gap-2 text-sm transition ${STYLES[variant]} ${className}`
    : `inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm transition ${STYLES[variant]} ${className}`
  return href ? <Link href={href} className={base}>{children}</Link>
              : <button className={base} {...rest}>{children}</button>
}
