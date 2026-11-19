# hare.makes 포트폴리오 사이트

Astro 정적 사이트 · 한국어(`/`) / 영어(`/en/`) · 작품 데이터는 `src/data/works.json` 하나로 관리합니다.
같은 파일로 인스타 캐러셀(`tools/carousel-maker.html`)도 만듭니다.

## 폴더 구조

```
site/
├─ .github/workflows/deploy.yml   main에 푸시하면 GitHub Pages로 자동 배포
├─ astro.config.mjs               사이트 주소(배포 때 자동으로 덮어씀)
├─ hold/                          게시 보류 작품 (git에 안 올라감)
│  ├─ works.json                  보류 작품 데이터 (형식은 src/data/works.json과 같음)
│  └─ media/<slug>/               보류 작품의 영상·이미지
├─ package.json / package-lock.json
├─ public/
│  ├─ favicon.svg, favicon-32.png, apple-touch-icon.png
│  ├─ og-default.png              공유 미리보기 기본 이미지 (1200×630)
│  └─ media/<slug>/               영상·포스터·전후 비교 이미지 (npm run media로 생성)
├─ scripts/
│  ├─ media.mjs                   ffmpeg로 웹용 영상·포스터·OG·비교 프레임 만들기
│  └─ build-carousel.mjs          works.json → tools/carousel-maker.html
├─ src/
│  ├─ data/works.json             ★ 공개 작품 데이터 (사이트 + 캐러셀 공용, 배열 순서 = 화면 순서)
│  ├─ data/site.json              이름·소개·연락처·도구 목록
│  ├─ lib/i18n.ts                 화면 문구(ko/en)와 주소 도우미
│  ├─ lib/works.ts                works.json 검사 + 실제 있는 미디어만 표시
│  ├─ layouts/Base.astro          <head>(SEO·OG·hreflang), 머리말, 꼬리말
│  ├─ components/                 Mark, Compare(전후 슬라이더), views/(페이지 본문)
│  ├─ pages/                      index, works/[slug], about, contact + en/ 같은 구조, 404, sitemap.xml, robots.txt
│  └─ styles/global.css
└─ tools/
   ├─ carousel-maker.template.html  캐러셀 메이커 원본
   ├─ carousel-maker.html           npm run carousel 결과 (공개 + 보류 작품 포함, git에 안 올라감)
   └─ og/og-default.html            og-default.png 원본
```

미디어 파일이 아직 없으면 그 부분만 빠지고 빌드는 성공합니다. 영상이 없으면 제목 카드와 인스타 링크가 대신 나오고, 전후 비교는 두 이미지가 다 있을 때만 나옵니다.

## 준비 (Windows, 한 번만)

```powershell
winget install OpenJS.NodeJS.LTS   # Node 22.22 이상
winget install Git.Git
winget install Gyan.FFmpeg
```
설치한 뒤 터미널을 새로 열고 `node -v`, `ffmpeg -version`이 나오는지 확인하세요.

## 실행

```powershell
cd site
npm ci
npm run dev            # http://localhost:4321  (영어: /en/)
npm run build          # dist/ 생성
npm run preview        # 빌드 결과 미리보기
```

## 작품 영상·이미지 넣기

```powershell
# 완성본 → video.mp4 + poster.jpg(11.5초 프레임) + og.jpg
npm run media -- video something-huge "D:\영상\넾다세일_AI광고_바하레.mp4" 11.5

# 유튜브로 임베드하는 작품(영상은 안 올림) → poster.jpg + og.jpg만
npm run media -- poster guest-from-mars "D:\영상\화성에서온손님_v6_제출본.mp4" 0.3
# 대표 썸네일 이미지로 포스터 바꾸기
npm run media -- poster same-element "D:\영상\05_대표썸네일.jpg"

# 전후 비교 프레임 (영상이면 초를, 이미지면 파일만). 경로와 초는 예시 — 원본과 완성본에서 같은 장면이 나오는 초로 바꾸기
npm run media -- frame something-huge compare-color-before  "D:\영상\B.mp4" 2
npm run media -- frame something-huge compare-color-after   "D:\영상\넾다세일_AI광고_바하레.mp4" 10.5
npm run media -- frame something-huge compare-screen-before "D:\영상\A2.mp4" 4.3
npm run media -- frame something-huge compare-screen-after  "D:\영상\넾다세일_AI광고_바하레.mp4" 5

# 보류 작품(hold/)도 같은 명령으로 만든 뒤 public/media/<slug> 폴더를 hold/media/로 옮기기
npm run media -- video box-cat "D:\영상\박스고양이.mp4" 3
```
- 영상은 H.264, 긴 변 최대 1920(세로 1080×1920 · 가로 1920×1080 그대로), CRF 23에 최대 4Mbps로 변환됩니다. 25초면 최대 약 13MB예요. 50MB를 넘으면 스크립트가 경고합니다.
- 가로 작품은 works.json의 `aspect`를 `"16:9"`로 쓰면 플레이어가 전체 폭으로, 장면 이미지는 가로로 나옵니다. 홈 카드는 모든 작품이 4:5로 잘려 나와요.
- `links.youtube`만 있고 `media.video`가 비어 있으면 유튜브 플레이어(youtube-nocookie)를 넣습니다. 유튜브에 새 버전을 올려 주소가 바뀌면 이 한 줄만 바꾸세요.
- 내레이션 자막이 있으면 `public/media/<slug>/captions.vtt`를 넣고, works.json의 해당 작품 `media`에 `"captions": "media/<slug>/captions.vtt"`를 추가하세요.

