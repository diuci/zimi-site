# 指南

本仓只存放**呈现层**：页面骨架、样式、主题与部署流程。
所有字谜内容来自 [diuci/chinese-character-riddle](https://github.com/diuci/chinese-character-riddle)，由 CI 在构建时检出。

## 架构

```
chinese-character-riddle          zimi-site（本仓）
├── riddles/    N 篇 md   →   ├── site/            站点骨架（手写）
├── data/       riddles.json   ├── site/.vitepress/ 配置与主题
├── tools/      内容工具       ├── tools/build-site.py  编译脚本
└── LICENSE / PROVENANCE      └── .github/workflows/deploy.yml
```

`site/riddles/`、`site/public/catalog.json` 都是 `tools/build-site.py` 在 CI 中生成的产物，不入库。

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

`CONTENT_ROOT` 指向内容仓根目录（需含 `riddles/` 与 `data/`）；`SITE_BASE` 绑定自定义域时为 `/`。
