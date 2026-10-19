import { createApp } from 'vue'
import App from './App.vue'
// 设计令牌直接引 VitePress 主题里那份正本副本（tools/check-ui.config.json 盯着它的
// sha256），游戏端不自留第二份，杜绝两处漂移。规范 §1：tokens 逐字节一致。
import '../../site/.vitepress/theme/tokens.css'
import './styles/main.css'

createApp(App).mount('#app')
