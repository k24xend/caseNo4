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

## Deterministic web planning model

The demo now derives Today, Diagnosis, the Path chart and milestones from `FinancialInputs` and a
passed reference clock. Scenario edits are candidate-only until accepted; acceptance persists the
adjustment separately from debts and transactions, recalculates every plan surface, and can be
reverted to the baseline. Forecast dates are ranges because income timing, rates and spending can
change. Money remains integer minor units throughout.

Opportunity ranking uses the phone/computer, weekly-hours, skills and investment-limit settings in
Profile. Its income ranges are illustrative and never guaranteed; tool purchases use conservative
income, payback time and cash-gap risk.

## Web validation

```bash
cd apps/web
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

For visual QA, run `npm run dev -- --host 0.0.0.0`, capture the routes at 390×844, then repeat after
fixes at 375×667, 430×932 and 1280 px. Playwright artifacts belong in `test-results/` and are not
committed.
