// works.json을 읽고 검사한 뒤, public/에 실제로 있는 미디어만 표시하도록 정리한다.
// 영상·포스터·비교 이미지가 아직 없으면 그 부분만 빠지고 빌드는 그대로 성공한다.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import data from '../data/works.json';
import type { L10n } from './i18n';
import { isHex, contrast } from './color';                                    // 작품별 색 검사용

export interface Work {
  slug: string;
  date: string;
  durationSec: number;
  aspect: string;
  shots: number;
  title: L10n;
  status: L10n;
  logline: L10n;
  tools: { generate: string[]; edit: string[] };
  links: { instagram: string; youtube: string };
  media: { video: string; poster: string; og: string; captions?: string };   // captions: 내레이션 자막 .vtt (선택)
  highlights: { label: L10n; text: L10n }[];
  pipeline: { name: L10n; detail: L10n }[];
  featuredPrompt: number;
  prompts: { label: L10n; mode: L10n; text: string; lang?: 'ko' | 'en' }[];   // lang: 프롬프트 원문 언어 (기본 en)
  compare: { label: L10n; before: string; after: string; beforeLabel: L10n; afterLabel: L10n; caption: L10n }[];
  notes: { heading: L10n; lines: { ko: string[]; en: string[] } }[];
  accent?: string;                                   // 작품 색(#RRGGBB). 상세 페이지의 로고·포인트 색. 없으면 브랜드 색
  tone?: 'quiet';                                    // 'quiet': 제목 서체를 본문 서체로, 캐러셀 홍보 문구 빼기
  closing?: L10n;                                    // 캐러셀 마지막 장 문장 (quiet 작품)
  coverTime?: number;                                // 캐러셀 표지에 쓸 완성본 프레임 시각(초)
  scenes?: { label: L10n; text: L10n; time: number; prompt?: number; frame?: string }[];  // 장면별 설명·프레임 시각·프롬프트 번호
}

export interface ResolvedWork extends Work {
  has: { video: boolean; poster: boolean; og: boolean; captions: boolean };
  compareReady: Work['compare'];                     // 전·후 이미지가 둘 다 있는 항목만
  scenesReady: NonNullable<Work['scenes']>;          // 프레임 이미지가 있는 장면만 (사이트 표시용)
  youtubeId: string | null;
  ratio: { w: number; h: number; css: string; landscape: boolean };   // aspect '16:9' → 1920×1080, '16 / 9', 가로 여부
}

const PUBLIC = join(process.cwd(), 'public');         // astro build/dev는 프로젝트 루트에서 실행됨
const exists = (p: string) => Boolean(p) && existsSync(join(PUBLIC, p));

function youtubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function check(w: Work, i: number) {                  // 빠진 값이 있으면 빌드를 멈추고 어디가 문제인지 알려줌
  const where = `works.json의 ${i + 1}번째 작품(${w.slug ?? '?'})`;
  if (!/^[a-z0-9-]+$/.test(w.slug)) throw new Error(`${where}: slug는 영문 소문자·숫자·하이픈만`);
  for (const k of ['title', 'status', 'logline'] as const) {
    if (!w[k]?.ko || !w[k]?.en) throw new Error(`${where}: ${k}.ko와 ${k}.en이 모두 필요`);
  }
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(w.date)) throw new Error(`${where}: date는 YYYY-MM 또는 YYYY-MM-DD`);
  if (w.accent !== undefined) {                     // 작품 색: 형식 + 검정 배경 위에서 읽히는지(3:1 이상) 확인
    if (!isHex(w.accent)) throw new Error(`${where}: accent는 #RRGGBB 형식`);
    if (contrast(w.accent, '#0b0b0c') < 3) throw new Error(`${where}: accent ${w.accent}가 검정 배경에서 너무 어둡습니다 (대비 3:1 미만)`);
  }
  if (w.tone !== undefined && w.tone !== 'quiet') throw new Error(`${where}: tone은 "quiet"만 가능`);
  if (!/^\d+:\d+$/.test(w.aspect)) throw new Error(`${where}: aspect는 "9:16"·"16:9" 같은 형식`);   // 화면비: 플레이어·장면 이미지 비율에 쓰임
  for (const [j, s] of (w.scenes ?? []).entries()) {
    if (s.prompt !== undefined && !w.prompts[s.prompt]) throw new Error(`${where}: scenes[${j}].prompt 번호 ${s.prompt}에 해당하는 프롬프트가 없습니다`);
  }
}

function ratio(aspect: string): ResolvedWork['ratio'] {   // 긴 변을 1920으로 두고 width/height 힌트를 계산
  const [a, b] = aspect.split(':').map(Number);
  const landscape = a > b;
  return landscape
    ? { w: 1920, h: Math.round(1920 * b / a), css: `${a} / ${b}`, landscape }
    : { w: Math.round(1920 * a / b), h: 1920, css: `${a} / ${b}`, landscape };
}

// 게시 보류 작품은 이 파일이 아니라 hold/works.json에 둔다 (git에 올라가지 않음 · 캐러셀 메이커에만 들어감)
const list = (data as unknown as { works: Work[] }).works;   // JSON 추론 타입(string)과 'quiet' 같은 좁은 타입 차이 때문에 unknown을 거쳐 변환
list.forEach(check);
const slugs = new Set(list.map(w => w.slug));
if (slugs.size !== list.length) throw new Error('works.json: slug가 겹칩니다');

export const works: ResolvedWork[] = list.map(w => ({
  ...w,
  has: { video: exists(w.media.video), poster: exists(w.media.poster), og: exists(w.media.og), captions: exists(w.media.captions ?? '') },
  compareReady: w.compare.filter(c => exists(c.before) && exists(c.after)),
  scenesReady: (w.scenes ?? []).filter(s => exists(s.frame ?? '')),
  youtubeId: youtubeId(w.links.youtube),
  ratio: ratio(w.aspect)
}));

export function getWork(slug: string): ResolvedWork {
  const w = works.find(x => x.slug === slug);
  if (!w) throw new Error(`작품 없음: ${slug}`);
  return w;
}
