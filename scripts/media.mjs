// 영상·이미지를 사이트용으로 변환해 public/media/<slug>/에 저장한다. ffmpeg(ffprobe 포함)가 PATH에 있어야 함.
//
//   npm run media -- video <slug> <원본.mp4> [포스터 초]
//     → video.mp4 (H.264, 긴 변 최대 1920, 최대 4Mbps, faststart), poster.jpg, og.jpg(1200×630)
//   npm run media -- poster <slug> <영상 또는 이미지> [초]
//     → poster.jpg, og.jpg 만 (유튜브로 임베드하는 작품, 또는 대표 썸네일 이미지로 포스터를 바꿀 때)
//   npm run media -- frame <slug> <이름> <영상 또는 이미지> [초]
//     → <이름>.jpg (전후 비교·장면 프레임. 예: compare-color-before, scene-1)
import { spawnSync } from 'node:child_process';
import { mkdirSync, statSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [cmd, slug, ...rest] = process.argv.slice(2);
const usage = `사용법:
  npm run media -- video  <slug> <원본.mp4> [포스터 초]
  npm run media -- poster <slug> <영상|이미지> [초]
  npm run media -- frame  <slug> <이름> <영상|이미지> [초]
  npm run media -- preview <slug> [원본.mp4] [시작 초] [길이 초]
  npm run media -- thumb  <slug>`;

// 세로(1080×1920)·가로(1920×1080) 모두 긴 변을 1920 이하로, 비율 유지, 짝수 크기 (변경: 예전엔 너비 1080 고정)
const FIT = "scale=w='min(iw,1920)':h='min(ih,1920)':force_original_aspect_ratio=decrease:force_divisible_by=2";

function run(bin, args) {
  const r = spawnSync(bin, args, { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });
  if (r.error?.code === 'ENOENT') { console.error(`${bin}를 찾을 수 없습니다. ffmpeg를 설치하고 PATH에 추가하세요 (Windows: winget install Gyan.FFmpeg).`); process.exit(1); }
  if (r.status !== 0) { console.error(`${bin} 실패:`, args.join(' ')); process.exit(r.status ?? 1); }
  return r.stdout;
}
const ffmpeg = args => run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
const mb = p => (statSync(p).size / 1024 / 1024).toFixed(1);
const isImage = p => /\.(png|jpe?g|webp)$/i.test(p);

function size(p) {                                   // 가로·세로 픽셀 (ffprobe)
  const [w, h] = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', p]).trim().split('x').map(Number);
  return { w, h };
}

// 포스터(지정한 초의 프레임 또는 이미지) + 공유 미리보기(OG) 1200×630
function posterAndOg(outDir, input, sec) {
  const poster = join(outDir, 'poster.jpg'), og = join(outDir, 'og.jpg');
  ffmpeg([...(isImage(input) ? [] : ['-ss', sec]), '-i', input, '-frames:v', '1', '-vf', FIT, '-q:v', '3', poster]);
  const { w, h } = size(poster);
  const filter = w / h >= 1.5
    ? '[0:v]scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630'          // 가로 화면: 꽉 채워 자름 (추가)
    : '[0:v]scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630,boxblur=24:2,eq=brightness=-0.15[bg];[0:v]scale=-2:630[fg];[bg][fg]overlay=(W-w)/2:0';  // 세로 화면: 흐린 배경 위 가운데
  ffmpeg(['-i', poster, '-filter_complex', filter, '-frames:v', '1', '-q:v', '3', og]);
  thumbFrom(outDir);
  return { w, h };
}

// 카드용 작은 썸네일: 포스터를 긴 변 720으로 줄인 thumb.jpg (보통 30~80KB). 홈·목록 카드가 이걸 쓴다
function thumbFrom(dir) {
  const poster = join(dir, 'poster.jpg');
  if (!existsSync(poster)) return false;
  ffmpeg(['-i', poster, '-frames:v', '1', '-vf', "scale=w='min(iw,720)':h='min(ih,720)':force_original_aspect_ratio=decrease:force_divisible_by=2", '-q:v', '5', join(dir, 'thumb.jpg')]);
  // 작품 상세의 플레이어 포스터: 긴 변 1280 (보통 60~110KB). 원본 poster.jpg는 공유 미리보기·구조화 데이터용으로 그대로 둔다
  ffmpeg(['-i', poster, '-frames:v', '1', '-vf', "scale=w='min(iw,1280)':h='min(ih,1280)':force_original_aspect_ratio=decrease:force_divisible_by=2", '-q:v', '4', join(dir, 'poster.m.jpg')]);
  return true;
}

// 장면 프레임의 작은 사본: scene-1.jpg → scene-1.s.jpg (긴 변 720). 사이트의 '장면' 칸이 이걸 쓴다
function smallOf(file) {
  const out = file.replace(/\.jpg$/i, '.s.jpg');
  ffmpeg(['-i', file, '-frames:v', '1', '-vf', "scale=w='min(iw,720)':h='min(ih,720)':force_original_aspect_ratio=decrease:force_divisible_by=2", '-q:v', '5', out]);
  return out;
}

if (!cmd || !slug || !/^[a-z0-9-]+$/.test(slug)) { console.error(usage); process.exit(1); }
const outDir = resolve('public', 'media', slug);
mkdirSync(outDir, { recursive: true });

if (cmd === 'video') {
  const [input, posterSec = '1'] = rest;
  if (!input || !existsSync(input)) { console.error(`원본 영상이 없습니다: ${input}\n${usage}`); process.exit(1); }
  const video = join(outDir, 'video.mp4');
  // 1) 웹 재생용 영상: 화질 기준 CRF 23 + 최대 비트레이트 4Mbps로 상한, moov를 앞에 둬 바로 재생 시작
  ffmpeg(['-i', input, '-vf', FIT, '-c:v', 'libx264', '-preset', 'slow', '-crf', '23',
    '-maxrate', '4M', '-bufsize', '8M', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', video]);
  // 2) 포스터 + OG
  const { w, h } = posterAndOg(outDir, video, posterSec);
  const sizeMb = Number(mb(video));
  console.log(`video.mp4 ${sizeMb} MB (${w}×${h}) · poster.jpg · og.jpg → public/media/${slug}/`);
  if (sizeMb > 50) console.warn('경고: 50MB를 넘으면 GitHub가 푸시 때 경고하고, 100MB를 넘으면 거부합니다. CRF를 26 정도로 올려 다시 변환하세요.');
} else if (cmd === 'poster') {
  const [input, sec = '1'] = rest;
  if (!input || !existsSync(input)) { console.error(`파일이 없습니다: ${input}\n${usage}`); process.exit(1); }
  const { w, h } = posterAndOg(outDir, input, sec);
  console.log(`poster.jpg (${w}×${h}) · og.jpg → public/media/${slug}/`);
} else if (cmd === 'frame') {
  const [name, input, sec = '0'] = rest;
  if (!name || !/^[a-z0-9-]+$/.test(name) || !input || !existsSync(input)) { console.error(usage); process.exit(1); }
  const out = join(outDir, `${name}.jpg`);
  ffmpeg([...(isImage(input) ? [] : ['-ss', sec]), '-i', input, '-frames:v', '1', '-vf', FIT, '-q:v', '3', out]);
  if (name.startsWith('scene-')) smallOf(out);                       // 장면 프레임은 작은 사본도 함께
  console.log(`${name}.jpg → public/media/${slug}/`);
} else if (cmd === 'thumb') {
  // 이미 있는 poster.jpg·scene-*.jpg에서 작은 사본(thumb.jpg, poster.m.jpg, scene-*.s.jpg)만 다시 만들기
  if (!thumbFrom(outDir)) { console.error(`poster.jpg가 없습니다: public/media/${slug}/`); process.exit(1); }
  const scenes = readdirSync(outDir).filter(f => /^scene-.*\.jpg$/i.test(f) && !/\.s\.jpg$/i.test(f));
  for (const f of scenes) smallOf(join(outDir, f));
  console.log(`thumb.jpg ${(statSync(join(outDir, 'thumb.jpg')).size / 1024).toFixed(0)} KB · poster.m.jpg ${(statSync(join(outDir, 'poster.m.jpg')).size / 1024).toFixed(0)} KB · 장면 ${scenes.length}장 → public/media/${slug}/`);
} else if (cmd === 'preview') {
  // 홈 대표작·카드 호버용 무음 미리보기: 긴 변 720, 24fps, 소리 없음, 기본 6초 (보통 0.3~0.8MB)
  const own = join(outDir, 'video.mp4');
  const hasInput = rest[0] && !/^[\d.]+$/.test(rest[0]);            // 첫 인자가 숫자면 원본 생략(= 이미 올린 video.mp4 사용)
  const input = hasInput ? rest[0] : own;
  const [start = '0', dur = '6'] = hasInput ? rest.slice(1) : rest;
  if (!existsSync(input)) { console.error(`원본 영상이 없습니다: ${input}\n${usage}`); process.exit(1); }
  const out = join(outDir, 'preview.mp4');
  ffmpeg(['-ss', start, '-t', dur, '-i', input, '-an',
    '-vf', "scale=w='min(iw,720)':h='min(ih,720)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=24",
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
  console.log(`preview.mp4 ${mb(out)} MB (${start}초부터 ${dur}초) → public/media/${slug}/`);
} else {
  console.error(usage); process.exit(1);
}
