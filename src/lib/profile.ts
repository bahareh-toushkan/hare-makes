// profile.json을 읽어 works.json과 맞춰 보고, 화면에 쓰는 숫자를 계산한다.
// 작품 수·출품 공모전 수·수상 수·도구별 편수는 여기서만 계산한다 (손으로 적지 않는다).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import data from '../data/profile.json';
import { works, getWork, type ResolvedWork } from './works';
import type { L10n } from './i18n';

type Result = 'submitted' | 'awarded';
interface ContestData { id: string; name: L10n; works: string[]; result: string; award?: L10n }
export interface Contest { id: string; name: L10n; result: Result; award?: L10n; date: string; items: ResolvedWork[] }

export const profile = data;

// ── 공모전: 검사 + 날짜(가장 이른 출품작 날짜) 계산 ─────────────────────────
const bySlug = new Map<string, Contest>();
export const contests: Contest[] = (data.contests as ContestData[]).map(c => {
  const where = `profile.json contests(${c.id})`;
  if (c.result !== 'submitted' && c.result !== 'awarded') throw new Error(`${where}: result는 "submitted" 또는 "awarded"만`);
  if (c.result === 'awarded' && !(c.award?.ko && c.award?.en)) throw new Error(`${where}: 수상이면 award.ko·award.en(상 이름)이 필요`);
  if (c.result === 'submitted' && c.award) throw new Error(`${where}: 출품(submitted)에는 award를 쓰지 않습니다 — 확정된 수상만`);
  const items = c.works.map(s => getWork(s));                       // 없는 slug면 여기서 빌드가 멈춤
  const contest: Contest = { id: c.id, name: c.name, result: c.result, award: c.award, items, date: items.map(w => w.date).sort()[0] };
  for (const w of items) {
    if (bySlug.has(w.slug)) throw new Error(`${where}: ${w.slug}가 공모전 두 곳에 들어 있습니다`);
    bySlug.set(w.slug, contest);
  }
  return contest;
}).sort((a, b) => b.date.localeCompare(a.date));

// works.json에서 '출품작'이라고 쓴 작품이 contests에 빠져 있으면 숫자가 틀어지므로 빌드를 멈춘다
for (const w of works) {
  if (/출품작/.test(w.status.ko) && !bySlug.has(w.slug)) throw new Error(`profile.json contests에 ${w.slug}가 없습니다 (works.json에는 출품작으로 적혀 있음)`);
}

export type WorkKind = 'awarded' | 'contest' | 'personal';
export function contestOf(slug: string): Contest | undefined { return bySlug.get(slug); }
export function kindOf(slug: string): WorkKind {
  const c = bySlug.get(slug);
  return !c ? 'personal' : c.result === 'awarded' ? 'awarded' : 'contest';
}

// ── 역량 묶음: 도구는 works.json tools에 실제로 나온 것만, 쓴 작품 수와 함께 ─────
const toolText = (w: ResolvedWork) => [...w.tools.generate, ...w.tools.edit].join(' | ').toLowerCase();
function usedIn(match: string[]): number {
  return works.filter(w => match.some(m => toolText(w).includes(m.toLowerCase()))).length;
}
export const capabilities = data.capabilities.map(c => ({
  id: c.id,
  title: c.title as L10n,
  body: c.body as L10n,
  tools: c.tools.map(t => ({ name: t.name, count: usedIn(t.match) })).filter(t => t.count > 0).sort((a, b) => b.count - a.count),
  extra: ('extra' in c ? c.extra : []) as string[],                  // works.json 밖의 근거(이 저장소 자체)로 확인되는 도구
  evidence: c.works.map(s => getWork(s))
}));

// ── 숫자 요약 ────────────────────────────────────────────────────────────
const genCap = capabilities.find(c => c.id === 'generate');
export const stats = {
  works: works.length,
  contests: contests.length,
  awards: contests.filter(c => c.result === 'awarded').length,
  models: genCap ? genCap.tools.length : 0,
  runtimeSec: works.reduce((s, w) => s + w.durationSec, 0)
};
export const firstWorkDate = works.map(w => w.date).sort()[0];      // 'YYYY-MM-DD' 또는 'YYYY-MM'

// ── 대표작: 미리보기 클립(preview.mp4)이 있으면 자동재생, 없으면 포스터만 ───────
const PUBLIC = join(process.cwd(), 'public');
export function previewOf(w: ResolvedWork): string | null {
  const p = `media/${w.slug}/preview.mp4`;
  return existsSync(join(PUBLIC, p)) ? p : null;
}
export const featured = data.featured.map(s => getWork(s));
