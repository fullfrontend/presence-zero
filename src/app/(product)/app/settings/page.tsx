import SettingsForm from '@/components/app/settings-form'
import KeySetupGuide, { GOOGLE_STEPS, APIFY_STEPS } from '@/components/app/key-setup-guide'
import { SectionTag } from '@/components/brand/section-tag'
import { HeadlineRule } from '@/components/brand/headline-rule'
export default function SettingsPage() {
  return (
    <div className="max-w-lg space-y-10">
      <div>
        <div><SectionTag>{'// SETTINGS'}</SectionTag><h1 className="mt-3 text-2xl font-semibold tracking-tight">Settings</h1><HeadlineRule /></div>
        <div className="mt-6"><SettingsForm /></div>
      </div>
      <div>
        <div><SectionTag>{'// GET A KEY'}</SectionTag><h2 className="mt-3 text-xl font-semibold tracking-tight">Getting your API keys</h2><HeadlineRule /></div>
        <div className="mt-6 space-y-6">
          <KeySetupGuide steps={GOOGLE_STEPS} title="Get a Google Places API key" />
          <KeySetupGuide steps={APIFY_STEPS} title="Get an Apify API token" />
        </div>
      </div>
    </div>
  )
}
