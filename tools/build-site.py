#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""build-site.py — 从内容仓生成字谜分站页面

zimi-site 只存呈现层。内容全部来自 diuci/chinese-character-riddle，
由 CI 在 CONTENT_ROOT 检出。本脚本：
  1. 拷贝 CONTENT_ROOT/riddles/**/*.md（除 索引.md）→ site/riddles/
  2. 从 CONTENT_ROOT/data/riddles.json 生成 site/riddles/索引.md 与 site/public/catalog.json

分站单向读内容仓，不读其他分站；按需取字段。产物可复算。

用法：
    CONTENT_ROOT=../chinese-character-riddle python tools/build-site.py
    python tools/build-site.py --selftest
"""

import argparse
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / 'site'


def _content_root():
    return Path(os.environ.get('CONTENT_ROOT') or Path(__file__).resolve().parent.parent.parent / 'chinese-character-riddle')


def render_index(riddles):
    lines = ['# 字谜索引', '',
             '> 由 `tools/build-site.py` 从内容仓 `data/riddles.json` 生成，共 %d 篇。' % len(riddles), '',
             '按谜种分组，组内按难度排序。']
    bytype = {}
    for r in riddles:
        bytype.setdefault(str(r.get('type') or '?'), []).append(r)
    for t in sorted(bytype):
        items = sorted(bytype[t], key=lambda r: (r.get('difficulty') or 0, str(r.get('id') or '')))
        lines += ['', '## %s（%d）' % (t, len(items)), '']
        for r in items:
            lines.append('- [%s](%s) → **%s**（难度 %d）' % (
                r.get('title'), r.get('path').replace('riddles/', '', 1), r.get('answer'), r.get('difficulty') or 0))
    return '\n'.join(lines).rstrip() + '\n'


def build(content_root, site_dir):
    riddles_src = content_root / 'riddles'
    data_json = content_root / 'data' / 'riddles.json'
    out_riddles = site_dir / 'riddles'
    out_public = site_dir / 'public'

    payload = {}
    if data_json.exists():
        payload = json.loads(data_json.read_text(encoding='utf-8'))

    if out_riddles.exists():
        shutil.rmtree(out_riddles)
    out_riddles.mkdir(parents=True, exist_ok=True)
    out_public.mkdir(parents=True, exist_ok=True)

    copied = 0
    for p in sorted(riddles_src.rglob('*.md')):
        if p.name == '索引.md':
            continue
        rel = p.relative_to(riddles_src)
        dest = out_riddles / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(p, dest)
        copied += 1

    catalog = {
        'version': payload.get('version', 1),
        'count': payload.get('count', 0),
        'types': payload.get('types', {}),
        'riddles': payload.get('riddles', []),
    }
    (out_public / 'catalog.json').write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (out_riddles / '索引.md').write_text(render_index(payload.get('riddles', [])), encoding='utf-8')
    return copied, payload.get('count', 0)


def selftest():
    with tempfile.TemporaryDirectory() as td:
        tdr = Path(td)
        content = tdr / 'content'
        (content / 'riddles' / '增损').mkdir(parents=True)
        (content / 'riddles' / '增损' / '山上还有山.md').write_text(
            '---\nid: t\ntitle: 山上还有山\nanswer: 出\nanswer_len: 1\ntype: 增损\n'
            'difficulty: 1\nauthor: 佚名\nera: 清\nsource: S1\nlicense: public-domain\n'
            'copyright: { text: public-domain, annotations: cc-by-4.0 }\n---\n\n# 山上还有山\n\n**谜面**：山上还有山\n**谜底**：出\n\n## 解析\n两山相叠。\n', encoding='utf-8')
        (content / 'data').mkdir()
        (content / 'data' / 'riddles.json').write_text(json.dumps({
            'version': 1, 'count': 1, 'types': {'增损': 1},
            'riddles': [{'id': 't', 'title': '山上还有山', 'answer': '出', 'answer_len': 1,
                         'type': '增损', 'difficulty': 1, 'author': '佚名', 'era': '清', 'source': 'S1',
                         'license': 'public-domain', 'copyright': {'text': 'public-domain', 'annotations': 'cc-by-4.0'},
                         'tags': [], 'path': 'riddles/增损/山上还有山.md'}]}), encoding='utf-8')
        site = tdr / 'site'
        copied, count = build(content, site)
        failures = []
        if copied != 1 or count != 1:
            failures.append('拷贝/计数错：%d/%d' % (copied, count))
        if not (site / 'riddles' / '增损' / '山上还有山.md').exists():
            failures.append('谜目页未生成')
        if not (site / 'riddles' / '索引.md').exists():
            failures.append('索引页未生成')
        if not (site / 'public' / 'catalog.json').exists():
            failures.append('catalog 未生成')
        cat = json.loads((site / 'public' / 'catalog.json').read_text(encoding='utf-8'))
        if cat.get('count') != 1:
            failures.append('catalog count 错')
        body = (site / 'riddles' / '增损' / '山上还有山.md').read_text(encoding='utf-8')
        if '谜面' not in body:
            failures.append('谜目页内容缺 谜面')
    if failures:
        print('build-site.py selftest FAILED:')
        for f in failures:
            print('  - ' + f)
        return 1
    print('build-site.py selftest ok')
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description='从内容仓生成字谜分站页面')
    ap.add_argument('--selftest', action='store_true')
    args = ap.parse_args(argv)
    if args.selftest:
        return selftest()
    content_root = _content_root()
    if not (content_root / 'riddles').exists():
        print('找不到内容仓 riddles/：CONTENT_ROOT=%s' % content_root)
        print('先 checkout 内容仓，或用 CONTENT_ROOT 指向它。')
        return 1
    copied, count = build(content_root, SITE)
    print('built zimi-site: %d riddle pages, catalog %d (content: %s)' % (copied, count, content_root))
    return 0


if __name__ == '__main__':
    sys.exit(main())
