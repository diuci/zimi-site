import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitepress'

// 字谜分站：zimi.diuci.com。内容来自 diuci/chinese-character-riddle，CI 检出后生成。
// 进站即玩（PLAN-全站统一-v2 §3.2）：根路径是 Vue 游戏；谜书整体住 /book/ 下。
const base = '/book/'

// 印章「猜」：本站自己的字。主站是「词」、学古诗是「诗」、连词是「连」、
// 汉兜是「兜」、月冕是「月」、大作战是「战」，各站各一枚，一眼分得清。
// 顶栏那枚印章由 custom.css 用圆体画；这里这份 SVG 只当 favicon 用。
const SEAL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23c8442e'/%3E%3Ctext x='32' y='45' font-size='40' text-anchor='middle' fill='%23f7f1e3' font-family='serif'%3E%E7%8C%9C%3C/text%3E%3C/svg%3E"

// 主题色跟随 <html data-theme>：切主题时同步手机浏览器地址栏。
const THEME_COLOR = `(function(){var m=document.querySelector('meta[name="theme-color"]');if(!m)return;var d=document.documentElement;var sys=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var s=null;try{s=localStorage.getItem('dc-theme')}catch(e){}var t=s||(sys?'dark':'light');d.setAttribute('data-theme',t);d.classList.toggle('dark',t==='dark');d.classList.toggle('light',t==='light');var set=function(){m.setAttribute('content',d.getAttribute('data-theme')==='dark'?'#17140f':'#f4ede0')};set();new MutationObserver(set).observe(d,{attributes:true,attributeFilter:['data-theme']})})();`

