import { ProductNav } from '@/components/brand/product-nav'
export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ProductNav />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </>
  )
}
