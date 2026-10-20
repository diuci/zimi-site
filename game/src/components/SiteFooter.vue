<script setup>
// 页脚：牌子 / 内容从哪来 / 许可免责 —— 右：八项乐园 + 三个说明页 + 邮箱（规范 §6）。
// 结构与样式单源 core/chrome.css（PLAN-全站统一-v3）：满宽 surface-3 + 1160 内层。
// 文案与 VitePress 侧页脚（config.mts footer）同源，别改出两套说法。
import parksData from '../../../core/parks.json'
</script>

<template>
  <footer class="dc-foot">
    <div class="dc-foot-in">
      <div class="dc-foot-l">
        <a href="https://diuci.com/">丢词夺理 diuci.com</a> · 给孩子的字谜乐园<br>
        谜面、谜底与解析来自内容仓 chinese-character-riddle，逐条写明来源与许可<br>
        古典谜面/谜底/解析属公有领域 · 我方原创当代谜与注释 CC BY 4.0 · 代码 MIT<br>
        <a href="https://k12.diuci.com/accuracy">内容准确性与台账</a> ·
        <a href="https://k12.diuci.com/sources">数据来源与版权</a>
      </div>
      <nav aria-label="八个乐园">
        <a v-for="p in parksData.parks" :key="p.href" :href="p.href">{{ p.label }}</a>
        <a href="https://github.com/diuci/chinese-character-riddle">内容仓库</a>
        <a href="https://k12.diuci.com/legal">版权与免责</a>
        <a href="mailto:hi@diuci.com">hi@diuci.com</a>
      </nav>
    </div>
  </footer>
</template>
