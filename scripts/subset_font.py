#!/usr/bin/env python3
"""사이트에 실제로 쓰인 글자만 담은 글꼴 파일을 만든다.   →   python scripts/subset_font.py

왜: 한글 웹폰트는 90여 개 조각으로 나뉘어 있어서, 한 페이지가 조각 15~18개를 받고
    글자마다 다른 조각을 찾아 배치하느라 첫 화면이 느려진다. 쓰는 글자만 한 파일에 담으면
    요청 1개, 배치 1번으로 끝난다.
결과: src/assets/fonts/pretendard-site.woff       본문·제목 (굵기 가변 그대로)
      src/assets/fonts/black-han-sans-site.woff   작품 제목 전용
필요: Python + fontTools (pip install fonttools). npm ci로 받은 node_modules의 원본 글꼴을 읽는다.

새 작품·문구를 추가한 뒤 다시 실행하고 결과 파일을 함께 커밋한다.
빠뜨려도 깨지지는 않는다 — 없는 글자는 기존 조각 글꼴(Pretendard dynamic subset)에서 받아 온다.
"""
import json
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "assets" / "fonts"
PRETENDARD = ROOT / "node_modules" / "pretendard" / "dist" / "public" / "variable" / "PretendardVariable.ttf"
BLACK_HAN = ROOT / "node_modules" / "@fontsource" / "black-han-sans" / "files" / "black-han-sans-korean-400-normal.woff"

ALWAYS = "".join(chr(c) for c in range(0x20, 0x7F)) + "·—–‘’“”…→←↗↘×「」『』〈〉《》℃％＋－～•▶©®™°"


def site_text() -> str:
    """화면에 나올 수 있는 글이 들어 있는 원본: 데이터(JSON), 문구(i18n), 페이지·컴포넌트."""
    parts = [ALWAYS]
    for p in (ROOT / "src").rglob("*"):
        if p.suffix in {".json", ".ts", ".astro"}:
            parts.append(p.read_text(encoding="utf-8"))
    return "".join(sorted(set("".join(parts)) - set("\r\n\t")))


def title_text() -> str:
    works = json.loads((ROOT / "src" / "data" / "works.json").read_text(encoding="utf-8"))["works"]
    return "".join(sorted(set(ALWAYS + "".join(w["title"]["ko"] + w["title"]["en"] for w in works))))


def make(src: Path, text: str, dst: Path) -> int:
    opts = subset.Options()
    opts.flavor = "woff"                 # zlib 압축. 모든 브라우저 지원, 추가 모듈(brotli) 없이 만들 수 있음
    opts.layout_features = ["*"]         # 한글 자소 결합·커닝 등 글꼴 기능 유지
    opts.notdef_outline = True
    opts.name_IDs = [1, 2]
    opts.drop_tables += ["DSIG"]
    font = TTFont(src)
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    dst.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = "woff"
    font.save(dst)
    return dst.stat().st_size


def main() -> int:
    for f in (PRETENDARD, BLACK_HAN):
        if not f.is_file():
            print(f"원본 글꼴이 없습니다: {f}\n먼저 npm ci를 실행하세요.", file=sys.stderr)
            return 1
    text, titles = site_text(), title_text()
    a = make(PRETENDARD, text, OUT / "pretendard-site.woff")
    b = make(BLACK_HAN, titles, OUT / "black-han-sans-site.woff")
    hangul = sum(1 for c in text if "가" <= c <= "힣")
    print(f"pretendard-site.woff {a // 1024} KB (글자 {len(text)}개, 한글 {hangul}개) · "
          f"black-han-sans-site.woff {b // 1024} KB (제목 글자 {len(titles)}개) → src/assets/fonts/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
