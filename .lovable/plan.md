# Membership, Gated Content & Ebook System

Teen-tier subscription system: **Starter** (free, sabke liye), **Signature** (₹399/month), **Sovereign** (₹69,999 one-time, lifetime — no expiry). Users login karke plan kharidenge, aur POV posts + ebook chapters plan-level ke hisaab se unlock honge. Instamojo payment gateway last phase me.

Kaam 4 phases me hoga — har phase apne aap me complete aur testable.

---

## Phase 1 — User accounts & profiles

- Public `/auth` page: email + password sign up / sign in, plus Google sign-in.
- Sign-up par automatically profile row ban jayegi (display name, avatar, bio) aur default plan **Starter** assign hoga.
- `/account` page (login-protected): profile edit, current plan dikhega, sign out.
- Header me session-aware affordance: logged out → "Sign in", logged in → avatar menu (Account, My Library, Sign out). Admin ho toh Admin link bhi.
- Admin (`heena/admin`) me naya **Users** section: sabhi users, unka plan, join date, manual plan grant/revoke.

Existing `/heena` admin login flow ko chhedenge nahi — wo alag rahega, bas role-based access se align kar denge.

## Phase 2 — Plans & access tiers

- Plans database me store honge (name, slug, price, billing type, features list, order) taaki aap admin se edit kar sakein — code me hardcode nahi.
- Public `/pricing` page: teeno plans ke cards, features comparison, CTA. Logged-out user ko "Sign in to subscribe".
- Har user ka ek active membership record — plan, status, start/end date. Sovereign ka end date null (lifetime).
- Access rule: har content item par ek minimum tier hota hai (`public` / `starter` / `signature` / `sovereign`). User ka tier us se bada ya barabar ho toh full content, warna locked preview.

## Phase 3 — Gated content (POV posts + Ebook)

**POV posts**
- Har post ko admin se ek visibility tier assign hoga.
- Locked post: title, category aur pehla chhota excerpt dikhega, baaki blur/lock overlay + "Unlock with Signature" CTA. Server locked body bhejega hi nahi (sirf UI hide karna kaafi nahi).

**Ebook** (ek book, chapters ke saath — koi PDF nahi, sab website par likha hua long-form)
- `/book` — book landing: cover, description, chapter list with lock badges.
- `/book/<chapter-slug>` — reading page: long-form typography, prev/next navigation, reading progress, chapter list sidebar.
- Free chapters (pehle 1-2) sabke liye, baaki Signature/Sovereign par gated. Locked chapter par preview + unlock CTA.
- Admin me **Book** section: chapters CRUD, ordering, tier assign, draft/publish, rich long-form editor.
- `/library` — logged-in user ki reading list: kya unlock hai, kahan tak padha.

SEO: unlocked chapters aur public posts crawlable rahenge, locked wale ke liye sirf preview + proper meta, taaki share links kaam karein.

## Phase 4 — Instamojo payments

- `/pricing` par "Subscribe" → server payment request banayega Instamojo par (amount, plan, user), user Instamojo checkout par jayega.
- Instamojo webhook endpoint (`/api/public/payments/instamojo`) signature verify karke payment record + membership activate karega.
- Signature monthly: 30-din validity, expiry ke baad automatic downgrade to Starter. Sovereign: one-time, permanent.
- `/account` me billing history (payments list, invoice ids, status).
- Admin me **Payments** section: sabhi transactions, filter, manual activate agar webhook fail ho.
- Aapko sirf Instamojo API key, auth token aur webhook salt secrets me daalne honge — main phase 4 shuru karte waqt maangunga.

---

## Technical notes

- Auth: Supabase Auth (email/password + Google via Lovable broker). Roles already `user_roles` table me hain (`has_role` security-definer) — usi ko extend karenge, roles kabhi profile table me nahi.
- New tables (sab `public` schema, GRANTs + RLS ke saath): `plans`, `memberships`, `payments`, `book`, `book_chapters`, `reading_progress`. `pov_posts` me `min_tier` column add hoga. `profiles` already exists — reuse.
- RLS: profiles/memberships/reading_progress owner-scoped (`auth.uid()`); `plans` public read; `book_chapters` ka public policy sirf safe columns; full body sirf server function se tier check ke baad.
- Gating server-side: `createServerFn` + `requireSupabaseAuth`; ek SQL helper `user_tier_rank(uid)` jo tier compare karega. Locked content ka body kabhi client tak nahi jayega.
- `src/start.ts` me abhi `functionMiddleware` register nahi hai — authenticated server functions ke liye bearer attacher add karna hoga (existing `requestMiddleware` array preserve rahega).
- Protected pages `src/routes/_authenticated/` ke andar; public pages (`/pricing`, `/book`, `/pov`) top-level SSR par rahenge taaki share/SEO chale.
- Instamojo: server route under `/api/public/`, webhook par HMAC/salt verify, phir membership activate. Client se kabhi direct activation nahi.

## Abhi kya shuru kar raha hoon

Phase 1 — auth pages, profiles, session-aware header, account page, aur admin ka Users section. Uske baad phase 2 par badhenge.
