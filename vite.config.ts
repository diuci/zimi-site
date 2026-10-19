import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 游戏应用与 VitePress 静态页并存的构建接线（PLAN-猜谜站 §7.4）：
// - root 指向 game/，源码在 game/index.html + game/src/，与 site/（VitePress）互不干扰
// - dev 端口 4173（5173 归 vitepress dev，4180 归 jiagu）
// - base=/play/：线上挂在 zimi.diuci.com/play/ 下
// - 产物直接落 site/.vitepress/dist/play/ —— CI 现有的 `cp -r site/.vitepress/dist/. .`
//   会把它一并带上线，部署工作流零改动
export default defineConfig({
  plugins: [vue()],
  root: 'game',
  base: '/play/',
  server: { port: 4173 },
  build: {
    outDir: '../site/.vitepress/dist/play',
    emptyOutDir: true,
  },
})
