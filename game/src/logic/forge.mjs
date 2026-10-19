// 字谜工坊的纯逻辑。客户端与 tools/ 共用这一份。
//
// 工坊玩法（PLAN-猜谜站 §4.3）：孩子选拆解过的字 → 解字台拼出它 → 自己写谜面 →
// 存进「我的谜册」或生成挑战链接（?forge=，纯 URL 编码，零后端）。
//
// 「可解」是这个功能的生死线：只有 structure 完备的字才能进工坊字库——
// 拼不出来 = 死谜，工坊上线即废。check-forge.mjs 盯这一条。

import { opsOf, isSolved } from './strip.mjs'

/** 工坊字库：快照里有 structure 的谜目（答案字 + 拆法都是现成的，保证可拼）。 */
export function workshopChars(corpus) {
  return (corpus.riddles || []).filter((r) => r.structure && r.structure.ops && r.structure.ops.length)
}

/** 一个字可解吗：structure 声明自洽（result 锚定 answer）且部件齐。
 *  「部件拼不拼得成 result」是内容知识，程序判不了（无 IDS）——
 *  那一步由内容仓 check11 的冗余声明 + 人审把住，这里只拦声明不自洽的。 */
export function solvable(riddle) {
  if (!riddle || !riddle.answer) return false
  const st = riddle.structure
  if (!st || !st.result) return false
  if (String(st.result) !== String(riddle.answer)) return false
  const parts = opsOf(st).map((o) => String(o.part))
  return parts.length > 0 && isSolved(parts, st)
}

/** 谜面合法：非空、去掉首尾空白后 2–30 字、不把谜底直接写进谜面。 */
export function validClue(text, answer) {
  const t = String(text || '').trim()
  if (t.length < 2 || t.length > 30) return false
  return !t.includes(String(answer))
}

/** 挑战编码：JSON → UTF-8 → base64url。纯前端、零后端，链接即谜。 */
export function encodeChallenge(ch) {
  const json = JSON.stringify({
    t: String(ch.answer || ''),
    m: String(ch.clue || '').trim(),
    o: (ch.ops || []).map((x) => [String(x.part), String(x.from), String(x.op)]),
    n: String(ch.author || '').trim().slice(0, 12) || '工坊小作者',
  })
  const b64 = btoa(unescape(encodeURIComponent(json)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** 解码：任何不合法的输入都给 null（挑战链接是用户输入，不能信）。 */
export function decodeChallenge(s) {
  try {
    const b64 = String(s || '').replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(escape(atob(b64)))
    const o = JSON.parse(json)
    if (!o || typeof o.t !== 'string' || !o.t || o.t.length !== 1) return null
    if (typeof o.m !== 'string' || !validClue(o.m, o.t)) return null
    if (!Array.isArray(o.o) || !o.o.length) return null
    const ops = o.o.map((x) => ({ part: String(x[0]), from: String(x[1]), op: String(x[2]) }))
    if (ops.some((x) => !x.part || x.part.length !== 1 || !x.from || x.from.length !== 1 || !x.op)) return null
    return { answer: o.t, clue: o.m.trim(), ops, author: String(o.n || '工坊小作者') }
  } catch {
    return null
  }
}

/** 挑战链接（同源 /play/ 下）。 */
export function challengeUrl(ch) {
  return location.origin + location.pathname + '?forge=' + encodeChallenge(ch)
}