## 색 규칙

- 배경은 모든 페이지에서 검정 `#0B0B0C`입니다.
- 브랜드 색은 코랄 `#FF5A36`이에요. 홈·소개·연락 페이지, 프로필, 하이라이트에 쓰여요(`src/styles/global.css`의 `--accent`).
- 작품 페이지에서는 그 작품의 `accent`가 로고와 포인트 색(상태 글씨, 버튼, 단계 번호, 전후 비교선)을 덮어씁니다. 버튼 위 글자색(검정/흰색)은 자동으로 정해져요.
- 검정 배경에서 대비가 3:1보다 낮은 색은 빌드가 멈추고 알려 줍니다.

## works.json 선택 필드

| 필드 | 쓰임 |
|---|---|
| `accent` | 작품 색 `#RRGGBB` (예: 「거대한 게 온다」 `#00F550`) |
| `tone: "quiet"` | 제목을 본문 서체로, 캐러셀에서 "MAKING OF"·"협업 DM" 문구를 빼기 |
| `closing` | 차분한 작품 캐러셀의 마지막 장 문장 (줄바꿈은 `\n`) |
| `coverTime` | 캐러셀 표지에 쓸 완성본 프레임 시각(초) |
| `scenes` | 장면별 `label`·`text`·`time`(완성본 초)·`prompt`(prompts 번호, 선택)·`frame`(사이트용 이미지 경로). 있으면 캐러셀이 장면 슬라이드로 만들어지고, `frame` 이미지가 있으면 사이트에 '장면' 칸이 나와요 |

장면 프레임을 사이트용으로 뽑을 때:
```powershell
npm run media -- frame see-you-later scene-1 "D:\영상\416_AI숏폼_다녀오겠습니다.mp4" 3
```

## 게시 보류 작품 (공모전 결과·허락 대기)

저장소가 공개라서, 아직 올리면 안 되는 작품은 `src/data/works.json`이 아니라 `hold/`에 둡니다. `hold/`는 .gitignore에 있어 GitHub에 올라가지 않고, 사이트에도 나오지 않아요. 캐러셀 메이커에는 나옵니다.

공개할 때:
1. `hold/works.json`에서 그 작품 항목을 잘라 `src/data/works.json`의 원하는 위치에 붙여 넣기
2. `hold/media/<slug>` 폴더를 `public/media/<slug>`로 옮기기
3. `npm run build`로 확인 → 커밋·푸시

## 새 작품 추가

1. `src/data/works.json`의 `works` 배열에 항목을 추가합니다(배열 순서 = 화면 순서). slug는 영문 소문자·숫자·하이픈만 쓰세요.
2. `npm run media -- video <slug> <파일> <포스터 초>`
3. `npm run carousel`을 실행하고 `tools/carousel-maker.html`을 엽니다. 작품을 고른 뒤 "완성본 영상 한 번에 넣기"로 완성본을 넣으면 표지·장면 칸이 works.json의 시각대로 채워져요. 그다음 PNG를 저장합니다.
4. 인스타에 올린 뒤 `links.instagram`에 게시물 주소를 넣고 커밋·푸시합니다.

## 배포 (GitHub Pages, 무료)

```powershell
git init
git add .
git commit -m "hare.makes portfolio"
git branch -M main
git remote add origin https://github.com/bahareh-toushkan/hare-makes.git   # GitHub에서 빈 저장소 hare-makes를 먼저 만듦
git push -u origin main
```
1. 저장소 → Settings → Pages → Build and deployment → Source: **GitHub Actions**
2. Actions 탭에서 "Deploy to GitHub Pages"가 초록색이 되면 `https://bahareh-toushkan.github.io/hare-makes/`에서 열립니다.

## 내 도메인 연결

순서가 중요합니다. GitHub에 도메인을 먼저 등록한 뒤 DNS를 바꾸세요. 반대로 하면 다른 사람이 그 도메인을 가로챌 수 있습니다.

