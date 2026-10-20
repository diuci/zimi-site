import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 游戏应用与 VitePress 静态页并存的构建接线（PLAN-全站统一-v2 §3.2 入口直连）：
// - root 指向 game/，源码在 game/index.html + game/src/，与 site/（VitePress 谜书）互不干扰
// - dev 端口 4173（5173 归 vitepress dev，4180 归 jiagu）
// - base=/：**进站即玩**——game 产物落 dist 根，zimi.diuci.com 打开就是今日谜面
// - 谜书（98 篇静态书 + 繁体）整体迁 /book/（VitePress base=/book/、outDir=dist/book）
// - emptyOutDir=false：build 顺序是 vitepress 先（落 dist/book/）、vite 后（落根）——
//   清了 dist 会把谜书一起清掉
// - 旧 /play/ 链接由 CI 落一份 index.html 到 play/ 兜底（同一应用，query 参数全兼容）
export default defineConfig({
  plugins: [vue()],
  root: 'game',
  base: '/',
  server: { port: 4173 },
  build: {
    outDir: '../site/.vitepress/dist',
    emptyOutDir: false,
  },
})
