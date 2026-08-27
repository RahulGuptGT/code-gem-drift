# Public Site Split — Deep Audit + Cleanup Plan

## Verdict

Split largely successful. Frontend, DB schema, data aur backend functions sab port ho chuke hain aur chal rahe hain. Kuch genuine gaps hain — sabse bada **Storage buckets migrate nahi hue**. Neeche verified findings + cleanup plan hai.

## What is verified working

- Routes: `/`, `/about`, `/portfolio`, `/portfolio/:cat`, `/portfolio/all`, `/referrals(+/all,/:cat)`, `/pov(+/:cat)`, `/contact`, `/site-map`, `/fund-rahul`, all 5 `/legal/*`, `/heena`, `/heena/admin/*`, `/:code` — sab 200 return kar rahe hain, per-route SEO head set hai.
- Har `src/components/pages/*` file kisi na kisi route se referenced hai (koi page orphan nahi).
- Admin dashboard naye project me source ke barabar hai — same admin component imports, same sidebar items (personal sections hataye gaye the, wahi expected tha).
- 12 backend functions `/api/public/*` par live, sahi 400/401 validation de rahe hain. Koi bacha hua `supabase.functions.invoke` call nahi.
- Purane project id `ehbungchpezbznxyfqic` ka koi reference **code** me nahi bacha.
- 119 public tables + 236 RLS policies + 279 indexes + 8,242 rows + 5 auth users migrate ho chuke.
- Preview console me koi runtime error nahi (sirf harmless Lovable preview warning).

## Gaps found (fix karne layak)

### 1. Storage buckets migrate hi nahi hue (blocker)
Naye Supabase project me **0 buckets** hain. Purane project me 9 buckets, 116 objects:
`app-files(2)`, `portfolio-images(1)`, `personal-notes-media(90)`, `personal-audio(10)`, `youtube-payment-screenshots(12)`, `release-assets(1)`, + 3 khali.
Public site ke liye zaroori: `app-files`, `portfolio-images` (aur admin ke liye `youtube-payment-screenshots`).

Plan: buckets (public/private flags + policies) naye project me banao, phir Storage API se objects copy karo.

### 2. Purane project ke storage URLs data me pade hain
Naye DB rows me abhi bhi old-project URLs:
- `portfolio_items.image_url` — 1 row (live public page par dikhta hai)
- `site_indexed_content.content` — 2 rows (chatbot index)
- `workspace_ai_messages.parts/metadata` — 42 rows (personal, delete candidate)
- `personal_biography.audio_url` — 8 rows (personal, delete candidate)

Plan: buckets copy hone ke baad in URLs ko new project host par rewrite karna.

### 3. Missing route: `/app` → `/portfolio/apps` redirect
Source me `/app` aur `/app/*` `/portfolio/apps` par redirect karte the. Naye project me ye `/:code` URL-shortener catch-all me chala jata hai. Purane public link toot sakte hain.

### 4. `sitemap.xml` purane domain par point kar raha hai
Sab 24 URLs `https://rahulgupta3-71507-81862.lovable.app/...` — naye domain (`rahulgupta.online`) par update karna hoga. `robots.txt` bhi check karna.

### 5. `payments` table code me use ho raha, DB me hai hi nahi
`src/lib/edge/ramogu-chat.server.ts` `payments` table query karta hai — na naye, na purane project me ye table hai (purane me `donations` hai). Ye source ka pre-existing bug hai; chatbot ka wo branch silently fail karta hoga. Fix: `donations` par point karo ya wo block hatao.

### 6. Workspace AI feature mount hi nahi hui
`WorkspaceAIGlobalOverlay` source ke `App.tsx` me global mounted tha; naye `__root.tsx` me nahi hai. Iska pura island (10 components + `useWorkspaceAI` + `workspaceAiContext` + `dkCacheSync` + `useVoiceRecorder`) dead pada hai — lekin backend route `/api/public/workspace-ai-chat` port ho chuka hai. **Decision chahiye: mount karein ya poora island + route + tables hatayein?**

## Dead code / dead data (removal candidates)

**Dead components (0 imports, source me bhi dead the):**
`admin/DashboardSection.tsx`, `admin/NotebookLMManagement.tsx`, `admin/SettingsManagement.tsx` (live wala `SiteSettingsManagement.tsx` hai), `admin/WebsiteAnalytics.tsx`, `admin/YouTubeSubscriptionManagement.tsx`, `hooks/useActiveNote.tsx`

**Dead Workspace AI island (agar mount nahi karna):**
`components/workspace-ai/*` (10 files), `hooks/useWorkspaceAI.ts`, `lib/workspaceAiContext.ts`, `lib/dkCacheSync.ts`, `assets/workspace-ai-logo.png`, `components/ui/sidebar.tsx` + `hooks/use-mobile.tsx` (sirf sidebar use karta hai)

**Unused shadcn primitives (27):** accordion, aspect-ratio, avatar, breadcrumb, calendar, carousel, chart, collapsible, combobox, command, context-menu, drawer, form, hover-card, input-otp, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, separator, slider, toggle, toggle-group, sidebar

**Unused deps:** `@hookform/resolvers` (+ `react-hook-form` agar `ui/form.tsx` hata), `@types/react-helmet` (verify pehle)

**Dead DB tables — 66 tables, ~2,110 rows** jinhe koi code touch nahi karta. Ye purane personal workspace ke hain: `personal_*`, `workspace_*`, `notepad_chat_*`, `heena_*`, `binod_*`, `kodu_*`, `distrokid_*` / `dk_*`, `db_ai_*`, `database_*`, `bihar_acs` / `candidates` / `political_parties` / `results` / `predictions` / `ac_*` / `election_access_sessions`, `syllabus_*`, `trash_bin`, `result_leads`, `result_expectations`, `admin_chat_*`, `app_settings`, `ai_suggested_changes`.
Note: `personal_login_events(3072)` aur `workspace_ai_messages(755)` code me referenced hain (login-activity/AI), lekin agar wo features hata rahe hain to ye bhi jayengi.

## Proposed execution order

1. Storage buckets + objects migrate (public-critical buckets pehle), phir data me URL rewrite.
2. `/app` → `/portfolio/apps` redirect route add.
3. `sitemap.xml` + `robots.txt` naye domain par update.
4. `ramogu-chat` ka `payments` → `donations` fix.
5. Workspace AI par aapka decision — mount ya remove.
6. Dead code delete (components, shadcn primitives, deps) — build green rakhte hue batch me.
7. Dead DB tables drop — sirf aapke confirm karne ke baad, `pg_dump` backup lekar.

## Technical notes

- Audit method: import-graph BFS from `src/router.tsx`, `src/start.ts`, `src/server.ts`, `src/routes/**`, `src/styles.css` — 158/217 `src` files reachable.
- `react-router-dom` imports (~20 files) intentional hain: `vite.config.ts` unhe `src/lib/router-compat.tsx` shim par alias karta hai. Ye dead code nahi.
- `src/integrations/supabase/auth-attacher.ts`, `auth-middleware.ts`, `client.server.ts` abhi unused hain kyunki backend `invokeFn` + manual bearer use karta hai — inhe rakhna theek hai (future server fns ke liye), delete optional.
- Table usage `.from("...")` grep se nikala: 53 used vs 66 unused.
