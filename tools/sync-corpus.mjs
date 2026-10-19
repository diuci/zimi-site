// tools/sync-corpus.mjs —— 从内容仓快照谜库数据到游戏端。
//
// 为什么是快照不是直连：内容仓是唯一真源，游戏端必须能离线构建，
// 而且线上玩到的每一谜都要能说出「它是哪个版本、凭什么说它可以收」。
// 所以快照里带 contentVersion、来源文件的 sha256，谜目带 license 溯源字段。
// 与 jiagu 的 sync-corpus 同构；差别是谜种轮转的选谜规则在 game/src/logic/daily.mjs。
//
// 解析（## 解析 段）不在 riddles.json 的序列化字段里，这里直接从 md 正文提取——
// 源文件已进 checksums.json，漂移可查。
//
// 用法：
//   node tools/sync-corpus.mjs           重新快照并写入（先把已发出的日子冻进 history）
//   node tools/sync-corpus.mjs --check   只比对，不写；漂移就失败
//   node tools/sync-corpus.mjs --selftest 用假数据证明冻结与漂移检查真的会拦

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dayKey, pickDaily } from '../game/src/logic/daily.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const CONTENT_ROOT = process.env.CONTENT_ROOT || resolve(ROOT, '../chinese-character-riddle')
const SOURCE = resolve(CONTENT_ROOT, 'data/riddles.json')
const RIDDLES_DIR = resolve(CONTENT_ROOT, 'riddles')
const OUT = resolve(ROOT, 'game/src/data/corpus.json')

// 快照带哪些字段（game 用得到的；解析另从 md 提取）
const FIELDS = ['id', 'title', 'answer', 'answer_len', 'type', 'subtype',
  'difficulty', 'structure', 'tags', 'source', 'license']

function readSource() {
  let raw
  try { raw = readFileSync(SOURCE) } catch {
    throw new Error('读不到内容仓数据：' + SOURCE + '（设 CONTENT_ROOT 指向内容仓）')
  }
  // 换行归一化：Windows 工作区是 CRLF，CI 检出是 LF，同一份内容两种字节。
  // 指纹只认内容（LF），否则快照在一台机器上自洽、到 CI 必漂移（首次 CI 实跑踩过）。
  const norm = raw.toString('utf8').replace(/\r\n/g, '\n')
  const data = JSON.parse(norm)
  if (!Array.isArray(data.riddles)) throw new Error('内容仓数据里没有 riddles 数组')
  return { data, sha256: createHash('sha256').update(norm, 'utf8').digest('hex') }
}

/** 从 md 正文提取「## 解析」段（与 build-traditional 的取法一致：到下一个 ## 或文末）。
 *  换行归一成 LF：Windows 工作区 CRLF 与 CI 检出 LF 必须得到同一份 jie。 */
export function extractJie(text) {
  const m = /##\s*解析\s*\n(.*?)(?=\n## |\s*$)/s.exec(text)
  return m ? m[1].trim().replace(/\r\n/g, '\n') : ''
}

