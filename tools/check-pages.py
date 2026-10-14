#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""check-pages.py — 产物体检：抓「生成出来是空的」静默故障

曾经有「构建成功、部署成功、链接全通，但点开那一页正文是空的」的事故。
这条体检只看生成产物（site/riddles/*.md），断言每篇都有非空谜面、谜底与解析段。
正文为空会 exit 1 阻断部署。

用法：
    python tools/check-pages.py           # 检查 site/riddles/
    python tools/check-pages.py --selftest
"""

import re
import sys
import tempfile
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / 'site'


def check_dir(site_dir):
    riddles = site_dir / 'riddles'
    failures = []
    if not riddles.exists():
        return ['site/riddles/ 不存在（没跑 build-site.py？）']
    for p in sorted(riddles.rglob('*.md')):
        if p.name == '索引.md':
            continue
        text = p.read_text(encoding='utf-8')
        body = text.split('---', 2)[-1] if text.startswith('---') else text
        # 谜面 / 谜底 / 解析 三段都必须非空
        for label in ('谜面', '谜底', '解析'):
            m = re.search(r'##?\s*%s\s*(.*?)\n(?=##|$)' % label, body, re.S)
            content = (m.group(1) if m else '').strip()
            # 谜面/谜底 也可能用 **谜面**： 形式
            if not content:
                m2 = re.search(r'\*\*%s\*\*\s*[：:]\s*(.+)' % label, body)
                content = (m2.group(1) if m2 else '').strip()
            if not content:
                failures.append('%s：%s 段为空（空正文）' % (p.relative_to(site_dir).as_posix(), label))
    return failures


def selftest():
    with tempfile.TemporaryDirectory() as td:
        tdr = Path(td)
        site = tdr / 'site'
        (site / 'riddles' / '增损').mkdir(parents=True)
        good = (site / 'riddles' / '增损' / '好谜.md')
        good.write_text(
            '---\nid: g\n---\n\n# 好谜\n\n**谜面**：山上还有山\n**谜底**：出\n\n## 解析\n两山相叠为出。\n', encoding='utf-8')
        bad = (site / 'riddles' / '增损' / '空谜.md')
        bad.write_text('---\nid: b\n---\n\n# 空谜\n\n\n## 解析\n\n\n', encoding='utf-8')
        failures = check_dir(site)
        problems = []
        if not any('空谜.md' in f and '解析' in f for f in failures):
            problems.append('没抓到空正文')
        if any('好谜.md' in f for f in failures):
            problems.append('好谜被误报：%s' % failures)
    if problems:
        print('check-pages.py selftest FAILED:')
        for p in problems:
            print('  - ' + p)
        return 1
    print('check-pages.py selftest ok')
    return 0


def main(argv=None):
    if '--selftest' in (sys.argv[1:] if argv is None else argv):
        return selftest()
    failures = check_dir(SITE)
    if failures:
        print('check-pages FAILED：%d 个空正文' % len(failures))
        for f in failures:
            print('  - ' + f)
        return 1
    print('check-pages ok（无空正文）')
    return 0


if __name__ == '__main__':
    sys.exit(main())
