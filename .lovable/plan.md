# Public Split Project — Final Audit Report + Remaining Cleanup

## Audit result: split ~95% complete

Verified live in this project (Supabase `hulcqzjhtuapsdzxplop`):

- **Frontend routes** — all present and building OK:
  - Public pages: `/` (Home), `/about`, `/portfolio` (+ `/:category`), `/referrals`, `/pov`, `/contact`, `/fund-rahul`, `/site-map`, `/all-links`
  - Legal: privacy-policy, terms-and-conditions, disclaimer, refund-policy, cancellation-policy
  - `/heena`, `/heena/admin/*`, `/:code` URL shortener, `/app` + `/app/*` → 307 redirect to `/portfolio/apps`
- **Design system** — restored: Midnight Blue/Electric Blue theme, Great Vibes signature font, float/pulse animations, all custom utilities (`btn-hero`, `card-modern`, `section-container`, etc.). Mobile + desktop browser-verified.
- **Backend** — 12 server functions live under `/api/public/*`: ramogu-chat (fixed to query `donations`), track-analytics, track-url-click, razorpay ×3, transcribe-audio, indexing ×2, analytics-insights, log-auth-event, plus secure `/api/public/file/*` storage proxy.
- **Database** — parity confirmed: 121 public tables, 236 RLS policies, 5 auth users migrated, 8,242 rows.
- **Storage** — 4 buckets exist, required public assets (APK, icons, portfolio images) copied; DB URLs rewritten to proxy.
- **SEO files** — `sitemap.xml`, `robots.txt`, `llms.txt` all point to `https://rahulgupta.online`; root metadata fixed (no more "Lovable App").
- **Dead code** — removed: Workspace AI island, 5 obsolete admin components, unused shadcn primitives, workspace server route, shared edge utils.
- **Build** — latest build: `build OK`; typecheck green.

## Remaining items

1. **66 leftover personal/workspace DB tables** (30 match personal/workspace/note/task prefixes + related) — migrated but unused by the public site. Recommend: backup to SQL dump, then drop them to slim the public database.
2. **2 empty private buckets** (`personal-audio`, `personal-notes-media`) — unused by public site; safe to delete.
3. **Domain switch** — `rahulgupta.online` / `rahulgupta.site` must be pointed to this public project via Project settings > Domains (needs your DNS/dashboard action; I cannot do this from code).
4. **38 Supabase security-linter warnings** (inherited from source: `vector` extension in public schema, SECURITY DEFINER grants, leaked-password protection off) — optional hardening, not blockers.

## Proposed action (this plan)

- Export a backup dump of the 66 personal/workspace tables.
- Drop those tables and their policies from the public project.
- Delete the 2 empty personal buckets.
- Re-verify: build, key public routes, storage proxy.

You then handle the domain switch in Project settings > Domains + publish.
