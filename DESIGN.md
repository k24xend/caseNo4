# DESIGN.md — VYHOD Web UI

Source of truth for web UI aesthetics. Commit to this direction; do not invent new ones.

## Product feel

Calm premium fintech — closer to Linear / Raycast restraint than a retail bank.
Mobile-first. Large money figures, short copy, one primary action per section.
No shame, no noise, no decorative charts without a user decision.

## Stack

- React + TypeScript
- Tailwind CSS
- shadcn/ui only for primitives
- App lives in `apps/web`

## Color tokens (semantic only)

Use Tailwind semantic classes mapped in `apps/web/src/index.css` and `tailwind.config.js`.

| Token | Use |
|--------|-----|
| `bg-background` / `text-foreground` | Page surface and body text |
| `bg-card` / `text-card-foreground` | Elevated surfaces |
| `bg-muted` / `text-muted-foreground` | Secondary surfaces and quiet text |
| `bg-primary` / `text-primary-foreground` | Primary actions |
| `bg-secondary` / `text-secondary-foreground` | Secondary actions |
| `bg-accent` / `text-accent-foreground` | Soft highlights |
| `bg-destructive` / `text-destructive-foreground` | Destructive only |
| `border` / `ring` | Borders and focus rings |
| `bg-layer-comfort` | Wallet comfort layer tint |
| `bg-layer-obligations` | Wallet obligations layer tint |
| `bg-layer-reserve` | Wallet reserve layer tint |
| `bg-glass` | Frosted glass surfaces |

Atmosphere: pearl-lilac light mode; deep graphite-violet dark mode.
Do not introduce random hex colors in components.

## Typography

- Family: Inter (system fallbacks allowed)
- Prefer: `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`
- Headings: `font-semibold` or `font-medium` only
- Money figures: large, high contrast, short labels under them
- Max ~3 text sizes on one screen
- Comfortable line height (`leading-relaxed` when body text wraps)

## Spacing (strict 8-pt grid)

Allowed: `p-2` `p-3` `p-4` `p-6` `p-8`, `gap-2` `gap-3` `gap-4` `gap-6` `gap-8`, `space-y-4` `space-y-6` `space-y-8`.
Avoid dense layouts. Prefer airy sections.

## Shape and elevation

- Radius: prefer `rounded-md` and `rounded-lg` (project also has `rounded-xl` for large shells — use sparingly)
- Shadows: `shadow-sm` or none for general UI; wallet/dial may use project `shadow-glass` / `shadow-dial` / `shadow-clasp` only where those components already do
- Borders: subtle (`border-border`), never heavy grids

## Layout principles

1. One primary action per section
2. Clear hierarchy: action → safe amount → state → secondary detail
3. Loading / empty / error / offline states are first-class
4. Critical financial state must not feel like punishment (no full red screens)
5. Dark mode is supported via `dark:` and CSS variables

## Signature product elements

- Liquid / glass wallet stack (comfort, obligations, reserve)
- Compact assistant capsule
- Frosted Base mode dial
- Floating glass navigation dock

Do not replace these with generic dashboard cards unless the task explicitly redesigns them.

## References

- `docs/design-references/` — visual ground truth for wallet and overview
- Existing screens in `apps/web/src/features/`
