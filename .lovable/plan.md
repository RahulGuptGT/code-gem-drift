# Admin pages load nahi ho rahe — fix plan

## Kya hua (verified)

Do alag-alag bugs hain, dono confirm ho chuke hain:

**1. Realtime channel crash (aapko jo dikh raha hai)**
`/heena/admin/referrals` par error boundary aata hai:
`cannot add postgres_changes callbacks for realtime:referral-links-changes after subscribe()`.
Wajah: kayi admin components fixed channel naam use karte hain (`referral-links-changes`, `chat-sessions-changes`, etc.). React ke double-mount par wahi topic dobara khulta hai aur Supabase client purane subscribed channel par naya listener add karne ki koshish karta hai → exception → poora page crash.

Affected files: `ReferralLinksManagement.tsx`, `SupportChatManagement.tsx`, `PortfolioManagement.tsx`, `ContactManagement.tsx`, `ChatbotIndexingPanel.tsx`, aur public pages `ReferralLinks.tsx`, `FundRahul.tsx` (same pattern).

**2. Logged-out redirect loop**
Browser test me `/heena/admin/referrals` logged-out kholne par URL infinitely nest ho gaya
(`/heena?redirect=%2Fheena%3Fredirect%3D...` sau baar) aur console me "Maximum update depth exceeded".
Wajah: `AdminDashboard` har render par `pathname + search` ko redirect param bana ke `/heena` bhejta hai, aur wahi value dobara encode hoti rehti hai. Login ke baad redirect target bhi garbage ban jaata hai.

## Fix

1. **Realtime subscriptions safe banao** — har subscription ke liye unique channel topic (fixed naam + random suffix) aur cleanup me guaranteed `removeChannel`. Sabhi 7 files me same pattern lagega, taki koi bhi admin/public page double-mount par crash na ho.
2. **Redirect guard theek karo** — `AdminDashboard` me redirect target sirf tab banega jab pathname `/heena/admin` se shuru ho; nested/encoded redirect param dobara nahi jodi jayegi. Redirect render ke bajay ek hi baar chalega, isliye loop khatam.
3. **Verify** — Playwright se logged-out `/heena/admin/*` (clean `/heena` par ek hi redirect) aur logged-in session se `/heena/admin/referrals`, `/portfolio`, `/contacts`, `/apps`, `/pov`, `/settings` sections load + console clean check karunga.

## Technical notes

- Channel helper: `supabase.channel(`referral-links-${crypto.randomUUID()}`)`, cleanup me `supabase.removeChannel(channel)` — behavior same, sirf topic collision hatega.
- `AdminDashboard` guard: `const target = location.pathname.startsWith('/heena/admin') ? location.pathname + location.search : '/heena/admin'` aur `<Navigate>` ki jagah stable target.
- Sirf frontend files touch hongi; DB, RLS, policies me koi change nahi.
