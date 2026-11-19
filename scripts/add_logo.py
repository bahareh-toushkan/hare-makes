#!/usr/bin/env python3
"""영상 오른쪽 위에 haremakes 로고를 넣는다. (ffmpeg·ffprobe가 PATH에 있어야 함)

    python scripts/add_logo.py "D:\\영상\\완성본.mp4"
        → 같은 폴더에 완성본_logo.mp4 (원본은 그대로. 같은 이름이 있으면 _logo_2, _logo_3 …)

옵션
    -o, --out PATH      저장할 파일 (이미 있으면 멈춤 — 덮어쓰지 않음)
    --logo PATH         로고 PNG (투명 배경). 기본: scripts/assets/haremakes-watermark-white-600.png
    --coral             흰색 대신 코랄 로고 사용
    --pos tr|tl|br|bl   위치. 기본 tr(오른쪽 위)
    --size 0.10         로고 폭 = 영상 '짧은 변'의 비율. 세로 1080×1920이면 108px, 가로 1920×1080도 108px
    --opacity 0.75      불투명도 (0.7~0.8 권장)
    --contest           공모전 출품 원본: 로고를 넣지 않고 그대로 끝냄 (주최 측 규정과 부딪히지 않게)
    --allow-contest     경로에 '출품·제출·contest·submission'이 있어도 로고를 넣음
    --dry-run           ffmpeg 명령만 보여 주고 실행하지 않음

안전 영역 (세로 9:16)
    쇼츠·릴스는 맨 위에 검색·메뉴 아이콘, 오른쪽에 좋아요·댓글 버튼, 아래에 설명·자막이 올라온다.
    그래서 로고는 위에서 12%, 옆에서 5% 떨어진 곳에 둔다 (1080×1920이면 위 230px · 옆 54px).
    가로 16:9는 위 6% · 옆 3.5%. 유튜브 채널 워터마크(오른쪽 아래)와 겹치지 않는다.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONTEST_MARKERS = re.compile(r"출품|제출|contest|submission|submit", re.IGNORECASE)


def probe(path: Path) -> tuple[int, int]:
    """영상의 화면 가로·세로 (회전 메타데이터 반영)."""
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height:stream_side_data=rotation", "-of", "json", str(path)],
        capture_output=True, text=True, check=True).stdout
    s = json.loads(out)["streams"][0]
    w, h = int(s["width"]), int(s["height"])
    rot = next((abs(int(d.get("rotation", 0))) for d in s.get("side_data_list", []) if "rotation" in d), 0)
    return (h, w) if rot in (90, 270) else (w, h)


def free_name(src: Path) -> Path:
    """원본 옆에 아직 없는 이름: 완성본_logo.mp4 → 완성본_logo_2.mp4 …"""
    out = src.with_name(f"{src.stem}_logo.mp4")
    n = 2
    while out.exists():
        out = src.with_name(f"{src.stem}_logo_{n}.mp4")
        n += 1
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="영상에 haremakes 로고 넣기", add_help=True)
    ap.add_argument("video")
    ap.add_argument("-o", "--out")
    ap.add_argument("--logo")
    ap.add_argument("--coral", action="store_true")
    ap.add_argument("--pos", choices=["tr", "tl", "br", "bl"], default="tr")
    ap.add_argument("--size", type=float, default=0.10)
    ap.add_argument("--opacity", type=float, default=0.75)
    ap.add_argument("--contest", action="store_true")
    ap.add_argument("--allow-contest", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    src = Path(a.video)
    if not src.is_file():
        print(f"영상이 없습니다: {src}", file=sys.stderr)
        return 1
    if a.contest:
        print(f"공모전 출품 원본으로 표시됨 — 로고를 넣지 않았습니다: {src.name}")
        return 0
    if CONTEST_MARKERS.search(str(src)) and not a.allow_contest:
        print("경로에 '출품·제출·contest·submission'이 있어 멈췄습니다. 공모전 제출본에는 로고를 넣지 않습니다.\n"
              "유튜브·인스타용 사본이 맞다면 --allow-contest 를 붙여 다시 실행하세요.", file=sys.stderr)
        return 2
    if not (0 < a.size <= 0.5) or not (0 < a.opacity <= 1):
        print("--size는 0~0.5, --opacity는 0~1 사이", file=sys.stderr)
        return 1

    logo = Path(a.logo) if a.logo else HERE / "assets" / (
        "haremakes-watermark-coral-600.png" if a.coral else "haremakes-watermark-white-600.png")
    if not logo.is_file():
        print(f"로고 파일이 없습니다: {logo}", file=sys.stderr)
        return 1

    if a.out:
        out = Path(a.out)
        if out.exists():
            print(f"이미 있는 파일은 덮어쓰지 않습니다: {out}", file=sys.stderr)
            return 1
    else:
        out = free_name(src)

    w, h = probe(src)
    portrait = h > w
    lw = max(2, round(min(w, h) * a.size / 2) * 2)                 # 로고 폭(짝수 픽셀)
    mx = round(w * (0.05 if portrait else 0.035))                   # 옆 여백
    my_top = round(h * (0.12 if portrait else 0.06))                # 위 여백: 쇼츠·릴스 상단 아이콘 아래
    my_bottom = round(h * (0.24 if portrait else 0.08))             # 아래 여백: 설명·자막 위
    x = f"main_w-overlay_w-{mx}" if a.pos[1] == "r" else str(mx)
    y = str(my_top) if a.pos[0] == "t" else f"main_h-overlay_h-{my_bottom}"
    flt = (f"[1:v]scale={lw}:-1:flags=lanczos,format=rgba,colorchannelmixer=aa={a.opacity}[lg];"
           f"[0:v][lg]overlay=x={x}:y={y}:format=auto,format=yuv420p[v]")
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-n", "-i", str(src), "-i", str(logo),
           "-filter_complex", flt, "-map", "[v]", "-map", "0:a?",
           "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-c:a", "copy",
           "-movflags", "+faststart", str(out)]
    if a.dry_run:
        print(" ".join(f'"{c}"' if " " in c else c for c in cmd))
        return 0
    r = subprocess.run(cmd)
    if r.returncode != 0:
        print("ffmpeg 실패", file=sys.stderr)
        return r.returncode
    print(f"{out.name} — {w}×{h}, 로고 {lw}px, 위치 {a.pos}, 불투명도 {a.opacity}  →  {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
