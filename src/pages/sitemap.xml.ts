// 모든 페이지를 두 언어 대체 링크(hreflang)와 함께 나열하는 sitemap.xml
import type { APIRoute } from 'astro';
import { works } from '../lib/works';
import { href, absolute } from '../lib/i18n';

export const GET: APIRoute = ({ site }) => {
  const paths = ['/', '/about/', '/contact/', ...works.map(w => `/works/${w.slug}/`)];
  const urls = paths.flatMap(p => (['ko', 'en'] as const).map(lang => {
    const loc = absolute(href(lang, p), site);
    return `  <url>
    <loc>${loc}</loc>
    <xhtml:link rel="alternate" hreflang="ko" href="${absolute(href('ko', p), site)}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${absolute(href('en', p), site)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${absolute(href('ko', p), site)}"/>
  </url>`;
  }));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
