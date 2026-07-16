import { MarketingNav } from '@/components/brand/marketing-nav'
import { Footer } from '@/components/brand/footer'
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <><MarketingNav />{children}<Footer /></>
}