1. (권장) GitHub 프로필 Settings → Pages → Add a domain → 안내된 TXT 레코드를 DNS에 추가해 도메인 소유를 인증합니다.
2. 저장소 Settings → Pages → Custom domain에 `내도메인.com`을 입력하고 Save. Actions 배포라서 CNAME 파일은 필요 없습니다.
3. 도메인 등록처의 DNS 관리에서 아래 레코드를 추가합니다. 기본으로 들어 있는 A/CNAME 레코드(파킹 페이지)가 있으면 먼저 지우세요.

| 타입 | 호스트(이름) | 값 |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| AAAA (선택) | @ | 2606:50c0:8000::153 / 8001::153 / 8002::153 / 8003::153 (4개) |
| CNAME | www | bahareh-toushkan.github.io |

- A 레코드 4개는 각각 따로 추가합니다. CNAME 값에는 저장소 이름(`/hare-makes`)을 붙이지 마세요.
- 와일드카드(`*`) 레코드는 만들지 마세요.
- 카페24: hosting.cafe24.com 로그인 → 나의서비스관리 → 도메인 → **DNS 관리**
  - A 레코드 4개: 「호스트IP(A 레코드) 관리」 → 호스트는 비우거나 `@`, IP는 위 4개를 하나씩
  - www: 「별칭(CNAME) 관리」 → 「CNAME 추가」 → 별칭 `www`, 실제 도메인명 `bahareh-toushkan.github.io`
  - 이미 들어 있는 기본 A 레코드(카페24 주차 페이지 IP)가 있으면 지운 뒤 추가하세요.
  - 카페24는 루트 도메인 A 레코드를 1개만 받습니다. 그래서 haremakes.com에는 `185.199.108.153` 하나만 넣었어요(나머지 3개는 예비 주소라 하나로도 동작).
  - 카페24 기본 와일드카드 별칭 `*.haremakes.com → haremakes.com`은 화면에서 지울 수 없어요. 다른 사람이 하위 도메인을 가로채지 못하도록 GitHub 프로필 Settings → Pages에서 haremakes.com을 인증해 뒀습니다(TXT `_github-pages-challenge-bahareh-toushkan`). 이 TXT 레코드는 지우지 마세요.
- 가비아: My가비아 → DNS 관리툴 → 도메인 선택 → DNS 설정 → 레코드 추가. 저장 후 CNAME 값이 `bahareh-toushkan.github.io.내도메인.com`처럼 붙어 보이면 값 끝에 `.`을 붙여(`bahareh-toushkan.github.io.`) 다시 저장하세요.
- 확인 (Windows): `Resolve-DnsName 내도메인.com -Type A` → 185.199.108~111.153이 나오면 됩니다. 반영까지 최대 24시간 걸릴 수 있어요.
4. Pages 설정에서 **Enforce HTTPS**를 켭니다. 인증서 발급에 최대 24시간 걸릴 수 있어요.
5. 다음 배포부터 사이트 주소·canonical·OG·sitemap이 모두 새 도메인으로 바뀝니다. 워크플로가 Pages 설정에서 주소를 읽기 때문이에요. 바뀐 뒤 Actions에서 "Run workflow"로 한 번 다시 배포하세요.

### Vercel을 쓸 때 (대안)
Vercel 대시보드 Project → Settings → Domains에서 도메인을 추가하면 값을 보여 줍니다.
- 루트 도메인: A 레코드 (안내값. 기본 76.76.21.21)
- www: CNAME (프로젝트마다 다른 값. 예: `xxxx.vercel-dns-017.com`)
- 대시보드에 나온 값을 그대로 넣으세요. 빌드 명령은 `npm run build`, 출력 폴더는 `dist`입니다.

## 프로필·홈 데이터 (`src/data/profile.json`)

홈과 소개 페이지의 글·역량·경력·학력·출품 기록은 `src/data/profile.json`에 있습니다. 숫자는 적지 않습니다 — 작품 수, 출품 공모전 수, 수상 수, 도구별 편수는 `src/lib/profile.ts`가 `works.json`과 `contests`에서 계산합니다.

- `featured`: 홈 대표작 slug 3개 안팎. 가로 작품은 두 칸, 세로 작품은 한 칸을 차지합니다.
- `capabilities[].tools`: `match`에 적은 글자가 `works.json`의 `tools`에 실제로 나온 작품 수를 세어 보여 줍니다. 한 편도 없으면 화면에 나오지 않습니다.
- `contests`: 공모전마다 출품작 slug와 `result`. `result`는 `"submitted"`(출품)와 `"awarded"`(수상 확정) 둘뿐입니다. 발표 전이거나 결과가 없으면 `submitted`로 둡니다. 수상이 확정되면 `"awarded"`로 바꾸고 `"award": { "ko": "…", "en": "…" }`를 추가하세요. `works.json`에 '출품작'이라고 쓴 작품이 `contests`에 없으면 빌드가 멈춥니다.
- `certifications`: 비어 있으면 '자격' 칸이 나오지 않습니다.

