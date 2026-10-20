import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import ThemeToggle from './ThemeToggle.vue'
import MobileTabBar from './MobileTabBar.vue'
import './custom.css'

// 明暗切换：与主站 diuci.com 同一套机制（core/theme 约定，v4 起写 cookie 跨站共享）。
// 挂到 nav-bar-content-after，窄屏宽屏都在。
// 移动端底部标签栏：挂到 layout-bottom，只在窄屏显示（CSS 控制）。
const Layout = {
  render() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => h(ThemeToggle),
      'layout-bottom': () => h(MobileTabBar),
    })
  },
}

export default {
  extends: DefaultTheme,
  Layout,
}
