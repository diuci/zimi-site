<script setup>
// 猜谜主玩法（PLAN-猜谜站 §九 步骤 3 + 4）：每日一谜 / 自由练习，打字判分。
//
// 口径（都钉死在 scoring.mjs 与 daily.mjs，这里只管编排）：
//   - 每日一谜：同一天全网同一谜，本地时区；已答过的日子重进只回看，不再计分；
//     答错即揭示（一天一题，重试没有意义，也不许把每日题试成穷举）
//   - 自由练习：连击在这里累计（连击只在自由练习，每日题不许带连击）；
//     第一次答错不清答案、可以再想；第二次答错才揭示，也可跳过
//   - 提示 = 看拆解（有 structure 时）或解析首句，本题得分 ×0.5
//   - 进度存 localStorage（dc-zimi-*），纯前端、无账号，与全站路线一致
import { ref, computed, onMounted } from 'vue'
import TypingPad from './TypingPad.vue'
import StripBoard from './StripBoard.vue'
import corpus from '../data/corpus.json'
import { puzzleFor, dayKey, parseDayKey } from '../logic/daily.mjs'
import { scoreAnswer, nextCombo } from '../logic/scoring.mjs'

const props = defineProps({
  mode: { type: String, required: true }, // 'daily' | 'practice'
})

const PKEY = 'dc-zimi-practice'
const DKEY = 'dc-zimi-daily'

function loadJSON(k, fallback) {
  try { const v = JSON.parse(localStorage.getItem(k)); return v || fallback } catch { return fallback }
}
function saveJSON(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch {}
}

// ---- 候选键盘字符池：全库谜底 + structure 部件 ----
const CHAR_POOL = [...new Set(corpus.riddles.flatMap((r) => {
  const out = [String(r.answer)]
  if (r.structure && Array.isArray(r.structure.ops)) {
    for (const o of r.structure.ops) if (o.part) out.push(String(o.part))
  }
  return out
}))]

// ---- 运行状态 ----
const riddle = ref(null)
const frozen = ref(false)
const day = ref('')
const phase = ref('loading') // loading | asking | revealed
const result = ref('') // ok | fail
const hintUsed = ref(false)
const fails = ref(0)
const lastPts = ref(0)
const note = ref('')
const practice = ref(loadJSON(PKEY, { score: 0, combo: 0, best: 0, right: 0, wrong: 0 }))
const dailyLog = ref(loadJSON(DKEY, {}))
const filterType = ref('全部')
const filterDiff = ref(0) // 0 = 全部难度
const recent = ref([]) // 练习模式最近出过的谜 id，避免连续重复
const style = ref('strip') // 'strip' 拼装（解字台）| 'typing' 打字
const level = ref('easy') // 解字台档位：easy 简 | mid 中（难档的减笔/加笔在步骤 6）

const hasStructure = computed(() => !!(riddle.value && riddle.value.structure))
const effDiff = computed(() => {
  const d = riddle.value ? riddle.value.difficulty : 1
  return Math.min(5, d + (style.value === 'strip' && level.value === 'mid' ? 1 : 0))
})

const TYPES = ['全部', ...Object.keys(corpus.types || {})]

function pickPractice() {
  const pool = corpus.riddles.filter((r) =>
    (filterType.value === '全部' || r.type === filterType.value)
    && (!filterDiff.value || r.difficulty === filterDiff.value))
  let cand = pool.filter((r) => !recent.value.slice(0, 5).includes(r.id))
  if (!cand.length) cand = pool
  if (!cand.length) return null
  return cand[Math.floor(Math.random() * cand.length)]
}

function startRiddle(r, { isFrozen = false, dayStr = '' } = {}) {
  riddle.value = r
  frozen.value = isFrozen
  day.value = dayStr
  phase.value = 'asking'
  result.value = ''
  hintUsed.value = false
  fails.value = 0
  lastPts.value = 0
  note.value = ''
  style.value = r.structure ? 'strip' : 'typing'
  level.value = 'easy'
}

function startDaily() {
  // 回放：?d=YYYY-MM-DD 只认已冻结的日子
  const q = parseDayKey(new URLSearchParams(location.search).get('d'))
  const target = q || dayKey(new Date())
  try {
    const p = puzzleFor(corpus, target)
    day.value = target
    startRiddle(p.riddle, { isFrozen: p.frozen, dayStr: target })
    if (q && !p.frozen) note.value = '那一天还没发出过，出的是按今天词库摇出来的题'
    // 已答过的日子：直接回看结果，不再计分
    if (dailyLog.value[target]) {
      result.value = dailyLog.value[target].result
      hintUsed.value = !!dailyLog.value[target].hint
      phase.value = 'revealed'
    }
  } catch (e) {
    note.value = '每日题暂不可用：' + e.message
    riddle.value = null
    phase.value = 'revealed'
  }
}

function startPractice() {
  const r = pickPractice()
  if (!r) { note.value = '这个筛选下没有谜，换一个条件试试'; return }
  note.value = ''
  if (riddle.value) recent.value = [riddle.value.id, ...recent.value].slice(0, 10)
  startRiddle(r)
}

