<script setup>
// 页脚：牌子 / 内容从哪来 / 许可免责 —— 右：八项乐园 + 三个说明页 + 邮箱（规范 §6）。
// 文案与 VitePress 侧页脚（config.mts footer）同源，别改出两套说法。
const PARKS = [
  { href: 'https://diuci.com/', label: '首页' },
  { href: 'https://k12.diuci.com/', label: '学古诗' },
  { href: 'https://jiagu.diuci.com/', label: '画甲骨' },
  { href: 'https://lian.diuci.com/', label: '连词' },
  { href: '/', label: '猜谜' },
  { href: 'https://handle.diuci.com/', label: '汉兜' },
  { href: 'https://moon.diuci.com/', label: '月冕' },
  { href: 'https://ink.diuci.com/', label: '大作战' },
]
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
        <a v-for="p in PARKS" :key="p.href" :href="p.href">{{ p.label }}</a>
        <a href="https://github.com/diuci/chinese-character-riddle">内容仓库</a>
        <a href="https://k12.diuci.com/legal">版权与免责</a>
        <a href="mailto:hi@diuci.com">hi@diuci.com</a>
      </nav>
    </div>
  </footer>
</template>

<style scoped>
.dc-foot{
  margin-top:28px;padding:18px 16px 28px;
  border-top:1px solid var(--line);
  background:var(--surface-3);
}
.dc-foot-in{
  max-width:820px;margin:0 auto;
  display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;
}
.dc-foot-l{flex:1 1 320px;min-width:0;font-size:12.5px;line-height:1.9;color:var(--ink-soft)}
.dc-foot a{color:var(--ink-soft);text-decoration:none}
.dc-foot a:hover{color:var(--cinnabar)}
.dc-foot nav{display:flex;flex-wrap:wrap;gap:6px 12px;max-width:280px;font-size:12.5px}
</style>
