// @ts-check
import { defineConfig, envField } from 'astro/config';

export default defineConfig({
  site: 'https://acdt-solutions.com',
  // Une seule convention d'URL : canonical, liens internes et sitemap finissent par « / ».
  trailingSlash: 'always',
  build: { format: 'directory' },
  output: 'static',
  env: {
    schema: {
      // Aucun secret ici : ces valeurs finissent dans le HTML généré.
      PUBLIC_INDEXABLE: envField.boolean({ context: 'server', access: 'public', default: false }),
      PUBLIC_PLAUSIBLE_DOMAIN: envField.string({ context: 'server', access: 'public', optional: true }),
      PUBLIC_PLAUSIBLE_SRC: envField.string({ context: 'server', access: 'public', optional: true }),
    },
  },
});
