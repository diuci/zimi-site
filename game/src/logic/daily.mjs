// 每日一谜的选谜与种子。客户端与 tools/ 共用这一份。
//
// 机械件（dayKey/parseDayKey/djb2/mulberry32/冻结回放）已收进统一核心
// core/daily.mjs（PLAN-全站统一-v2）——这里只留**本站的选题策略**：
// 按**谜种轮转**（PLAN-猜谜站 §4.1）——谜种分布极不均（增损 45、离合 1），
// 纯随机会让增损反复出现、离合几乎抽不到。先按「天序号 mod 现有谜种数」
// 定谜种，类内再用日期种子取谜。
// 谜种顺序用内容仓 validate.py 的合法集顺序（CANON_TYPES），保证跨端一致。
//
// 已经发出去的日子记在 corpus.json 的 history 里，回放一律按那份记录走
// （core 的 frozenFor 铁律：记录钉了 id 就按记录走，词库怎么变都不换谜）。

import {
  dayKey,
  parseDayKey,
  djb2,
  mulberry32,
  DAY_MS,
  pickFromPool,
  frozenFor as coreFrozenFor,
} from '../../../core/daily.mjs'

// 机械件原样再导出：tools/（check-puzzle/check-forge/sync-corpus 等）与
// store 都从这里拿——站内导入路径不变，core 是唯一实现。
export { dayKey, parseDayKey, djb2, mulberry32, DAY_MS }

// 与内容仓 tools/validate.py 的 TYPES 同源同序（改那边必须同步这边）
export const CANON_TYPES = ['拆字', '会意', '谐音', '增损', '离合', '典故', '象形', '方位', '数字', '当代']

/** 快照里实际有谜的谜种，按 CANON_TYPES 的顺序排。 */
export function presentTypes(riddles) {
  const have = new Set(riddles.map((r) => r.type))
  return CANON_TYPES.filter((t) => have.has(t))
}

/** 当天玩哪一谜：谜种轮转 + 类内日期种子（salt 用本站名——不与别站同题）。
 *  riddles 顺序必须稳定（sync 按谜种/难度/id 排）。 */
export function pickDaily(riddles, day) {
  if (!riddles.length) throw new Error('谜库快照是空的')
  const types = presentTypes(riddles)
  if (!types.length) throw new Error('谜库快照里没有合法谜种')
  const dayIdx = Math.floor(Date.parse(day + 'T00:00:00') / DAY_MS)
  const type = types[dayIdx % types.length]
  const pool = riddles.filter((r) => r.type === type)
  const riddle = pickFromPool(pool, day, 'zimi-daily')
  return { riddle, type, day }
}

/** 这一天冻在记录里吗？（core 机械件 + 本站谜库查找）
 *  core 返回 {char, frozen}（char 泛指当题对象）——本站口径是 riddle，这里映射。 */
export function frozenFor(corpus, day) {
  const f = coreFrozenFor(
    Array.isArray(corpus) ? null : corpus.history,
    day,
    (id) => {
      const all = Array.isArray(corpus) ? corpus : corpus.riddles
      return all.find((r) => r.id === id)
    },
  )
  return f ? { riddle: f.char, frozen: true } : null
}

/** 一个可玩的题面：冻结优先，未冻结按轮转摇。CI 回放与客户端走同一条路。 */
export function puzzleFor(corpus, day) {
  const riddles = Array.isArray(corpus) ? corpus : corpus.riddles
  if (!riddles || !riddles.length) throw new Error('谜库快照是空的')
  const frozen = frozenFor(corpus, day)
  const picked = frozen || pickDaily(riddles, day)
  return { riddle: picked.riddle, day, frozen: !!frozen }
}
