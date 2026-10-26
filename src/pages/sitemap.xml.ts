import type { APIRoute } from 'astro';
import { PAGES_PUBLIEES, anciennesPagesConservees } from '@/config/publication.mjs';

// Le sitemap liste les pages publiées et les anciennes pages encore conservées (toujours indexables).
export const GET: APIRoute = ({ site }) => {
  const chemins = [...PAGES_PUBLIEES, ...anciennesPagesConservees()];
  const urls = chemins.map((chemin) => `  <url><loc>${new URL(chemin, site).href}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
