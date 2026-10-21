import type { APIRoute } from 'astro';
import { asset, absolute } from '../lib/i18n';

export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${absolute(asset('sitemap.xml'), site)}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
