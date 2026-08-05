# AGENTS.md

## Project goal

Build the portfolio-grade MVP described in `VYHOD_SPEC.md`. Read that file completely before planning or editing.

## Web UI rules

When writing or changing web UI (`apps/web`):

1. Read `DESIGN.md` and `ANTI-SLOP.md` first.
2. Follow `CLAUDE.md` / `.cursorrules` UI generation rules.
3. Stack only: React + Tailwind + shadcn/ui; semantic tokens only; 8-pt spacing.
4. One high-quality component or section at a time unless a full page is explicitly requested.
5. Pass the Anti-Slop checklist before finishing.

## Required workflow

1. Inspect the repository and map the current state against `VYHOD_SPEC.md`.
2. Plan implementation in vertical slices that keep the repository runnable.
3. Continue from planning into implementation unless a concrete external blocker prevents progress.
4. Implement the mandatory MVP completely before optional polish.
5. Do not add anything listed under “Что не входит в MVP”.
6. Do not stop after scaffolding, static screens, or TODO placeholders.
7. Use real API flows once the backend exists; demo seed data is allowed, hard-coded production flows are not.
8. Preserve unrelated user changes.

## Non-negotiable correctness rules

- Store money only as integer minor units; never use float for money.
- Keep currency as an explicit ISO 4217 code and never silently combine currencies.
- Financial calculations, journey-state classification, debt strategy, and the main recommended action must be deterministic domain logic.
- The LLM may explain calculated results but must not calculate authoritative amounts, select the financial state, or mutate data.
- Validate AI responses against a strict schema and provide a deterministic fallback.
- Enforce record ownership on the backend for every user-scoped entity.
- Make critical create operations idempotent.
- Keep secrets, tokens, financial data, and personal information out of source control and logs.
- The complete core experience must work with the fake AI provider and without an external API key.

## Verification

Run the smallest relevant checks while developing and the full available validation before finishing:

- backend lint and typecheck;
- backend unit and integration tests;
- Alembic migrations against a clean PostgreSQL database;
- Flutter analyze and tests;
- Flutter debug build when the environment supports it;
- Docker Compose smoke test;
- repository secret scan.

Never claim a check passed unless it was actually executed. If the environment blocks a check, report the exact command, observed blocker, and remaining manual verification.

## Completion report

Report:

- behavior implemented;
- important architecture decisions;
- main files and components changed;
- commands actually executed and their observed results;
- material areas not tested;
- remaining limitations and risks;
- exact demo startup steps and recommended portfolio demo flow.
