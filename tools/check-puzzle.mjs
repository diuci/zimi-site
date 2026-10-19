// tools/check-puzzle.mjs —— 谜库快照的游戏侧闸门。
//
// 内容仓的 validate.py 已查过内容本身；这里查「快照到游戏这一步」没有走样：
//   1. 快照自洽 —— id 唯一、谜面/谜底/解析齐、structure 与内容仓同一套规则
//   2. 每日题回放 30 天 —— 冻结日按记录出、未冻结日轮转摇得出、谜种轮转真的在转
//   3. 计分函数穷举自检 —— 难度分 × 连击 × 提示的每一格都对得上口径
//
// 用法：node tools/check-puzzle.mjs [--selftest]

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { puzzleFor, dayKey, presentTypes } from '../game/src/logic/daily.mjs'
import { scoreAnswer, nextCombo, unlockGoal } from '../game/src/logic/scoring.mjs'
import { tryOp, isSolved, sourceBlocks, partBlocks } from '../game/src/logic/strip.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const CORPUS = resolve(HERE, '../game/src/data/corpus.json')

// 与内容仓 validate.py STRUCT_OPS 同源同序（改那边必须同步这边）
const OPS = ['full', 'half', 'half_r', 'part', 'free', 'minus', 'plus']

/** structure 校验（与内容仓 check11 同一套规则，快照级复检）。riddle 需带 jie。 */
export function checkStructure(r) {
  const errs = []
  const st = r.structure
  if (st === null || st === undefined) return errs
  const rid = r.id
  if (typeof st !== 'object' || Array.isArray(st) || !st.ops) {
    errs.push(rid + ' structure 必须是 {ops, result}'); return errs
  }
  if (!Array.isArray(st.ops) || !st.ops.length) { errs.push(rid + ' structure.ops 空列表'); return errs }
  if (!st.result) { errs.push(rid + ' structure.result 缺失'); return errs }
  if (String(st.result) !== String(r.answer))
    errs.push(rid + ' 拆解结果 ' + st.result + ' 与谜底 ' + r.answer + ' 不一致')
  const hay = String(r.title || '') + String(r.jie || '')
  st.ops.forEach((op, i) => {
    const where = rid + ' ops[' + i + ']'
    if (!op || typeof op !== 'object') { errs.push(where + ' 非映射'); return }
    if (!OPS.includes(op.op)) errs.push(where + ' op 非法：' + op.op)
    if (!op.from || String(op.from).length !== 1) errs.push(where + ' from 非单字')
    else if (!hay.includes(String(op.from))) errs.push(where + ' from「' + op.from + '」不在谜面或解析里')
    if (!op.part || String(op.part).length !== 1) errs.push(where + ' part 非单字部件')
    else if (op.op === 'full' && String(op.part) !== String(op.from)) errs.push(where + ' full 但 part≠from')
  })
  return errs
}

function snapshotProblems(corpus) {
  const problems = []
  const rs = corpus.riddles || []
  if (corpus.count !== rs.length)
    problems.push('count 字段（' + corpus.count + '）与谜目数（' + rs.length + '）不符')
  const seen = new Set()
  for (const r of rs) {
    if (seen.has(r.id)) problems.push('id 重复：' + r.id)
    seen.add(r.id)
    if (!r.title) problems.push(r.id + ' 谜面为空')
    if (!r.answer || String(r.answer).length !== 1)
      problems.push(r.id + ' 谜底必须是非空单字：' + JSON.stringify(r.answer))
    if (!r.jie) problems.push(r.id + ' 解析为空（快照没提到 jie）')
    if (!r.type) problems.push(r.id + ' 缺谜种')
    for (const e of checkStructure(r)) problems.push(e)
  }
  // 轮转前提：presentTypes 至少 1 个，且 CANON 之外的谜种不会被摇到
  const pt = presentTypes(rs)
  if (!pt.length) problems.push('快照里没有可轮转的谜种')
  return problems
}

function replayProblems(corpus, days = 30) {
  const problems = []
  const today = new Date()
  for (let i = 0; i < days; i++) {
    const d = new Date(today.getTime() - i * 86400000)
    const day = dayKey(d)
    try {
      const p = puzzleFor(corpus, day)
      if (!p.riddle || !p.riddle.id) problems.push(day + ' 摇出空谜')
      if (p.frozen) {
        const hit = (corpus.history.days || []).find((x) => x.day === day)
        if (hit && hit.id !== p.riddle.id) problems.push(day + ' 冻结记录 ' + hit.id + ' 与出题 ' + p.riddle.id + ' 不符')
      }
    } catch (e) {
      problems.push(day + ' 回放失败：' + e.message)
    }
  }
  return problems
}

function scoringProblems() {
  const problems = []
  const expect = (name, got, want) => { if (got !== want) problems.push(name + '：得 ' + got + ' 应 ' + want) }
  expect('答对难度 3 无连击', scoreAnswer({ ok: true, difficulty: 3 }), 3)
  expect('答对难度 5 连击 2', scoreAnswer({ ok: true, difficulty: 5, combo: 2 }), 8) // 5×1.5=7.5→8
  expect('连击 1 不乘', scoreAnswer({ ok: true, difficulty: 4, combo: 1 }), 4)
  expect('提示折半', scoreAnswer({ ok: true, difficulty: 3, combo: 2, hint: true }), 2) // 3×1.5×0.5=2.25→2
  expect('答错得 0', scoreAnswer({ ok: false, difficulty: 5, combo: 9 }), 0)
  expect('连击清零', nextCombo(5, false), 0)
  expect('连击累加', nextCombo(5, true), 6)
  expect('离合通关线 80%', unlockGoal(1), 1)
  expect('增损通关线 80%', unlockGoal(45), 36)
  expect('难度越界钳到 1–5', scoreAnswer({ ok: true, difficulty: 9 }), 5)
  return problems
}

