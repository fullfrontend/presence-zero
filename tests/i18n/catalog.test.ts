import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { expect, it } from 'vitest'
import messages from '@/i18n/en-US.json'

it('includes every explicit UI message in both catalogs', () => {
  const missing: string[] = []
  function walk(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name)
      if (entry.isDirectory()) { walk(file); continue }
      if (!/\.tsx?$/.test(file)) continue
      const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
      function visit(node: ts.Node) {
        if (ts.isCallExpression(node) && node.expression.getText(source) === 't' && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
          const key = node.arguments[0].text.replace(/\s+/g, ' ').trim()
          if (!(key in messages)) missing.push(`${file}: ${key}`)
        }
        ts.forEachChild(node, visit)
      }
      visit(source)
    }
  }
  walk('src')
  expect(missing).toEqual([])
})
