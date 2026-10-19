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