export default defineConfig({
  base,
  lang: 'zh-CN',
  title: '猜字谜',
  titleTemplate: ':title | 猜字谜',
  description:
    '猜字谜——按谜种 / 难度 / 标签分门别类的开源字谜。谜面、谜底、解析，可浏览、搜索、打印，繁简可切。',

  // 谜书整体住 dist/book/（base=/book/）；根留给 Vue 游戏（进站即玩）。
  // outDir 是 VitePress 顶层键（build.outDir 不生效，实测）；绝对路径防歧义。
  outDir: fileURLToPath(new URL('dist/book', import.meta.url)),

  // 刻意不声明 appearance：主题由 ThemeToggle.vue 通过 data-theme 接管，
  // 与主站 diuci.com 同一套机制。

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: SEAL }],
    ['meta', { name: 'theme-color', content: '#f4ede0' }],
    ['script', {}, THEME_COLOR],
    // 与主站同一套字体：圆体标题、楷体解析、衬线正文
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700;900&family=ZCOOL+KuaiLe&family=ZCOOL+XiaoWei&display=swap',
      },
    ],
  ],

  themeConfig: {
    // 顶栏的印章实际由 custom.css 画（img 被隐藏）
    logo: { src: SEAL, alt: '猜字谜' },

    // 侧栏抽屉的折叠按钮文案
    sidebarMenuLabel: '目录',

    // 顶部导航与主站 diuci.com 同一组、同一顺序、同一措辞（八项乐园）。
    // 本站「猜谜」是第 5 个乐园，标成当前页。
    nav: [
      { text: '首页', link: 'https://diuci.com/' },
      { text: '学古诗', link: 'https://k12.diuci.com/' },
      { text: '画甲骨', link: 'https://jiagu.diuci.com/' },
      { text: '连词', link: 'https://lian.diuci.com/' },
      { text: '猜谜', link: '/', activeMatch: '^/$|^/book/' },
      { text: '汉兜', link: 'https://handle.diuci.com/' },
      { text: '月冕', link: 'https://moon.diuci.com/' },
      { text: '大作战', link: 'https://ink.diuci.com/' },
    ],

    // 侧栏只列简体谜（按谜种分组）；繁体靠顶栏「繁」钮切到 /trad/ 镜像页，不进侧栏。
    // 索引页内已按谜种/难度/谜底/标签交叉列出全部谜目，侧栏是快速直达。
    sidebar: [
      {
        text: '开始',
        items: [
          { text: '索引', link: '/riddles/索引' },
          { text: '打印版', link: '/print' },
          { text: '指南', link: '/guide' },
        ],
      },
      {
        text: '拆字',
        collapsed: false,
        items: [
          { text: '十张口', link: '/riddles/拆字/十张口' },
          { text: '人在草木中', link: '/riddles/拆字/人在草木中' },
          { text: '十口心思', link: '/riddles/拆字/十口心思' },
          { text: '半耕半读', link: '/riddles/拆字/半耕半读' },
          { text: '半青半紫', link: '/riddles/拆字/半青半紫' },
          { text: '千里相逢', link: '/riddles/拆字/千里相逢' },
          { text: '一口咬掉牛半截', link: '/riddles/拆字/一口咬掉牛半截' },
          { text: '一人在内', link: '/riddles/拆字/一人在内' },
        ],
      },
      {
        text: '会意',
        collapsed: false,
        items: [
          { text: '四面不透风', link: '/riddles/会意/四面不透风' },
          { text: '一箭穿心', link: '/riddles/会意/一箭穿心' },
          { text: '一夜又一夜', link: '/riddles/会意/一夜又一夜' },
          { text: '十五天', link: '/riddles/会意/十五天' },
          { text: '一家十一口', link: '/riddles/会意/一家十一口' },
          { text: '一家一口', link: '/riddles/会意/一家一口' },
        ],
      },
      {
        text: '增损',
        collapsed: false,
        items: [
          { text: '山上还有山', link: '/riddles/增损/山上还有山' },
          { text: '多一半', link: '/riddles/增损/多一半' },
          { text: '半部春秋', link: '/riddles/增损/半部春秋' },
          { text: '春雨绵绵妻独宿', link: '/riddles/增损/春雨绵绵妻独宿' },
        ],
      },
      {
        text: '数字',
        collapsed: false,
        items: [
          { text: '九十九', link: '/riddles/数字/九十九' },
          { text: '七十二小时', link: '/riddles/数字/七十二小时' },
        ],
      },
      {
        text: '象形',
        collapsed: false,
        items: [
          { text: '一轮弯月', link: '/riddles/象形/一轮弯月' },
          { text: '一点一横长', link: '/riddles/象形/一点一横长' },
        ],
      },
      {
        text: '离合',
        collapsed: false,
        items: [
          { text: '半推半就', link: '/riddles/离合/半推半就' },
        ],
      },
      {
        text: '方位',
        collapsed: false,
        items: [
          { text: '上下相连', link: '/riddles/方位/上下相连' },
        ],
      },
      {
        text: '典故',
        collapsed: false,
        items: [
          { text: '三过其门', link: '/riddles/典故/三过其门' },
        ],
      },
      {
        text: '当代',
        collapsed: false,
        items: [
          { text: '人言诚信为本', link: '/riddles/当代/人言诚信为本' },
        ],
      },
    ],

    search: {
      provider: 'local',
      options: {
        detailedView: true,
        miniSearch: {
          searchOptions: {
            fuzzy: 0.2,
            prefix: true,
            boost: { title: 4, answer: 3 },
          },
        },
      },
    },

    outline: { level: [2, 3], label: '本页目录' },

    // 页脚与主站 diuci.com 同一块结构：左边牌子+许可，右边乐园链接。
    footer: {
      message:
        '<a href="https://diuci.com/">丢词夺理 diuci.com</a> · 给孩子的字谜乐园' +
        '<br />古典谜面/谜底/解析属公有领域 · 我方原创当代谜与注释 CC BY 4.0 · 代码 MIT' +
        '<br /><a href="https://k12.diuci.com/legal">原文公有领域 · 注释 CC BY 4.0 · 代码 MIT · 版权与免责</a>',
      copyright:
        '<a href="https://diuci.com/">丢词夺理 diuci.com</a> ·' +
        '<a href="https://k12.diuci.com/">学古诗</a> ·' +
        '<a href="https://jiagu.diuci.com/">画甲骨</a> ·' +
        '<a href="https://lian.diuci.com/">连词</a> ·' +
        '<a href="https://zimi.diuci.com/">猜谜</a> ·' +
        '<a href="https://handle.diuci.com/">汉兜</a> ·' +
        '<a href="https://moon.diuci.com/">月冕</a> ·' +
        '<a href="https://ink.diuci.com/">大作战</a> ·' +
        '<a href="https://github.com/diuci/chinese-character-riddle">内容仓库</a>' +
        '<br /><a href="https://k12.diuci.com/sources">数据来源与版权</a> · ' +
        '<a href="https://k12.diuci.com/accuracy">内容准确性与台账</a> · ' +
        '<a href="https://k12.diuci.com/legal">版权与免责</a> · ' +
        '<a href="mailto:hi@diuci.com">hi@diuci.com</a>',
    },

    lastUpdated: true,
    docFooter: { prev: '上一篇', next: '下一篇' },
  },
})
