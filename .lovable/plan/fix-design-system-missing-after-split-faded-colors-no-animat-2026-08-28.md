# Fix: design system missing after split (faded colors + no animations)

## What's wrong

The split copied pages and components, but not the original site's stylesheet. `src/styles.css` is still the stock template theme, so every brand token the pages ask for is undefined:

- `--secondary` is near-white instead of the bright blue → "Rahul Gupta", "Student | Creator | Thinker", gradients all look washed out.
- `font-signature` (the script logo/name font) does not exist and no Google Font is loaded → falls back to plain sans.
- `animate-float`, `animate-pulse-soft` keyframes missing → hero has no motion.
- `shadow-soft`, `shadow-primary`, and the component classes `section-container`, `btn-hero`, `card-modern` are undefined → flat cards, default buttons, inconsistent page padding.

## Plan

1. Recover the original stylesheet from the source project (`Rahul Gupta` Vite project) — its `index.css` plus `tailwind.config.ts` theme extension (colors, fonts, keyframes, shadows). If the checkout isn't available, reconstruct the same tokens from the live published old site's compiled CSS.
2. Port it into Tailwind v4 form in `src/styles.css`:
   - Brand color values into `:root` / `.dark` (oklch), mapped in `@theme inline` — including the real `--secondary` blue, primary navy, muted/accent values.
   - `--font-signature` plus the other families as `@theme` font tokens.
   - `--shadow-soft` / `--shadow-primary` as theme shadow tokens.
   - `float` and `pulse-soft` keyframes + `animate-float` / `animate-pulse-soft`.
   - `section-container`, `btn-hero`, `card-modern` as `@utility` rules (v4 replacement for `@layer components`).
3. Load the script/display webfonts with a `<link>` in `src/routes/__root.tsx` head (Tailwind v4 cannot `@import` a remote font URL).
4. Verify: run the app in a headless browser at mobile + desktop widths, screenshot home, POV, portfolio, about, contact, and compare against the old live site — colors, signature font, hero float animation, card shadows.

## Notes

- No page/component markup changes are planned; this is purely restoring the missing design tokens so existing class names resolve.
- Dark mode values get ported too, so the theme toggle keeps working.