function run() {
  let corpus
  try { corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) }
  catch { console.error('[!!] 读不到快照：' + CORPUS + '（先跑 node tools/sync-corpus.mjs）'); return 1 }
  const problems = [...snapshotProblems(corpus), ...replayProblems(corpus), ...scoringProblems()]
  if (problems.length) {
    for (const p of problems) console.error('[!!] ' + p)
    console.error('    共 ' + problems.length + ' 个问题')
    return 1
  }
  console.log('[ok] 快照自洽（' + corpus.count + ' 谜）+ 每日题 30 天回放 + 计分自检 全部通过')
  return 0
}

function selftest() {
  const cases = []
  const add = (name, fn) => {
    const r = fn()
    if (r !== true) { console.error('[!!] ' + r); process.exitCode = 1; return }
    cases.push(name)
  }
  const mk = (over) => Object.assign({ id: 'a', title: '谜面', answer: '出', jie: '解析', type: '增损',
    difficulty: 1, structure: null }, over)
  const snapOf = (rs) => ({ count: rs.length, riddles: rs, history: { days: [], ghosts: {} } })

  add('谜底为空被抓', () => snapshotProblems(snapOf([mk({ answer: '' })])).some((p) => p.includes('谜底')))
  add('谜底多字被抓', () => snapshotProblems(snapOf([mk({ answer: '出山' })])).some((p) => p.includes('单字')))
  add('id 重复被抓', () => snapshotProblems(snapOf([mk(), mk({ id: 'a' })])).some((p) => p.includes('id 重复')))
  add('解析为空被抓', () => snapshotProblems(snapOf([mk({ jie: '' })])).some((p) => p.includes('解析为空')))
  add('structure result 与谜底不符被抓', () =>
    snapshotProblems(snapOf([mk({ structure: { ops: [{ part: '山', from: '山', op: 'full' }], result: '山' } })]))
      .some((p) => p.includes('拆解结果')))
  add('structure from 不在谜面/解析被抓', () =>
    snapshotProblems(snapOf([mk({ structure: { ops: [{ part: '口', from: '口', op: 'full' }], result: '出' } })]))
      .some((p) => p.includes('from')))
  add('干净快照无误报', () => snapshotProblems(snapOf([mk(), mk({ id: 'b', type: '会意', answer: '心' })])).length === 0
    ? true : '干净快照被误报：' + JSON.stringify(snapshotProblems(snapOf([mk(), mk({ id: 'b', type: '会意', answer: '心' })]))))
  add('score 穷举：连击与提示的组合全部舍入一致', () => {
    for (let d = 1; d <= 5; d++) {
      for (let c = 0; c <= 9; c++) {
        for (const h of [false, true]) {
          const base = d * (c >= 2 ? 1.5 : 1) * (h ? 0.5 : 1)
          if (scoreAnswer({ ok: true, difficulty: d, combo: c, hint: h }) !== Math.round(base))
            return '组合 d=' + d + ' c=' + c + ' h=' + h + ' 不符'
        }
      }
    }
    return true
  })
  // 解字台纯逻辑（strip.mjs）：判定与出件
  const st = { ops: [{ part: '扌', from: '推', op: 'half' }, { part: '京', from: '就', op: 'half_r' }], result: '掠' }
  add('strip：配对工序出件并消耗', () => {
    const used = []
    return tryOp('推', 'half', st, used) === '扌' && used.length === 1 ? true : '取左半没出件'
  })
  add('strip：配不上的 (字,操作) 拆不出', () => tryOp('推', 'half_r', st, []) === null ? true : '错的工序不该出件')
  add('strip：同一工序重复消耗会被挡', () => {
    const used = []
    tryOp('推', 'half', st, used)
    return tryOp('推', 'half', st, used) === null ? true : '同一声明被用了两次'
  })
  add('strip：多重集合判定（顺序无关、数量必齐）', () => {
    const ok = isSolved(['京', '扌'], st)
    const dup = isSolved(['扌', '扌'], st)
    const miss = isSolved(['扌'], st)
    return ok && !dup && !miss ? true : 'isSolved 判定错误'
  })
  add('strip：同 (字,操作) 声明多件时逐个出', () => {
    const st2 = { ops: [{ part: '三', from: '春', op: 'part' }, { part: '人', from: '春', op: 'part' }], result: '秦' }
    const used = []
    const a = tryOp('春', 'part', st2, used)
    const b = tryOp('春', 'part', st2, used)
    return (a === '三' && b === '人') || (a === '人' && b === '三') ? true : '多件声明没逐个出'
  })
  add('strip：简档件块含全部真部件，中档字块含全部来源字', () => {
    const r = { id: 'x', title: '半推半就', structure: st }
    const pool = ['山', '水', '火', '口']
    const pb = partBlocks(r, pool)
    const sb = sourceBlocks(r, pool)
    return ['扌', '京'].every((c) => pb.includes(c)) && ['推', '就'].every((c) => sb.includes(c))
      ? true : '块面没盖住必需字符：' + JSON.stringify({ pb, sb })
  })
  console.log('[ok] check-puzzle --selftest 通过（' + cases.length + ' 项：' + cases.join('、') + '）')
  return process.exitCode || 0
}

const isEntry = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/check-puzzle.mjs')
if (isEntry) {
  process.exitCode = process.argv.includes('--selftest') ? selftest() : run()
}
