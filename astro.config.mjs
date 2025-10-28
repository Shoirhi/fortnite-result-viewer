// @ts-check
import { defineConfig, envField } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: "https://fortnite-result-viewer.plain-star-15af.workers.dev",
  output: "server",
  adapter: cloudflare(),

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [react()],

  env: {
    schema: {
      MICROCMS_SERVICE_DOMAIN: envField.string({ context: "server", access: "secret" }),
      MICROCMS_API_KEY: envField.string({ context: "server", access: "secret" }),
    }
  }
});
