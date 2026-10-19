<script setup>
// 猜谜 · 游戏主容器。
//   每日一谜 / 自由练习 —— 已上线（每日冻结、打字判分、大键盘）
//   字谜工坊 —— 已上线（选拆解字 → 解字台拼装 → 写谜面 → 谜册/挑战链接）
// 挑战链接（?forge=…）打开时自动切到工坊页。
import { ref, onMounted } from 'vue'
import TopNav from './components/TopNav.vue'
import SiteFooter from './components/SiteFooter.vue'
import PlayView from './components/PlayView.vue'
import ForgeView from './components/ForgeView.vue'

const tab = ref('daily')

const TABS = [
  { id: 'daily', label: '每日一谜' },
  { id: 'practice', label: '自由练习' },
  { id: 'forge', label: '字谜工坊' },
]

onMounted(() => {
  if (new URLSearchParams(location.search).get('forge')) tab.value = 'forge'
})
</script>

<template>
  <TopNav />
  <div class="app">
    <header class="hdr">
      <h1>猜谜</h1>
      <p class="sub">拆一个字，懂一个字</p>
    </header>

    <nav class="tabs" aria-label="玩法选择">
      <button
        v-for="t in TABS"
        :key="t.id"
        :class="{ on: tab === t.id }"
        @click="tab = t.id"
      >{{ t.label }}</button>
    </nav>

    <main>
      <PlayView v-if="tab !== 'forge'" :key="tab" :mode="tab" />
      <ForgeView v-else />
    </main>
  </div>
  <SiteFooter />
</template>