function retry() {
  phase.value = 'asking'
  result.value = ''
  hintUsed.value = hintUsed.value // 提示用过就算这题用过
}

function onPick(ch) {
  if (phase.value !== 'asking' || !riddle.value) return
  const ok = String(ch).trim() === String(riddle.value.answer)
  settle(ok)
}

/** 解字台拼成 → 成功（档位计分：简=难度、中=难度+1 封顶 5）。 */
function onStripSolved() {
  settle(true)
}

function settle(ok) {
  if (phase.value !== 'asking' || !riddle.value) return
  if (ok) {
    result.value = 'ok'
    phase.value = 'revealed'
    if (props.mode === 'practice') {
      const pts = scoreAnswer({ ok: true, difficulty: effDiff.value, combo: practice.value.combo, hint: hintUsed.value })
      lastPts.value = pts
      practice.value = {
        ...practice.value,
        score: practice.value.score + pts,
        combo: nextCombo(practice.value.combo, true),
        best: Math.max(practice.value.best, nextCombo(practice.value.combo, true)),
        right: practice.value.right + 1,
      }
      saveJSON(PKEY, practice.value)
    } else {
      dailyLog.value = { ...dailyLog.value, [day.value]: { result: 'ok', hint: hintUsed.value } }
      saveJSON(DKEY, dailyLog.value)
    }
  } else {
    fails.value++
    if (props.mode === 'daily') {
      // 每日一谜单次作答：答错即揭示
      result.value = 'fail'
      phase.value = 'revealed'
      dailyLog.value = { ...dailyLog.value, [day.value]: { result: 'fail', hint: hintUsed.value } }
      saveJSON(DKEY, dailyLog.value)
      return
    }
    practice.value = { ...practice.value, combo: nextCombo(practice.value.combo, false), wrong: practice.value.wrong + 1 }
    saveJSON(PKEY, practice.value)
    if (fails.value >= 2) {
      result.value = 'fail'
      phase.value = 'revealed'
    } else {
      note.value = '不对，再想想——提示可以帮你拆一拆'
    }
  }
}

function giveUp() {
  result.value = 'fail'
  phase.value = 'revealed'
}

const diffStars = computed(() => (riddle.value ? '★'.repeat(riddle.value.difficulty) + '☆'.repeat(5 - riddle.value.difficulty) : ''))
const hintParts = computed(() => {
  const st = riddle.value && riddle.value.structure
  if (!st || !Array.isArray(st.ops) || !st.ops.length) return ''
  return st.ops.map((o) => o.part).join(' + ') + ' → ' + st.result
})
const jieShort = computed(() => {
  const j = riddle.value && riddle.value.jie || ''
  return j.split(/[。\n]/)[0] + '。'
})

onMounted(() => {
  if (props.mode === 'daily') startDaily()
  else startPractice()
})
</script>

