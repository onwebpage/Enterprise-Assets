import fs from 'fs';
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const isBuild = process.argv.includes('build');

const rawPort = process.env.PORT;
if (!isBuild && !rawPort) {
  throw new Error('PORT environment variable is required but was not provided.');
}
const port = rawPort ? Number(rawPort) : 3000;
if (!isBuild && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? '/';

// The official logo lives in attached_assets/logo.png (single source of truth).
// Components import it through the @assets alias; this plugin also publishes the
// same file at /logo.png for link previews (og:image), without keeping a copy.
const brandLogoPath = path.resolve(import.meta.dirname, '..', '..', 'attached_assets', 'logo.png');
function brandLogoPlugin(): Plugin {
  return {
    name: 'zorvani-brand-logo',
    configureServer(server) {
      server.middlewares.use('/logo.png', (_req, res) => {
        res.setHeader('Content-Type', 'image/png');
        fs.createReadStream(brandLogoPath).pipe(res);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'logo.png', source: fs.readFileSync(brandLogoPath) });
    },
  };
}

// CAPACITOR_BUILD=1 (set by mobile/setup-android.ps1) swaps the no-op web bridge
// for the Capacitor implementation. Normal web builds never touch Capacitor.
const isCapacitorBuild = process.env.CAPACITOR_BUILD === '1';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    brandLogoPlugin(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@native-bridge': path.resolve(
        import.meta.dirname,
        isCapacitorBuild ? 'mobile/bridge.capacitor.ts' : 'src/lib/native/bridge.web.ts',
      ),
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    // The Android build goes to its own folder so it can never replace the website build.
    outDir: path.resolve(import.meta.dirname, isCapacitorBuild ? 'dist/android' : 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
