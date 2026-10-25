import type { APIRoute } from 'astro';
import { PUBLIC_INDEXABLE } from 'astro:env/server';

// Tant que PUBLIC_INDEXABLE n'est pas explicitement à true, tout le site est fermé aux robots.
// La ligne Sitemap sera ajoutée avec l'intégration @astrojs/sitemap.
export const GET: APIRoute = () => {
  const contenu = PUBLIC_INDEXABLE ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n';

  return new Response(contenu, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
