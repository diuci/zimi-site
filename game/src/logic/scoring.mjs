// 计分：难度分 + 连击 ×1.5 + 提示 ×0.5（PLAN-猜谜站 §5.1，沿用原规划，它是合理的）。
// 纯函数，客户端与 tools/ 共用这一份。
//
// 口径（容易写错的两处，都在这里钉死）：
//   - 连击只在自由练习累计；每日题一天一题，连击无意义，调用方不许传 combo>0 进每日题。
//   - 连击 ≥2 才乘 1.5（首题不乘）。
//   - 只在最后舍入一次（乘法交换，先连击后提示与反过来同值），不逐级取整。

/** 一题的得分。ok=false 恒为 0。 */
export function scoreAnswer({ ok, difficulty, combo = 0, hint = false }) {
  if (!ok) return 0
  const d = Math.max(1, Math.min(5, Number(difficulty) || 1))
  let pts = d
  if (combo >= 2) pts *= 1.5
  if (hint) pts *= 0.5
  return Math.round(pts)
}

/** 连击的下一值：对了 +1，错了清零。 */
export function nextCombo(combo, ok) {
  return ok ? (combo || 0) + 1 : 0
}

/** 谜种通关线：该谜种篇数的 80%（向上取整）。
 *  原规划「每栏目收满 100 条解锁」对离合（1 篇）永远解锁不了，改为按比例。 */
export function unlockGoal(typeCount) {
  return Math.max(1, Math.ceil(typeCount * 0.8))
}

/** 成就清单（PLAN §4.5，口径都钉在数据上，不靠感觉）：
 *  - 每谜种一条「XX 通关」：答对该谜种不同谜目 ≥ 通关线（刷同一题不算）
 *  - 不用拐杖：任一谜种无提示达到通关线
 *  - 小作者：字谜工坊出 10 道自己的谜
 *  - 百发百中：连续答对 10 题（历史最佳连击） */
export function achievements({ practice = {}, forgeCount = 0, corpus }) {
  const solved = new Set(practice.solved || [])
  const noHint = new Set(practice.noHint || [])
  const byType = {}
  const noHintByType = {}
  for (const r of corpus.riddles || []) {
    if (solved.has(r.id)) byType[r.type] = (byType[r.type] || 0) + 1
    if (noHint.has(r.id)) noHintByType[r.type] = (noHintByType[r.type] || 0) + 1
  }
  const out = []
  for (const [t, total] of Object.entries(corpus.types || {})) {
    const goal = unlockGoal(total)
    const got = byType[t] || 0
    out.push({ id: 'type:' + t, name: t + '通关', done: got >= goal,
      progress: Math.min(got, goal), goal, note: '答对 ' + goal + ' 道不同的' + t + '谜' })
  }
  const noHintDone = Object.entries(corpus.types || {})
    .some(([t, total]) => (noHintByType[t] || 0) >= unlockGoal(total))
  out.push({ id: 'nohint', name: '不用拐杖', done: noHintDone,
    progress: noHintDone ? 1 : 0, goal: 1, note: '任一谜种不用提示达到通关线' })
  out.push({ id: 'author', name: '小作者', done: forgeCount >= 10,
    progress: Math.min(forgeCount, 10), goal: 10, note: '在字谜工坊出 10 道自己的谜' })
  const best = practice.best || 0
  out.push({ id: 'combo10', name: '百发百中', done: best >= 10,
    progress: Math.min(best, 10), goal: 10, note: '连续答对 10 题' })
  return out
}
