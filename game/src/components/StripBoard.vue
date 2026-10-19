<script setup>
// 解字台（PLAN-猜谜站 §3.2）——这个站的招牌玩法。
//
// 简：件块备好（真件 + 干扰件），挑对的放上台。
// 中：原字块 + 工具栏（全取/取左半/取右半/取部件/会意），自己配对工序；
//     配不上声明的 (字, 操作) 就是拆不出——猜料配工序本身就是玩法。
// 合成键只在台上的件与声明的部件恰好齐了才亮（多重集合一致）。
// 减笔/加笔（「难」档）是步骤 6 的事，这里不出现。
import { ref, computed, watch } from 'vue'
import { tryOp, isSolved, sourceBlocks, partBlocks, opsOf } from '../logic/strip.mjs'

const props = defineProps({
  riddle: { type: Object, required: true }, // 带 structure 的谜目
  level: { type: String, required: true }, // 'easy' | 'mid'
  charPool: { type: Array, required: true },
})
const emit = defineEmits(['solved'])

const OPS = [
  { id: 'full', label: '全取' },
  { id: 'half', label: '取左半' },
  { id: 'half_r', label: '取右半' },
  { id: 'part', label: '取部件' },
  { id: 'free', label: '会意' },
]

const used = ref([]) // 已消耗的 structure.ops 下标
const placed = ref([]) // 台上的件
const selBlock = ref('') // 选中的来源字/件块
const selOp = ref('') // 选中的操作
const shake = ref(false) // 拆不出的反馈

const blocks = computed(() => props.level === 'easy'
  ? partBlocks(props.riddle, props.charPool)
  : sourceBlocks(props.riddle, props.charPool))

const solved = computed(() => isSolved(placed.value, props.riddle.structure))

// 换谜或换档：台面重置
watch(() => [props.riddle.id, props.level], reset, { immediate: true })
function reset() {
  used.value = []
  placed.value = []
  selBlock.value = ''
  selOp.value = ''
  shake.value = false
}

function tapBlock(c) {
  if (props.level === 'easy') {
    // 简档：直接上件（可重复放同名件，比如两个「日」合成昌）
    place(c)
    return
  }
  selBlock.value = selBlock.value === c ? '' : c
  selOp.value = ''
}

function tapOpBtn(id) {
  if (!selBlock.value) return
  selOp.value = selOp.value === id ? '' : id
  if (selOp.value) tapOp(selOp.value)
}

function tapOp(id) {
  if (!selBlock.value) return
  const part = tryOp(selBlock.value, id, props.riddle.structure, used.value)
  if (part === null) {
    // 拆不出：晃一下，块保留，操作清空
    shake.value = true
    setTimeout(() => { shake.value = false }, 350)
    selOp.value = ''
    return
  }
  place(part)
  selBlock.value = ''
  selOp.value = ''
}

function place(c) {
  placed.value = [...placed.value, c]
  if (solved.value) {
    // 让孩子看见最后一块落位，再报喜
    setTimeout(() => emit('solved'), 450)
  }
}

function pull(c) {
  // 从台上取下一块（简档件块回到墙上——墙上的块是无限供应的展示，不必真的放回）
  placed.value = placed.value.filter((x, i) => !(x === c && i === placed.value.lastIndexOf(c)))
}

function undoAll() {
  reset()
}
</script>

<template>
  <div class="strip" :class="{ shake }">
    <div class="blocks" role="group" :aria-label="level === 'easy' ? '部件块' : '来源字块'">
      <button
        v-for="c in blocks"
        :key="c"
        class="blk"
        :class="{ sel: selBlock === c }"
        :disabled="level === 'mid' && used.length >= opsOf(riddle.structure).length"
        @click="tapBlock(c)"
      >{{ c }}</button>
    </div>

    <div v-if="level === 'mid'" class="toolbar" role="group" aria-label="拆解工序">
      <button
        v-for="o in OPS"
        :key="o.id"
        class="op"
        :class="{ on: selOp === o.id }"
        :disabled="!selBlock"
        @click="tapOpBtn(o.id)"
      >{{ o.label }}</button>
    </div>

    <div class="desk">
      <span class="desklabel">解字台</span>
      <div class="slots">
        <button
          v-for="(c, i) in placed"
          :key="c + i"
          class="slot"
          :disabled="solved"
          @click="pull(c)"
        >{{ c }}</button>
        <span v-if="!placed.length" class="empty">把拆出来的件放上台</span>
      </div>
      <button class="merge" :disabled="!solved">合成</button>
    </div>

    <div class="stripops">
      <button class="ghostbtn" @click="undoAll">重摆</button>
      <span class="tip">{{ level === 'easy' ? '挑出拼成谜底的部件' : '挑一块料，选一道工序' }}</span>
    </div>
  </div>
</template>

<style scoped>
.strip { margin-top: 6px; }
.blocks { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.blk {
  min-width: 46px; height: 46px; padding: 0 8px;
  border: 1px solid var(--line); border-radius: 10px;
  background: var(--surface-hi); color: var(--ink);
  font-family: var(--serif); font-size: 22px;
  cursor: pointer; transition: border-color .15s, color .15s, transform .1s;
}
.blk:hover:not(:disabled) { border-color: var(--c-primary); color: var(--c-primary); }
.blk.sel { border-color: var(--c-primary); color: var(--c-primary); background: var(--wash-2); }
.blk:active:not(:disabled) { transform: scale(.92); }
.toolbar { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 10px; }
.op {
  padding: 6px 12px; border: 1px solid var(--line); border-radius: 999px;
  background: var(--surface-hi); color: var(--ink-soft);
  font-size: 13.5px; cursor: pointer; font-family: var(--round);
}
.op.on { border-color: var(--c-primary); color: var(--c-primary); }
.op:disabled { opacity: .5; cursor: default; }
.desk {
  margin-top: 14px; padding: 12px;
  border: 1.5px dashed var(--line); border-radius: 12px;
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  min-height: 64px;
}
.desklabel { color: var(--ink-faint); font-size: 12.5px; flex: none; }
.slots { display: flex; gap: 8px; flex-wrap: wrap; flex: 1; }
.slot {
  width: 44px; height: 44px;
  border: 1px solid var(--c-primary); border-radius: 10px;
  background: var(--wash-2); color: var(--c-primary);
  font-family: var(--serif); font-size: 22px; cursor: pointer;
}
.slot:disabled { cursor: default; }
.empty { color: var(--ink-faint); font-size: 13px; }
.merge {
  padding: 8px 18px; border-radius: 9px; border: 1px solid var(--line);
  background: var(--surface-hi); color: var(--ink-faint);
  font-size: 14px; cursor: default; font-family: var(--round);
}
.merge:disabled { opacity: .6; }
.stripops { display: flex; gap: 10px; align-items: center; margin-top: 10px; }
.ghostbtn {
  padding: 5px 12px; border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--ink-soft);
  font-size: 13px; cursor: pointer; font-family: var(--round);
}
.ghostbtn:hover { border-color: var(--c-primary); color: var(--c-primary); }
.tip { color: var(--ink-faint); font-size: 12.5px; }
.shake { animation: shake .35s; }
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
</style>
