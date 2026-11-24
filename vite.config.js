import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      strict: false,
    },
    // /api lives in Cloudflare Pages Functions. For the full app in dev, run
    // `npm run build && npx wrangler pages dev dist --port 8788` alongside `npm run dev`.
    proxy: {
      '/api': 'http://127.0.0.1:8788',
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: 'esbuild',
    esbuild: {
      target: 'esnext',
      format: 'esm',
      treeShaking: true,
      legalComments: 'none',
      minifyIdentifiers: true,
      minifySyntax: true,
      minifyWhitespace: true,
      drop: ['console', 'debugger'],
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
})
