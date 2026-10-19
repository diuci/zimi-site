// 每日一谜的选谜与种子。客户端与 tools/ 共用这一份。
//
// 规则：同一天全网同一谜；日期可回放（?d=YYYY-MM-DD）。
// 选谜不排难度、不排重：种子由日期决定，人不能挑，挑了就不是「今天这一谜」。
//
// 与 jiagu 的差别：按**谜种轮转**（PLAN-猜谜站 §4.1）——
// 谜种分布极不均（增损 45、离合 1），纯随机会让增损反复出现、离合几乎抽不到。
// 先按「天序号 mod 现有谜种数」定谜种，类内再用日期种子取谜。
// 谜种顺序用内容仓 validate.py 的合法集顺序（CANON_TYPES），保证跨端一致。
//
// 已经发出去的日子记在 corpus.json 的 history 里，回放一律按那份记录走。
// 为什么必须记下来：选谜是「日期 → 词库里的第几个」，词库一变（内容仓补了谜、
// 改了顺序），同一天的题就跟着变。玩家上周猜过的那一谜，这周回放变成另一谜，
// 那不叫回放，那叫换题。所以过去的日子钉死在记录里，只有还没玩过的日子跟着词库走。
//
// 种子用自包含的确定性哈希（djb2 → mulberry32），不引 seedrandom 依赖。

export const DAY_MS = 86400000

// 与内容仓 tools/validate.py 的 TYPES 同源同序（改那边必须同步这边）
export const CANON_TYPES = ['拆字', '会意', '谐音', '增损', '离合', '典故', '象形', '方位', '数字', '当代']

/** 本地日期 → YYYY-MM-DD。用本地时区：「今天这一谜」按玩家所在的日子算。 */
export function dayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + day
}

export function parseDayKey(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''))
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const day = Number(m[3])
  if (mo < 1 || mo > 12 || day < 1 || day > 31) return null
  const dt = new Date(y, mo - 1, day)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== day) return null
  return dt
}

/** djb2 字符串哈希 → 32 位无符号整数。确定性、跨语言可复现。 */
export function djb2(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0
  }
  return h
}

/** mulberry32：由 32 位种子生成确定性伪随机序列。 */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 快照里实际有谜的谜种，按 CANON_TYPES 的顺序排。 */
export function presentTypes(riddles) {
  const have = new Set(riddles.map((r) => r.type))
  return CANON_TYPES.filter((t) => have.has(t))
}

/** 当天玩哪一谜：谜种轮转 + 类内日期种子。riddles 顺序必须稳定（sync 按谜种/难度/id 排）。 */
export function pickDaily(riddles, day) {
  if (!riddles.length) throw new Error('谜库快照是空的')
  const types = presentTypes(riddles)
  if (!types.length) throw new Error('谜库快照里没有合法谜种')
  const dayIdx = Math.floor(Date.parse(day + 'T00:00:00') / DAY_MS)
  const type = types[dayIdx % types.length]
  const pool = riddles.filter((r) => r.type === type)
  const rng = mulberry32(djb2('zimi-daily:' + day))
  const idx = Math.floor(rng() * pool.length)
  return { riddle: pool[idx], type, day }
}

/** 这一天冻在记录里吗？冻着就必须按记录的那一谜出，不许重新摇。 */
export function frozenFor(corpus, day) {
  const h = corpus && !Array.isArray(corpus) ? corpus.history : null
  if (!h || !Array.isArray(h.days)) return null
  const hit = h.days.find((x) => x.day === day)
  if (!hit) return null
  const all = Array.isArray(corpus) ? [] : corpus.riddles
  const cur = all.find((r) => r.id === hit.id)
  if (cur) return { riddle: cur, frozen: true }
  const ghost = (h.ghosts || {})[hit.id]
  if (ghost) return { riddle: Object.assign({ ghost: true }, ghost), frozen: true }
  throw new Error(day + ' 冻在记录里，指向「' + hit.id + '」，可快照与幽灵记录里都没有这个谜')
}

/** 一个可玩的题面：冻结优先，未冻结按轮转摇。CI 回放与客户端走同一条路。 */
export function puzzleFor(corpus, day) {
  const riddles = Array.isArray(corpus) ? corpus : corpus.riddles
  if (!riddles || !riddles.length) throw new Error('谜库快照是空的')
  const frozen = frozenFor(corpus, day)
  const picked = frozen || pickDaily(riddles, day)
  return { riddle: picked.riddle, day, frozen: !!frozen }
}
