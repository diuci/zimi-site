// 解字台的纯逻辑。客户端与 tools/ 共用这一份。
//
// 诚实边界（PLAN-猜谜站 §7.2.1 实测）：没有 IDS 部件数据，程序算不出
// 「推 的左半是 扌」。所以解字台不做字形推导，只做**知识判定**：
// 谜目的 structure 已经声明了哪个字、经什么操作、出哪个部件；
// 玩家在字块墙上挑字、在工具栏挑操作，(字, 操作) 对得上声明才出件，
// 对不上就是「拆不出」——这正是玩法：猜哪块料、配哪道工序。
//
// 两个档位（步骤 5；「难」档的减笔/加笔在步骤 6）：
//   简：部件已备好（真部件 + 干扰件），只挑对的不挑多的
//   中：给原字块 + 工具栏（全取/取左半/取右半/取部件/会意），自己配对

import { djb2, mulberry32 } from './daily.mjs'

/** structure 声明的全部工序 [{from, op, part}]。无 structure 返回空。 */
export function opsOf(structure) {
  if (!structure || !Array.isArray(structure.ops)) return []
  return structure.ops
}

/** 试一道工序：该 (from, op) 在 structure 里还有没消耗的声明吗？
 *  有 → 返回部件并记入 used（索引数组）；没有 → null（拆不出）。
 *  同一 (from, op) 声明了多个部件时（如 春 → 三 / 人），每次消耗一个。 */
export function tryOp(from, op, structure, used) {
  const ops = opsOf(structure)
  for (let i = 0; i < ops.length; i++) {
    if (used.includes(i)) continue
    const o = ops[i]
    if (String(o.from) === String(from) && o.op === op && o.part) {
      used.push(i)
      return String(o.part)
    }
  }
  return null
}

/** 台上的件拼齐了吗：已放件与声明的部件多重集合一致（含数量，不含顺序）。 */
export function isSolved(placed, structure) {
  const want = opsOf(structure).map((o) => String(o.part)).sort()
  const got = placed.map(String).sort()
  return want.length === got.length && want.every((c, i) => c === got[i])
}

/** 确定性洗牌（同一谜的块面布局稳定，重试不变）。 */
export function seededShuffle(arr, seedStr) {
  const out = arr.slice()
  const rng = mulberry32(djb2('zimi-strip:' + seedStr))
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** 中档的来源字块：structure 用到的 from 字 + 谜面里的干扰字。 */
export function sourceBlocks(riddle, pool, n = 6) {
  const ops = opsOf(riddle.structure)
  const froms = [...new Set(ops.map((o) => String(o.from)))]
  const titleChars = [...new Set(String(riddle.title || '').split(''))]
    .filter((c) => /\p{Script=Han}/u.test(c) && !froms.includes(c))
  const extra = seededShuffle(
    pool.filter((c) => !froms.includes(c) && !titleChars.includes(c)),
    riddle.id + ':mid',
  ).slice(0, Math.max(0, n - froms.length - Math.min(2, titleChars.length)))
  return seededShuffle([...froms, ...titleChars.slice(0, 2), ...extra], riddle.id + ':mid')
}

/** 简档的件块：真部件 + 干扰件。 */
export function partBlocks(riddle, pool, n = 10) {
  const parts = [...new Set(opsOf(riddle.structure).map((o) => String(o.part)))]
  const distract = seededShuffle(
    pool.filter((c) => !parts.includes(c)),
    riddle.id + ':easy',
  ).slice(0, Math.max(0, n - parts.length))
  return seededShuffle([...parts, ...distract], riddle.id + ':easy')
}
