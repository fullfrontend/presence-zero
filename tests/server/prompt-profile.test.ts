import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { loadPromptProfile, profileInstructions } from '@/server/prompt-profile'
import example from '../../examples/ai-prompts/default.json'

const dirs: string[] = []
function folder() { const dir = mkdtempSync(path.join(tmpdir(), 'pz-prompts-')); dirs.push(dir); return dir }
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }) })

it('ships a generic example and reads a private profile outside the project', () => {
  expect(loadPromptProfile({}).profile.id).toBe('default')
  const dir = folder()
  const profile = { ...example, id: 'my-agency', context: { ...example.context, businessName: 'Private agency' } }
  writeFileSync(path.join(dir, 'my-agency.json'), JSON.stringify(profile))
  const loaded = loadPromptProfile({ AI_PROMPTS_DIR: dir, AI_PROMPT_PROFILE: 'my-agency' })
  expect(loaded.profile.context.businessName).toBe('Private agency')
  expect(loaded.revision).toMatch(/^[a-f0-9]{64}$/)
  expect(profileInstructions(loaded.profile, 'websiteAudit')).toContain('Private agency')
})

it('reloads edits and changes the report fingerprint, without evaluating code or expanding secrets', () => {
  const dir = folder()
  const file = path.join(dir, 'default.json')
  writeFileSync(file, JSON.stringify(example))
  const before = loadPromptProfile({ AI_PROMPTS_DIR: dir })
  const changed = { ...example, prompts: { ...example.prompts, websiteAudit: '${process.env.SECRET} $(do-not-run)' } }
  writeFileSync(file, JSON.stringify(changed))
  const after = loadPromptProfile({ AI_PROMPTS_DIR: dir })
  expect(after.revision).not.toBe(before.revision)
  expect(after.profile.prompts.websiteAudit).toBe('${process.env.SECRET} $(do-not-run)')
})

it('rejects profiles inside the repository and symlinks escaping the selected directory', () => {
  const root = folder()
  const internal = path.join(root, 'profiles')
  mkdirSync(internal)
  writeFileSync(path.join(internal, 'default.json'), JSON.stringify(example))
  expect(() => loadPromptProfile({ AI_PROMPTS_DIR: internal }, root)).toThrow('allowed directory')
  const external = folder()
  symlinkSync(path.join(internal, 'default.json'), path.join(external, 'default.json'))
  expect(() => loadPromptProfile({ AI_PROMPTS_DIR: external }, root)).toThrow('allowed directory')
})

it.each(['../secret', '/tmp/secret', 'with spaces'])('rejects traversal and unsafe profile IDs: %s', id => {
  expect(() => loadPromptProfile({ AI_PROMPTS_DIR: folder(), AI_PROMPT_PROFILE: id })).toThrow('identifier')
})

it('fails closed for missing, oversized, malformed, mismatched and unknown-field profiles without leaking contents', () => {
  const dir = folder()
  const file = path.join(dir, 'default.json')
  const env = { AI_PROMPTS_DIR: dir }
  expect(() => loadPromptProfile(env)).toThrow('unavailable')
  for (const raw of ['PRIVATE_SENTINEL', ' '.repeat(32769), JSON.stringify({ ...example, id: 'other' }), JSON.stringify({ ...example, extra: 'PRIVATE_SENTINEL' })]) {
    writeFileSync(file, raw)
    try { loadPromptProfile(env); throw new Error('should reject') } catch (error) {
      expect(String(error)).not.toContain('PRIVATE_SENTINEL')
      expect(String(error)).not.toContain('should reject')
    }
  }
  expect(readFileSync(file, 'utf8')).toContain('PRIVATE_SENTINEL')
})
