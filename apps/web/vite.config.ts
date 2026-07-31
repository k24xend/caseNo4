import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage } from 'node:http';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Load KEY=VALUE from monorepo root .env into process.env (no override). */
function loadRootEnv() {
  const envPath = resolve(rootDir, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer | string) => {
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolveBody(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

/** Dev-only: POST /api/assistant → Grok (same as Vercel serverless). */
function assistantApiPlugin(): Plugin {
  return {
    name: 'vyhod-assistant-api',
    configureServer(server) {
      loadRootEnv();
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url !== '/api/assistant') {
          next();
          return;
        }
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const key = process.env.XAI_API_KEY;
        if (!key) {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'XAI_API_KEY not configured' }));
          return;
        }

        try {
          const body = (await readJsonBody(req)) as {
            message?: string;
            language?: string;
            context?: string;
            history?: Array<{ role: string; content: string }>;
          };
          // Core module only — no @vercel/node (keeps `tsc -b` green on Vercel).
          const { runAssistant } = await import('../../api/assistant-core');
          const result = await runAssistant(body, key);
          if ('reply' in result) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
            return;
          }
          res.statusCode = result.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: result.error,
              ...(result.detail ? { detail: result.detail } : {}),
            }),
          );
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: e instanceof Error ? e.message : 'assistant error',
            }),
          );
        }
      });
    },
  };
}

export default defineConfig({
  resolve: {
    dedupe: ['three', 'react', 'react-dom'],
  },
  plugins: [
    react(),
    assistantApiPlugin(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon.png', 'favicon.svg', 'favicon.png'],
      manifest: {
        name: 'ВЫХОД — финансовый навигатор',
        short_name: 'ВЫХОД',
        description: 'Личный финансовый навигатор: выбор, план и безопасное действие сегодня',
        theme_color: '#ECEAF1',
        background_color: '#ECEAF1',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'ru',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        runtimeCaching: [],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
