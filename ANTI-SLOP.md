# ANTI-SLOP.md — UI quality checklist

Run this checklist mentally before showing or committing any UI code.

## Instant fails (fix before return)

- [ ] Looks like a generic AI dashboard (purple gradients, neon accents, random cards)
- [ ] Hardcoded hex/rgb colors instead of semantic tokens
- [ ] Arbitrary spacing (`p-[13px]`, random gaps) instead of 8-pt grid
- [ ] Heavy shadows (`shadow-lg`, multi-layer glow stacks) on normal UI
- [ ] More than one competing primary CTA in a section
- [ ] Low-contrast gray-on-gray body text
- [ ] Decorative charts, badges, or icons with no product purpose
- [ ] Emoji as UI decoration in core product surfaces
- [ ] Inconsistent alignment / broken grid
- [ ] Dense “admin panel” tables where a calm mobile layout is needed
- [ ] Invented aesthetic that ignores `DESIGN.md`

## Spacing and structure

- [ ] Spacing uses only allowed Tailwind steps (2/3/4/6/8…)
- [ ] Generous whitespace; sections breathe
- [ ] Cards have consistent internal padding (usually `p-4` or `p-6`)
- [ ] Related items share one alignment axis

## Typography

- [ ] At most three text sizes on the screen
- [ ] Headings are `font-medium` / `font-semibold` only
- [ ] Money is readable at a glance; labels are short
- [ ] No long walls of helper text competing with the action

## Color and contrast

- [ ] Only semantic tokens from `DESIGN.md`
- [ ] High contrast for primary numbers and actions
- [ ] Destructive color only for destructive actions
- [ ] Dark mode tokens considered (`dark:` / CSS variables)

## Components

- [ ] Built from shadcn primitives where possible
- [ ] Focus-visible states present
- [ ] Hover states subtle, not loud
- [ ] Loading / empty / error handled

## Final gate

Ask: **Does this look like a generic AI dashboard or like a carefully designed product interface?**

Return code only if it is the second option. If anything fails, fix first.
