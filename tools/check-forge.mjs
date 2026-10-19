// tools/check-forge.mjs —— 字谜工坊闸门。
//
// 工坊的生死线是「可解」：给定字必须能用它 structure 的部件拼出来，
// 拼不出来 = 死谜，孩子拿到永远过不了关。另外查挑战编码的往返一致与抗垃圾输入。
//
// 用法：node tools/check-forge.mjs [--selftest]

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { workshopChars, solvable, encodeChallenge, decodeChallenge, validClue } from '../game/src/logic/forge.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const CORPUS = resolve(HERE, '../game/src/data/corpus.json')

function run() {
  let corpus
  try { corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) }
  catch { console.error('[!!] 读不到快照：' + CORPUS); return 1 }

  const chars = workshopChars(corpus)
  const dead = chars.filter((r) => !solvable(r))
  if (dead.length) {
    for (const r of dead) console.error('[!!] 死谜：' + r.id + '（' + r.answer + '）的部件拼不回谜底')
    return 1
  }
  // 挑战编码往返：全字库抽验
  for (const r of chars) {
    const ch = { answer: r.answer, clue: '试一道' + r.type + '谜', ops: r.structure.ops, author: '闸门' }
    const back = decodeChallenge(encodeChallenge(ch))
    if (!back || back.answer !== ch.answer || back.clue !== ch.clue
      || JSON.stringify(back.ops) !== JSON.stringify(ch.ops.map((x) => ({ part: x.part, from: x.from, op: x.op })))) {
      console.error('[!!] 挑战编码往返失败：' + r.id)
      return 1
    }
    if (encodeChallenge(ch).length > 1800) {
      console.error('[!!] 挑战链接过长：' + r.id)
      return 1
    }
  }
  console.log('[ok] 工坊字库 ' + chars.length + ' 字全部可解；挑战编码往返与长度全部通过')
  return 0
}

function selftest() {
  const cases = []
  const add = (name, fn) => {
    const r = fn()
    if (r !== true) { console.error('[!!] ' + r); process.exitCode = 1; return }
    cases.push(name)
  }
  const mk = (over) => Object.assign({ id: 'a', answer: '出', structure:
    { ops: [{ part: '山', from: '山', op: 'full' }, { part: '山', from: '山', op: 'full' }], result: '出' } }, over)

  add('可解：部件拼回谜底', () => solvable(mk()) ? true : '可解的字被判死谜')
  add('死谜：result 与谜底不一致不进工坊', () =>
    !solvable(mk({ structure: { ops: [{ part: '山', from: '山', op: 'full' }, { part: '山', from: '山', op: 'full' }], result: '山' } }))
      ? true : 'result 锚定失效')
  add('诚实边界：声明自洽但拼装存疑的字照常进工坊', () =>
    solvable(mk({ structure: { ops: [{ part: '山', from: '山', op: 'full' }], result: '出' } }))
      ? true : '无 IDS 数据，拼装关系是内容审查的事，程序不许越权硬拦')
  add('死谜：没有 structure 不进工坊', () => !solvable(mk({ structure: null })) ? true : '无 structure 应不可解')
  add('谜面：太短/太长/泄底都不合法', () =>
    !validClue('卡', '卡') && !validClue('一', '卡') && !validClue('a'.repeat(31), '卡')
    && validClue('一上一下', '卡') ? true : 'validClue 口径错误')
  add('谜面：极常用字答案豁免泄底（一/十/口），非常用字照拦', () =>
    validClue('试一道增损谜', '一') && validClue('谜面里有一字', '一')
    && !validClue('谜底就是鲜', '鲜') ? true : '白名单豁免口径错误')
  add('编码往返：中文谜面与部件无损', () => {
    const ch = { answer: '鲜', clue: '一边鱼一边羊', ops: [{ part: '鱼', from: '鱼', op: 'full' }, { part: '羊', from: '羊', op: 'full' }], author: '小作者' }
    const back = decodeChallenge(encodeChallenge(ch))
    return back && back.answer === '鲜' && back.clue === '一边鱼一边羊'
      && back.author === '小作者' && back.ops.length === 2 ? true : '往返有损：' + JSON.stringify(back)
  })
  add('抗垃圾：乱码/缺字段/谜底泄底都给 null', () =>
    decodeChallenge('!!!not-base64!!!') === null
    && decodeChallenge('aGVsbG8=') === null // 'hello' 不是合法挑战
    && decodeChallenge(encodeChallenge({ answer: '卡', clue: '谜面里有卡字泄底', ops: [{ part: '上', from: '上', op: 'full' }] })) === null
    ? true : '垃圾输入没被拦住')
  console.log('[ok] check-forge --selftest 通过（' + cases.length + ' 项：' + cases.join('、') + '）')
  return process.exitCode || 0
}

const isEntry = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/check-forge.mjs')
if (isEntry) {
  process.exitCode = process.argv.includes('--selftest') ? selftest() : run()
}
