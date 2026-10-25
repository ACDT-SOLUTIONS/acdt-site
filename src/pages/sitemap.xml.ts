import type { APIRoute } from 'astro';
import { PAGES_PUBLIEES } from '@/config/publication.mjs';

// Le sitemap ne liste que les pages publiées, quel que soit l'environnement.
export const GET: APIRoute = ({ site }) => {
  const urls = PAGES_PUBLIEES.map((chemin) => `  <url><loc>${new URL(chemin, site).href}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
