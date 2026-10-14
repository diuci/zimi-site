#!/usr/bin/env node
// check-typography.mjs — 字号结构闸门
//
// 每篇字谜页必须有「谜面 / 谜底 / 解析 / 出处」四段，且顺序正确、不缺段。
// 缺段或乱序会导致页面结构崩坏（同一段落前半 16px、后半 1.3rem 那类事故）。
// 这条闸门只看生成产物的结构，先 --selftest 证明它抓得住坏样本。
//
// 用法：node tools/check-typography.mjs  /  node tools/check-typography.mjs --selftest

import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, rmSync, mkdtempSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = resolve(process.cwd())
const REQUIRED = ['谜面', '谜底', '解析', '出处']

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
  const siteDir = join(root, 'site', 'riddles')
  if (!existsSync(siteDir)) {
    failures.push('site/riddles/ 不存在（没跑 build-site.py？）')
    return failures
  }
  for (const p of walk(siteDir)) {
    if (p.endsWith('索引.md')) continue
    const text = readFileSync(p, 'utf8')
    const positions = []
    for (const label of REQUIRED) {
      const re = new RegExp('##?\\s*' + label, 'g')
      const m = text.match(re)
      const inline = text.includes('**' + label + '**')
      if (!m && !inline) {
        failures.push(`${p.replace(root, '')}：缺「${label}」段`)
        break
      }
    }
    // 顺序检查（按行首出现顺序）
    const order = []
    for (const line of text.split('\n')) {
      for (const label of REQUIRED) {
        if (line.includes(label) && !order.includes(label)) order.push(label)
      }
    }
    const sorted = [...order].sort((a, b) => REQUIRED.indexOf(a) - REQUIRED.indexOf(b))
    if (order.length === REQUIRED.length && order.join(',') !== sorted.join(',')) {
      failures.push(`${p.replace(root, '')}：段落顺序错乱（${order.join('→')}）`)
    }
  }
  return failures
}

function selftest() {
  const bad = mkdtempSync(join(tmpdir(), 'zimi-typo-bad-'))
  const badDir = join(bad, 'site', 'riddles', '增损')
  mkdirSync(badDir, { recursive: true })
  writeFileSync(join(badDir, '缺段.md'), '# 缺段\n\n**谜面**：山上还有山\n**谜底**：出\n\n## 解析\n两山相叠。\n')
  const badFail = check(bad)
  rmSync(bad, { recursive: true, force: true })

  const good = mkdtempSync(join(tmpdir(), 'zimi-typo-good-'))
  const goodDir = join(good, 'site', 'riddles', '增损')
  mkdirSync(goodDir, { recursive: true })
  writeFileSync(join(goodDir, '好谜.md'),
    '# 好谜\n\n**谜面**：山上还有山\n**谜底**：出\n\n## 解析\n两山相叠。\n\n## 出处\n《字謎大全》。\n')
  const goodFail = check(good)
  rmSync(good, { recursive: true, force: true })

  const problems = []
  if (!badFail.some((f) => f.includes('缺段.md'))) problems.push('没抓到缺段')
  if (goodFail.some((f) => f.includes('好谜.md'))) problems.push('好谜被误报：%s' % goodFail)
  if (problems.length) {
    console.error('check-typography.mjs selftest FAILED:')
    for (const p of problems) console.error('  - ' + p)
    return 1
  }
  console.log('check-typography.mjs selftest ok')
  return 0
}

if (process.argv.includes('--selftest')) {
  process.exit(selftest())
}
const failures = check(ROOT)
if (failures.length) {
  console.error('check-typography FAILED:')
  for (const f of failures) console.error('  - ' + f)
  process.exit(1)
}
console.log('check-typography ok')
