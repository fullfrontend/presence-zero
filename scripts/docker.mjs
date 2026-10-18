import { randomBytes } from 'node:crypto'
import { constants, copyFileSync, existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('../', import.meta.url))
const config = fileURLToPath(new URL('../.env.docker', import.meta.url))
const action = process.argv[2]
const commands = {
  up: ['up', '-d', '--build'],
  search: ['up', '-d', 'searxng'],
  down: ['down'],
  config: ['config', '--quiet'],
}
if (!Object.hasOwn(commands, action)) {
  console.error('Usage: node scripts/docker.mjs up|search|down|config')
  process.exit(1)
}
const localSettings = fileURLToPath(new URL('../docker/searxng/settings.yml', import.meta.url))
if (!existsSync(localSettings)) {
  copyFileSync(fileURLToPath(new URL('../docker/searxng/settings.example.yml', import.meta.url)), localSettings, constants.COPYFILE_EXCL)
}
// Never overwrite an existing secret or print it to the console.
if (!existsSync(config)) {
  writeFileSync(config, `SEARXNG_SECRET=${randomBytes(32).toString('hex')}\n`, { mode: 0o600, flag: 'wx' })
}
const result = spawnSync('docker', ['compose', '--env-file', config, ...commands[action]], {
  cwd: root, stdio: 'inherit',
})
if (result.error) console.error(result.error.message)
process.exit(result.status ?? 1)
