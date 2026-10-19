<script setup>
// 猜谜 · 游戏主容器（PLAN-猜谜站 §九 步骤 1 骨架）。
// 三个入口先立骨架：玩法内核在后续步骤接入——
//   每日一谜（步骤 3，冻结机制照抄 jiagu 的 daily.mjs）
//   自由练习（步骤 4 打字 + 大键盘；步骤 5 起解字台）
//   字谜工坊（步骤 8，依赖 structure 拆解数据）
// 占位文案对访问者如实说明状态，不假装可玩。
import { ref } from 'vue'
import TopNav from './components/TopNav.vue'
import SiteFooter from './components/SiteFooter.vue'

const tab = ref('daily')

const TABS = [
  { id: 'daily', label: '每日一谜' },
  { id: 'practice', label: '自由练习' },
  { id: 'forge', label: '字谜工坊' },
]

const PANELS = {
  daily: {
    title: '每日一谜',
    desc: '同一天所有人猜同一道谜，已发出的日子可回放。谜面、谜底、解析与计分都在路上。',
  },
  practice: {
    title: '自由练习',
    desc: '按谜种与难度筛选，拆字、会意、增损……想练哪个练哪个，还能在解字台上亲手把部件拼出谜底。',
  },
  forge: {
    title: '字谜工坊',
    desc: '自己出谜给别人猜：挑一个字，选拆法，工坊帮你写出谜面。会拆字的孩子，也能成为出题人。',
  },
}
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
      <section class="card">
        <h2>{{ PANELS[tab].title }}</h2>
        <p>{{ PANELS[tab].desc }}</p>
        <span class="soon">开发中，即将上线</span>
      </section>
    </main>
  </div>
  <SiteFooter />
</template>
