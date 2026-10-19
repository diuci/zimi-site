<script setup>
// 字谜工坊（PLAN-猜谜站 §4.3）——会拆字的孩子，也能成为出题人。
//
// 三步创作：选字（工坊字库=structure 完备的字，保证拼得出）→ 解字台拼出它 →
// 自己写谜面 → 收进谜册 / 复制挑战链接（?forge=…，纯 URL，零后端）。
// 别人打开链接：工坊页顶部出现「向你挑战」，玩完才知道谜底。
// 谜面判据：非空、2–30 字、不许把谜底直接写进谜面（forge.mjs validClue）。
import { ref, computed, onMounted } from 'vue'
import TypingPad from './TypingPad.vue'
import StripBoard from './StripBoard.vue'
import corpus from '../data/corpus.json'
import { workshopChars, challengeUrl, encodeChallenge, decodeChallenge, validClue } from '../logic/forge.mjs'

const FKEY = 'dc-zimi-forge'
const CHAR_POOL = [...new Set(corpus.riddles.flatMap((r) => {
  const out = [String(r.answer)]
  if (r.structure && Array.isArray(r.structure.ops)) {
    for (const o of r.structure.ops) if (o.part) out.push(String(o.part))
  }
  return out
}))]

const workshop = workshopChars(corpus)
const step = ref(1) // 1 选字 | 2 拼装 | 3 写谜面
const picked = ref(null) // 选中的谜目（带 structure）
const clue = ref('')
const author = ref('')
const saved = ref(load())
const link = ref('')
const note = ref('')
const challenge = ref(null) // ?forge= 来的挑战
const playResult = ref('') // 挑战/试玩的判定
const playPick = ref('')

function load() {
  try { return JSON.parse(localStorage.getItem(FKEY)) || [] } catch { return [] }
}
function persist() {
  try { localStorage.setItem(FKEY, JSON.stringify(saved.value)) } catch {}
}

// 链接挑战：?forge= 出现时直接切到工坊
onMounted(() => {
  const q = new URLSearchParams(location.search).get('forge')
  if (q) {
    challenge.value = decodeChallenge(q)
    if (!challenge.value) note.value = '这个挑战链接打不开——可能复制的时候缺了字'
  }
})

function pickChar(r) {
  picked.value = r
  step.value = 2
  playResult.value = ''
  playPick.value = ''
}

function onSolved() {
  step.value = 3
}

function clueOk() {
  return validClue(clue.value, picked.value ? picked.value.answer : '')
}

function saveEntry() {
  if (!clueOk() || !picked.value) return
  const entry = {
    answer: picked.value.answer,
    clue: clue.value.trim(),
    ops: picked.value.structure.ops,
    author: author.value.trim() || '工坊小作者',
    at: Date.now(),
  }
  saved.value = [entry, ...saved.value].slice(0, 50)
  persist()
  link.value = challengeUrl(entry)
  note.value = '已收进谜册'
}

function copyLink(entry) {
  link.value = challengeUrl(entry)
  try { navigator.clipboard.writeText(link.value) } catch {}
  note.value = '挑战链接已复制，发给朋友吧'
}

function removeEntry(at) {
  saved.value = saved.value.filter((x) => x.at !== at)
  persist()
}

function tryPlay(entry) {
  playResult.value = String(playPick.value).trim() === String(entry.answer) ? 'ok' : 'fail'
}
</script>

<template>
  <section class="forge">
    <!-- 挑战模式：链接里带来的一谜 -->
    <div v-if="challenge" class="card">
      <h2>向你挑战</h2>
      <p class="byline">{{ challenge.author }} 出题</p>
      <div class="mian">{{ challenge.clue }}</div>
      <template v-if="playResult !== 'ok'">
        <TypingPad
          seed="forge-challenge"
          :answer="challenge.answer"
          :char-pool="CHAR_POOL"
          @pick="c => { playPick = c; tryPlay({ answer: challenge.answer }) }"
        />
        <p v-if="playResult === 'fail'" class="miss">不对，再想想</p>
      </template>
      <div v-else class="win">
        答对了，就是「<b class="big">{{ challenge.answer }}</b>」
        <div class="struct">{{ challenge.ops.map(o => o.part).join(' + ') }} → {{ challenge.answer }}</div>
      </div>
      <div class="ops-row"><button class="ghostbtn" @click="challenge = null">收起挑战</button></div>
    </div>

    <!-- 创作流 -->
    <div v-if="step === 1" class="card">
      <h2>第一步：挑一个字</h2>
      <p class="lead">这些字都能拆——选出你要别人猜的字。</p>
      <div class="chars">
        <button
          v-for="r in workshop"
          :key="r.id"
          class="charbtn"
          :title="r.type + ' · ' + r.title"
          @click="pickChar(r)"
        >{{ r.answer }}</button>
      </div>
    </div>

    <div v-else-if="step === 2 && picked" class="card">
      <h2>第二步：亲手拼出「{{ picked.answer }}」</h2>
      <p class="lead">在解字台上把它拼出来——你写的谜面，得真的能拼成才行。</p>
      <StripBoard :riddle="picked" level="mid" :char-pool="CHAR_POOL" @solved="onSolved" />
      <div class="ops-row"><button class="ghostbtn" @click="step = 1">重选</button></div>
    </div>

    <div v-else-if="step === 3 && picked" class="card">
      <h2>第三步：写你的谜面</h2>
      <div class="win">拼成了「<b class="big">{{ picked.answer }}</b>」</div>
      <label class="field">
        <span>谜面（2–30 字，不许出现「{{ picked.answer }}」）</span>
        <textarea v-model="clue" rows="2" maxlength="30" placeholder="比如：一上一下"></textarea>
      </label>
      <label class="field">
        <span>署名（可不填）</span>
        <input v-model="author" maxlength="12" placeholder="工坊小作者">
      </label>
      <p v-if="clue && !clueOk()" class="miss">谜面要在 2–30 字之间，而且不能把谜底直接写出来</p>
      <div class="ops-row">
        <button class="mainbtn" :disabled="!clueOk()" @click="saveEntry">收进谜册</button>
        <button class="ghostbtn" @click="step = 2">回去重拼</button>
      </div>
    </div>

    <!-- 我的谜册 -->
    <div v-if="saved.length" class="card">
      <h2>我的谜册（{{ saved.length }}）</h2>
      <div v-for="e in saved" :key="e.at" class="entry">
        <div class="entry-main">
          <div class="entry-clue">{{ e.clue }}</div>
          <div class="entry-by">{{ e.author }} 出 · 谜底「{{ e.answer }}」</div>
          <div v-if="playResult === 'ok' && playPick" class="win">猜中了！</div>
          <p v-else-if="playResult === 'fail'" class="miss">不对，再想想</p>
        </div>
        <div class="entry-ops">
          <input v-model="playPick" maxlength="1" class="mininput" placeholder="猜" @keydown.enter="tryPlay(e)">
          <button class="ghostbtn" @click="copyLink(e)">复制链接</button>
          <button class="ghostbtn danger" @click="removeEntry(e.at)">删</button>
        </div>
      </div>
      <p v-if="link" class="linkrow">{{ link }}</p>
      <p v-if="note" class="byline">{{ note }}</p>
    </div>
  </section>
