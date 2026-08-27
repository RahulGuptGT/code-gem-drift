# Public site ko is naye project me laana (Step 2–4)

Source project `Rahul Gupta` ka read-only snapshot mil gaya hai, aur `docs/split/` ke teeno files padh liye hain: manifest (124 files), admin cleanup notes, aur schema dump generator.

## Ek zaroori baat pehle

Purana project **Vite + React Router SPA** hai (`src/App.tsx`, `src/pages/*`, `BrowserRouter`, `index.html`).
Yeh naya project **TanStack Start** par hai, jahan React Router allowed nahi hai aur pages `src/routes/*` me file-based routing se aate hain.

Iska matlab: 124 files ka 1:1 copy possible nahi. Components/hooks/lib/ui ~90% as-is copy honge, lekin routing layer rewrite hoga. Aapne poora port choose kiya hai, toh plan usi hisaab se hai. (Alternative jo sasta padta: naya project Classic stack par banate, tab literally copy-paste chalta — agar mann badle toh bata dena.)

## Phase 1 — Foundation

- Non-route code copy: `components/ui/*`, `components/*` (Layout, Breadcrumbs, SocialIcons, support-chat/*, pov/*, legal/LegalLayout, admin/* public subset, AnalyticsTracker, ErrorBoundary), `hooks/*`, `lib/*`, `config/routes.ts`, `data/websiteKnowledge.ts`, `utils/pageContentExtractor.ts`, `src/assets/*`.
- Missing npm packages install (tiptap, dnd-kit, fontsource, radix wale jo template me nahi hain).
- Design system: purane `src/index.css` + `tailwind.config.ts` ke tokens ko is project ke `src/styles.css` (Tailwind v4 @theme) me translate.
- Static: `public/robots.txt`, `sitemap.xml`, `llms.txt`, `favicon.ico`.
- Supabase client: purane `integrations/supabase/client.ts` copy **nahi** hoga — is project ka generated client use hoga. `types.ts` schema apply ke baad regenerate hoga.

## Phase 2 — Routing port

`App.tsx` ki jagah `src/routes/` files:

```text
__root.tsx            providers + Layout chrome + Toaster + AnalyticsTracker
index.tsx             Home
about.tsx  portfolio.tsx  referral-links.tsx  contact.tsx
pov.tsx  fund.tsx  links.tsx
legal.privacy.tsx  legal.terms.tsx  legal.disclaimer.tsx
legal.refund.tsx  legal.cancellation.tsx
heena.tsx             AdminLogin
heena.admin.tsx       AdminDashboard (tabs)
$code.tsx             short-URL redirect
$.tsx                 NotFound
```

Har route file par apna `head()` (title, description, og) — purane `useDocumentTitle` ki jagah.

Code-level changes: `react-router-dom` ke `Link`/`useNavigate`/`useParams`/`useLocation`/`Navigate` → `@tanstack/react-router` equivalents; `AuthProvider`/`ThemeProvider`/`QueryClientProvider` root me; `use-toast`/`toaster` → `sonner`; browser-only cheezein (localStorage, fingerprint, voice recorder, tiptap) SSR-safe (`useEffect` / `ClientOnly`).

`admin-cleanup-notes.txt` ke hisaab se `AdminDashboard` se AdminClock, AdminNotepad, AdminPeople, AdminBiography, AdminPersonalLanding, ViewAdminButton hata denge — unki jagah personal project ka external link. `workspace-ai/*` bhi personal-side hai; agar admin me use ho raha hai toh drop.

## Phase 3 — Schema (naye Supabase me)

`dump-public-schema.sql` chalane ki zaroorat nahi — source project ki 141 migration files se public-side schema main khud reconstruct karke ek migration me apply karunga:

1. Enums `app_role`, `payment_status`
2. Functions: `update_updated_at_column`, `has_role`, `handle_new_user` (+ auth.users trigger), `update_pov_comment_count`, `update_pov_reaction_counts`
3. 32 tables + GRANTs + RLS + policies + indexes + triggers (manifest order: profiles/user_roles → settings → content → contact/donations → chat/index → analytics)
4. Public RPCs: `get_public_site_settings`, `get_public_app_settings`, `get_public_supporters`, `increment_url_clicks`, `set_pov_reaction` + GRANT EXECUTE
5. Storage buckets: portfolio images, POV media, chat attachments (same naam/visibility)

Migration approve karne ke baad `types.ts` auto-regenerate hoga.

## Phase 4 — Data migration

Purane Supabase ka connection string (Project Settings → Database → Connection string, pooler nahi, direct) mujhe secret `OLD_DB_URL` ke roop me chahiye — main `add_secret` ka secure form kholunga, aap wahin paste kar dena.

Uske baad main:
- data-only `pg_dump` (README Step 4 ki table list) → naye DB me import
- import ke waqt POV count triggers disable, baad me counts recompute
- badi analytics tables date-chunks me
- row counts source vs target compare karke verify

Auth users copy nahi hote: aap naye project me apna admin user banaoge, phir main `user_roles` me admin row insert kar dunga.

## Phase 5 — Backend functions + secrets

11 functions (`ramogu-chat`, `track-analytics`, `track-url-click`, `index-site-content`, `smart-index-site`, `analytics-insights`, `razorpay-*` teen, `log-auth-event`, `transcribe-audio`) + `_shared/*` naye Supabase me deploy honge (existing code, as-is). Secrets: `GEMINI_API_KEY`, `SARVAM_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` — `add_secret` form se. `LOVABLE_API_KEY` yahan already hai. Razorpay webhook URL naye project ka set karna hoga.

## Phase 6 — Verify

Preview par: home, portfolio, referrals, POV (agree/disagree + comment), contact submit, donation test-mode, `/:code` short link, support chatbot reply, analytics row DB me, admin login + har tab. Playwright se main khud bhi check karunga.

Domain switch (Step 7) sabse aakhir me, verify pass hone ke baad.

## Kaise chalayenge

Ek turn me sab nahi hoga. Sequence: Phase 1 → Phase 2 → (Phase 3 migration approval) → Phase 4 (secret ke baad) → Phase 5 → Phase 6. Har phase ke baad build green karke aage badhunga.

## Technical notes

- Copy source: `/tmp/cross-project/rahul-gupta-.../` read-only snapshot — direct `cp` se files aayengi.
- `src/pages/` is stack me exist nahi karega; sab kuch `src/routes/` + `src/components/`.
- Purana `main.tsx`, `App.tsx`, `index.html`, `tailwind.config.ts` copy nahi honge (TanStack me inka equivalent alag hai).
- Server-side kaam (contact submit, donations, analytics writes) me se jo abhi client se ho raha hai woh waisa hi rahega; sirf edge functions edge par rahenge.
