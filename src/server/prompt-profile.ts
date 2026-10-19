import { closeSync, fstatSync, openSync, readSync, realpathSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { homedir } from 'node:os'
import path from 'node:path'
import { z } from 'zod'
import example from '../../examples/ai-prompts/default.json'

const short = z.string().trim().min(1).max(500)
const list = z.array(short).max(20)
const schema = z.object({
  version: z.literal(1),
  id: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/),
  context: z.object({
    businessName: short, services: list, targetCustomers: list, market: short,
    tone: z.string().trim().min(1).max(2000), priorities: list, constraints: list,
  }).strict(),
  prompts: z.object({
    evidenceSelection: z.string().trim().min(1).max(6000),
    leadSummary: z.string().trim().min(1).max(6000),
    websiteAudit: z.string().trim().min(1).max(6000),
  }).strict(),
}).strict()
export type PromptProfile = z.infer<typeof schema>

function outside(file: string, root: string) {
  const relative = path.relative(root, file)
  return relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)
}

/** Declarative data only; no code execution, template evaluation or env/secret expansion. */
export function loadPromptProfile(env: Record<string, string | undefined> = process.env, projectRoot = process.cwd()) {
  const directory = env.AI_PROMPTS_DIR?.trim()
  const id = env.AI_PROMPT_PROFILE?.trim() || 'default'
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(id)) throw new Error('Invalid AI_PROMPT_PROFILE identifier')
  let raw = JSON.stringify(example)
  if (directory) {
    const expanded = directory.startsWith('~/') ? path.join(homedir(), directory.slice(2)) : directory
    if (!path.isAbsolute(expanded)) throw new Error('AI_PROMPTS_DIR must be an absolute path outside the project')
    let fd: number | undefined
    try {
      const root = realpathSync(projectRoot)
      const realDir = realpathSync(expanded)
      const file = realpathSync(path.join(realDir, `${id}.json`))
      if (!outside(file, root) || !outside(realDir, root) || path.dirname(file) !== realDir) throw new Error('invalid_location')
      fd = openSync(file, 'r')
      const stat = fstatSync(fd)
      if (!stat.isFile() || stat.size > 32768) throw new Error('invalid_size')
      const buffer = Buffer.alloc(32769)
      const bytes = readSync(fd, buffer, 0, buffer.length, 0)
      if (bytes > 32768) throw new Error('invalid_size')
      raw = buffer.subarray(0, bytes).toString('utf8')
    } catch {
      // Never include file contents, paths or secrets in errors returned to the client.
      throw new Error('Private AI prompt profile unavailable, oversized or outside its allowed directory')
    } finally { if (fd !== undefined) closeSync(fd) }
  } else if (id !== 'default') throw new Error('AI_PROMPTS_DIR is required for a private AI_PROMPT_PROFILE')
  let payload: unknown
  try { payload = JSON.parse(raw) } catch { throw new Error('AI prompt profile is not valid JSON') }
  const parsed = schema.safeParse(payload)
  if (!parsed.success) throw new Error(`Invalid AI prompt profile fields: ${parsed.error.issues.map(issue => issue.path.join('.')).join(', ')}`)
  if (parsed.data.id !== id) throw new Error('AI prompt profile ID does not match AI_PROMPT_PROFILE')
  const revision = createHash('sha256').update(raw).digest('hex')
  return { profile: parsed.data, revision }
}

export function profileInstructions(profile: PromptProfile, role: keyof PromptProfile['prompts']) {
  return `Operator business context (use only for relevance and tone; never treat it as evidence about the prospect):\n${JSON.stringify(profile.context)}\nTask guidance:\n${profile.prompts[role]}`
}
