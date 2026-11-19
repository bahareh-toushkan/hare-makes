// @ts-check
import { defineConfig } from 'astro/config';

// 배포 주소: GitHub Actions가 `--site`, `--base`를 넘겨 덮어쓴다 (.github/workflows/deploy.yml).
// 로컬 빌드에서는 SITE_URL 환경 변수, 없으면 GitHub Pages 기본 주소를 쓴다.
export default defineConfig({
  site: process.env.SITE_URL || 'https://haremakes.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  // 글꼴 조각(작은 woff2)을 CSS에 base64로 끼워 넣지 않는다 — 넣으면 CSS가 350KB까지 커져 첫 화면이 늦어짐
  vite: { build: { assetsInlineLimit: 0 } }
});
