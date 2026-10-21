// works.json(+ 게시 보류 작품 hold/works.json)을 캐러셀 메이커 HTML 안에 넣어 tools/carousel-maker.html을 만든다.
// 사용: npm run carousel  → tools/carousel-maker.html을 브라우저로 열기
// 결과 파일에는 보류 작품도 들어가므로 .gitignore로 저장소에서 뺀다.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));    // 형식 오류면 여기서 멈춤
const works = read('src/data/works.json');
const holdPath = new URL('hold/works.json', root);
const hold = existsSync(holdPath) ? read('hold/works.json') : { works: [] };  // 보류 작품 (없으면 건너뜀, 추가)
const template = readFileSync(new URL('tools/carousel-maker.template.html', root), 'utf8');
const MARKER = '/*WORKS_JSON*/null';
if (!template.includes(MARKER)) throw new Error(`템플릿에 ${MARKER} 표시가 없습니다`);

const merged = { works: [...works.works, ...hold.works] };                    // 공개 작품 먼저, 보류 작품 뒤에 (변경)
const slugs = merged.works.map(w => w.slug);
const dup = slugs.find((s, i) => slugs.indexOf(s) !== i);
if (dup) throw new Error(`slug가 겹칩니다: ${dup} (works.json과 hold/works.json 확인)`);

// HTML <script> 안에 안전하게 넣기 위해 '<'를 이스케이프
const embedded = JSON.stringify(merged).replace(/</g, '\\u003c');
writeFileSync(new URL('tools/carousel-maker.html', root), template.replace(MARKER, () => embedded));
console.log(`tools/carousel-maker.html — 공개 ${works.works.length}개 + 보류 ${hold.works.length}개`);