</template>

<style scoped>
.card {
  background: var(--card-grad); border: 1px solid var(--line); border-radius: var(--radius);
  padding: 22px 20px; box-shadow: var(--shadow); margin-bottom: 16px;
}
.card h2 { margin: 0 0 8px; font-family: var(--serif); font-size: 19px; }
.lead { margin: 0 0 12px; color: var(--ink-soft); font-size: 14px; }
.byline { color: var(--ink-faint); font-size: 13px; }
.chars { display: flex; flex-wrap: wrap; gap: 8px; }
.charbtn {
  width: 52px; height: 52px;
  border: 1px solid var(--line); border-radius: 10px;
  background: var(--surface-hi); color: var(--ink);
  font-family: var(--serif); font-size: 26px; cursor: pointer;
  transition: border-color .15s, color .15s, transform .1s;
}
.charbtn:hover { border-color: var(--c-primary); color: var(--c-primary); }
.charbtn:active { transform: scale(.92); }
.mian {
  margin: 12px 0; font-family: var(--serif); font-size: 26px; letter-spacing: 4px;
  text-align: center; word-break: break-all; line-height: 1.5;
}
.win { margin: 10px 0; color: var(--c-ok); font-size: 16px; }
.big { font-family: var(--serif); font-size: 30px; color: var(--c-primary); }
.struct { margin-top: 6px; color: var(--ink-soft); font-size: 14.5px; letter-spacing: 2px; }
.field { display: block; margin: 12px 0; font-size: 13.5px; color: var(--ink-soft); }
.field textarea, .field input {
  display: block; width: 100%; margin-top: 6px;
  padding: 9px 11px;
  border: 1px solid var(--line); border-radius: 9px;
  background: var(--surface-hi); color: var(--ink);
  font-size: 16px; font-family: var(--serif);
}
.miss { color: var(--c-mis); font-size: 13.5px; }
.ops-row { display: flex; gap: 10px; margin-top: 12px; align-items: center; }
.mainbtn {
  padding: 9px 22px; border: 1px solid var(--c-primary); border-radius: 9px;
  background: var(--c-primary); color: var(--paper);
  font-size: 15px; cursor: pointer; font-family: var(--round);
}
.ghostbtn {
  padding: 6px 13px; border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--ink-soft);
  font-size: 13px; cursor: pointer; font-family: var(--round);
}
.ghostbtn:hover { border-color: var(--c-primary); color: var(--c-primary); }
.ghostbtn.danger:hover { border-color: var(--c-mis); color: var(--c-mis); }
.entry {
  display: flex; gap: 12px; align-items: center; justify-content: space-between;
  padding: 10px 0; border-top: 1px solid var(--line); flex-wrap: wrap;
}
.entry:first-of-type { border-top: 0; }
.entry-clue { font-family: var(--serif); font-size: 17px; }
.entry-by { color: var(--ink-faint); font-size: 12.5px; margin-top: 2px; }
.entry-ops { display: flex; gap: 6px; align-items: center; }
.mininput {
  width: 44px; height: 36px; text-align: center;
  border: 1px solid var(--line); border-radius: 8px;
  background: var(--surface-hi); color: var(--ink);
  font-size: 17px; font-family: var(--serif);
}
.linkrow {
  margin: 10px 0 0; padding: 8px 10px;
  background: var(--wash-1); border-radius: 8px;
  font-size: 12px; color: var(--ink-soft); word-break: break-all;
}
</style>
