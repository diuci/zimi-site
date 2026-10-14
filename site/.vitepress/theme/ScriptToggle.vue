<script setup>
/**
 * 繁简切换：字谜站的繁简是「换页」，不是就地转写。
 *
 * 简体页 /riddles/<谜种>/<谜面> ↔ 繁体页 /trad/<谜种>/<谜面>
 * （build-site.py 两边都生成；繁体整篇 md 来自内容仓派生 data/traditional.json，
 *  引擎唯一，站点不自转）。
 *
 * 没有繁体对应的页面——首页、索引之外无对应者、打印版、指南、数据来源、版权——
 * 不摆这枚钮：摆了就是点了没反应（规范 §3）。
 * 索引页 /riddles/索引 ↔ /trad/索引 有对应，摆钮。
 *
 * 状态键 dc-script 与全站同一个名字。
 */
import { computed } from 'vue'
import { useRoute, withBase } from 'vitepress'

const route = useRoute()

function normalize(p) {
  return String(p || '').replace(/index\.html$/i, '').replace(/\.html$/i, '')
}

// 简体 /riddles/X ↔ 繁体 /trad/X。索引页同样适用（X = 索引）。
// '/riddles' 8 字符、'/trad' 5 字符，切片要精确。
function counterpart(p) {
  const norm = normalize(p)
  if (norm.startsWith('/trad/')) {
    return '/riddles' + norm.slice(5) // /trad/X → /riddles/X
  }
  if (norm.startsWith('/riddles/')) {
    return '/trad' + norm.slice(8)    // /riddles/X → /trad/X
  }
  return null
}

const target = computed(() => counterpart(route.path))
const isTrad = computed(() => normalize(route.path).startsWith('/trad/'))

function go() {
  if (!target.value) return
  try {
    localStorage.setItem('dc-script', isTrad.value ? 'hans' : 'hant')
  } catch (e) {
    /* 隐私模式下 localStorage 可能抛错：跳转照做 */
  }
  window.location.href = withBase(target.value)
}
</script>

<template>
  <button
    v-if="target"
    class="dc-lang-btn"
    type="button"
    aria-label="繁简切换"
    title="繁简切换"
    @click="go"
  >{{ isTrad ? '简' : '繁' }}</button>
</template>
