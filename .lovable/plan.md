# Deep Audit — Report + Fix Plan

## Sabse badi baat: Portfolio, Referrals, POV aur Apps ka data visitors ko dikh hi nahi raha

Browser me pages khulte to hain, par data fetch fail ho raha hai:

```text
Error fetching portfolio: permission denied for function has_role
```

Anon (logged-out visitor) key se direct test:

| Table | Anon read |
|---|---|
| portfolio_items | permission denied for function has_role |
| referral_links | permission denied for function has_role |
| pov_posts | permission denied for function has_role |
| app_info | permission denied for function has_role |
| donations / short_urls / pov_comments | OK |

Wajah: pichhle security hardening me `has_role` se anon ka execute permission hata diya gaya tha. Lekin in tables par jo "Admins can manage/view" policies hain, woh `public` role (yaani anon bhi) par lagi hain aur `has_role(...)` call karti hain. Postgres har SELECT par woh policy evaluate karta hai → anon ke liye poora query fail.

Matlab abhi live site par Portfolio khaali, Referrals khaali, POV feed khaali. Ye #1 priority fix hai.

## Baaki audit results (sab theek)

- Build: `build OK` (2026-09-02T06:33Z). Typecheck clean.
- Sabhi 15 public + legal pages HTTP 200, har page par exactly 1 `<h1>`.
- `/app` → `/portfolio/apps` 307 redirect kaam kar raha hai.
- Unknown URL `/nonexistentpage123` → asli 404.
- 11 API endpoints: GET par saaf 405, POST par sahi 400/401 validation. Koi 500 nahi.
- Storage proxy (`/api/public/file/...`) 200.
- DB: 28 tables, analytics data aa raha hai (697 page views, 404 clicks, 388 sessions).
- Sirf ek harmless console warning har page par: ek third-party head/meta component purana React lifecycle use karta hai.

## Content gaps (data ki kami, code ki nahi)

- `app_info` = 0 rows → Apps section blank rahega data fix ke baad bhi.
- `portfolio_items` = 2, `referral_links` = 4, `pov_posts` = 5 — patla content.
- `contact_submissions` = 0 — contact form ka end-to-end test kabhi nahi hua.

## Fix plan

**Step 1 (critical) — Public data wapas chalu karo.**
Affected tables (`portfolio_items`, `referral_links`, `pov_posts`, `app_info`, aur baaki jitni bhi `has_role` wali policies `public` role par hain) ki admin policies ko `TO authenticated` par re-scope kar do. Isse anon kabhi `has_role` call hi nahi karega, public read policies normally chalengi, aur security posture bhi bani rahegi (anon ko `has_role` execute dobara dene ki zarurat nahi).

**Step 2 — Verify.**
Anon key se saari public tables ka read dobara test, aur browser me Portfolio / Referrals / POV / Apps kholkar confirm ki cards actually render ho rahe hain, console clean hai.

**Step 3 — Contact form end-to-end test.**
Form submit karke check karo ki row `contact_submissions` me aati hai; abhi 0 rows hain.

**Step 4 (aapke haath me) — Content.**
Admin panel se app entry add karo (APK + icon storage me pehle se hain), aur portfolio/referral/POV entries badhao.

**Step 5 (optional) — Auth hardening.**
Supabase Auth settings me leaked-password protection toggle on karo — last remaining linter warning.

## Technical notes

- Step 1 ek SQL migration hai: har affected policy ko `DROP POLICY` + `CREATE POLICY ... TO authenticated` ke saath dobara banana. Table data ya app code touch nahi hoga.
- Fallback agar kuch policy re-scope karna mushkil ho: `GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon;` — kaam kar dega par linter warning wapas aa jaayegi.
- Ye project external Supabase par hai, isliye migration Supabase SQL ke through apply hoga.
