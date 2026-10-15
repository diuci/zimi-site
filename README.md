# zimi-site

字谜分站，构建产物发布到 <https://zimi.diuci.com>。

> 内容规模以内容仓 `docs/scope.md` 契约为准（M2 起 97 篇，覆盖全 10 谜种）。

本仓只存放**站点呈现层**：页面骨架、样式、主题与部署流程。
所有字谜内容来自 [diuci/chinese-character-riddle](https://github.com/diuci/chinese-character-riddle)，由 CI 在构建时检出。

## 架构

```
chinese-character-riddle          zimi-site（本仓）
├── riddles/    N 篇 md   →   ├── site/            站点骨架（手写）
├── data/       riddles.json   ├── site/.vitepress/ 配置与主题
├── tools/      内容工具       ├── tools/build-site.py  编译脚本
└── LICENSE / PROVENANCE      └── .github/workflows/deploy.yml
```

`site/riddles/`、`site/print.md`、`site/public/catalog.json` 都是
`tools/build-site.py` 在 CI 中生成的产物，不入库。

## 本地开发

需要本机已 checkout 内容仓（默认同级目录 `../chinese-character-riddle`）：

```bash
npm install
CONTENT_ROOT=../chinese-character-riddle npm run dev
```

## 构建

```bash
CONTENT_ROOT=../chinese-character-riddle SITE_BASE=/ npm run build
```

`CONTENT_ROOT` 指向内容仓根目录（需含 `riddles/` 与 `data/`）；
`SITE_BASE` 在绑定自定义域名时为 `/`。

## 检查

| 命令 | 查什么 |
|---|---|
| `python tools/build-site.py --selftest` | 生成脚本的坏样本 |
| `node tools/check-legal.mjs --selftest` / 正式 | LICENSE、绝对化表述、联系入口 |
| `python tools/check-pages.py --selftest` / 正式 | 抓「生成出来是空的」空正文 |
| `node tools/check-typography.mjs --selftest` / 正式 | 谜面/谜底/解析/出处四段结构 |
| `node tools/check-ui.mjs --selftest` / 正式 | CNAME、title、nav 入口 |

## 许可

站点代码采用 CC BY 4.0。字谜内容版权归原作者所有（公有领域），
注释、解析、编排的授权见内容仓 `PROVENANCE.md`。
