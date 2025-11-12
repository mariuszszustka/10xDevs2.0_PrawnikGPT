import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false, // Używamy własnych stylów w globals.css
    }),
  ],
  output: 'server', // SSR dla dynamicznych stron (chat, history)
  server: {
    port: 4321,
    host: true, // Pozwala na dostęp z innych urządzeń w sieci
  },
  vite: {
    ssr: {
      noExternal: ['@supabase/supabase-js'], // Supabase client dla SSR
    },
  },
});