대표작·카드 미리보기 클립(무음, 약 6초, 0.1~0.8MB):
```powershell
npm run media -- preview pureal-breakup 5 6          # 이미 올린 video.mp4의 5초부터 6초
npm run media -- preview one-more-beat "D:\영상\완성본.mp4" 171 6   # 원본 파일에서
```
미리보기는 화면에 들어왔을 때만 받아서 재생하고, '움직임 줄이기' 설정이나 데이터 절약 모드에서는 포스터만 보입니다.

## 영상에 haremakes 로고 넣기 (`scripts/add_logo.py`)

유튜브·인스타에 올릴 사본에 작은 로고를 넣습니다. Python과 ffmpeg만 있으면 됩니다. 원본은 건드리지 않고 `<이름>_logo.mp4`를 새로 만듭니다.

```powershell
python scripts/add_logo.py "D:\영상\완성본.mp4"                 # 오른쪽 위, 짧은 변의 10%, 불투명도 0.75
python scripts/add_logo.py "D:\영상\완성본.mp4" --coral --pos tl  # 코랄 로고, 왼쪽 위
python scripts/add_logo.py "D:\영상\제출본.mp4" --contest        # 공모전 출품 원본: 로고를 넣지 않고 끝냄
```
- 세로(9:16)는 위에서 12%·옆에서 5% 떨어진 곳에 둡니다(쇼츠·릴스 상단 아이콘과 오른쪽 버튼, 아래 자막을 피함). 가로(16:9)는 위 6%·옆 3.5%.
- 경로에 `출품`·`제출`·`contest`·`submission`이 있으면 멈춥니다. 주최 측 규정과 부딪히지 않게 제출본에는 넣지 않고, 게시용 사본이 맞을 때만 `--allow-contest`를 붙이세요.
- 로고 원본은 `scripts/assets/`에 있습니다(사이트에는 배포되지 않음).

## 페이지 구성 (2026-11 리뉴얼)

| 주소 | 내용 | 데이터 |
|---|---|---|
| `/` | 한 줄 소개 · 숫자 요약 · 대표작 · 하는 일 · 최근 작품 8편 | `profile.json`, `works.json` |
| `/works/` | 전체 작품 + 필터(전체 / 수상 / 공모전 출품 / 개인 작업) | `works.json`, `profile.json`의 `contests` |
| `/projects/` | 영상 밖의 작업(앱 · 연구 · 이 사이트) | `profile.json`의 `projects` |
| `/about/` | 프로필 · 역량 · 경력 · 학력 · 출품·수상 타임라인 · 언어 | `profile.json` |
| `/contact/` | 이메일 · 인스타그램 · 유튜브 · GitHub | `site.json`, `profile.json`의 `contact` |

- 유튜브 채널 링크는 핸들(@)이 아니라 채널 ID 주소를 씁니다. 채널 이름이나 핸들을 바꿔도 깨지지 않습니다.
- 카드 미리보기는 `public/media/<slug>/preview.mp4`가 있을 때만 붙습니다. 새 작품을 올린 뒤 `npm run media -- preview <slug> <시작 초> 5`를 한 번 실행하세요.
- 장식 서체(Black Han Sans)는 작품 상세의 제목에만 쓰고, 나머지 제목은 Pretendard입니다.

## 속도: 사이트 전용 글꼴과 작은 이미지

- **글꼴**: `src/assets/fonts/pretendard-site.woff`는 이 사이트에 쓰인 글자만 담은 파일 하나입니다(약 210KB). 한글 웹폰트 조각 15~18개를 받던 것을 1개로 줄여 첫 화면이 빨라집니다. 작품 제목용 `black-han-sans-site.woff`도 같은 방식입니다.
  새 작품이나 문구를 추가한 뒤 아래를 실행하고 결과 파일을 함께 커밋하세요. 빠뜨려도 깨지지는 않습니다 — 없는 글자만 기존 조각 글꼴에서 받아 옵니다.
  ```powershell
  python scripts/subset_font.py        # Python + fontTools 필요 (pip install fonttools)
  ```
- **이미지**: `npm run media -- video|poster`가 `thumb.jpg`(카드용)와 `poster.m.jpg`(상세 플레이어용)를, `frame scene-N`이 `scene-N.s.jpg`(장면 칸용)를 함께 만듭니다. 원본 `poster.jpg`·`scene-N.jpg`는 공유 미리보기와 인스타 캐러셀용으로 그대로 둡니다. 예전 작품의 작은 사본을 한꺼번에 다시 만들려면:
  ```powershell
  npm run media -- thumb <slug>
  ```
- 화면 밖 섹션은 `content-visibility: auto`로 배치를 미루고, 작품 상세의 영상은 재생을 누를 때 받습니다.
