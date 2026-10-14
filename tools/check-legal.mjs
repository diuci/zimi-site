#!/usr/bin/env node
// check-legal.mjs — 字谜分站法律护栏
//
// 三件事，任何一件失败即 exit 1：
//   1. LICENSE 存在。
//   2. site/ 里不得出现「绝对安全 / 100%无版权 / 保证无版权」等绝对化表述。
//   3. 必须有侵权联系入口（hi@diuci.com）。
//
// 用法：node tools/check-legal.mjs  /  node tools/check-legal.mjs --selftest

import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, rmSync, mkdtempSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = resolve(process.cwd())
const ABSOLUTE = /(绝对安全|绝对无版权|百分百无版权|100%无版权|保证无版权|百分之百安全)/gu
const CONTACT = /hi@diuci\.com/

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.git' || name === 'dist') continue
      walk(p, out)
    } else if (p.endsWith('.md')) {
      out.push(p)
    }
  }
  return out
}

function check(root) {
  const failures = []
  if (!existsSync(join(root, 'LICENSE'))) failures.push('缺 LICENSE')
  let contactSeen = false
  const siteDir = join(root, 'site')
  if (existsSync(siteDir)) {
    for (const p of walk(siteDir)) {
      const text = readFileSync(p, 'utf8')
      for (const m of text.matchAll(ABSOLUTE)) {
        failures.push(`${p.replace(root, '')}：绝对化表述「${m[0]}」`)
      }
      if (CONTACT.test(text)) contactSeen = true
    }
  }
  if (!contactSeen) failures.push('找不到侵权联系入口 hi@diuci.com')
  return failures
}

function selftest() {
  const bad = mkdtempSync(join(tmpdir(), 'zimi-bad-'))
  mkdirSync(join(bad, 'site'), { recursive: true })
  writeFileSync(join(bad, 'LICENSE'), 'MIT\n')
  writeFileSync(join(bad, 'site', 'bad.md'), '本站保证 100%无版权 风险。\n')
  const badFail = check(bad)
  rmSync(bad, { recursive: true, force: true })

  const good = mkdtempSync(join(tmpdir(), 'zimi-good-'))
  mkdirSync(join(good, 'site'), { recursive: true })
  writeFileSync(join(good, 'LICENSE'), 'MIT\n')
  writeFileSync(join(good, 'site', 'ok.md'), '联系 hi@diuci.com。我们不做万无一失的担保。\n')
  const goodFail = check(good)
  rmSync(good, { recursive: true, force: true })

  const problems = []
  if (!badFail.some((f) => f.includes('100%无版权'))) problems.push('没抓到绝对化表述')
  if (goodFail.length) problems.push(`干净样本被误报：${goodFail.join('; ')}`)
  if (problems.length) {
    console.error('check-legal.mjs selftest FAILED:')
    for (const p of problems) console.error('  - ' + p)
    return 1
  }
  console.log('check-legal.mjs selftest ok')
  return 0
}

if (process.argv.includes('--selftest')) {
  process.exit(selftest())
}
const failures = check(ROOT)
if (failures.length) {
  console.error('check-legal FAILED:')
  for (const f of failures) console.error('  - ' + f)
  process.exit(1)
}
console.log('check-legal ok')