/** 读一个谜 md，返回 {jie}。 */
function loadBody(rel) {
  const p = join(RIDDLES_DIR, rel.replace(/^riddles\//, ''))
  try {
    return { jie: extractJie(readFileSync(p, 'utf8')) }
  } catch {
    return { jie: '' }
  }
}

export function buildSnapshot(data, sha256) {
  const riddles = data.riddles.map((r) => {
    const rec = {}
    for (const f of FIELDS) rec[f] = r[f] === undefined ? null : r[f]
    return rec
  })
  // 稳定排序：谜种（CANON 顺序由客户端 daily.mjs 处理，这里按 type/difficulty/id 保证可复算）
  riddles.sort((a, b) => (a.type || '').localeCompare(b.type || '')
    || (a.difficulty || 0) - (b.difficulty || 0)
    || String(a.id).localeCompare(String(b.id)))
  // 解析从 md 提取（路径字段在 riddles.json 里是 'riddles/<谜种>/<名>.md'）
  const byId = new Map(data.riddles.map((r) => [r.id, r]))
  for (const rec of riddles) {
    const src = byId.get(rec.id)
    rec.jie = src && src.path ? loadBody(src.path).jie : ''
  }
  return {
    contentVersion: data.version,
    sourceSha256: sha256,
    count: riddles.length,
    types: data.types || {},
    riddles,
  }
}

/** 把已发出的日子冻进 history：用「旧的」词库算出每一天摇到哪个谜。
 *  freshIds = 新快照里的谜 id 集合——幽灵判定以它为准：冻过的日子若指向
 *  新快照没有的谜，才进 ghosts（数据从旧快照或上一轮 ghosts 里找）。 */
export function freezeHistory(oldCorpus, today, freshIds) {
  const h = oldCorpus && oldCorpus.history ? oldCorpus.history : null
  const days = h && Array.isArray(h.days) ? h.days.slice() : []
  const ghosts = Object.assign({}, (h && h.ghosts) || {})
  const since = (h && h.since) || today
  const have = new Set(days.map((d) => d.day))
  let added = 0
  if (oldCorpus && Array.isArray(oldCorpus.riddles) && oldCorpus.riddles.length) {
    const start = new Date(since + 'T00:00:00')
    const end = new Date(today + 'T00:00:00')
    for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) {
      const day = dayKey(d)
      if (have.has(day)) continue
      const { riddle } = pickDaily(oldCorpus.riddles, day)
      days.push({ day, id: riddle.id })
      added++
    }
  }
  days.sort((a, b) => a.day.localeCompare(b.day))
  const fresh = freshIds || new Set((oldCorpus && oldCorpus.riddles || []).map((r) => r.id))
  const oldById = new Map((oldCorpus && oldCorpus.riddles || []).map((r) => [r.id, r]))
  for (const rec of days) {
    if (!fresh.has(rec.id) && !ghosts[rec.id]) {
      const old = oldById.get(rec.id)
      if (old) ghosts[rec.id] = old
    }
  }
  return { since, through: today, added, days, ghosts }
}

/** 历史合法：日子连续、每条还指向存在的谜或幽灵记录、昨天已冻。 */
export function checkHistory(h, today, riddles) {
  const problems = []
  if (!h || !Array.isArray(h.days) || !h.days.length) return problems
  const have = new Set((riddles || []).map((r) => r.id))
  const want = []
  const start = new Date(h.since + 'T00:00:00')
  const end = new Date(h.through + 'T00:00:00')
  for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) want.push(dayKey(d))
  if (want.length !== h.days.length)
    problems.push('history 有洞：应有 ' + want.length + ' 天，记录里 ' + h.days.length + ' 天')
  for (const rec of h.days) {
    if (!have.has(rec.id) && !((h.ghosts || {})[rec.id]))
      problems.push('history 里 ' + rec.day + ' 指向「' + rec.id + '」，可快照与幽灵记录里都没有这个谜')
  }
  const yesterday = dayKey(new Date(new Date(today + 'T00:00:00').getTime() - 86400000))
  if (String(h.through) < yesterday)
    problems.push('history 只冻到 ' + h.through + '，昨天（' + yesterday + '）还没冻：词库一改，已玩过的日子会被换题')
  return problems
}

function same(a, b) { return JSON.stringify(a) === JSON.stringify(b) }

function check() {
  const { data, sha256 } = readSource()
  const snap = buildSnapshot(data, sha256)
  let existing
  try { existing = JSON.parse(readFileSync(OUT, 'utf8')) }
  catch { console.error('[!!] 缺 ' + OUT + '：先跑 node tools/sync-corpus.mjs'); return 1 }
  const problems = []
  if (existing.contentVersion !== snap.contentVersion)
    problems.push('contentVersion 漂移：快照 ' + existing.contentVersion + '，内容仓 ' + snap.contentVersion)
  if (existing.sourceSha256 !== snap.sourceSha256)
    problems.push('来源文件 sha256 漂移：内容仓 riddles.json 变了但快照没重跑')
  if (!same(existing.riddles, snap.riddles)) problems.push('谜目内容与内容仓不一致')
  for (const p of checkHistory(existing.history, dayKey(new Date()), existing.riddles)) problems.push(p)
  if (problems.length) {
    for (const p of problems) console.error('[!!] ' + p)
    console.error('    跑 node tools/sync-corpus.mjs 重新快照')
    return 1
  }
  console.log('[ok] 谜库快照与内容仓一致：' + snap.count + ' 谜，contentVersion ' + snap.contentVersion
    + '，每日题历史冻到 ' + existing.history.through)
  return 0
}

