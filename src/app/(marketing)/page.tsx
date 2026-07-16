import { Hero } from '@/components/landing/hero'
import { HowItWorks } from '@/components/landing/how-it-works'
import { WhyManual } from '@/components/landing/why-manual'
import { Features } from '@/components/landing/features'
import { WhoFor } from '@/components/landing/who-for'
import { Ethics } from '@/components/landing/ethics'
import { Quickstart } from '@/components/landing/quickstart'
import { Faq } from '@/components/landing/faq'
import { WorkWithMe } from '@/components/landing/work-with-me'
import { JsonLd } from '@/components/brand/json-ld'
import { Reveal } from '@/components/brand/reveal'

export default function LandingPage() {
  return (
    <>
      <JsonLd />
      <Hero />
      <Reveal><HowItWorks /></Reveal>
      <Reveal><WhyManual /></Reveal>
      <Reveal><Features /></Reveal>
      <Reveal><WhoFor /></Reveal>
      <Reveal><Ethics /></Reveal>
      <Reveal><Quickstart /></Reveal>
      <Reveal><Faq /></Reveal>
      <Reveal><WorkWithMe /></Reveal>
    </>
  )
}
