# Workspace AI — Admin ka apna AI assistant

Admin panel ke andar ek naya section: **Workspace AI**. Yahan se aap chat karke apni poori website ke baare mein sawaal pooch sakte ho, aur aage chal ke bol ke ya likh ke content manage bhi kar sakte ho.

## Kya banega

### 1. Naya admin section
- Sidebar mein "TOOLS" group ke upar naya item: **Workspace AI** (`/heena/admin/ai`).
- Full-page chat layout: left mein purani chats ki list (naya chat, rename, delete), right mein chat window.
- Chat history browser mein save hogi (jaise abhi support chat mein hoti hai), taaki refresh par baat na khoye.

### 2. Input box ke controls
Chat box ke neeche ek row mein:
- **Mode dropdown** (hover/click par khulega) — teen options:
  - **Default (Auto)** — AI khud decide karega ki sirf jawab dena hai ya badlav karna hai.
  - **Ask** — sirf jawab dega, kuch bhi change nahi karega.
  - **Edit (Agent)** — badlav karne ke liye; kaam karke batayega kya kiya.
- **Model dropdown** — jo models site ke chatbot mein pehle se use ho rahe hain, wahi yahan chunne ko milenge (default wahi jo site ka default hai).
- **Attachment button** — image ya file attach karke bhej sakte ho.
- **Mic button** — bol ke likhwa sakte ho (Hindi/Hinglish/English), jo abhi support chat mein kaam karta hai wahi voice input.
- Send / Stop button, streaming jawab ke saath.

### 3. Website ki samajh (read)
Pehle din se AI ko site ka "read" access milega, taaki wo sach mein aapke data se jawab de:
- Posts (POV), book aur chapters, portfolio, referral links, short URLs, docs, apps
- Users, plans, memberships, payments (sirf sankhya/summary type jankari, poore card/secret kabhi nahi)
- Contact messages, analytics summary, site settings
Jaise: "is mahine kitne Signature members bane?", "kaun se POV posts locked hain?", "last 10 contact messages dikhao".

### 4. Kaam karne ki taakat (write) — agle step mein
Edit/Agent mode ke liye create, update aur delete tools diye jayenge (post banana/edit karna, chapter publish karna, referral link add karna, plan price badalna, message delete karna, etc.).
Safety default: **koi bhi badlav se pehle AI chat mein ek chhota confirm card dikhayega** — "yeh karne ja raha hoon, haan/na". Aap chaho to baad mein isse "auto-approve" par bhi kar sakte ho. Har badlav ka record ek activity log mein rahega taaki pata rahe kya-kya hua.

## Kaam ka kram

1. **Phase A (abhi)** — Admin section, chat UI (mode + model dropdown, attachment, mic), streaming jawab, chat history, aur poore site ka read access + activity log table.
2. **Phase B (iske baad)** — Write/update/delete tools with confirm cards, taaki sirf bol ke ya likh ke content manage ho sake.

## Technical notes

- Naya server route `src/routes/api/public/workspace-ai.ts` + `src/lib/edge/workspace-ai.server.ts`, admin-only: har request par Supabase bearer verify karke `has_role(uid,'admin')` check; bina admin ke 401. Route `/api/public/*` sirf isliye ki published site par auth wall na aaye — auth handler ke andar hoga.
- Model calls Lovable AI Gateway se, streaming (SSE) — default `google/gemini-3.7-flash`, dropdown mein site ke maujooda model chain ke options.
- Tool calling: read tools pehle round mein (`list_pov_posts`, `get_post`, `list_book_chapters`, `list_users_summary`, `list_payments_summary`, `list_contacts`, `get_analytics_summary`, `get_site_settings`, `search_content`). Sab queries service-role client se server par, admin verify hone ke baad; response se secrets/tokens strip.
- Naya table `public.ai_activity_log` (id, admin_user_id, mode, model, prompt, tool_name, tool_args, result_summary, created_at) — GRANTs + RLS: sirf admin select, insert service_role se.
- UI reuse: `Composer`-jaise component naya `src/components/admin/workspace-ai/` folder mein (Composer, ChatPanel, ThreadSidebar, ModePicker, ModelPicker), voice ke liye maujooda `useVoiceInput`, storage ke liye `supportChatStorage` jaisa alag `workspaceAiStorage.ts`.
- Routing: `AdminDashboard.tsx` ke `pathToSection` map mein `ai` entry + sidebar item.