<template>
  <section class="play">
    <div v-if="mode === 'practice'" class="filters">
      <div class="chips" role="group" aria-label="按谜种筛选">
        <button
          v-for="t in TYPES" :key="t"
          :class="{ on: filterType === t }"
          @click="filterType = t; startPractice()"
        >{{ t }}</button>
      </div>
      <div class="chips" role="group" aria-label="按难度筛选">
        <button :class="{ on: filterDiff === 0 }" @click="filterDiff = 0; startPractice()">全部难度</button>
        <button
          v-for="d in 5" :key="d"
          :class="{ on: filterDiff === d }"
          @click="filterDiff = d; startPractice()"
        >{{ '★'.repeat(d) }}</button>
      </div>
      <div class="hud">
        得分 {{ practice.score }} · 连击 {{ practice.combo }} · 最佳连击 {{ practice.best }}
        · 对 {{ practice.right }} / 错 {{ practice.wrong }}
      </div>
    </div>

    <div v-if="!riddle" class="card"><p>{{ note || '加载中……' }}</p></div>

    <div v-else class="card board">
      <div class="meta">
        <span>{{ riddle.type }}</span>
        <span class="stars">{{ diffStars }}</span>
        <span v-if="mode === 'daily'" class="daytag">{{ frozen ? '每日一谜 ' + day : day + '（回放）' }}</span>
        <span v-if="riddle.ghost" class="daytag">原谜已下架，此为存档</span>
      </div>
      <div class="mian">{{ riddle.title }}</div>

      <div v-if="phase === 'asking'">
        <div class="stylebar" v-if="hasStructure">
          <span class="stylelabel">玩法</span>
          <button :class="{ on: style === 'strip' }" @click="style = 'strip'">拼装</button>
          <button :class="{ on: style === 'typing' }" @click="style = 'typing'">打字</button>
          <template v-if="style === 'strip'">
            <span class="stylelabel">档位</span>
            <button :class="{ on: level === 'easy' }" @click="level = 'easy'">简</button>
            <button :class="{ on: level === 'mid' }" @click="level = 'mid'">中</button>
          </template>
        </div>

        <div class="hintbar">
          <button class="ghostbtn" :disabled="hintUsed" @click="hintUsed = true">
            {{ hintUsed ? '提示已给出' : '提示（本题得分减半）' }}
          </button>
          <span v-if="hintUsed" class="hinttext">{{ hintParts || jieShort }}</span>
        </div>

        <StripBoard
          v-if="hasStructure && style === 'strip'"
          :riddle="riddle"
          :level="level"
          :char-pool="CHAR_POOL"
          @solved="onStripSolved"
        />
        <TypingPad
          v-else
          :seed="riddle.id"
          :answer="String(riddle.answer)"
          :char-pool="CHAR_POOL"
          @pick="onPick"
        />

        <div class="noteline">
          <span v-if="note">{{ note }}</span>
          <button v-if="mode === 'practice' && fails" class="ghostbtn" @click="giveUp">看答案</button>
        </div>
      </div>

      <div v-else class="verdict">
        <div :class="['ans', result]">
          {{ result === 'ok' ? '答对了' : (mode === 'daily' ? '今天没猜中' : '谜底在这里') }}
          <span class="anschar">{{ riddle.answer }}</span>
        </div>
        <div v-if="hintParts" class="struct">{{ hintParts }}</div>
        <div class="jie">{{ riddle.jie }}</div>
        <div v-if="mode === 'practice' && result === 'ok'" class="pts">+{{ lastPts }} 分</div>
        <div class="actions">
          <button v-if="mode === 'practice'" class="mainbtn" @click="startPractice">下一题</button>
          <button v-if="mode === 'practice' && result === 'fail'" class="ghostbtn" @click="startPractice">换一题</button>
          <span v-if="mode === 'daily'" class="daytag">明天再来——每天一谜，已发出的日子都不会变</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stylebar { display: flex; gap: 6px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
.stylelabel { color: var(--ink-faint); font-size: 12.5px; margin: 0 2px; }
.stylebar button {
  padding: 4px 12px; border: 1px solid var(--line); border-radius: 999px;
  background: var(--surface-hi); color: var(--ink-soft);
  font-size: 13px; cursor: pointer; font-family: var(--round);
}
.stylebar button.on { background: var(--c-primary); border-color: var(--c-primary); color: var(--paper); }
.stylebar button:not(.on):hover { border-color: var(--c-primary); color: var(--c-primary); }
.filters { margin-bottom: 12px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.chips button {
  padding: 4px 11px; border: 1px solid var(--line); border-radius: 999px;
  background: var(--surface-hi); color: var(--ink-soft);
  font-size: 13px; cursor: pointer; font-family: var(--round);
  transition: border-color .15s, color .15s, background .15s;
}
.chips button.on { background: var(--c-primary); border-color: var(--c-primary); color: var(--paper); }
.chips button:not(.on):hover { border-color: var(--c-primary); color: var(--c-primary); }
.hud { font-size: 13px; color: var(--ink-faint); }

.meta {
  display: flex; gap: 12px; align-items: baseline;
  color: var(--ink-faint); font-size: 13px;
}
.stars { color: var(--c-primary); letter-spacing: 2px; }
.daytag { color: var(--ink-faint); font-size: 12.5px; }
.mian {
  margin: 14px 0 4px;
  font-family: var(--serif); font-size: 30px; letter-spacing: 6px;
  text-align: center;
  /* 长谜面（如「外面一口圈里面一口田」10 字）在窄屏必须能按字换行 */
  word-break: break-all; line-height: 1.5;
}
.hintbar { display: flex; gap: 10px; align-items: center; margin: 10px 0 0; flex-wrap: wrap; }
.hinttext { color: var(--ink-soft); font-size: 14px; }
.ghostbtn {
  padding: 5px 12px; border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--ink-soft);
  font-size: 13px; cursor: pointer; font-family: var(--round);
}
.ghostbtn:hover:not(:disabled) { border-color: var(--c-primary); color: var(--c-primary); }
.ghostbtn:disabled { opacity: .55; cursor: default; }
.noteline {
  display: flex; gap: 10px; align-items: center;
  margin-top: 10px; min-height: 20px;
  color: var(--c-mis); font-size: 13.5px;
}
.verdict .ans { font-size: 17px; }
.verdict .ans.ok { color: var(--c-ok); }
.verdict .ans.fail { color: var(--c-mis); }
.anschar {
  display: inline-block; margin-left: 8px;
  font-family: var(--serif); font-size: 34px;
  color: var(--c-primary);
}
.struct { margin-top: 8px; color: var(--ink-soft); font-size: 15px; letter-spacing: 2px; }
.jie {
  margin-top: 10px; padding: 12px 14px;
  background: var(--wash-1); border-radius: 10px;
  line-height: 1.9; font-size: 14px; color: var(--ink);
}
.pts { margin-top: 8px; color: var(--c-ok); font-size: 14px; }
.actions { display: flex; gap: 10px; align-items: center; margin-top: 14px; flex-wrap: wrap; }
.mainbtn {
  padding: 9px 22px; border: 1px solid var(--c-primary); border-radius: 9px;
  background: var(--c-primary); color: var(--paper);
  font-size: 15px; cursor: pointer; font-family: var(--round);
}
.mainbtn:hover { filter: brightness(1.06); }
</style>
