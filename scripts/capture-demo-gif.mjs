/**
 * Capture demo frames with system Chrome + build GIF via ffmpeg.
 * Run: node scripts/capture-demo-gif.mjs
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, existsSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

async function loadPuppeteer() {
  try {
    return require('puppeteer-core')
  } catch {
    spawnSync('npm', ['install', '--no-save', 'puppeteer-core@24'], {
      stdio: 'inherit',
      shell: true,
    })
    return require('puppeteer-core')
  }
}

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
  'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
  `${process.env.LOCALAPPDATA}\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe`,
].filter(Boolean)

const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p))
if (!chromePath) {
  console.error('Chrome not found. Set CHROME_PATH.')
  process.exit(1)
}

const framesDir = join(process.cwd(), 'tmp-demo-frames')
mkdirSync(framesDir, { recursive: true })
const f1 = join(framesDir, '01-table.png')
const f2 = join(framesDir, '02-expanded.png')
const gifPath = join(process.cwd(), 'public', 'screenshots', 'demo-expand.gif')
const url = process.env.DEMO_URL || 'https://presencezero.its-tahir.com/demo'

const puppeteer = await loadPuppeteer()
const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: 'new',
  defaultViewport: { width: 1280, height: 800 },
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})
const page = await browser.newPage()
await page.evaluateOnNewDocument(() => {
  try {
    localStorage.setItem('pz-demo-tour-seen', '1')
  } catch {
    /* ignore */
  }
})
await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise((r) => setTimeout(r, 1000))
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Skip')
  btn?.click()
})
await new Promise((r) => setTimeout(r, 500))
await page.screenshot({ path: f1, type: 'png' })

await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(
    (b) => b.getAttribute('aria-controls')?.startsWith('lead-detail') && b.textContent?.includes('100'),
  )
  btn?.click()
})
await new Promise((r) => setTimeout(r, 1200))
await page.screenshot({ path: f2, type: 'png' })
await browser.close()

const listFile = join(framesDir, 'frames.txt')
const { writeFileSync } = await import('node:fs')
writeFileSync(
  listFile,
  [
    `file '${f1.replace(/\\/g, '/')}'`,
    'duration 1.5',
    `file '${f2.replace(/\\/g, '/')}'`,
    'duration 3.5',
    `file '${f2.replace(/\\/g, '/')}'`,
  ].join('\n'),
)

const ff = spawnSync(
  'ffmpeg',
  [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listFile,
    '-vf',
    'fps=8,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer',
    '-loop',
    '0',
    gifPath,
  ],
  { encoding: 'utf8' },
)
if (ff.status !== 0) {
  console.error(ff.stderr || ff.stdout)
  process.exit(ff.status ?? 1)
}
console.log('Wrote', gifPath)
try {
  unlinkSync(listFile)
} catch {
  /* ignore */
}