function selftest() {
  const cases = []
  const add = (name, fn) => {
    const r = fn()
    if (r !== true) { console.error('[!!] ' + r); process.exitCode = 1; return }
    cases.push(name)
  }
  const mk = (id, type) => ({ id, title: '谜面' + id, answer: '出', type, difficulty: 1,
    answer_len: 1, subtype: null, structure: null, tags: [], source: 'S1', license: 'public-domain' })

  add('解析提取：截到下一个 ## 为止', () => {
    const j = extractJie('## 解析\n第一行\n第二行\n## 出处\n来源')
    return j === '第一行\n第二行' ? true : '解析提取错误：' + JSON.stringify(j)
  })
  add('解析提取：CRLF 归一成 LF', () => {
    const j = extractJie('## 解析\r\n第一行\r\n第二行\r\n## 出处\r\n来源')
    return j === '第一行\n第二行' ? true : 'CRLF 没归一：' + JSON.stringify(j)
  })
  add('解析提取：没有解析段给空串', () => extractJie('## 出处\n来源') === '' ? true : '应给空串')
  add('冻结之后内容仓删谜进 ghosts', () => {
    const old = { riddles: [mk('a', '增损')], history: { since: '2026-10-19', through: '2026-10-19',
      days: [{ day: '2026-10-19', id: 'a' }], ghosts: {} } }
    // 新内容里 a 已被删：freshIds 为空集 → 冻结日指向的 a 必须进 ghosts
    const h = freezeHistory(old, '2026-10-20', new Set())
    return h.ghosts && h.ghosts.a ? true : '删掉的谜没进 ghosts'
  })
  add('历史断链被抓', () => {
    const h = { since: '2026-10-18', through: '2026-10-19',
      days: [{ day: '2026-10-18', id: 'a' }], ghosts: {} }
    const p = checkHistory(h, '2026-10-19', [mk('a', '增损')])
    return p.length >= 1 ? true : '断链没被抓'
  })
  add('history 只冻到前天要报', () => {
    const h = { since: '2026-10-17', through: '2026-10-17',
      days: [{ day: '2026-10-17', id: 'a' }], ghosts: {} }
    const p = checkHistory(h, '2026-10-19', [mk('a', '增损')])
    return p.length >= 1 ? true : '过期 history 没被抓'
  })
  add('谜种轮转：连续 10 天不重样（各谜种都有谜时）', () => {
    const riddles = ['拆字', '会意', '谐音', '增损', '离合', '典故', '象形', '方位', '数字', '当代']
      .map((t, i) => mk('r' + i, t))
    const seen = new Set()
    for (let i = 0; i < 10; i++) {
      const day = dayKey(new Date(Date.parse('2026-10-10T00:00:00') + i * 86400000))
      seen.add(pickDaily(riddles, day).type)
    }
    return seen.size === 10 ? true : '10 天只覆盖 ' + seen.size + ' 种'
  })
  add('轮转确定性：同一天两次摇结果一致', () => {
    const riddles = [mk('a', '增损'), mk('b', '增损'), mk('c', '会意')]
    const d = '2026-10-19'
    return pickDaily(riddles, d).riddle.id === pickDaily(riddles, d).riddle.id
      ? true : '同一天摇出不同谜'
  })
  add('快照字段：无 structure 的谜为 null 且 jie 从 md 提取', () => {
    const snap = buildSnapshot({ version: 3, count: 1, types: {},
      riddles: [{ id: 'x', title: '谜', answer: '出', answer_len: 1, type: '增损',
        subtype: null, difficulty: 1, tags: [], source: 'S1', license: 'public-domain',
        path: 'riddles/增损/谜.md' }] }, 'deadbeef')
    const r = snap.riddles[0]
    return r.structure === null && typeof r.jie === 'string' ? true : '快照字段异常：' + JSON.stringify(r)
  })
  console.log('[ok] sync-corpus --selftest 通过（' + cases.length + ' 项：' + cases.join('、') + '）')
  return process.exitCode || 0
}

const isEntry = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/sync-corpus.mjs')
if (isEntry) {
  if (process.argv.includes('--selftest')) process.exitCode = selftest()
  else if (process.argv.includes('--check')) process.exitCode = check()
  else {
    let oldCorpus = null
    try { oldCorpus = JSON.parse(readFileSync(OUT, 'utf8')) } catch {}
    const { data, sha256 } = readSource()
    const snap = buildSnapshot(data, sha256)
    const history = freezeHistory(oldCorpus, dayKey(new Date()),
      new Set(snap.riddles.map((r) => r.id)))
    snap.history = history
    mkdirSync(dirname(OUT), { recursive: true })
    writeFileSync(OUT, JSON.stringify(snap, null, 2) + '\n', 'utf8')
    console.log('[ok] 已快照 ' + snap.count + ' 谜 / 内容仓 ' + data.count + ' 谜')
    console.log('     contentVersion ' + snap.contentVersion + '，每日题历史冻到 ' + history.through
      + '（新增 ' + history.added + ' 天）')
    process.exitCode = 0
  }
}
