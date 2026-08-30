# Full Website Audit — Findings + Fix Plan

## Overall health: strong

- Build: `build OK` (latest, 2026-08-30T14:28Z). Typecheck: clean, 0 errors.
- All 17 public pages return HTTP 200; `/app` correctly 307-redirects to `/portfolio/apps`.
- Storage proxy works (`/api/public/file/...` → 200).
- Design system restored (brand colors, Great Vibes signature, float/pulse animations).
- No runtime errors in console — only a harmless Lovable preview-tool warning.
- Database is clean after the split: 28 tables, all actively used, 89 RLS policies, ~5,000 rows.
- SEO: unique title + description on all 20 routes, sitemap covers 24 URLs, robots.txt correct, all pointing at `rahulgupta.online`.

## Issues found (7)

### A. Content gaps (highest business impact)
1. `app_info` table is **empty (0 rows)** — the Apps section has no data even though an APK and its icon sit in storage. `/portfolio/apps` renders empty.
2. `portfolio_items` has only **2 rows**, `referral_links` **4**, `pov_posts` **5**. Thin content for SEO and for visitors.

### B. Technical issues
3. **Soft 404** — unknown URLs like `/nonexistentpage123` return HTTP **200** instead of 404. Google will index junk URLs. Needs a proper 404 status on the not-found response.
4. **API GET returns 500** — `track-analytics`, `ramogu-chat` etc. throw `Internal error` on GET. POST works correctly (400 with a clear message). Should return **405 Method Not Allowed** instead of a 500.
5. **No `og:image` / `twitter:image` anywhere** — social shares on WhatsApp/X/Facebook show a blank card. A branded share image plus tags on the main pages would fix this.
6. **No structured data (JSON-LD)** — a `Person` schema on Home/About and `BreadcrumbList` on category pages would improve how Google displays the site.

### C. Security (all warning-level, none critical)
7. Supabase linter: 38 warnings — `vector` extension in the public schema, 18 SECURITY DEFINER functions callable by anon/authenticated, and **leaked-password protection disabled** on auth. The last one is a one-click toggle and worth doing.

## Proposed fix plan

**Step 1 — Correct 404 status.** Make the not-found route respond with HTTP 404 so search engines stop indexing invalid URLs.

**Step 2 — Fix API method handling.** Remove the GET handlers (or return 405) from the `/api/public/*` routes that are POST-only, so bots and scanners get a clean response instead of a 500.

**Step 3 — Social share cards.** Generate one branded Open Graph image (1200x630) and add `og:image` + `twitter:image` to Home, About, Portfolio, POV, Contact and Fund Rahul.

**Step 4 — Structured data.** Add `Person` JSON-LD on Home/About and `BreadcrumbList` on portfolio/referrals/POV category pages.

**Step 5 — Security hardening.** Enable leaked-password protection, and review/revoke public EXECUTE on the SECURITY DEFINER functions that are not meant to be called from the browser.

**Step 6 — Content (your call).** Add the app entry to the Apps section so the APK already in storage is actually downloadable, and top up portfolio/referral/POV entries from the admin panel.

## Technical notes

- 404 fix goes in `src/routes/__root.tsx` (`notFoundComponent` + a status-aware response).
- Method fix touches the 12 files under `src/routes/api/public/`.
- OG tags go in each route's `head()` — never on `__root`, and only with absolute `https://rahulgupta.online/...` URLs.
- Security changes are Supabase-side migrations plus one auth setting.
- Unimported files flagged by the scan (`src/router.tsx`, `src/start.ts`, `src/integrations/supabase/client.server.ts`, `auth-middleware.ts`, `router-compat.tsx`) are framework entrypoints or Vite aliases — **not** dead code, leave them.
