<script setup>
// 猜谜 · 游戏主容器。
//   每日一谜 / 自由练习 —— 步骤 3+4 已接入（PlayView：每日冻结、打字判分、大键盘）
//   字谜工坊 —— 步骤 8，依赖 structure 拆解数据（首批 18 篇已入库），仍是占位
// 占位文案对访问者如实说明状态，不假装可玩。
import { ref } from 'vue'
import TopNav from './components/TopNav.vue'
import SiteFooter from './components/SiteFooter.vue'
import PlayView from './components/PlayView.vue'

const tab = ref('daily')

const TABS = [
  { id: 'daily', label: '每日一谜' },
  { id: 'practice', label: '自由练习' },
  { id: 'forge', label: '字谜工坊' },
]
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
      <section v-else class="card">
        <h2>字谜工坊</h2>
        <p>自己出谜给别人猜：挑一个字，选拆法，工坊帮你写出谜面。会拆字的孩子，也能成为出题人。</p>
        <span class="soon">开发中，即将上线</span>
      </section>
    </main>
  </div>
  <SiteFooter />
</template>
