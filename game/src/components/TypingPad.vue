<script setup>
// 大键盘：孩子不用切输入法，直接点字。PLAN-猜谜站 §3.1 的三大难题之一——
// 中文输入法在游戏里体验差，是最大的劝退点。
//
// 键位设计：
//   - 答案字必然在键盘上（种子定的位置），混入从全谜库谜底/部件里取的干扰字
//   - 布局按谜 id 做确定性洗牌（djb2 → mulberry32）：重试时键盘不变，孩子能形成位置记忆
//   - 上排保留一个手动输入框：桌面端系统输入法直接打字，是移动键盘之外的兜底
import { computed } from 'vue'
import { djb2, mulberry32 } from '../logic/daily.mjs'

const props = defineProps({
  seed: { type: String, required: true },
  answer: { type: String, required: true }, // 答案字必然在键盘上（保证可解）
  charPool: { type: Array, required: true }, // 干扰字全集（不含答案也行，会去重）
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['pick'])

const KEYS = 48

const keys = computed(() => {
  const ans = String(props.answer || '')
  const rest = [...new Set(props.charPool.filter(
    (c) => c && String(c).length === 1 && String(c) !== ans))]
  const rng = mulberry32(djb2('zimi-keys:' + props.seed))
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  const grid = rest.slice(0, KEYS - 1)
  // 答案字插在种子决定的位置：每个谜的键盘布局稳定，重试不变
  const at = Math.floor(rng() * (grid.length + 1))
  grid.splice(at, 0, ans)
  return grid
})

function onInput(e) {
  const v = String(e.target.value || '').trim()
  e.target.value = ''
  if (v) emit('pick', v)
}
</script>

<template>
  <div class="pad">
    <div class="grid" role="group" aria-label="选字键盘">
      <button
        v-for="c in keys"
        :key="c"
        class="key"
        :disabled="disabled"
        @click="emit('pick', c)"
      >{{ c }}</button>
    </div>
    <label class="manual">
      <span>或直接输入：</span>
      <input
        type="text"
        maxlength="4"
        :disabled="disabled"
        placeholder="打一个字"
        @keydown.enter.prevent="onInput"
        @change="onInput"
      >
    </label>
  </div>
</template>

<style scoped>
.pad { margin-top: 14px; }
.grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
}
.key {
  aspect-ratio: 1;
  border: 1px solid var(--line);
  background: var(--surface-hi);
  color: var(--ink);
  border-radius: 9px;
  font-size: 20px;
  font-family: var(--serif);
  cursor: pointer;
  padding: 0;
  transition: border-color .15s, color .15s, background .15s, transform .1s;
}
.key:hover:not(:disabled) { border-color: var(--c-primary); color: var(--c-primary); }
.key:active:not(:disabled) { transform: scale(.92); }
.manual {
  display: flex; align-items: center; gap: 8px;
  margin-top: 12px; font-size: 13px; color: var(--ink-faint);
}
.manual input {
  flex: 1; max-width: 180px;
  padding: 7px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: var(--surface-hi); color: var(--ink);
  font-size: 16px; font-family: var(--serif);
}
@media (max-width: 480px) {
  .grid { grid-template-columns: repeat(6, 1fr); }
  .key { font-size: 19px; }
}
</style>
