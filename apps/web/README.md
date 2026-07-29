# ВЫХОД Web PWA

Mobile-first portfolio preview of the future native SwiftUI client. Demo data is explicitly fictional; this is not a bank or payment product.

## Open the demo

```bash
cd apps/web
npm ci
npm run dev
```

Open the shown URL and tap **Открыть демо**. No API, Docker, database, account, or key is required. Demo changes, onboarding draft, cache, idempotency metadata, and mutation queue live in IndexedDB and survive reloads.

## Publish from an iPhone

The simplest path is **Vercel → Add New Project → import this GitHub repository → choose branch `codex/web-pwa-preview` → set Root Directory to `apps/web` → Deploy**. Framework is Vite, build command is `npm run build`, and output is `dist`. `vercel.json` supplies the SPA fallback. Netlify/Cloudflare Pages use the same command/output; `public/_redirects` supports Netlify.

Then open the HTTPS URL in Safari: **Поделиться → На экран «Домой»**. The standalone status is shown in Profile. The first online visit installs the app shell; financial API responses are never placed in shared Cache Storage.

## Test offline and sync

1. Profile → enable **Искусственный offline**.
2. Add an operation or edit a debt. Its badge becomes **Ожидает** and the durable queue count changes.
3. Disable offline and tap **Синхронизировать**. Items reconcile without duplication and retain their Idempotency-Key.
4. Use the Scenario selector for **normal / critical / empty**, or enable **Искусственная ошибка**; reset restores the original dataset.

## Real FastAPI mode

Copy `.env.example`, set `VITE_DATA_MODE=api` and `VITE_API_BASE_URL=https://api.example.com`, then rebuild. No production URL or secret is hard-coded. The API client validates plan/debt/transaction/explanation DTOs with Zod, maps error envelopes, times out requests, coordinates refresh calls, and attaches idempotency keys.

Backend CORS must contain the exact HTTPS frontend origin (never `*` with credentials). The existing backend returns refresh tokens in JSON. The compatibility adapter keeps access tokens only in memory and refresh tokens only in `sessionStorage`; it deliberately never uses localStorage or IndexedDB. This is a documented portfolio compromise, **not production-safe web auth**. Before production, add a Secure + HttpOnly + SameSite refresh cookie, exact CORS allowlist, CSRF protection for cookie-authenticated mutations, and verify the flow without changing native token endpoints.

## What is real vs demo

- **Deterministic:** all displayed authoritative amounts come from a plan/snapshot contract; money remains integer minor units with explicit ISO currency. The web UI does not invent or recalculate plan authority. AI/fallback only explains.
- **Demo adapter:** Russian scenario, simulated latency/error/offline, local CRUD, and simulated reconciliation implement the same repository boundary without pretending to be bank data.
- **API adapter:** authentication and typed reads are implemented. The current backend does not expose a cookie refresh flow; API-mode onboarding and full mutation reconciliation need end-to-end verification against a deployed backend before production use.
