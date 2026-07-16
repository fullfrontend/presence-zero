import SettingsForm from '@/components/app/settings-form'
import { SectionTag } from '@/components/brand/section-tag'
import { HeadlineRule } from '@/components/brand/headline-rule'
export default function SettingsPage() {
  return (
    <div className="max-w-lg space-y-6">
      <div><SectionTag>{'// SETTINGS'}</SectionTag><h1 className="mt-3 text-2xl font-semibold tracking-tight">Settings</h1><HeadlineRule /></div>
      <SettingsForm />
    </div>
  )
}
