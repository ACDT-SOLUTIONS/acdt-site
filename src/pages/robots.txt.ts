import type { APIRoute } from 'astro';
import { PUBLIC_INDEXABLE } from 'astro:env/server';

// Tant que PUBLIC_INDEXABLE n'est pas explicitement à true, tout le site est fermé aux robots.
// Version indexable : tout est autorisé (les pages non publiées n'existent pas) et le sitemap est déclaré.
export const GET: APIRoute = ({ site }) => {
  const contenu = PUBLIC_INDEXABLE
    ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site).href}\n`
    : 'User-agent: *\nDisallow: /\n';

  return new Response(contenu, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
