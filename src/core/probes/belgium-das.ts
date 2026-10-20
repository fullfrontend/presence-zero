import { createConnection } from 'node:net'

interface DasDeps {
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  request?: (domain: string) => Promise<string>
}
export function createBelgiumDasQuery(deps: DasDeps = {}) {
  const now = deps.now ?? Date.now
  const sleep = deps.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)))
  let nextQueryAt = 0
  return async (domain: string): Promise<string> => {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.be$/.test(domain)) return ''
    const delay = Math.max(0, nextQueryAt - now())
    nextQueryAt = now() + delay + 1500
    if (delay) await sleep(delay)
    return (deps.request ?? requestBelgiumDas)(domain)
  }
}
// Shared across checker instances/jobs in this process: below DNS Belgium's 50/minute limit.
export const queryBelgiumDas = createBelgiumDasQuery()

function requestBelgiumDas(domain: string): Promise<string> {
  return new Promise(resolve => {
    let data = ''
    const socket = createConnection({ host: 'das.dns.be', port: 4343 })
    const timer = setTimeout(() => finish(''), 10000)
    function finish(result: string) { clearTimeout(timer); socket.destroy(); resolve(result) }
    socket.setEncoding('utf8')
    socket.on('connect', () => socket.write(`${domain}\r\n`))
    socket.on('data', chunk => { data += chunk; if (data.length > 16384) finish('') })
    socket.on('end', () => finish(data))
    socket.on('error', () => finish(''))
    socket.on('close', () => finish(''))
  })
}

export function parseBelgiumDas(text: string, domain: string): boolean | null {
  if (!/^%% RC=0\s*$/m.test(text) || !new RegExp(`^Domain:\\s*${domain.replaceAll('.', '\\.')}\\s*$`, 'mi').test(text)) return null
  const status = /^Status:\s*(.*?)\s*$/m.exec(text)?.[1]
  if (status === 'AVAILABLE') return true
  if (status === 'NOT AVAILABLE' || status === 'REGISTERED') return false
  return null
}
