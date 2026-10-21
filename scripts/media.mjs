// 영상·이미지를 사이트용으로 변환해 public/media/<slug>/에 저장한다. ffmpeg(ffprobe 포함)가 PATH에 있어야 함.
//
//   npm run media -- video <slug> <원본.mp4> [포스터 초]
//     → video.mp4 (H.264, 긴 변 최대 1920, 최대 4Mbps, faststart), poster.jpg, og.jpg(1200×630)
//   npm run media -- poster <slug> <영상 또는 이미지> [초]
//     → poster.jpg, og.jpg 만 (유튜브로 임베드하는 작품, 또는 대표 썸네일 이미지로 포스터를 바꿀 때)
//   npm run media -- frame <slug> <이름> <영상 또는 이미지> [초]
//     → <이름>.jpg (전후 비교·장면 프레임. 예: compare-color-before, scene-1)
import { spawnSync } from 'node:child_process';
import { mkdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [cmd, slug, ...rest] = process.argv.slice(2);
const usage = `사용법:
  npm run media -- video  <slug> <원본.mp4> [포스터 초]
  npm run media -- poster <slug> <영상|이미지> [초]
  npm run media -- frame  <slug> <이름> <영상|이미지> [초]`;

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
  return { w, h };
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
  console.log(`${name}.jpg → public/media/${slug}/`);
} else {
  console.error(usage); process.exit(1);
}
