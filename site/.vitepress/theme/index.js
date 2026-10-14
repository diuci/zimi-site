import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import ThemeToggle from './ThemeToggle.vue'
import ScriptToggle from './ScriptToggle.vue'
import MobileTabBar from './MobileTabBar.vue'
import './custom.css'

// 明暗切换：与主站 diuci.com 同一套机制（data-theme + localStorage）。
// 繁简切换：ScriptToggle 在谜页/索引页摆「繁/简」钮，换到 /trad/ 镜像页。
// 两钮都挂到 nav-bar-content-after，窄屏宽屏都在；繁/简在前、明暗在后（全站同一顺序）。
// 移动端底部标签栏：挂到 layout-bottom，只在窄屏显示（CSS 控制）。
const Layout = {
  render() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => [h(ScriptToggle), h(ThemeToggle)],
      'layout-bottom': () => h(MobileTabBar),
    })
  },
}

export default {
  extends: DefaultTheme,
  Layout,
}
