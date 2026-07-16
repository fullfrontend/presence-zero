'use client'
import { useEffect, useState } from 'react'
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true)
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(m.matches)
    on(); m.addEventListener('change', on); return () => m.removeEventListener('change', on)
  }, [])
  return reduced
}
