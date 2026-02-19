import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-mark.svg', 'logo.svg'],
      manifest: {
        name: 'EngramX',
        short_name: 'EngramX',
        description: 'Decentralized agent state on ICP',
        theme_color: '#0a0e14',
        background_color: '#0a0e14',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/logo-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.icp0\.io\/api\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', expiration: { maxEntries: 50, maxAgeSeconds: 300 } },
          },
        ],
      },
    }),
  ],
  define: {
    'process.env.ICP_ENVIRONMENT': JSON.stringify(process.env.ICP_ENVIRONMENT || 'local'),
    global: 'globalThis',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4943',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['@icp-sdk/core', '@icp-sdk/auth'],
          vue: ['vue', 'vue-router'],
        },
      },
    },
  },
});
