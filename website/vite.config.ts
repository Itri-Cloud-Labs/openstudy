import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// A relative base keeps the build portable: it works from a domain root or a project subpath.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
