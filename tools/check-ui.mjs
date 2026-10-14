#!/usr/bin/env node
// check-ui.mjs — 分站 UI 闸门（字谜分站版）
//
// 分站呈现层必须与 diuci 全站 UI 统一，本闸门守「硬约束」：
//   1. site/public/CNAME 必须是 zimi.diuci.com（绑错域 = 全站白屏或串站）。
//   2. site/.vitepress/config.mts 的 title 必须含「字谜」。
//   3. 顶栏 nav 必须含全站统一的乐园组：首页（主站）+ 本站「猜字谜」当前页，
//      以及五个兄弟乐园（学古诗 / 连词成句 / 汉兜 / 遗失月冕 / 丢词大作战）。
//      顶栏不再是「索引/数据来源」——那是站内页，走侧栏；顶栏是给孩子跳乐园的。
//   4. 页脚必须含同一组乐园链接 + 内容仓库 + hi@diuci.com。
//   5. 主题已接入：theme/tokens.css 存在且与正本（k12 副本）逐字节一致——
//      令牌不一致就等于宣纸配色漂移。
// 先 --selftest 证明它抓得住坏样本。
//
// 用法：node tools/check-ui.mjs  /  node tools/check-ui.mjs --selftest

import { readFileSync, existsSync, writeFileSync, rmSync, mkdtempSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'

const ROOT = resolve(process.cwd())
const DOMAIN = 'zimi.diuci.com'

// 顶栏必须含的乐园（全站同一组、同一顺序）。本站「猜字谜」标为当前页。
const NAV_PARKS = ['首页', '学古诗', '连词成句', '汉兜', '遗失月冕', '丢词大作战', '猜字谜']
// 页脚必须含的乐园链接 + 内容仓库 + 联系入口。
const FOOTER_TOKENS = ['学古诗', '连词成句', '汉兜', '遗失月冕', '丢词大作战', '猜字谜', 'chinese-character-riddle', 'hi@diuci.com']

function sha256(p) {
  return createHash('sha256').update(readFileSync(p)).digest('hex')
}

function check(root) {
  const failures = []
  const cname = join(root, 'site', 'public', 'CNAME')
  if (!existsSync(cname)) {
    failures.push('缺 site/public/CNAME')
  } else {
    const domain = readFileSync(cname, 'utf8').trim()
    if (domain !== DOMAIN) failures.push(`CNAME 应为 ${DOMAIN}，实为 ${domain}`)
  }
  const cfg = join(root, 'site', '.vitepress', 'config.mts')
  if (!existsSync(cfg)) {
    failures.push('缺 site/.vitepress/config.mts')
  } else {
    const text = readFileSync(cfg, 'utf8')
    if (!/title:\s*'[^']*字谜[^']*'/.test(text)) failures.push('config.mts 的 title 未含「字谜」')
    for (const entry of NAV_PARKS) {
      if (!text.includes(entry)) failures.push(`顶栏 nav 缺「${entry}」入口`)
    }
    for (const entry of FOOTER_TOKENS) {
      if (!text.includes(entry)) failures.push(`页脚缺「${entry}」入口`)
    }
    // 主题令牌：theme/tokens.css 必须存在（主题已接入）
    const tokens = join(root, 'site', '.vitepress', 'theme', 'tokens.css')
    if (!existsSync(tokens)) {
      failures.push('缺 site/.vitepress/theme/tokens.css（主题未接入，宣纸配色会漂移）')
    } else {
      // 与正本（k12 副本）逐字节比对：令牌不一致 = 配色漂移
      const canon = join(root, '..', 'k12-site', 'site', '.vitepress', 'theme', 'tokens.css')
      if (existsSync(canon) && sha256(tokens) !== sha256(canon)) {
        failures.push('theme/tokens.css 与正本不一致（宣纸令牌漂移）')
      }
    }
  }
  return failures
}

function selftest() {
  const bad = mkdtempSync(join(tmpdir(), 'zimi-ui-bad-'))
  mkdirSync(join(bad, 'site', 'public'), { recursive: true })
  mkdirSync(join(bad, 'site', '.vitepress'), { recursive: true })
  writeFileSync(join(bad, 'site', 'public', 'CNAME'), 'wrong.example.com\n')
  writeFileSync(join(bad, 'site', '.vitepress', 'config.mts'),
    "export default { title: '别的站' }\n")
  const badFail = check(bad)
  rmSync(bad, { recursive: true, force: true })

  const good = mkdtempSync(join(tmpdir(), 'zimi-ui-good-'))
  mkdirSync(join(good, 'site', 'public'), { recursive: true })
  mkdirSync(join(good, 'site', '.vitepress', 'theme'), { recursive: true })
  writeFileSync(join(good, 'site', 'public', 'CNAME'), 'zimi.diuci.com\n')
  writeFileSync(join(good, 'site', '.vitepress', 'theme', 'tokens.css'), '')
  writeFileSync(join(good, 'site', '.vitepress', 'config.mts'),
    "export default { title: '猜字谜',\n" +
    "  nav: [{text:'首页'},{text:'学古诗'},{text:'连词成句'},{text:'汉兜'},{text:'遗失月冕'},{text:'丢词大作战'},{text:'猜字谜'}],\n" +
    "  footer: { message: '学古诗·连词成句·汉兜·遗失月冕·丢词大作战·猜字谜', copyright: 'chinese-character-riddle · hi@diuci.com' } }\n")
  const goodFail = check(good)
  rmSync(good, { recursive: true, force: true })

  const problems = []
  if (!badFail.some((f) => f.includes('CNAME'))) problems.push('没抓到错 CNAME')
  if (!badFail.some((f) => f.includes('字谜'))) problems.push('没抓到缺「字谜」nav')
  if (goodFail.length) problems.push(`干净样本被误报：${goodFail.join('; ')}`)
  if (problems.length) {
    console.error('check-ui.mjs selftest FAILED:')
    for (const p of problems) console.error('  - ' + p)
    return 1
  }
  console.log('check-ui.mjs selftest ok')
  return 0
}

if (process.argv.includes('--selftest')) {
  process.exit(selftest())
}
const failures = check(ROOT)
if (failures.length) {
  console.error('check-ui FAILED:')
  for (const f of failures) console.error('  - ' + f)
  process.exit(1)
}
console.log('check-ui ok')
