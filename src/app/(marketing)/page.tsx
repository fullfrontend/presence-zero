import { Hero } from '@/components/landing/hero'
import { HowItWorks } from '@/components/landing/how-it-works'
import { WhyManual } from '@/components/landing/why-manual'
import { Features } from '@/components/landing/features'
import { WhoFor } from '@/components/landing/who-for'
import { Ethics } from '@/components/landing/ethics'
import { Quickstart } from '@/components/landing/quickstart'
import { Faq } from '@/components/landing/faq'

export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <WhyManual />
      <Features />
      <WhoFor />
      <Ethics />
      <Quickstart />
      <Faq />
    </>
  )
}
