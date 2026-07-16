import SettingsForm from '@/components/app/settings-form'
import KeySetupGuide from '@/components/app/key-setup-guide'
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
        <div><SectionTag>{'// GET A KEY'}</SectionTag><h2 className="mt-3 text-xl font-semibold tracking-tight">Getting a Google Places key</h2><HeadlineRule /></div>
        <div className="mt-6"><KeySetupGuide /></div>
      </div>
    </div>
  )
}
