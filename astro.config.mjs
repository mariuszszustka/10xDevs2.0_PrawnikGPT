import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false, // Używamy własnych stylów w globals.css
    }),
    sitemap(), // Automatyczna generacja sitemap.xml dla SEO
  ],
  output: 'server', // SSR dla dynamicznych stron (chat, history)
  adapter: node({
    mode: 'standalone', // Standalone mode dla lepszej wydajności
  }),
  server: {
    port: 4321,
    host: true, // Pozwala na dostęp z innych urządzeń w sieci
  },
  vite: {
    ssr: {
      noExternal: ['@supabase/supabase-js'], // Supabase client dla SSR
    },

    plugins: [tailwindcss()],
  },
});