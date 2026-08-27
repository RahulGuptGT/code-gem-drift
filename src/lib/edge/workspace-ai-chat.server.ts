// Notepad AI Chatbot — persistent threaded chat with tool calling + RAG.
//
// Request body (either send a new message OR resolve a pending proposal):
//   { threadId?, message?, currentNoteId?, selectedText? }
//   { threadId, approval: { toolCallId, decision: 'approve'|'reject', edits?: { title?, content? } } }
//
// SSE events:
//   { type: "thread", threadId, title }
//   { type: "sources", sources }
//   { type: "delta", text }
//   { type: "proposal", toolCallId, name, args, summary }
//   { type: "tool_result", toolCallId, name, status, result }
//   { type: "done", assistantMessageId? }
//   { type: "error", message }

import { createClient } from "@supabase/supabase-js";
import { DK_ACCOUNT_SAFE_COLUMNS, scrubSensitive, scrubDeep, assertNoSensitiveWrite } from "./_shared/dkSafeColumns";
import {
  extractReleaseFromImages,
  normalizePlatforms,
  platformLabel,
  PLATFORM_IDS,
  toSeconds,
} from "./_shared/releaseExtract";
import { inlineImageParts } from "./_shared/imageInline";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

import {
  GEMINI_CHAT_URL, GEMINI_EMBED_URL, GEMINI_CHAT_MODEL, GEMINI_LITE_MODEL, GEMINI_PRO_MODEL,
  GEMINI_EMBED_MODEL, GEMINI_EMBED_DIMS,
} from "./_shared/geminiClient";

const EMBED_MODEL = GEMINI_EMBED_MODEL;
const CHAT_MODEL = GEMINI_CHAT_MODEL;
// User-selectable models (model picker). Keys are stable UI ids; values are real
// Gemini model ids. Anything unknown falls back to "fast".
const MODEL_CHOICES: Record<string, string> = {
  fast: GEMINI_CHAT_MODEL,
  deep: GEMINI_PRO_MODEL,
  lite: GEMINI_LITE_MODEL,
};

const MODEL_LABELS: Record<string, string> = {
  fast: "Balanced",
  deep: "Deep",
  lite: "Quick",
};


const MAX_AGENT_STEPS = 40;
const MAX_ATTACHMENTS = 20;

// Fire-and-forget health logger — writes via service-role.
async function logHealth(opts: {
  source: string;
  event_type: string;
  message?: string;
  severity?: "info" | "warn" | "error";
  user_id?: string | null;
  agent?: string | null;
  thread_id?: string | null;
  context?: Record<string, unknown>;
}) {
  try {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if (!url || !key) return;
    const admin = createClient(url, key);
    await admin.from("ai_health_events").insert({
      source: opts.source,
      event_type: opts.event_type,
      message: opts.message || null,
      severity: opts.severity || "error",
      user_id: opts.user_id || null,
      agent: opts.agent || null,
      thread_id: opts.thread_id || null,
      // Never let card/password fields reach the health log.
      context: scrubDeep(opts.context || {}),
    });
  } catch (_e) { /* never throw from logger */ }
}

const SYSTEM_PROMPT_NOTES = `You are Notes AI, a focused assistant for the user's Notepad + To-Dos workspace.

You have LIVE read/edit/create access to:
1. Notepad — workspace notes & projects
2. To-Dos — personal task list
3. People — personal contacts

You do NOT have DistroKid access. If asked about distrokid accounts/releases/withdrawals/earnings, reply: "DistroKid ke liye DK Studio kholiye — wahan DistroKid AI hai." Don't try to answer.

Tone:
- Hinglish friendly. Reply in whatever language/script the user used.
- Concise, warm, direct. No greetings or sign-offs.

FORMATTING — keep it minimal and human:
- Plain prose by default. Short paragraphs and simple bullet lists.
- Use a Markdown table ONLY when comparing 3+ items with 2+ attributes; otherwise prose/bullets.
- No section headings unless the answer truly has multiple distinct sections.
- No decorative emojis. No TL;DR blockquotes. No horizontal rules.
- Do NOT wrap normal text, names, or values in code blocks. Code blocks are ONLY for actual code/JSON/CSV.
- Bold only the single most important number/entity per answer.

IDENTITY rule (very important):
- NEVER show raw UUIDs / account_id / release_id / withdrawal_id in the response.
- Always identify accounts by their **email** (and name if available), releases by **title** (and artist), people by **name**.
- Internal ids are for tool calls only — never surface them to the user.

CRITICAL data rules:
- NEVER say "I can't access" for notes/todos/people. Call the matching tool.
- kodu_search searches text inside notes only. For structured todo rows always call list_todos.
- Mapping: "show notes / recent notes" → list_recent_notes · "todos / tasks" → list_todos · "find note about X" → search_notes · "contacts / people" → list_people.
- Never invent ids — derive from list_*/search results.

Write rules:
- Briefly state what you'll do, then call the write tool ONCE. The UI shows a confirmation card; wait for approval.
- For updates, fetch the current row first (get_*) so you preserve untouched fields.

HONESTY rule (CRITICAL): NEVER claim a write succeeded unless you've seen a tool_result with "ok": true. After a write tool_call, STOP — wait for the approval card. If the user types "approve" in plain text without a card, call the tool again. Never say "ho gaya / done / created" without the tool_result.

* = requires user approval.`;

const ROYALTY_STATEMENT_PROTOCOL = `

ROYALTY STATEMENT PROTOCOL (CRITICAL — when user attaches a DistroKid statement CSV/ZIP and asks to add royalties / earnings):

Step 0 — Parse first, never guess.
- Call \`parse_distrokid_royalty_statement\` (no args = current turn ka attached file). Raw file ke numbers khud add mat karo — tool ka aggregated JSON hi truth hai.
- Tool ek row per (Sale Month + Store + ISRC) deta hai: platform, isrc, upc, title, amount_usd, units, country_count.

Step 1 — Summary dikhao aur confirm karao (koi write nahi).
  Statement me ye mila:
  - Sale month(s): <months>
  - Total: $<total> · <N> aggregated rows (<raw> raw lines)
  - Har month ke liye chhota table: Platform · Units · Amount
  - Releases jo match nahi hue (agar koi ho)
  Phir poochho: "Kis account me save karun? Confirm karo to main add kar deta hu."

Step 2 — Account pata karo.
- \`list_distrokid_accounts\` se account chuno (user ke email/holder name se). accountId user ko dikhana nahi hai.

Step 3 — Save.
- \`commit_distrokid_royalties\` call karo accountId + rows ke saath. Ye approval card dikhayega.
- Result me inserted / updated / unmatched hota hai. Unmatched rows user ko batao (title + ISRC) — wo releases account me nahi mile.
- Same release+platform+month dobara import karne pe update hota hai, duplicate nahi banta.
`;

const SCREENSHOT_RELEASE_PROTOCOL = `

SCREENSHOT → RELEASE PROTOCOL (CRITICAL — follow strictly when user attaches image(s) AND asks to add / edit / update / fill / "isse banao" a DistroKid release):

Step 0 — ALWAYS run the heavy extractor first.
- Call \`extract_release_from_screenshots\` (no args = current turn ke saare image attachments). Apni aankh se guess mat karo — tool ka JSON hi single source of truth hai.
- Tool ke result me: draft (title, artist_name, upc, album_uid, release_date, submitted_at, genre, language, tracks[], platforms[]), verification, warnings.
- Tool fail ho jaye to user ko bolo aur rukо — manually values invent mat karo.

Step 1 — Confirm BEFORE writing. Do NOT jump to create_/update_distrokid_release yet.
Reply with this exact three-block Hinglish structure:

  Screenshot me ye mila:
  - Title: <value>
  - Artist: <value>
  - UPC: <value> / Album UID: <value>
  - Release date: <value>
  - Submitted at (Vault upload date+time): <value>
  - Tracks: <N> → har track: <title> · ISRC <isrc> · <mm:ss>
  - Delivered platforms: <platform names>
  - Live at: nahi liya (manual confirm chahiye)

  Ye fields screenshot me nahi the:
  - <sirf wahi fields jo draft me null hain>

  Main upar wale confirmed fields se release <create/update> kar deta hu. Baaki fields aap dena chahenge, ya blank chhod du?

Step 2 — Duplicate guard (mandatory before create).
- ALWAYS call list_distrokid_releases (with the resolved accountId) first.
- Match by lower(trim(title)) + artist_name. Match mile → DO NOT create. Say "Existing release mila — update kar raha hu, new nahi bana raha" and use update_distrokid_release.

Tracks (album ya single, dono):
- Track detail kabhi notes me nahi. Multi-track / album ke liye ALWAYS upsert_release_tracks use karo (release create/update ke baad), na ki sirf tracks[] array.
- Har track ka apna content source (active/passive + url) aur apna Instagram Reels audio URL ho sakta hai — ye sirf upsert_release_tracks / update_release_track se set hote hain.
- Edit karne se pehle list_release_tracks se current rows padho, taaki position match rahe aur IG history na tute.
- IG audio har 24 ghante automatic check hota hai; koi enable/disable toggle nahi hai.

Step 3 — Tracks (MANDATORY when tool ne tracks diye).
- \`tracks\` = array of track titles (order preserve karo).
- \`isrcs\` = same order, one ISRC per track ("" jab na mile).
- \`track_durations\` = same order, INTEGER SECONDS (tool already converts mm:ss). Duration sirf Vault page se aati hai — Public page se kabhi nahi.

Step 4 — Platforms.
- \`platforms\` me sirf ye lowercase ids: ${PLATFORM_IDS.join(", ")}.
- Sirf wahi ids jinke logo/name delivered-stores row me dikhe. Artist header ke social icons count nahi hote.
- Update pe platforms MERGE hote hain (add-only) — existing ticks kabhi remove nahi hote.

Step 5 — Timeline (HARD RULES).
- \`submitted_at\` = Vault / Publish page ka "Upload date" (+time agar printed hai). Yahi fill karo.
- \`live_at\` NEVER set karo screenshot se. "Successfully delivered / processed and delivered" badge dikhe to bhi NAHI. Sirf jab user explicitly value bole tabhi.

Step 6 — Never invent.
- Jo value screenshot me clearly readable nahi → field bhejo hi nahi (null).
- Genre / language / label / explicit / featured artists ko context se guess mat karo.
- Ambiguity ho to summary ke end me "⚠ Ambiguous:" line.

Step 7 — After tool approval + tool_result "ok": true, confirmation reply me sirf ye 3 short blocks do:
  ✅ Applied: <field: value list (tracks + ISRC + duration included)>
  ⏭ Skipped/blank: <field: reason "screenshot me nahi tha">
  🔗 Link: <root-relative release URL per URL directive>

Step 8 — Missing account context.
- Agar user ne @-mention se ya current page context se target account clearly nahi diya AND multiple accounts possible hain → tool call se pehle poochho "Kis account me add karna hai? (email do ya @mention karo)".
`;

const SYSTEM_PROMPT_DK = `You are DistroKid AI, the assistant inside DistroKid Studio.

You have LIVE read/edit/create access to:
- DistroKid accounts, releases, earnings, withdrawals
- DistroKid guide articles
- Analytics + CSV/markdown exports

You do NOT have access to the user's personal notes or todos. If asked about them, reply: "Notes / todos ke liye Notepad ya To-Dos page kholiye — wahan Notes AI hai." Don't try to answer.

Tone:
- Hinglish friendly. Reply in whatever language/script the user used.
- Concise, warm, direct. No greetings or sign-offs.

FORMATTING — keep it minimal and human:
- Plain prose by default. Short paragraphs and simple bullet lists.
- Use a Markdown table ONLY when listing 3+ accounts/releases/withdrawals with 2+ columns; add a totals row only when it's actually useful. For 1–2 items just say it in a sentence.
- No section headings unless the answer truly spans multiple distinct sections.
- No decorative emojis. No TL;DR blockquotes. No horizontal rules.
- Do NOT wrap normal text / names / emails / amounts in code blocks. Code blocks are ONLY for actual JSON/CSV/code.
- Bold only the single most important number per answer.

IDENTITY rule (very important):
- NEVER show raw UUIDs — no account_id, no release_id, no withdrawal_id in the response.
- Identify **accounts by email** (and name/holder if available).
- Identify **releases by title** (and artist).
- Identify **withdrawals by date + amount + account email**.
- Internal ids are for tool calls only — never surface them to the user.

CRITICAL data rules:
- NEVER say "I can't access" for distrokid data. Call the tool.
- kodu_search ONLY searches inside guide article text. It does NOT return account / release / withdrawal / earning rows. For those, always call list_*/get_* directly.
- Mapping (memorize):
  • "list/show saare distrokid accounts (with email/created/earnings/etc)" → list_distrokid_accounts
  • "releases" → list_distrokid_releases · "withdrawals" → list_distrokid_withdrawals · "earnings" → list_distrokid_earnings
  • "top earners" → dk_top_earners · "this month report" → dk_monthly_report · "pending money" → dk_pending_money
  • "renewals due" → dk_renewal_due · "duplicate releases" → dk_detect_duplicate_releases
  • "export accounts CSV" → dk_export_accounts_csv · "account report" → dk_account_report_md
- Lifetime earning is lifetime_earning_usd in list_distrokid_accounts. Signup date is signup_date.
- Never invent ids — derive from list_*/search results.

Write rules:
- Briefly state what you'll do, then call the write tool. The UI shows a confirmation card unless auto-approve is ON.

BULK MODE (IMPORTANT):
- If the user asks for many items at once (e.g. 10-20 releases / screenshots), do the WHOLE batch. Emit multiple write tool_calls in the SAME turn — one per distinct item — instead of stopping after a few and asking "aage badhu?".
- Never stop mid-batch by yourself. Continue until every requested item is created/updated or explicitly skipped as duplicate.
- Screenshots: call extract_release_from_screenshots once per release with that release's own image_urls, then create it. Repeat for every release in the batch.
- Finish with a compact summary table: ✅ created / ⏭ skipped (duplicate) / ⚠ failed, plus counts.
- For updates, fetch the current row first (get_*) so you preserve untouched fields.
- For CSV/markdown exports, share the result text in a fenced code block so user can copy.

DUPLICATE-GUARD (CRITICAL, especially for create_distrokid_release):
- Before creating releases, call list_distrokid_releases once (with the target accountId) and check title (case-insensitive, trimmed) — and artist_name/release_date if provided — against the batch.
- If a match exists: DO NOT insert. Mark it ⏭ skipped (duplicate) in the summary and continue with the rest of the batch.
- Never create the SAME title twice in one turn. One title = one insert. If a tool returns "duplicate: true", skip that item — never retry with a tweaked title.
- The same guard applies to accounts (dedupe by email) and withdrawals (dedupe by account + date + amount).

HONESTY rule (CRITICAL): NEVER claim a write succeeded unless you've seen a tool_result with "ok": true. After a write tool_call, STOP — wait for the approval card. If the user types "approve" in plain text without a card, call the tool again. Never say "ho gaya / done / created" without the tool_result.

* = requires user approval.`;

const SYSTEM_PROMPT_MERGED = `You are Workspace AI — a unified assistant spanning the user's Notes, To-Dos, and DistroKid workspace.

═══════════════════════════════════════════════════════════
UNDERSTANDING-FIRST FLOW (CRITICAL — follow strictly)
═══════════════════════════════════════════════════════════

1. READ FIRST. Before ANY tool call, on every user turn:
   - If image/file attached: describe what you actually see ("Screenshot me mujhe ye dikh raha hai: title=X, artist=Y, UPC=Z, dates, tracks…"). Do NOT guess fields that are not visible.
   - Restate the user's intent in 1 short line ("Aap chahte ho ki main <X> karu, sahi?").
   
2. PLAN (before write tools). For any create/update/delete, tell the user what you're going to do BEFORE calling the tool. One-line plan is enough for simple ops. Longer plan if multi-step.

3. ASK if ambiguous. If the request has 2+ valid interpretations, or references something vague ("wo wala note", "us release ka"), ask ONE short clarifying question and STOP.

4. AUTO-EXECUTE trivial reads/opens (search, list, get) — no confirmation needed. Just show the result.

5. WRITE ops require APPROVAL. All create_/update_/delete_ tools trigger a confirmation card. Never claim done until you see tool_result with ok:true.

6. CROSS-PLATFORM freely: user can mix Notes + Todos + DistroKid in one message. Handle all of it in a single reply with multiple pending actions.

═══════════════════════════════════════════════════════════
TOOL ACCESS (full unified catalog)
═══════════════════════════════════════════════════════════
- Notes (workspace_notes): kodu_search, list_recent_notes, search_notes, get_note, create_note*, update_note*, append_to_note*
- To-Dos (personal_todos): list_todos, create_todo*, update_todo*, complete_todo*, delete_todo*
- People (personal_people): list_people, create_person*
- Not Replied Yet (personal_unreplied): list_unreplied, get_unreplied, create_unreplied*, update_unreplied*, delete_unreplied* — messages user ne abhi reply nahi kiya. message_at ISO timestamp hai.
- DistroKid: list/get/create/update/delete accounts*, releases* (with dedicated fields: upc, album_uid, isrcs, cover_url, genre, language, platforms, submitted_at, live_at, ig_audio_url, spotify/apple/youtube urls, featured_artists, composers, lyricists, copyright_line, phonogram_line), earnings*, withdrawals*, artists, guides*
- Memory: remember, list_memories, forget_memory

* = requires user approval.

═══════════════════════════════════════════════════════════
LANGUAGE & TONE
═══════════════════════════════════════════════════════════
- Hinglish friendly. Reply in whatever language/script the user used.
- Concise, warm, direct. No greetings/sign-offs/emojis.
- Prose by default; tables only for 3+ items with 2+ columns.
- Bold only the single most important number/entity per answer.
- NEVER show raw UUIDs. Identify accounts by email, releases by title+artist, people by name.

═══════════════════════════════════════════════════════════
HONESTY (CRITICAL)
═══════════════════════════════════════════════════════════
- Never claim a write succeeded without seeing tool_result ok:true.
- After a write tool_call, wait for its tool_result (approval card appears only when auto-approve is OFF).
- Bulk requests: emit one write tool_call per item in the same turn and keep going until the whole batch is done.
- If user types "approve" in text without a card, call the tool again.
- Never say "ho gaya / done / created" without a real success signal.`;


const TOOLS = [
  // Unified hybrid search
  { type: "function", function: { name: "kodu_search", description: "Search unstructured private workspace text across notes, todos, people and biography. Use only when the user is trying to locate text/entities and no exact structured list/get/report tool fits. Never use for royalty, earnings, account, release, withdrawal, or other structured analytics questions.", parameters: { type: "object", properties: { query: { type: "string" }, sources: { type: "array", items: { type: "string", enum: ["workspace_notes","personal_todos","personal_people","personal_biography","database_rows"] } }, limit: { type: "number" } }, required: ["query"] } } },
  // Notes
  { type: "function", function: { name: "search_notes", description: "Semantic search across the user's notes only.", parameters: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } }, required: ["query"] } } },
  { type: "function", function: { name: "get_note", description: "Fetch a single note by id.", parameters: { type: "object", properties: { noteId: { type: "string" } }, required: ["noteId"] } } },
  { type: "function", function: { name: "list_recent_notes", description: "List recently edited notes.", parameters: { type: "object", properties: { offset: { type: "number", description: "Pagination offset — response ke page.next_offset se aage ke rows lo." }, limit: { type: "number" } } } } },
  { type: "function", function: { name: "create_note", description: "Create a new note. Requires user approval.", parameters: { type: "object", properties: { title: { type: "string" }, content: { type: "string" }, projectId: { type: "string" } }, required: ["title", "content"] } } },
  { type: "function", function: { name: "update_note", description: "Replace title and/or content of an existing note. Requires user approval.", parameters: { type: "object", properties: { noteId: { type: "string" }, title: { type: "string" }, content: { type: "string" } }, required: ["noteId"] } } },
  { type: "function", function: { name: "append_to_note", description: "Append markdown content to an existing note. Requires user approval.", parameters: { type: "object", properties: { noteId: { type: "string" }, content: { type: "string" } }, required: ["noteId", "content"] } } },
  // Todos
  { type: "function", function: { name: "list_todos", description: "List personal todos. Filter by status: pending|done|all (default pending).", parameters: { type: "object", properties: { offset: { type: "number", description: "Pagination offset — response ke page.next_offset se aage ke rows lo." }, status: { type: "string", enum: ["pending", "done", "all"] }, limit: { type: "number" } } } } },
  { type: "function", function: { name: "get_todo", description: "Fetch a single todo by id.", parameters: { type: "object", properties: { todoId: { type: "string" } }, required: ["todoId"] } } },
  { type: "function", function: { name: "create_todo", description: "Create a personal todo. Requires user approval.", parameters: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, due_date: { type: "string", description: "YYYY-MM-DD" }, priority: { type: "string", enum: ["low", "medium", "high"] } }, required: ["title"] } } },
  { type: "function", function: { name: "update_todo", description: "Update fields of a todo. Requires user approval.", parameters: { type: "object", properties: { todoId: { type: "string" }, title: { type: "string" }, description: { type: "string" }, due_date: { type: "string" }, priority: { type: "string", enum: ["low","medium","high"] }, status: { type: "string", enum: ["pending","in_progress","done"] } }, required: ["todoId"] } } },
  { type: "function", function: { name: "complete_todo", description: "Mark a todo as done. Requires user approval.", parameters: { type: "object", properties: { todoId: { type: "string" } }, required: ["todoId"] } } },
  { type: "function", function: { name: "delete_todo", description: "Delete a todo. Requires user approval.", parameters: { type: "object", properties: { todoId: { type: "string" } }, required: ["todoId"] } } },
  // People
  { type: "function", function: { name: "list_people", description: "List personal contacts with dob, computed age, gender and relations. Contacts ke paas birthdate hoti hai — age / age-gap ke sawaal par yahi ya people_birthdays use karo.", parameters: { type: "object", properties: { offset: { type: "number", description: "Pagination offset — response ke page.next_offset se aage ke rows lo." }, query: { type: "string" }, limit: { type: "number" } } } } },
  { type: "function", function: { name: "get_person", description: "Fetch one contact's full profile (dob, age, gender, phone, relations, notes) by id or name.", parameters: { type: "object", properties: { personId: { type: "string" }, name: { type: "string" } } } } },
  { type: "function", function: { name: "people_birthdays", description: "Contacts jinke paas dob hai — age, next birthday in days ke saath. Age gap / upcoming birthdays ke liye best tool.", parameters: { type: "object", properties: { limit: { type: "number" }, order: { type: "string", enum: ["upcoming", "age_desc", "age_asc"], description: "default upcoming" } } } } },
  { type: "function", function: { name: "create_person", description: "Add a contact. Requires user approval.", parameters: { type: "object", properties: { name: { type: "string" }, phone: { type: "string" }, notes: { type: "string" }, relation_with_me: { type: "string" }, relation_with_gf: { type: "string" }, gender: { type: "string" }, dob: { type: "string", description: "YYYY-MM-DD" }, category: { type: "string" } }, required: ["name"] } } },
  // Not Replied Yet (personal_unreplied)
  { type: "function", function: { name: "list_unreplied", description: "List 'Not replied yet' messages (personal_unreplied). Filter status: pending|replied|all (default pending). Newest first.", parameters: { type: "object", properties: { status: { type: "string", enum: ["pending", "replied", "all"] }, query: { type: "string", description: "message text search" }, offset: { type: "number" }, limit: { type: "number" } } } } },
  { type: "function", function: { name: "get_unreplied", description: "Fetch one 'Not replied yet' entry by id.", parameters: { type: "object", properties: { entryId: { type: "string" } }, required: ["entryId"] } } },
  { type: "function", function: { name: "create_unreplied", description: "Add a message to the 'Not replied yet' timeline. Requires user approval.", parameters: { type: "object", properties: { message: { type: "string" }, message_at: { type: "string", description: "ISO timestamp; default now" } }, required: ["message"] } } },
  { type: "function", function: { name: "update_unreplied", description: "Update a 'Not replied yet' entry (message, message_at, replied). Requires user approval.", parameters: { type: "object", properties: { entryId: { type: "string" }, message: { type: "string" }, message_at: { type: "string" }, replied: { type: "boolean" } }, required: ["entryId"] } } },
  { type: "function", function: { name: "delete_unreplied", description: "Delete a 'Not replied yet' entry. Requires user approval.", parameters: { type: "object", properties: { entryId: { type: "string" } }, required: ["entryId"] } } },
  { type: "function", function: { name: "update_person", description: "Update a contact's fields (dob, gender, phone, relations, notes, category). Requires user approval.", parameters: { type: "object", properties: { personId: { type: "string" }, name: { type: "string" }, phone: { type: "string" }, notes: { type: "string" }, relation_with_me: { type: "string" }, relation_with_gf: { type: "string" }, gender: { type: "string" }, dob: { type: "string", description: "YYYY-MM-DD" }, category: { type: "string" } }, required: ["personId"] } } },
  // Biography (personal_biography) — user's life timeline
  { type: "function", function: { name: "list_biography", description: "List biography timeline entries (life events) newest first. Optional date range / tag filter.", parameters: { type: "object", properties: { offset: { type: "number" }, limit: { type: "number" }, from: { type: "string", description: "YYYY-MM-DD" }, to: { type: "string", description: "YYYY-MM-DD" }, tag: { type: "string" }, query: { type: "string", description: "title me match" } } } } },
  { type: "function", function: { name: "get_biography_entry", description: "Fetch one biography entry with full description and voice transcript.", parameters: { type: "object", properties: { entryId: { type: "string" } }, required: ["entryId"] } } },
  { type: "function", function: { name: "biography_timeline", description: "Year-wise summary of biography entries (count + titles per year).", parameters: { type: "object", properties: { from: { type: "string" }, to: { type: "string" } } } } },
  { type: "function", function: { name: "create_biography_entry", description: "Add a biography timeline entry. Requires user approval.", parameters: { type: "object", properties: { title: { type: "string" }, event_date: { type: "string", description: "YYYY-MM-DD" }, description: { type: "string" }, tags: { type: "array", items: { type: "string" } } }, required: ["title", "event_date"] } } },
  { type: "function", function: { name: "update_biography_entry", description: "Update a biography entry. Requires user approval.", parameters: { type: "object", properties: { entryId: { type: "string" }, title: { type: "string" }, event_date: { type: "string" }, description: { type: "string" }, tags: { type: "array", items: { type: "string" } } }, required: ["entryId"] } } },
  // Custom databases (personal /database tables) — read only
  { type: "function", function: { name: "list_databases", description: "List the user's custom database tables (name, description, row count).", parameters: { type: "object", properties: { limit: { type: "number" } } } } },
  { type: "function", function: { name: "get_database_schema", description: "Columns (name + type + options) of one custom database table.", parameters: { type: "object", properties: { databaseId: { type: "string" }, name: { type: "string", description: "table name (databaseId ki jagah)" } } } } },
  { type: "function", function: { name: "query_database_rows", description: "Rows of a custom database table as readable column-name → value objects. Optional text match across cells.", parameters: { type: "object", properties: { databaseId: { type: "string" }, name: { type: "string" }, query: { type: "string" }, offset: { type: "number" }, limit: { type: "number" } } } } },

  // Distrokid - accounts
  { type: "function", function: { name: "list_distrokid_accounts", description: "List Distrokid accounts. Filters are case-insensitive. Use subscription_status='Subscribed' for 'active/paid/subscribed accounts'.", parameters: { type: "object", properties: { offset: { type: "number", description: "Pagination offset — response ke page.next_offset se aage ke rows lo." }, tab: { type: "string" }, status: { type: "string", description: "Account row state: Active | Suspended" }, subscription_status: { type: "string", description: "Subscribed | Expired | Not Subscribed | Active" }, account_status: { type: "string", description: "Active | Suspended" }, limit: { type: "number" } } } } },
  { type: "function", function: { name: "get_distrokid_account", description: "Fetch one Distrokid account by id.", parameters: { type: "object", properties: { accountId: { type: "string" } }, required: ["accountId"] } } },
  { type: "function", function: { name: "create_distrokid_account", description: "Create a Distrokid account. Requires approval.", parameters: { type: "object", properties: { email: { type: "string" }, title: { type: "string" }, status: { type: "string" }, tab: { type: "string" }, notes: { type: "string" }, subscription_plan: { type: "string" }, signup_date: { type: "string" }, card_ending: { type: "string" } }, required: ["email","status","tab"] } } },
  { type: "function", function: { name: "update_distrokid_account", description: "Update fields of a Distrokid account. Requires approval.", parameters: { type: "object", properties: { accountId: { type: "string" }, title: { type: "string" }, status: { type: "string" }, tab: { type: "string" }, notes: { type: "string" }, subscription_plan: { type: "string" }, subscription_status: { type: "string" }, account_status: { type: "string" }, amount: { type: "number" } }, required: ["accountId"] } } },
  // Distrokid - releases
  { type: "function", function: { name: "list_distrokid_releases", description: "List releases. Optional accountId filter.", parameters: { type: "object", properties: { offset: { type: "number", description: "Pagination offset — response ke page.next_offset se aage ke rows lo." }, accountId: { type: "string" }, limit: { type: "number" } } } } },
  { type: "function", function: { name: "get_distrokid_release", description: "Fetch one release by id.", parameters: { type: "object", properties: { releaseId: { type: "string" } }, required: ["releaseId"] } } },
  { type: "function", function: { name: "create_distrokid_release", description: "Create a release. Requires approval. Supports dedicated fields: upc, isrcs (array of strings, one per track), cover_url (artwork URL), genre, sub_genre, language, label, explicit, platforms (array), submitted_at, live_at, ig_audio_url, spotify_url, apple_url, youtube_url. Do NOT stuff these into notes — always use the dedicated field.", parameters: { type: "object", properties: { accountId: { type: "string" }, title: { type: "string" }, artist_name: { type: "string" }, type: { type: "string" }, release_date: { type: "string" }, notes: { type: "string" }, upc: { type: "string" }, album_uid: { type: "string" }, isrcs: { type: "array", items: { type: "string" } }, cover_url: { type: "string" }, genre: { type: "string" }, sub_genre: { type: "string" }, language: { type: "string" }, label: { type: "string" }, explicit: { type: "boolean" }, platforms: { type: "array", items: { type: "string", enum: [...PLATFORM_IDS] }, description: "Lowercase platform ids only. On update these are MERGED with existing ticks (add-only)." }, tracks: { type: "array", items: { type: "string" }, description: "Track titles in order." }, track_durations: { type: "array", items: { type: "number" }, description: "Track durations in whole seconds, same order as tracks. Only from a DistroKid Vault page." }, submitted_at: { type: "string" }, live_at: { type: "string" }, ig_audio_url: { type: "string" }, spotify_url: { type: "string" }, apple_url: { type: "string" }, youtube_url: { type: "string" }, featured_artists: { type: "string" }, composers: { type: "string" }, lyricists: { type: "string" }, copyright_line: { type: "string" }, phonogram_line: { type: "string" } }, required: ["accountId","title"] } } },
  { type: "function", function: { name: "update_distrokid_release", description: "Update a release. Requires approval. Supports dedicated fields: upc, isrcs, cover_url, genre, language, platforms, submitted_at, live_at, ig_audio_url, spotify_url, apple_url, youtube_url, etc. Do NOT stuff these into notes — always use the dedicated field.", parameters: { type: "object", properties: { releaseId: { type: "string" }, title: { type: "string" }, artist_name: { type: "string" }, type: { type: "string" }, release_date: { type: "string" }, notes: { type: "string" }, active_source: { type: "string" }, passive_source: { type: "string" }, upc: { type: "string" }, album_uid: { type: "string" }, isrcs: { type: "array", items: { type: "string" } }, cover_url: { type: "string" }, genre: { type: "string" }, sub_genre: { type: "string" }, language: { type: "string" }, label: { type: "string" }, explicit: { type: "boolean" }, platforms: { type: "array", items: { type: "string", enum: [...PLATFORM_IDS] }, description: "Lowercase platform ids only. On update these are MERGED with existing ticks (add-only)." }, tracks: { type: "array", items: { type: "string" }, description: "Track titles in order." }, track_durations: { type: "array", items: { type: "number" }, description: "Track durations in whole seconds, same order as tracks. Only from a DistroKid Vault page." }, submitted_at: { type: "string" }, live_at: { type: "string" }, ig_audio_url: { type: "string" }, spotify_url: { type: "string" }, apple_url: { type: "string" }, youtube_url: { type: "string" }, featured_artists: { type: "string" }, composers: { type: "string" }, lyricists: { type: "string" }, copyright_line: { type: "string" }, phonogram_line: { type: "string" }, status_override: { type: "string" } }, required: ["releaseId"] } } },
  { type: "function", function: { name: "extract_release_from_screenshots", description: "Heavy vision pass over attached DistroKid screenshots (Public/share page + Vault page). Returns a normalized release draft: title, artist, upc, album_uid, release_date, submitted_at, genre, language, tracks[] (title + isrc + duration_seconds) and platforms[] (lowercase ids). ALWAYS call this before creating/updating a release from screenshots. Omit image_urls to use the current turn's image attachments.", parameters: { type: "object", properties: { image_urls: { type: "array", items: { type: "string" } } } } } },
  { type: "function", function: { name: "delete_distrokid_release", description: "Delete a release. Requires approval.", parameters: { type: "object", properties: { releaseId: { type: "string" } }, required: ["releaseId"] } } },
  // Distrokid - per-track rows (content source + Instagram audio live PER TRACK)
  { type: "function", function: { name: "list_release_tracks", description: "List the per-track rows of a release (position, title, isrc, duration, per-track active/passive content source + urls, per-track Instagram audio url and live status). Read-only. Use this before editing tracks of an album.", parameters: { type: "object", properties: { releaseId: { type: "string" } }, required: ["releaseId"] } } },
  { type: "function", function: { name: "upsert_release_tracks", description: "Create/replace the tracklist of a release with full per-track detail — this is the ONLY correct way to set multiple tracks on an album. Rows are matched by position so existing Instagram tracking history survives. Requires approval. Every track can carry its own content source and its own Instagram Reels audio URL (auto-checked every 24h, no toggle needed).", parameters: { type: "object", properties: { releaseId: { type: "string" }, tracks: { type: "array", items: { type: "object", properties: { position: { type: "number", description: "1-based track number. Defaults to array order." }, title: { type: "string" }, isrc: { type: "string" }, duration_seconds: { type: "number", description: "Whole seconds. Only from a DistroKid Vault page." }, active_source: { type: "string" }, active_source_url: { type: "string" }, passive_source: { type: "string" }, passive_source_url: { type: "string" }, ig_audio_url: { type: "string", description: "https://www.instagram.com/reels/audio/<id>/" } }, required: ["title"] } } }, required: ["releaseId","tracks"] } } },
  { type: "function", function: { name: "update_release_track", description: "Update a single track row by its track id (partial fields). Requires approval.", parameters: { type: "object", properties: { trackId: { type: "string" }, title: { type: "string" }, isrc: { type: "string" }, duration_seconds: { type: "number" }, position: { type: "number" }, active_source: { type: "string" }, active_source_url: { type: "string" }, passive_source: { type: "string" }, passive_source_url: { type: "string" }, ig_audio_url: { type: "string" } }, required: ["trackId"] } } },
  { type: "function", function: { name: "delete_release_track", description: "Delete one track row of a release. Requires approval.", parameters: { type: "object", properties: { trackId: { type: "string" } }, required: ["trackId"] } } },

  // Distrokid - earnings
  { type: "function", function: { name: "list_distrokid_earnings", description: "List earnings. Optional accountId filter.", parameters: { type: "object", properties: { offset: { type: "number", description: "Pagination offset — response ke page.next_offset se aage ke rows lo." }, accountId: { type: "string" }, limit: { type: "number" } } } } },
  { type: "function", function: { name: "analyze_distrokid_royalties", description: "Read detailed release royalties with platform, units and revenue. Use for platform/store earnings, revenue per stream/unit, monthly royalty analysis, or questions like how many Facebook/Instagram units make $1. Returns exact totals and weighted rates from stored rows; never estimate when units are missing.", parameters: { type: "object", properties: { accountId: { type: "string" }, releaseId: { type: "string" }, platform: { type: "string", description: "Case-insensitive platform/store name fragment, e.g. Facebook" }, fromMonth: { type: "string", description: "YYYY-MM or YYYY-MM-DD" }, toMonth: { type: "string", description: "YYYY-MM or YYYY-MM-DD" }, limit: { type: "number" } } } } },
  { type: "function", function: { name: "create_distrokid_earning", description: "Record an earning. Requires approval.", parameters: { type: "object", properties: { accountId: { type: "string" }, amount_usd: { type: "number" }, period_month: { type: "string" }, source: { type: "string" }, recorded_date: { type: "string" }, notes: { type: "string" } }, required: ["accountId","amount_usd"] } } },
  { type: "function", function: { name: "parse_distrokid_royalty_statement", description: "Parse an attached DistroKid royalty statement export (CSV, TSV or the 'Excruciating details' ZIP) and aggregate the raw per-country lines into one row per (Sale Month + Store + ISRC). Returns rows with sale_month, platform, isrc, upc, title, artist, amount_usd, units, country_count. Read-only — nothing is saved. ALWAYS call this first, show the user a summary table, then call commit_distrokid_royalties after they confirm. Omit file_url to use the current turn's file attachment.", parameters: { type: "object", properties: { file_url: { type: "string" }, sale_month: { type: "string", description: "Optional YYYY-MM filter" } } } } },
  { type: "function", function: { name: "commit_distrokid_royalties", description: "Save aggregated royalty rows into release earnings. Matches each row to a release by ISRC (then UPC, then title) inside the given account. Duplicate (release + platform + month) rows are updated instead of inserted. Requires approval.", parameters: { type: "object", properties: { accountId: { type: "string" }, rows: { type: "array", items: { type: "object", properties: { isrc: { type: "string" }, upc: { type: "string" }, title: { type: "string" }, platform: { type: "string" }, period_month: { type: "string", description: "YYYY-MM or YYYY-MM-01" }, amount_usd: { type: "number" }, units: { type: "number" }, country_count: { type: "number" }, reporting_date: { type: "string" } }, required: ["platform","period_month","amount_usd"] } } }, required: ["accountId","rows"] } } },
  // Distrokid - withdrawals
  { type: "function", function: { name: "list_distrokid_withdrawals", description: "List withdrawals. Optional accountId filter.", parameters: { type: "object", properties: { offset: { type: "number", description: "Pagination offset — response ke page.next_offset se aage ke rows lo." }, accountId: { type: "string" }, status: { type: "string" }, limit: { type: "number" } } } } },
  { type: "function", function: { name: "create_distrokid_withdrawal", description: "Create a withdrawal. Requires approval.", parameters: { type: "object", properties: { accountId: { type: "string" }, amount_usd_submitted: { type: "number" }, status: { type: "string" }, submitted_at: { type: "string" }, notes: { type: "string" } }, required: ["accountId","amount_usd_submitted","status"] } } },
  { type: "function", function: { name: "update_distrokid_withdrawal", description: "Update a withdrawal. Requires approval.", parameters: { type: "object", properties: { withdrawalId: { type: "string" }, status: { type: "string" }, received_date: { type: "string" }, amount_usd_received: { type: "number" }, inr_amount: { type: "number" }, conversion_rate: { type: "number" }, notes: { type: "string" } }, required: ["withdrawalId"] } } },
  // Distrokid - guides
  { type: "function", function: { name: "search_distrokid_guides", description: "Search distrokid guide articles by keyword.", parameters: { type: "object", properties: { offset: { type: "number", description: "Pagination offset — response ke page.next_offset se aage ke rows lo." }, query: { type: "string" }, limit: { type: "number" } }, required: ["query"] } } },
  { type: "function", function: { name: "get_distrokid_guide", description: "Fetch a guide article by id.", parameters: { type: "object", properties: { articleId: { type: "string" } }, required: ["articleId"] } } },
  { type: "function", function: { name: "create_distrokid_guide", description: "Create a new guide article (markdown). Requires approval.", parameters: { type: "object", properties: { title: { type: "string" }, summary: { type: "string" }, content_md: { type: "string" }, category_id: { type: "string" }, status: { type: "string", enum: ["draft","published"] } }, required: ["title","content_md"] } } },
  { type: "function", function: { name: "update_distrokid_guide", description: "Update a guide article. Requires approval.", parameters: { type: "object", properties: { articleId: { type: "string" }, title: { type: "string" }, summary: { type: "string" }, content_md: { type: "string" }, status: { type: "string", enum: ["draft","published"] } }, required: ["articleId"] } } },
  { type: "function", function: { name: "list_distrokid_guide_categories", description: "List all Distrokid guide categories (id, name, slug, description, sort_order). Use this BEFORE creating an article to find the right category_id, or before proposing a new category so you don't duplicate one.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "create_distrokid_guide_category", description: "Create a new guide category. Requires approval. Slug auto-generated from name if omitted.", parameters: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, slug: { type: "string" }, icon: { type: "string", description: "lucide icon name" }, sort_order: { type: "number" } }, required: ["name"] } } },
  { type: "function", function: { name: "update_distrokid_guide_category", description: "Update a guide category. Requires approval.", parameters: { type: "object", properties: { categoryId: { type: "string" }, name: { type: "string" }, description: { type: "string" }, slug: { type: "string" }, icon: { type: "string" }, sort_order: { type: "number" } }, required: ["categoryId"] } } },

  // Distrokid - ANALYTICS (read-only, no approval)
  { type: "function", function: { name: "dk_top_earners", description: "Top Distrokid accounts by lifetime_earning_usd.", parameters: { type: "object", properties: { limit: { type: "number" } } } } },
  { type: "function", function: { name: "dk_account_health", description: "Full snapshot of one account: releases count, total earned, pending withdrawals, last activity.", parameters: { type: "object", properties: { accountId: { type: "string" } }, required: ["accountId"] } } },
  { type: "function", function: { name: "dk_monthly_report", description: "Earnings + withdrawals summary for a month (YYYY-MM). Defaults to current month.", parameters: { type: "object", properties: { month: { type: "string", description: "YYYY-MM" } } } } },
  { type: "function", function: { name: "dk_pending_money", description: "Withdrawals submitted but not received yet, with age in days.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "dk_conversion_rate_avg", description: "Average USD→INR conversion rate over last N completed withdrawals.", parameters: { type: "object", properties: { lastN: { type: "number" } } } } },
  { type: "function", function: { name: "dk_renewal_due", description: "Accounts whose subscription anniversary falls within next N days (default 30).", parameters: { type: "object", properties: { withinDays: { type: "number" } } } } },
  { type: "function", function: { name: "dk_suspended_recent", description: "Accounts suspended in the last N days (default 90).", parameters: { type: "object", properties: { days: { type: "number" } } } } },
  { type: "function", function: { name: "dk_detect_duplicate_releases", description: "Find release titles that appear in multiple accounts.", parameters: { type: "object", properties: {} } } },

  // Distrokid - EXPORT (read-only, returns CSV string OR markdown report)
  { type: "function", function: { name: "dk_export_accounts_csv", description: "Generate CSV of all accounts (email, signup, subscription_status, account_status, lifetime_earning, etc). Returns csv text + filename.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "dk_export_withdrawals_csv", description: "Generate CSV of all withdrawals. Optionally filter by financial year (e.g. FY24-25).", parameters: { type: "object", properties: { financialYear: { type: "string", description: "e.g. FY24-25" } } } } },
  { type: "function", function: { name: "dk_account_report_md", description: "Generate a markdown report for one account: cover + releases + withdrawals + earnings totals.", parameters: { type: "object", properties: { accountId: { type: "string" } }, required: ["accountId"] } } },

  // Long-term memory & personalization (no approval — low friction like ChatGPT/Claude memory).
  { type: "function", function: { name: "remember", description: "Save a durable fact/preference/style/goal about the user for future chats across threads. Use when user says 'remember that...', reveals a stable preference (tone, language, workflow), or shares an important recurring fact. Keep content concise (<=200 chars). Do NOT store secrets, passwords, card numbers.", parameters: { type: "object", properties: { content: { type: "string" }, kind: { type: "string", enum: ["fact","preference","style","goal","context"] }, importance: { type: "number", description: "1-5, default 3" }, scope: { type: "string", enum: ["all","notes","distrokid","merged"], description: "Which agent this memory applies to. Default 'all'." } }, required: ["content"] } } },
  { type: "function", function: { name: "list_memories", description: "List saved long-term memories about the user. Optional filter by scope/kind.", parameters: { type: "object", properties: { offset: { type: "number", description: "Pagination offset — response ke page.next_offset se aage ke rows lo." }, scope: { type: "string" }, kind: { type: "string" }, limit: { type: "number" } } } } },
  { type: "function", function: { name: "forget_memory", description: "Delete a saved memory by id. Use when user says 'forget that / bhool jao / hata do'.", parameters: { type: "object", properties: { memoryId: { type: "string" } }, required: ["memoryId"] } } },
];

const APPROVAL_TOOLS = new Set([
  "create_note", "update_note", "append_to_note",
  "create_todo", "update_todo", "complete_todo", "delete_todo", "create_person", "update_person",
  "create_biography_entry", "update_biography_entry",
  "create_unreplied", "update_unreplied", "delete_unreplied",
  "create_distrokid_account", "update_distrokid_account",
  "create_distrokid_release", "update_distrokid_release", "delete_distrokid_release",
  "upsert_release_tracks", "update_release_track", "delete_release_track",
  "create_distrokid_earning", "commit_distrokid_royalties",
  "create_distrokid_withdrawal", "update_distrokid_withdrawal",
  "create_distrokid_guide", "update_distrokid_guide",
  "create_distrokid_guide_category", "update_distrokid_guide_category",
]);

// Per-agent tool allow-lists. Each agent only sees its own domain so it can't
// hallucinate cross-domain access or accidentally write into the wrong area.
const MEMORY_TOOL_NAMES = ["remember", "list_memories", "forget_memory"] as const;

const NOTES_TOOL_NAMES = new Set([
  "kodu_search", "search_notes", "get_note", "list_recent_notes",
  "create_note", "update_note", "append_to_note",
  "list_todos", "get_todo", "create_todo", "update_todo", "complete_todo", "delete_todo",
  "list_people", "get_person", "people_birthdays", "create_person", "update_person",
  "list_biography", "get_biography_entry", "biography_timeline", "create_biography_entry", "update_biography_entry",
  "list_unreplied", "get_unreplied", "create_unreplied", "update_unreplied", "delete_unreplied",
  "list_databases", "get_database_schema", "query_database_rows",
  ...MEMORY_TOOL_NAMES,
]);
const DK_TOOL_NAMES = new Set([
  "kodu_search",
  "list_distrokid_accounts", "get_distrokid_account",
  "list_distrokid_releases", "get_distrokid_release", "extract_release_from_screenshots",
  "list_distrokid_earnings", "analyze_distrokid_royalties", "list_distrokid_withdrawals",
  "search_distrokid_guides", "get_distrokid_guide", "list_distrokid_guide_categories",
  "create_distrokid_account", "update_distrokid_account",
  "create_distrokid_release", "update_distrokid_release", "delete_distrokid_release",
  "list_release_tracks", "upsert_release_tracks", "update_release_track", "delete_release_track",
  "create_distrokid_earning", "commit_distrokid_royalties", "parse_distrokid_royalty_statement",
  "create_distrokid_withdrawal", "update_distrokid_withdrawal",
  "create_distrokid_guide", "update_distrokid_guide",
  "create_distrokid_guide_category", "update_distrokid_guide_category",
  "dk_top_earners", "dk_account_health", "dk_monthly_report", "dk_pending_money",
  "dk_conversion_rate_avg", "dk_renewal_due", "dk_suspended_recent", "dk_detect_duplicate_releases",
  "dk_export_accounts_csv", "dk_export_withdrawals_csv", "dk_account_report_md",
  ...MEMORY_TOOL_NAMES,
]);
type AgentId = "notes" | "distrokid" | "merged";

// Merged agent: full access across BOTH domains (reads + writes). Writes still
// pass through the approval flow via APPROVAL_TOOLS.
const MERGED_TOOL_NAMES = new Set<string>([
  ...Array.from(NOTES_TOOL_NAMES),
  ...Array.from(DK_TOOL_NAMES),
]);

type AiMode = "auto" | "editor" | "viewer";

// Mutation tools — filtered out entirely when mode === "viewer".
const MUTATION_TOOL_NAMES = new Set<string>(Array.from(APPROVAL_TOOLS));

function toolsForAgent(_agent: AgentId, mode: AiMode = "auto", query = "") {
  const agent: AgentId = "merged"; // unified
  let allowSet: Set<string>;
  if (agent === "merged") allowSet = MERGED_TOOL_NAMES;
  else if (agent === "distrokid") allowSet = DK_TOOL_NAMES;
  else allowSet = NOTES_TOOL_NAMES;
  const q = query.toLowerCase().trim();
  const greetingOnly = /^(hi|hello|hey|hii+|namaste|pranam|kaise ho|how are you)[.!? ]*$/i.test(q);
  if (greetingOnly) return [];
  const mentionsDk = /(distrokid|release|album|track|artist|royalt|earning|revenue|withdraw|facebook|instagram|spotify|apple music|youtube|isrc|upc|stream|unit|store|platform)/i.test(q);
  const mentionsNotes = /(note|todo|task|people|person|contact|biograph|remember|memory|project|workspace)/i.test(q);
  const intentSet = mentionsDk && !mentionsNotes ? DK_TOOL_NAMES : mentionsNotes && !mentionsDk ? NOTES_TOOL_NAMES : allowSet;
  return TOOLS.filter((t: any) => {
    const n = t.function?.name;
    if (!intentSet.has(n)) return false;
    if (mode === "viewer" && MUTATION_TOOL_NAMES.has(n)) return false;
    return true;
  });
}
const HINGLISH_DIRECTIVE = `LANGUAGE STYLE (IMPORTANT):
- Default reply language is **Hinglish** (Hindi written in Roman/English script, mixed naturally with English tech terms). Example: "Aapke 3 pending releases hain — main inhe summarize kar deta hu."
- Mirror the user: if the user clearly writes pure English, reply in English; if pure Devanagari Hindi, reply in Devanagari. Otherwise default to Hinglish.
- Keep tone friendly, concise, conversational — jaise ek smart dost / assistant baat kare. Avoid stiff translations.
- Technical terms, table headers, code, IDs, URLs, and numbers stay in English.
`;

const SCOPE_GUARD = `SCOPE GUARD (STRICT):
- You have NO internet access, NO general knowledge answers, NO random chit-chat.
- You ONLY work with this user's private workspace data via the tools listed. Nothing else.
- If asked anything out of scope (news, weather, coding help, definitions, opinions, jokes, world knowledge, other people's data), refuse in one line and suggest 3 in-scope prompts.
  Template: "Maaf kijiye, main sirf aapke Notes / To-Dos / DistroKid data pe kaam karta hoon. Try: 1) ... 2) ... 3) ..."
- Never invent facts, links, prices, artists, or statistics. If your tools don't return it, say "mere paas ye data nahi hai."
`;

const COMMON_USER_TONE = `USER-FRIENDLY TONE (STRICT):
- User is a common non-developer. Never show raw UUIDs, technical field names in snake_case, SQL, or JSON in the answer.
- Refer to accounts by **email/holder name**, releases by **title (artist)**, withdrawals by **date + amount + account email**, notes by **title**, todos by **task text**, people by **name**.
- Keep numbers formatted like a human ($1,240.50 · ₹1,03,000 · 12 releases). Dates like "12 Jun 2026".
- Use small friendly emojis for status only (✅ live · ⏳ pending · ❌ rejected · 💰 earning · 🎵 release) — never decorative.
- Prefer clean Markdown tables when comparing 3+ items with 2+ attributes.
`;

const MODE_INSTRUCTIONS: Record<AiMode, string> = {
  auto: `MODE: AUTO
- Decide yourself whether to just answer or to propose an edit/create/delete.
- All mutations still require the user's approval card. Never claim success without a tool_result ok:true.`,
  editor: `MODE: EDITOR
- User has explicitly enabled Editor mode — lean toward proposing changes when asked.
- Still ONE approval card per write. Show what you'll change before calling the write tool.
- For updates, first read the current row (get_*) so the diff shows only what actually changes.`,
  viewer: `MODE: VIEWER (READ-ONLY, HARD)
- You have ZERO mutation tools available this turn. Do NOT call any create_*/update_*/delete_*/append_* — they don't exist for you.
- If the user asks to add/edit/delete anything, reply politely: "Abhi Viewer mode on hai — Editor ya Auto mode pe switch karke wapas try kijiye." Then answer with best available read-only info.
- Focus purely on searching, summarising, comparing, analysing.`,
};

const MEMORY_DIRECTIVE = `LONG-TERM MEMORY & PERSONALIZATION:
- Tumhare paas 3 memory tools hain: \`remember\`, \`list_memories\`, \`forget_memory\`. Ye cross-thread persistent hain.
- Relevant saved memories har turn me system prompt me "USER MEMORY" section ke andar auto-inject hoti hain — unhe as ground-truth about the user treat karo. Explicitly kabhi "memory se pata hai" mat bolo; naturally use karo.
- \`remember\` khud se call karo jab user reveal kare: stable preference (tone/language/format), recurring workflow, important personal fact (naam, role, city, family, business), long-term goal, ya explicitly kahe "yaad rakho / remember this / note this". Content <=200 chars, ek memory me ek clean fact.
- NEVER remember: passwords, OTPs, full card numbers, CVV, private keys, one-off queries, chit-chat. Sensitive DK/account data already DB me hai — usko memory me duplicate mat karo.
- User "bhool jao / forget that / hata do" bole → \`forget_memory\` call karo (pehle \`list_memories\` se sahi id nikaalo).
- Confirmation short rakho: "Yaad rakh liya ✓" — pura content dobara mat likho.`;

const PAGINATION_DIRECTIVE = `DATA COMPLETENESS (IMPORTANT):
- Har \`list_*\` tool result me \`page\` object aata hai: \`{ limit, offset, returned, has_more, next_offset }\`.
- Agar \`has_more: true\` hai to data adhoora hai — "bas itna hi hai" / total counts kabhi mat bolo. Usi tool ko \`offset: page.next_offset\` ke saath dobara call karo jab tak \`has_more: false\` ho jaye (ya user ko batao ki aur rows bache hain).
- Report tools me \`truncated: true\` ka matlab bhi wahi — figures approximate hain, user ko clearly bata do.
`;

const URL_DIRECTIVE = `IN-APP LINKS (IMPORTANT):
- Jab user kisi note / release / withdrawal / account / todo / guide ka URL / link maange (ya "open kar do", "khol do" bole), tum EXACT in-app path share karo — root-relative, protocol-less. Never say "mere paas link nahi hai" agar tumhare paas required IDs hain.
- URL templates (root-relative, always start with \`/\`):
  · Note        → \`/personal/notepad/n/{noteId}\`
  · To-do       → \`/personal/todo/t/{todoId}\`
  · DK Account  → \`/personal/distrokid/accounts/{accountId}/overview\`
  · DK Release  → \`/personal/distrokid/accounts/{accountId}/releases/{releaseId}\`
  · DK Withdrawal → \`/personal/distrokid/accounts/{accountId}/withdrawals/{withdrawalId}\`
  · DK Artist   → \`/personal/distrokid/accounts/{accountId}/artists/{artistId}\`
  · DK Guide    → \`/personal/distrokid/guide/article/{slug}\`
- Release / withdrawal / artist ke liye \`accountId\` (parent account) chahiye — agar tool result me nahi hai to \`get_distrokid_release\` / \`get_distrokid_withdrawal\` call kar ke pehle nikaalo, tab link do.
- Format as Markdown link: \`[Title](/personal/notepad/n/abc123)\`. Kabhi bhi \`https://\` prefix mat lagao — root-relative rakho taaki SPA me smoothly open ho.
- Right-side "Artifacts" panel auto-populate hota hai jab tum tools call karte ho — isliye har touched entity user ko clickable milti hai; likhne me ek line bata do ki "side panel me bhi mil jayega."
`;

function systemForAgent(agent: AgentId, mode: AiMode = "auto") {
  const base = agent === "merged" ? SYSTEM_PROMPT_MERGED : agent === "distrokid" ? SYSTEM_PROMPT_DK : SYSTEM_PROMPT_NOTES;
  const releaseProtocol = agent === "distrokid" || agent === "merged"
    ? SCREENSHOT_RELEASE_PROTOCOL + ROYALTY_STATEMENT_PROTOCOL
    : "";
  return `${HINGLISH_DIRECTIVE}\n${SCOPE_GUARD}\n${COMMON_USER_TONE}\n${URL_DIRECTIVE}\n${PAGINATION_DIRECTIVE}\n${MEMORY_DIRECTIVE}\n${MODE_INSTRUCTIONS[mode]}\n\n${base}${releaseProtocol}`;
}

async function loadMemoriesForPrompt(userClient: any, userId: string, agent: AgentId): Promise<string> {
  try {
    const { data } = await userClient
      .from("kodu_memories")
      .select("id, kind, content, importance, agent")
      .eq("user_id", userId)
      .in("agent", ["all", agent])
      .order("importance", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(40);
    const rows = (data as any[]) || [];
    if (!rows.length) return "";
    const lines = rows.map((m) => `- [${m.kind}·${m.importance}] ${m.content}  (id:${m.id})`).join("\n");
    return `\n\nUSER MEMORY (persistent facts/preferences — apply naturally, don't quote raw):\n${lines}`;
  } catch { return ""; }
}


function sse(event: Record<string, unknown>): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function slugifyGuideTitle(input: string): string {
  const base = String(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/^-|-$/g, "");
  return base || `guide-${Date.now()}`;
}

async function uniqueGuideSlug(userClient: any, title: string): Promise<string> {
  const base = slugifyGuideTitle(title);
  let candidate = base;
  for (let i = 2; i <= 25; i += 1) {
    const { data, error } = await userClient
      .from("distrokid_guide_articles")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
    candidate = `${base}-${i}`.slice(0, 90);
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`.slice(0, 90);
}

async function embedQuery(apiKey: string, text: string): Promise<number[] | null> {
  try {
    const res = await fetch(GEMINI_EMBED_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 4000), dimensions: GEMINI_EMBED_DIMS }),
    });
    if (!res.ok) { console.error("embed failed", res.status); return null; }
    const j = await res.json();
    return j?.data?.[0]?.embedding ?? null;
  } catch (e) { console.error("embed exc", e); return null; }
}

import { parseCsv, aggregateStatement, readStatementText } from "./_shared/dkStatement";

// ---------- P2: pagination + bounded scan helpers ----------
const SCAN_PAGE = 1000;
const SCAN_MAX = 5000;

/** Paged fetch — PostgREST ka 1000-row cap cross karta hai, par hard cap ke saath. */
async function fetchPaged<T = any>(build: () => any, cap = SCAN_MAX): Promise<{ rows: T[]; truncated: boolean; error?: string }> {
  const rows: T[] = [];
  for (let from = 0; from < cap; from += SCAN_PAGE) {
    const size = Math.min(SCAN_PAGE, cap - from);
    const { data, error } = await build().range(from, from + size - 1);
    if (error) return { rows, truncated: false, error: error.message };
    const batch = (data || []) as T[];
    rows.push(...batch);
    if (batch.length < size) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

function pageArgs(args: any, def: number, max: number) {
  const limit = Math.min(Math.max(Number(args?.limit) || def, 1), max);
  const offset = Math.max(Number(args?.offset) || 0, 0);
  return { limit, offset };
}

/** limit+1 rows fetch karke `has_more` / `next_offset` batata hai. */
function pageInfo<T>(batch: T[], limit: number, offset: number) {
  const has_more = batch.length > limit;
  const rows = has_more ? batch.slice(0, limit) : batch;
  return { rows, page: { limit, offset, returned: rows.length, has_more, next_offset: has_more ? offset + limit : null } };
}

const PERSON_SELECT = "id, name, phone, dob, gender, relation_with_me, relation_with_gf, category, notes, updated_at";

/** dob se age + next birthday nikaalta hai, taki AI ko "data nahi hai" na bolna pade. */
function withAge<T extends { dob?: string | null }>(row: T): T & { age: number | null; next_birthday_in_days: number | null } {
  const dob = row?.dob ? new Date(`${String(row.dob).slice(0, 10)}T00:00:00Z`) : null;
  if (!dob || isNaN(dob.getTime())) return { ...row, age: null, next_birthday_in_days: null };
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const passed = now.getUTCMonth() > dob.getUTCMonth() || (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() >= dob.getUTCDate());
  if (!passed) age--;
  let next = Date.UTC(now.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate());
  if (next < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) {
    next = Date.UTC(now.getUTCFullYear() + 1, dob.getUTCMonth(), dob.getUTCDate());
  }
  const days = Math.round((next - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / 86_400_000);
  return { ...row, age, next_birthday_in_days: days };
}

/** databaseId ya name se custom database table resolve karta hai. */
async function resolveDatabase(ctx: any, args: any): Promise<{ id: string; name: string; description: string | null } | null> {
  let q = ctx.userClient.from("databases").select("id, name, description").limit(1);
  if (args?.databaseId) q = q.eq("id", args.databaseId);
  else if (args?.name) q = q.ilike("name", `%${safeLike(args.name)}%`);
  else return null;
  const { data } = await q;
  return ((data as any[]) || [])[0] || null;
}




/** PostgREST `.or()` filter string me raw user text inject karna injection hai. */
function safeLike(input: string): string {
  return String(input || "").replace(/[,()"\\*%]/g, " ").trim().slice(0, 120);
}

/** Tool result ko itna bada mat rakho ki context/DB bloat ho. */
function csvEsc(v: any): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const TOOL_RESULT_CAP = 12_000;
function capToolResult(res: any): any {
  try {
    const json = JSON.stringify(res ?? {});
    if (json.length <= TOOL_RESULT_CAP) return res;
    if (res && typeof res === "object" && typeof (res as any).csv === "string") {
      const csv = String((res as any).csv);
      const lines = csv.split("\n");
      const head = lines.slice(0, 40).join("\n");
      return { ...res, csv: head, csv_truncated: true, csv_total_lines: lines.length, note: `CSV bada tha — pehli 40 lines hi rakhi gayi (total ${lines.length}). Full file UI se download karein.` };
    }
    return { truncated: true, preview: json.slice(0, TOOL_RESULT_CAP), note: "Result bahut bada tha — truncate kiya gaya. Zyada narrow filter/limit ke saath dobara call karein." };
  } catch {
    return res;
  }
}

async function executeReadTool(
  name: string,
  args: any,
  ctx: { userClient: any; apiKey: string; userId: string; attachments?: { url?: string; kind?: string; name?: string }[] },
): Promise<any> {
  if (name === "list_release_tracks") {
    const { data, error } = await ctx.userClient
      .from("distrokid_release_tracks")
      .select("id, position, title, isrc, duration_seconds, active_source, active_source_url, passive_source, passive_source_url, ig_audio_url, ig_live_status, ig_last_checked_at")
      .eq("release_id", String(args?.releaseId || ""))
      .order("position", { ascending: true });
    if (error) return { error: error.message };
    return { ok: true, tracks: data || [] };
  }
  if (name === "extract_release_from_screenshots") {
    const explicit = Array.isArray(args?.image_urls) ? args.image_urls.filter((u: any) => typeof u === "string") : [];
    const fromAtts = (ctx.attachments || [])
      .filter((a) => a?.kind === "image" && typeof a.url === "string")
      .map((a) => a.url as string);
    const urls = (explicit.length ? explicit : fromAtts).slice(0, 8);
    if (urls.length === 0) return { error: "Koi screenshot attached nahi mila — user ko image attach karne ko bolo." };
    try {
      const out = await extractReleaseFromImages(ctx.apiKey, urls);
      const d = out.draft;
      return {
        ok: true,
        pages_detected: out.pages_detected,
        draft: {
          ...d,
          // Ready-to-use arrays for create_/update_distrokid_release (same order).
          tracks: d.tracks.map((t) => t.title),
          isrcs: d.tracks.map((t) => t.isrc || ""),
          track_durations: d.tracks.map((t) => t.duration_seconds ?? null),
        },
        track_details: d.tracks,
        platform_labels: d.platforms.map((p) => platformLabel(p)),
        verification: out.verification,
        confidence: out.confidence,
        warnings: out.warnings,
        note: "live_at kabhi extract nahi hota. Duration sirf Vault page se. Platforms lowercase ids hain aur update pe merge hote hain.",
      };
    } catch (e: any) {
      return { error: String(e?.message || e) };
    }
  }
  if (name === "parse_distrokid_royalty_statement") {
    const fromAtt = (ctx.attachments || []).find((a) => typeof a?.url === "string" && /\.(zip|csv|tsv|txt)$/i.test(String(a.name || a.url)));
    const url = String(args?.file_url || fromAtt?.url || "");
    if (!url) return { error: "Koi statement file attached nahi mili — user ko DistroKid ka CSV/ZIP export attach karne ko bolo." };
    try {
      const res = await fetch(url);
      if (!res.ok) return { error: `File download failed (${res.status})` };
      const bytes = new Uint8Array(await res.arrayBuffer());
      const text = await readStatementText(bytes, fromAtt?.name);
      const raw = parseCsv(text);
      if (raw.length === 0) return { error: "File me koi data row nahi mili." };
      let rows = aggregateStatement(raw);
      const filter = String(args?.sale_month || "").slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(filter)) rows = rows.filter((r) => r.sale_month === filter);
      const total = rows.reduce((sum, r) => sum + r.amount_usd, 0);
      const months = Array.from(new Set(rows.map((r) => r.sale_month))).sort();
      return {
        ok: true,
        raw_line_count: raw.length,
        aggregated_count: rows.length,
        sale_months: months,
        total_usd: Math.round(total * 100) / 100,
        rows: rows.slice(0, 200),
        truncated: rows.length > 200,
        note: "Ye sirf parse hua hai, kuch save nahi hua. User ko summary dikhao (month + platform + amount + units), confirm karao, phir commit_distrokid_royalties call karo accountId ke saath.",
      };
    } catch (e: any) {
      return { error: String(e?.message || e) };
    }
  }
  if (name === "search_notes") {
    const q = String(args?.query || "").trim();
    const limit = Math.min(Math.max(Number(args?.limit) || 6, 1), 12);
    if (!q) return { error: "query required" };
    const vec = await embedQuery(ctx.apiKey, q);
    if (!vec) return { error: "embedding failed" };
    const { data, error } = await ctx.userClient.rpc("match_note_chunks", { query_embedding: vec as any, match_count: limit * 2 });
    if (error) return { error: error.message };
    const rows = (data as any[]).filter((r) => r.similarity > 0.3);
    const noteIds = Array.from(new Set(rows.map((r) => r.note_id)));
    const { data: notes } = await ctx.userClient.from("workspace_notes").select("id, title").in("id", noteIds);
    const titleMap = new Map(((notes || []) as any[]).map((n) => [n.id, n.title || "Untitled"]));
    const byNote = new Map<string, { score: number; snippet: string }>();
    for (const r of rows) {
      const existing = byNote.get(r.note_id);
      if (!existing || r.similarity > existing.score) {
        byNote.set(r.note_id, { score: r.similarity, snippet: String(r.content || "").slice(0, 400) });
      }
    }
    return {
      results: Array.from(byNote.entries()).slice(0, limit).map(([noteId, v]) => ({
        noteId, title: titleMap.get(noteId) || "Untitled", score: Number(v.score.toFixed(3)), snippet: v.snippet,
      })),
    };
  }
  if (name === "get_note") {
    const { data, error } = await ctx.userClient.from("workspace_notes").select("id, title, content, tags, updated_at").eq("id", args?.noteId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "not found" };
    return { note: { ...data, content: String((data as any).content || "").slice(0, 8000) } };
  }
  if (name === "list_recent_notes") {
    const { limit, offset } = pageArgs(args, 10, 30);
    const { data, error } = await ctx.userClient.from("workspace_notes").select("id, title, updated_at, excerpt").eq("is_trashed", false).order("last_edited_at", { ascending: false }).range(offset, offset + limit);
    if (error) return { error: error.message };
    const { rows, page } = pageInfo((data as any[]) || [], limit, offset);
    return { notes: rows, page };
  }
  if (name === "list_todos") {
    const status = String(args?.status || "pending");
    const { limit, offset } = pageArgs(args, 20, 50);
    let q = ctx.userClient.from("personal_todos").select("id, title, description, status, priority, due_date, completed_at, created_at").order("created_at", { ascending: false }).range(offset, offset + limit);
    if (status === "pending") q = q.neq("status", "done");
    else if (status === "done") q = q.eq("status", "done");
    const { data, error } = await q;
    if (error) return { error: error.message };
    const { rows, page } = pageInfo((data as any[]) || [], limit, offset);
    return { todos: rows, page };
  }
  if (name === "list_unreplied") {
    const status = String(args?.status || "pending");
    const { limit, offset } = pageArgs(args, 20, 50);
    let q = ctx.userClient.from("personal_unreplied").select("id, message, message_at, replied, replied_at, created_at").order("message_at", { ascending: false }).range(offset, offset + limit);
    if (status === "pending") q = q.eq("replied", false);
    else if (status === "replied") q = q.eq("replied", true);
    const query = safeLike(args?.query || "");
    if (query) q = q.ilike("message", `%${query}%`);
    const { data, error } = await q;
    if (error) return { error: error.message };
    const { rows, page } = pageInfo((data as any[]) || [], limit, offset);
    return { unreplied: rows, page };
  }
  if (name === "get_unreplied") {
    const { data, error } = await ctx.userClient.from("personal_unreplied").select("id, message, message_at, replied, replied_at, created_at").eq("id", args?.entryId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { found: false };
    return { found: true, entry: data };
  }
  if (name === "list_people") {
    const { limit, offset } = pageArgs(args, 20, 50);
    const query = safeLike(args?.query || "");
    let q = ctx.userClient.from("personal_people").select(PERSON_SELECT).order("name").range(offset, offset + limit);
    if (query) q = q.ilike("name", `%${query}%`);
    const { data, error } = await q;
    if (error) return { error: error.message };
    const { rows, page } = pageInfo(((data as any[]) || []).map(withAge), limit, offset);
    return { people: rows, page };
  }
  if (name === "get_person") {
    let q = ctx.userClient.from("personal_people").select(PERSON_SELECT).limit(1);
    if (args?.personId) q = q.eq("id", args.personId);
    else if (args?.name) q = q.ilike("name", `%${safeLike(args.name)}%`);
    else return { error: "personId ya name chahiye" };
    const { data, error } = await q;
    if (error) return { error: error.message };
    const row = ((data as any[]) || [])[0];
    if (!row) return { found: false };
    return { found: true, person: withAge(row) };
  }
  if (name === "people_birthdays") {
    const limit = Math.min(Math.max(Number(args?.limit) || 30, 1), 100);
    const { data, error } = await ctx.userClient.from("personal_people").select(PERSON_SELECT).not("dob", "is", null).limit(200);
    if (error) return { error: error.message };
    const people = ((data as any[]) || []).map(withAge);
    const order = String(args?.order || "upcoming");
    if (order === "age_desc") people.sort((a, b) => (b.age ?? -1) - (a.age ?? -1));
    else if (order === "age_asc") people.sort((a, b) => (a.age ?? 1e9) - (b.age ?? 1e9));
    else people.sort((a, b) => (a.next_birthday_in_days ?? 1e9) - (b.next_birthday_in_days ?? 1e9));
    return { people: people.slice(0, limit), total_with_dob: people.length };
  }

  // ---------- BIOGRAPHY (life timeline) ----------
  if (name === "list_biography") {
    const { limit, offset } = pageArgs(args, 20, 50);
    let q = ctx.userClient.from("personal_biography")
      .select("id, title, event_date, description, tags, transcript_status, audio_url, updated_at")
      .order("event_date", { ascending: false }).range(offset, offset + limit);
    if (args?.from) q = q.gte("event_date", String(args.from));
    if (args?.to) q = q.lte("event_date", String(args.to));
    if (args?.tag) q = q.contains("tags", [String(args.tag)]);
    if (args?.query) q = q.ilike("title", `%${safeLike(args.query)}%`);
    const { data, error } = await q;
    if (error) return { error: error.message };
    const trimmed = ((data as any[]) || []).map((r) => ({ ...r, description: r.description ? String(r.description).slice(0, 600) : r.description }));
    const { rows, page } = pageInfo(trimmed, limit, offset);
    return { entries: rows, page };
  }
  if (name === "get_biography_entry") {
    const { data, error } = await ctx.userClient.from("personal_biography")
      .select("id, title, event_date, description, tags, transcript_status, transcript_text, audio_url, created_at, updated_at")
      .eq("id", args?.entryId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { found: false };
    return { found: true, entry: data };
  }
  if (name === "biography_timeline") {
    let q = ctx.userClient.from("personal_biography").select("title, event_date").order("event_date", { ascending: true }).limit(1000);
    if (args?.from) q = q.gte("event_date", String(args.from));
    if (args?.to) q = q.lte("event_date", String(args.to));
    const { data, error } = await q;
    if (error) return { error: error.message };
    const byYear: Record<string, { count: number; titles: string[] }> = {};
    for (const r of ((data as any[]) || [])) {
      const y = String(r.event_date || "").slice(0, 4) || "unknown";
      byYear[y] ||= { count: 0, titles: [] };
      byYear[y].count++;
      if (byYear[y].titles.length < 12) byYear[y].titles.push(r.title);
    }
    return { total: ((data as any[]) || []).length, years: byYear };
  }

  // ---------- CUSTOM DATABASES (read only) ----------
  if (name === "list_databases") {
    const limit = Math.min(Math.max(Number(args?.limit) || 50, 1), 100);
    const { data, error } = await ctx.userClient.from("databases").select("id, name, description, default_view, display_order, updated_at").order("display_order").limit(limit);
    if (error) return { error: error.message };
    const out: any[] = [];
    for (const db of ((data as any[]) || [])) {
      const { count } = await ctx.userClient.from("database_rows").select("id", { count: "exact", head: true }).eq("database_id", db.id);
      out.push({ ...db, row_count: count ?? null });
    }
    return { databases: out };
  }
  if (name === "get_database_schema" || name === "query_database_rows") {
    const db = await resolveDatabase(ctx, args);
    if (!db) return { error: "Ye database table nahi mila — pehle list_databases call karein." };
    const { data: cols, error: colErr } = await ctx.userClient.from("database_columns")
      .select("id, name, type, options, order_index").eq("database_id", db.id).order("order_index");
    if (colErr) return { error: colErr.message };
    const columns = (cols as any[]) || [];
    if (name === "get_database_schema") {
      return { database: { id: db.id, name: db.name, description: db.description }, columns: columns.map((c) => ({ name: c.name, type: c.type, options: c.options })) };
    }
    const { limit, offset } = pageArgs(args, 25, 100);
    const { data: rowsRaw, error: rowErr } = await ctx.userClient.from("database_rows")
      .select("id, order_index").eq("database_id", db.id).order("order_index").range(offset, offset + limit);
    if (rowErr) return { error: rowErr.message };
    const rowIds = ((rowsRaw as any[]) || []).map((r) => r.id);
    let cells: any[] = [];
    if (rowIds.length) {
      const { data: cellData, error: cellErr } = await ctx.userClient.from("database_cells").select("row_id, column_id, value").in("row_id", rowIds);
      if (cellErr) return { error: cellErr.message };
      cells = (cellData as any[]) || [];
    }
    const colName = new Map(columns.map((c) => [c.id, c.name]));
    const byRow = new Map<string, any>();
    for (const c of cells) {
      const obj = byRow.get(c.row_id) || {};
      obj[colName.get(c.column_id) || c.column_id] = c.value;
      byRow.set(c.row_id, obj);
    }
    let mapped = ((rowsRaw as any[]) || []).map((r) => byRow.get(r.id) || {});
    const query = String(args?.query || "").trim().toLowerCase();
    if (query) mapped = mapped.filter((r) => JSON.stringify(r).toLowerCase().includes(query));
    const { rows, page } = pageInfo(mapped, limit, offset);
    return { database: { name: db.name }, columns: columns.map((c) => c.name), rows, page };
  }


  // ---------- LONG-TERM MEMORY ----------
  if (name === "remember") {
    const content = String(args?.content || "").trim();
    if (!content) return { error: "content required" };
    if (content.length > 2000) return { error: "content too long (max 2000)" };
    const kind = ["fact","preference","style","goal","context"].includes(args?.kind) ? args.kind : "fact";
    const scope = ["all","notes","distrokid","merged"].includes(args?.scope) ? args.scope : "all";
    const importance = Math.min(Math.max(Number(args?.importance) || 3, 1), 5);
    // Dedupe: if content already exists (case-insensitive) update importance instead of inserting.
    const { data: existing } = await ctx.userClient.from("kodu_memories").select("id").eq("user_id", ctx.userId).ilike("content", content).maybeSingle();
    if (existing?.id) {
      await ctx.userClient.from("kodu_memories").update({ importance, kind, agent: scope, last_used_at: new Date().toISOString() }).eq("id", existing.id);
      return { ok: true, id: existing.id, updated: true };
    }
    const { data, error } = await ctx.userClient.from("kodu_memories").insert({
      user_id: ctx.userId, content, kind, agent: scope, importance, source: "assistant",
    }).select("id").single();
    if (error) return { error: error.message };
    return { ok: true, id: (data as any).id, saved: content };
  }
  if (name === "list_memories") {
    const { limit, offset } = pageArgs(args, 30, 100);
    let q = ctx.userClient.from("kodu_memories").select("id, agent, kind, content, importance, updated_at").eq("user_id", ctx.userId).order("importance", { ascending: false }).order("updated_at", { ascending: false }).range(offset, offset + limit);
    if (args?.scope) q = q.eq("agent", String(args.scope));
    if (args?.kind) q = q.eq("kind", String(args.kind));
    const { data, error } = await q;
    if (error) return { error: error.message };
    const { rows, page } = pageInfo((data as any[]) || [], limit, offset);
    return { memories: rows, page };
  }
  if (name === "forget_memory") {
    const id = String(args?.memoryId || "").trim();
    if (!id) return { error: "memoryId required" };
    const { error } = await ctx.userClient.from("kodu_memories").delete().eq("id", id).eq("user_id", ctx.userId);
    if (error) return { error: error.message };
    return { ok: true, forgotten: id };
  }

  // ---------- KODU UNIFIED HYBRID SEARCH ----------
  if (name === "kodu_search") {
    const q = String(args?.query || "").trim();
    const limit = Math.min(Math.max(Number(args?.limit) || 8, 1), 20);
    const sources: string[] | null = Array.isArray(args?.sources) && args.sources.length ? args.sources : null;
    if (!q) return { error: "query required" };
    // Hybrid: semantic over kodu_chunks (todos+distrokid) + match_note_chunks (notes) + FTS.
    const vec = await embedQuery(ctx.apiKey, q);
    const results = new Map<string, { source: string; id: string; title: string; snippet: string; semScore?: number; ftsScore?: number }>();

    if (vec) {
      // Notes semantic (separate table)
      if (!sources || sources.includes("workspace_notes")) {
        const { data: noteRows } = await ctx.userClient.rpc("match_note_chunks", { query_embedding: vec as any, match_count: limit });
        for (const r of (noteRows as any[] || [])) {
          const key = `workspace_notes:${r.note_id}`;
          const existing = results.get(key);
          if (!existing || (r.similarity || 0) > (existing.semScore || 0)) {
            results.set(key, { source: "workspace_notes", id: r.note_id, title: "", snippet: String(r.content || "").slice(0, 280), semScore: r.similarity });
          }
        }
      }
      // Entity semantic
      const entitySources = sources ? sources.filter((s) => s !== "workspace_notes") : null;
      const { data: entRows } = await ctx.userClient.rpc("kodu_search_chunks", { query_embedding: vec as any, source_types: entitySources, match_count: limit });
      for (const r of (entRows as any[] || [])) {
        const key = `${r.source_table}:${r.source_id}`;
        const existing = results.get(key);
        if (!existing || (r.similarity || 0) > (existing.semScore || 0)) {
          results.set(key, { source: r.source_table, id: r.source_id, title: "", snippet: String(r.content || "").slice(0, 280), semScore: r.similarity });
        }
      }
    }
    // FTS pass
    const { data: ftsRows } = await ctx.userClient.rpc("kodu_search_fts", { query_text: q, source_types: sources, match_count: limit });
    for (const r of (ftsRows as any[] || [])) {
      const key = `${r.source_table}:${r.source_id}`;
      const existing = results.get(key);
      if (existing) {
        existing.ftsScore = r.rank;
        existing.title = existing.title || r.title || "";
        if (!existing.snippet) existing.snippet = String(r.snippet || "").slice(0, 280);
      } else {
        results.set(key, { source: r.source_table, id: r.source_id, title: r.title || "", snippet: String(r.snippet || "").slice(0, 280), ftsScore: r.rank });
      }
    }
    // Fill missing titles
    const byTable = new Map<string, string[]>();
    for (const v of results.values()) {
      if (!v.title) {
        const arr = byTable.get(v.source) || [];
        arr.push(v.id);
        byTable.set(v.source, arr);
      }
    }
    for (const [src, ids] of byTable.entries()) {
      let selectStr = "id, title";
      if (src === "distrokid_accounts") selectStr = "id, title, email";
      else if (src === "distrokid_withdrawals") selectStr = "id, status, notes";
      const { data } = await ctx.userClient.from(src).select(selectStr).in("id", ids);
      const map = new Map(((data as any[]) || []).map((r) => {
        const t = r.title || r.email || r.status || "(untitled)";
        return [r.id, t];
      }));
      for (const v of results.values()) {
        if (v.source === src && !v.title) v.title = (map.get(v.id) as string) || "(untitled)";
      }
    }
    // RRF fusion
    const all = Array.from(results.values());
    const semSorted = [...all].filter((r) => r.semScore != null).sort((a, b) => (b.semScore || 0) - (a.semScore || 0));
    const ftsSorted = [...all].filter((r) => r.ftsScore != null).sort((a, b) => (b.ftsScore || 0) - (a.ftsScore || 0));
    const rrfK = 60;
    const scored = all.map((r) => {
      const sIdx = semSorted.indexOf(r);
      const fIdx = ftsSorted.indexOf(r);
      const score = (sIdx >= 0 ? 1 / (rrfK + sIdx) : 0) + (fIdx >= 0 ? 1 / (rrfK + fIdx) : 0);
      return { ...r, score };
    }).sort((a, b) => b.score - a.score).slice(0, limit);
    return { results: scored.map((r) => ({ source: r.source, id: r.id, title: r.title || "(untitled)", snippet: r.snippet })) };
  }

  // ---------- TODOS ----------
  if (name === "get_todo") {
    const { data, error } = await ctx.userClient.from("personal_todos").select("*").eq("id", args?.todoId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "not found" };
    return { todo: data };
  }

  // ---------- DISTROKID READ ----------
  if (name === "list_distrokid_accounts") {
    const { limit, offset } = pageArgs(args, 100, 500);
    let q = ctx.userClient.from("distrokid_accounts").select("id, email, title, status, tab, subscription_plan, subscription_status, account_status, amount, lifetime_earning_usd, signup_date, created_at, updated_at").order("created_at", { ascending: false }).range(offset, offset + limit);
    if (args?.tab) q = q.ilike("tab", args.tab);
    if (args?.status) q = q.ilike("status", args.status);
    if (args?.subscription_status) q = q.ilike("subscription_status", args.subscription_status);
    if (args?.account_status) q = q.ilike("account_status", args.account_status);
    const { data, error } = await q;
    if (error) return { error: error.message };
    const { rows, page } = pageInfo((data as any[]) || [], limit, offset);
    return { accounts: rows, count: rows.length, page };
  }
  if (name === "get_distrokid_account") {
    const { data, error } = await ctx.userClient.from("distrokid_accounts").select(DK_ACCOUNT_SAFE_COLUMNS).eq("id", args?.accountId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "not found" };
    return { account: scrubSensitive(data) };
  }
  if (name === "list_distrokid_releases") {
    const { limit, offset } = pageArgs(args, 20, 100);
    let q = ctx.userClient.from("distrokid_releases").select("id, account_id, title, artist_name, type, release_date, expected_earning_usd, active_source, passive_source, updated_at").order("release_date", { ascending: false, nullsFirst: false }).range(offset, offset + limit);
    if (args?.accountId) q = q.eq("account_id", args.accountId);
    const { data, error } = await q;
    if (error) return { error: error.message };
    const { rows, page } = pageInfo((data as any[]) || [], limit, offset);
    return { releases: rows, page };
  }
  if (name === "get_distrokid_release") {
    const { data, error } = await ctx.userClient.from("distrokid_releases").select("*").eq("id", args?.releaseId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "not found" };
    return { release: data };
  }
  if (name === "list_distrokid_earnings") {
    const { limit, offset } = pageArgs(args, 20, 100);
    let q = ctx.userClient.from("distrokid_earnings").select("id, account_id, amount_usd, period_month, source, recorded_date, notes").order("recorded_date", { ascending: false }).range(offset, offset + limit);
    if (args?.accountId) q = q.eq("account_id", args.accountId);
    const { data, error } = await q;
    if (error) return { error: error.message };
    const { rows, page } = pageInfo((data as any[]) || [], limit, offset);
    return { earnings: rows, page };
  }
  if (name === "analyze_distrokid_royalties") {
    const limit = Math.min(Math.max(Number(args?.limit) || 200, 1), 500);
    let q = ctx.userClient.from("distrokid_release_earnings")
      .select("id, release_id, account_id, platform, amount_usd, units, country_count, period_month, reporting_date, source")
      .order("period_month", { ascending: false }).limit(limit);
    if (args?.accountId) q = q.eq("account_id", args.accountId);
    if (args?.releaseId) q = q.eq("release_id", args.releaseId);
    if (args?.platform) q = q.ilike("platform", `%${String(args.platform).trim()}%`);
    if (args?.fromMonth) q = q.gte("period_month", String(args.fromMonth).slice(0, 7) + "-01");
    if (args?.toMonth) q = q.lte("period_month", String(args.toMonth).slice(0, 7) + "-31");
    const { data, error } = await q;
    if (error) return { error: error.message };
    const rows = (data || []) as any[];
    const totalRevenueUsd = rows.reduce((sum, row) => sum + (Number(row.amount_usd) || 0), 0);
    const rowsWithUnits = rows.filter((row) => Number(row.units) > 0);
    const totalUnits = rowsWithUnits.reduce((sum, row) => sum + Number(row.units), 0);
    const revenueWithUnits = rowsWithUnits.reduce((sum, row) => sum + (Number(row.amount_usd) || 0), 0);
    const revenuePerUnit = totalUnits > 0 ? revenueWithUnits / totalUnits : null;
    return {
      rows,
      summary: {
        rowCount: rows.length,
        rowsWithUnits: rowsWithUnits.length,
        totalRevenueUsd,
        totalUnits,
        revenuePerUnit,
        approximateUnitsPerDollar: revenuePerUnit && revenuePerUnit > 0 ? 1 / revenuePerUnit : null,
        note: totalUnits > 0 ? "Rates are weighted from rows that contain positive units." : "No positive unit data is available; do not estimate a per-unit rate.",
      },
    };
  }
  if (name === "list_distrokid_withdrawals") {
    const { limit, offset } = pageArgs(args, 20, 100);
    let q = ctx.userClient.from("distrokid_withdrawals").select("id, account_id, amount_usd_submitted, amount_usd_received, inr_amount, status, submitted_at, received_date, notes").order("submitted_at", { ascending: false }).range(offset, offset + limit);
    if (args?.accountId) q = q.eq("account_id", args.accountId);
    if (args?.status) q = q.eq("status", args.status);
    const { data, error } = await q;
    if (error) return { error: error.message };
    const { rows, page } = pageInfo((data as any[]) || [], limit, offset);
    return { withdrawals: rows, page };
  }
  if (name === "search_distrokid_guides") {
    const query = String(args?.query || "").trim();
    const limit = Math.min(Math.max(Number(args?.limit) || 10, 1), 30);
    if (!query) return { error: "query required" };
    const safe = safeLike(query);
    if (!safe) return { error: "query required" };
    const { data, error } = await ctx.userClient.from("distrokid_guide_articles").select("id, title, summary, tags, status").eq("status", "published")
      .or(`title.ilike."%${safe}%",summary.ilike."%${safe}%",content_md.ilike."%${safe}%"`).limit(limit);
    if (error) return { error: error.message };
    return { articles: data || [] };
  }
  if (name === "get_distrokid_guide") {
    const { data, error } = await ctx.userClient.from("distrokid_guide_articles").select("id, title, summary, content_md, tags, status, updated_at").eq("id", args?.articleId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "not found" };
    return { article: { ...data, content_md: String((data as any).content_md || "").slice(0, 8000) } };
  }
  if (name === "list_distrokid_guide_categories") {
    const { data, error } = await ctx.userClient.from("distrokid_guide_categories").select("id, name, slug, description, icon, sort_order").order("sort_order", { ascending: true }).limit(100);
    if (error) return { error: error.message };
    return { categories: data || [] };
  }

  // ---------- DISTROKID ANALYTICS ----------
  if (name === "dk_top_earners") {
    const limit = Math.min(Math.max(Number(args?.limit) || 10, 1), 50);
    const { data, error } = await ctx.userClient
      .from("distrokid_accounts")
      .select("id, email, title, lifetime_earning_usd, account_status, subscription_status")
      .order("lifetime_earning_usd", { ascending: false })
      .limit(limit);
    if (error) return { error: error.message };
    return { top: data || [] };
  }
  if (name === "dk_account_health") {
    const id = args?.accountId;
    if (!id) return { error: "accountId required" };
    const [{ data: acc }, { data: rels }, { data: wds }, { data: ern }] = await Promise.all([
      ctx.userClient.from("distrokid_accounts").select("id, email, title, status, account_status, subscription_status, subscription_date, lifetime_earning_usd, signup_date").eq("id", id).maybeSingle(),
      ctx.userClient.from("distrokid_releases").select("id, title, release_date, expected_earning_usd").eq("account_id", id),
      ctx.userClient.from("distrokid_withdrawals").select("id, status, amount_usd_submitted, amount_usd_received, submitted_at, received_date").eq("account_id", id),
      ctx.userClient.from("distrokid_earnings").select("amount_usd, recorded_date, period_month").eq("account_id", id),
    ]);
    if (!acc) return { error: "not found" };
    const pendingWd = (wds as any[] || []).filter((w) => w.status !== "received");
    const totalSubmitted = (wds as any[] || []).reduce((s, w) => s + Number(w.amount_usd_submitted || 0), 0);
    const totalReceived = (wds as any[] || []).reduce((s, w) => s + Number(w.amount_usd_received || 0), 0);
    return {
      account: acc,
      releases_count: (rels || []).length,
      withdrawals_count: (wds || []).length,
      pending_withdrawals_count: pendingWd.length,
      total_submitted_usd: Number(totalSubmitted.toFixed(2)),
      total_received_usd: Number(totalReceived.toFixed(2)),
      earnings_entries: (ern || []).length,
      last_release: (rels as any[] || []).sort((a, b) => String(b.release_date || "").localeCompare(String(a.release_date || "")))[0] || null,
      last_withdrawal: (wds as any[] || []).sort((a, b) => String(b.submitted_at || "").localeCompare(String(a.submitted_at || "")))[0] || null,
    };
  }
  if (name === "dk_monthly_report") {
    const month = String(args?.month || new Date().toISOString().slice(0, 7));
    const start = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
    const [{ data: ern }, { data: wds }] = await Promise.all([
      ctx.userClient.from("distrokid_earnings").select("account_id, amount_usd, source, recorded_date, period_month").gte("recorded_date", start).lt("recorded_date", next),
      ctx.userClient.from("distrokid_withdrawals").select("account_id, amount_usd_submitted, amount_usd_received, status, submitted_at").gte("submitted_at", start).lt("submitted_at", next),
    ]);
    const earnTotal = (ern as any[] || []).reduce((s, r) => s + Number(r.amount_usd || 0), 0);
    const wdSubmitted = (wds as any[] || []).reduce((s, r) => s + Number(r.amount_usd_submitted || 0), 0);
    const wdReceived = (wds as any[] || []).reduce((s, r) => s + Number(r.amount_usd_received || 0), 0);
    const bySource: Record<string, number> = {};
    for (const r of (ern as any[] || [])) { const k = r.source || "(unknown)"; bySource[k] = (bySource[k] || 0) + Number(r.amount_usd || 0); }
    return { month, earnings_total_usd: Number(earnTotal.toFixed(2)), withdrawals_submitted_usd: Number(wdSubmitted.toFixed(2)), withdrawals_received_usd: Number(wdReceived.toFixed(2)), earnings_by_source: bySource, entries: (ern || []).length, withdrawals: (wds || []).length };
  }
  if (name === "dk_pending_money") {
    const { rows: allRows, truncated, error } = await fetchPaged<any>(() => ctx.userClient.from("distrokid_withdrawals").select("id, account_id, amount_usd_submitted, status, submitted_at, notes").neq("status", "received").order("submitted_at", { ascending: false }));
    if (error) return { error };
    const now = Date.now();
    const rows = allRows.map((r) => {
      const age = r.submitted_at ? Math.floor((now - new Date(r.submitted_at).getTime()) / 86400000) : null;
      return { ...r, age_days: age };
    }).sort((a, b) => (b.age_days || 0) - (a.age_days || 0));
    const total = rows.reduce((s, r) => s + Number(r.amount_usd_submitted || 0), 0);
    return { pending: rows.slice(0, 200), count: rows.length, total_pending_usd: Number(total.toFixed(2)), truncated };
  }
  if (name === "dk_conversion_rate_avg") {
    const n = Math.min(Math.max(Number(args?.lastN) || 10, 1), 100);
    const { data, error } = await ctx.userClient.from("distrokid_withdrawals").select("conversion_rate, received_date").not("conversion_rate", "is", null).order("received_date", { ascending: false }).limit(n);
    if (error) return { error: error.message };
    const rates = (data as any[] || []).map((r) => Number(r.conversion_rate)).filter((x) => x > 0);
    if (!rates.length) return { avg_rate: null, sample_size: 0 };
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    const min = Math.min(...rates), max = Math.max(...rates);
    return { avg_rate: Number(avg.toFixed(4)), min, max, sample_size: rates.length };
  }
  if (name === "dk_renewal_due") {
    const within = Math.min(Math.max(Number(args?.withinDays) || 30, 1), 365);
    const { rows: accRows, truncated, error } = await fetchPaged<any>(() => ctx.userClient.from("distrokid_accounts").select("id, email, title, subscription_date, subscription_status").not("subscription_date", "is", null).order("created_at", { ascending: false }));
    if (error) return { error };
    const now = new Date();
    const due: any[] = [];
    for (const a of accRows) {
      if (!a.subscription_date) continue;
      const sub = new Date(a.subscription_date);
      const next = new Date(sub); next.setFullYear(now.getFullYear());
      if (next < now) next.setFullYear(now.getFullYear() + 1);
      const days = Math.floor((next.getTime() - now.getTime()) / 86400000);
      if (days <= within) due.push({ ...a, renewal_date: next.toISOString().slice(0, 10), days_until: days });
    }
    due.sort((a, b) => a.days_until - b.days_until);
    return { due: due.slice(0, 200), count: due.length, truncated };
  }
  if (name === "dk_suspended_recent") {
    const days = Math.min(Math.max(Number(args?.days) || 90, 1), 365);
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const { rows, truncated, error } = await fetchPaged<any>(() => ctx.userClient.from("distrokid_accounts").select("id, email, title, account_status, account_status_date, notes").eq("account_status", "suspended").gte("account_status_date", cutoff).order("account_status_date", { ascending: false }));
    if (error) return { error };
    return { suspended: rows.slice(0, 200), count: rows.length, since: cutoff, truncated };
  }
  if (name === "dk_detect_duplicate_releases") {
    const { rows: relRows, truncated, error } = await fetchPaged<any>(() => ctx.userClient.from("distrokid_releases").select("id, account_id, title, artist_name").order("created_at", { ascending: false }));
    if (error) return { error };
    const groups = new Map<string, any[]>();
    for (const r of relRows) {
      const key = String(r.title || "").trim().toLowerCase();
      if (!key) continue;
      const arr = groups.get(key) || []; arr.push(r); groups.set(key, arr);
    }
    const dups = Array.from(groups.entries()).filter(([, v]) => v.length > 1).map(([title, items]) => ({ title, count: items.length, items }));
    return { duplicates: dups.slice(0, 100), count: dups.length, truncated };
  }

  // ---------- DISTROKID EXPORT ----------
  if (name === "dk_export_accounts_csv") {
    const { rows, truncated, error } = await fetchPaged<any>(() => ctx.userClient.from("distrokid_accounts").select("email, title, signup_date, subscription_date, subscription_plan, subscription_status, account_status, account_status_date, lifetime_earning_usd, card_ending, tab, created_at").order("created_at", { ascending: false }));
    if (error) return { error };
    const headers = ["email","title","signup_date","subscription_date","subscription_plan","subscription_status","account_status","account_status_date","lifetime_earning_usd","card_ending","tab","created_at"];
    const lines = [headers.join(",")];
    for (const r of rows) lines.push(headers.map((h) => csvEsc((r as any)[h])).join(","));
    return { filename: `distrokid_accounts_${new Date().toISOString().slice(0,10)}.csv`, csv: lines.join("\n"), count: rows.length, truncated };
  }
  if (name === "dk_export_withdrawals_csv") {
    const fy = String(args?.financialYear || "").trim();
    let q = ctx.userClient.from("distrokid_withdrawals").select("account_id, amount_usd_submitted, amount_usd_received, fee_usd, withholding_usd, inr_amount, conversion_rate, status, submitted_at, received_date, notes").order("submitted_at", { ascending: false });
    if (fy) {
      const m = fy.match(/FY(\d{2})-(\d{2})/i);
      if (m) {
        const start = `20${m[1]}-04-01`, end = `20${m[2]}-04-01`;
        q = q.gte("submitted_at", start).lt("submitted_at", end);
      }
    }
    const { rows, truncated, error } = await fetchPaged<any>(() => q);
    if (error) return { error };
    const headers = ["account_id","amount_usd_submitted","amount_usd_received","fee_usd","withholding_usd","inr_amount","conversion_rate","status","submitted_at","received_date","notes"];
    const lines = [headers.join(",")];
    for (const r of rows) lines.push(headers.map((h) => csvEsc((r as any)[h])).join(","));
    return { filename: `distrokid_withdrawals${fy ? `_${fy}` : ""}_${new Date().toISOString().slice(0,10)}.csv`, csv: lines.join("\n"), count: rows.length, truncated };
  }
  if (name === "dk_account_report_md") {
    const id = args?.accountId; if (!id) return { error: "accountId required" };
    const [{ data: acc }, { data: rels }, { data: wds }, { data: ern }] = await Promise.all([
      ctx.userClient.from("distrokid_accounts").select(DK_ACCOUNT_SAFE_COLUMNS).eq("id", id).maybeSingle(),
      ctx.userClient.from("distrokid_releases").select("title, artist_name, release_date, expected_earning_usd").eq("account_id", id).order("release_date", { ascending: false }),
      ctx.userClient.from("distrokid_withdrawals").select("amount_usd_submitted, amount_usd_received, status, submitted_at, received_date, inr_amount").eq("account_id", id).order("submitted_at", { ascending: false }),
      ctx.userClient.from("distrokid_earnings").select("amount_usd, period_month, source").eq("account_id", id),
    ]);
    if (!acc) return { error: "not found" };
    const a = acc as any;
    const totalEarn = (ern as any[] || []).reduce((s, r) => s + Number(r.amount_usd || 0), 0);
    const totalRecv = (wds as any[] || []).reduce((s, r) => s + Number(r.amount_usd_received || 0), 0);
    let md = `# ${a.title || a.email}\n\n`;
    md += `- Email: ${a.email}\n- Status: ${a.status} / ${a.account_status || "-"}\n- Subscription: ${a.subscription_status || "-"} (${a.subscription_plan || "-"})\n- Signup: ${a.signup_date || "-"}\n- Lifetime: $${a.lifetime_earning_usd}\n- Total earnings (logged): $${totalEarn.toFixed(2)}\n- Total received: $${totalRecv.toFixed(2)}\n\n`;
    md += `## Releases (${(rels || []).length})\n\n`;
    for (const r of (rels as any[] || [])) md += `- ${r.release_date || "?"} — **${r.title}** by ${r.artist_name || "?"}${r.expected_earning_usd ? ` (earned $${r.expected_earning_usd})` : ""}\n`;
    md += `\n## Withdrawals (${(wds || []).length})\n\n`;
    for (const w of (wds as any[] || [])) md += `- ${w.submitted_at?.slice(0,10) || "?"} → ${w.received_date?.slice(0,10) || "pending"} | $${w.amount_usd_submitted} → $${w.amount_usd_received || "-"} (₹${w.inr_amount || "-"}) [${w.status}]\n`;
    return { filename: `${(a.email || "account").replace(/[^a-z0-9]+/gi, "_")}_report.md`, markdown: md };
  }

  return { error: `unknown tool ${name}` };
}

/** Normalize AI-supplied release fields: platform ids, track arrays, durations. */
function normalizeReleasePayload(payload: any) {
  if (Array.isArray(payload.platforms)) payload.platforms = normalizePlatforms(payload.platforms);
  if (Array.isArray(payload.tracks)) {
    payload.tracks = payload.tracks.map((t: any) => String(t ?? "").trim()).filter((t: string) => t.length > 0);
  }
  if (Array.isArray(payload.isrcs)) payload.isrcs = payload.isrcs.map((v: any) => (v == null ? "" : String(v).trim()));
  if (Array.isArray(payload.track_durations)) {
    payload.track_durations = payload.track_durations.map((v: any) => {
      const secs = toSeconds(v);
      return secs == null ? "" : String(secs);
    });
  }
  // live_at is never written from screenshots; only an explicit non-empty value survives.
  if (payload.live_at === "" || payload.live_at === null) delete payload.live_at;
  return payload;
}

async function executeWriteTool(
  name: string,
  args: any,
  ctx: { userClient: any; userId: string },
): Promise<any> {
  try {
    // Structural guard: no AI write path may ever carry card/password columns,
    // whatever field list an individual tool happens to copy.
    assertNoSensitiveWrite(args, `${name} me`);
    if (args && typeof args === "object") {
      for (const v of Object.values(args as Record<string, unknown>)) {
        if (v && typeof v === "object" && !Array.isArray(v)) assertNoSensitiveWrite(v, `${name} me`);
      }
    }
    if (name === "create_note") {
      const { data, error } = await ctx.userClient.from("workspace_notes").insert({
        project_id: args?.projectId || null,
        title: String(args?.title || "Untitled").slice(0, 200),
        content: String(args?.content || ""),
      }).select("id, title").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, noteId: (data as any).id, title: (data as any).title };
    }
    if (name === "update_note") {
      const patch: any = { last_edited_at: new Date().toISOString() };
      if (typeof args?.title === "string") patch.title = args.title.slice(0, 200);
      if (typeof args?.content === "string") patch.content = args.content;
      const { data, error } = await ctx.userClient.from("workspace_notes").update(patch).eq("id", args?.noteId).select("id, title").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, noteId: (data as any).id, title: (data as any).title };
    }
    if (name === "append_to_note") {
      const { data: existing, error: e1 } = await ctx.userClient.from("workspace_notes").select("content").eq("id", args?.noteId).maybeSingle();
      if (e1 || !existing) return { ok: false, error: e1?.message || "not found" };
      const newContent = (((existing as any).content || "") + "\n\n" + String(args?.content || "")).trim();
      const { error } = await ctx.userClient.from("workspace_notes").update({ content: newContent, last_edited_at: new Date().toISOString() }).eq("id", args?.noteId);
      if (error) return { ok: false, error: error.message };
      return { ok: true, noteId: args.noteId };
    }
    if (name === "create_unreplied") {
      const insert: any = { message: String(args?.message || "").slice(0, 5000) };
      if (!insert.message) return { ok: false, error: "message required" };
      insert.message_at = args?.message_at ? new Date(String(args.message_at)).toISOString() : new Date().toISOString();
      const { data, error } = await ctx.userClient.from("personal_unreplied").insert(insert).select("id, message").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, entryId: (data as any).id, message: (data as any).message };
    }
    if (name === "update_unreplied") {
      const patch: any = {};
      if (typeof args?.message === "string") patch.message = args.message.slice(0, 5000);
      if (args?.message_at) patch.message_at = new Date(String(args.message_at)).toISOString();
      if (typeof args?.replied === "boolean") {
        patch.replied = args.replied;
        patch.replied_at = args.replied ? new Date().toISOString() : null;
      }
      if (!Object.keys(patch).length) return { ok: false, error: "no fields to update" };
      const { data, error } = await ctx.userClient.from("personal_unreplied").update(patch).eq("id", args?.entryId).select("id, message").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, entryId: (data as any).id, message: (data as any).message };
    }
    if (name === "delete_unreplied") {
      const { error } = await ctx.userClient.from("personal_unreplied").delete().eq("id", args?.entryId);
      if (error) return { ok: false, error: error.message };
      return { ok: true, entryId: args?.entryId };
    }
    if (name === "create_todo") {
      const insert: any = { title: String(args?.title || "").slice(0, 300), status: "pending" };
      if (typeof args?.description === "string") insert.description = args.description;
      if (typeof args?.priority === "string") insert.priority = args.priority;
      if (typeof args?.due_date === "string") insert.due_date = args.due_date;
      const { data, error } = await ctx.userClient.from("personal_todos").insert(insert).select("id, title").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, todoId: (data as any).id, title: (data as any).title };
    }
    if (name === "complete_todo") {
      const { error } = await ctx.userClient.from("personal_todos").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", args?.todoId);
      if (error) return { ok: false, error: error.message };
      return { ok: true, todoId: args.todoId };
    }
    if (name === "update_todo") {
      const patch: any = {};
      for (const k of ["title", "description", "priority", "due_date", "status"]) {
        if (args?.[k] !== undefined) patch[k] = args[k];
      }
      if (patch.status === "done" && !patch.completed_at) patch.completed_at = new Date().toISOString();
      const { data, error } = await ctx.userClient.from("personal_todos").update(patch).eq("id", args?.todoId).select("id, title").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, todoId: (data as any).id, title: (data as any).title };
    }
    if (name === "delete_todo") {
      const { error } = await ctx.userClient.from("personal_todos").delete().eq("id", args?.todoId);
      if (error) return { ok: false, error: error.message };
      return { ok: true, todoId: args.todoId };
    }
    if (name === "create_person") {
      const insert: any = { name: String(args?.name || "").slice(0, 200) };
      for (const k of ["phone", "notes", "relation_with_me", "category"]) {
        if (typeof args?.[k] === "string") insert[k] = args[k];
      }
      const { data, error } = await ctx.userClient.from("personal_people").insert(insert).select("id, name").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, personId: (data as any).id, name: (data as any).name };
    }
    // ---------- DISTROKID WRITE ----------
    if (name === "create_distrokid_account") {
      // Duplicate guard (prompt promise): same email pehle se hai to naya mat banao.
      const email = String(args?.email || "").trim();
      if (email) {
        const { data: dupAcc } = await ctx.userClient.from("distrokid_accounts").select("id, email, title").ilike("email", email).limit(1);
        if ((dupAcc as any[])?.length) {
          const d = (dupAcc as any[])[0];
          return { ok: false, duplicate: true, accountId: d.id, error: `Is email (${d.email}) ka account pehle se maujood hai — naya nahi banaya. Update karna ho to update_distrokid_account use karein.` };
        }
      }
      const insert: any = {
        email: args.email,
        status: args.status,
        tab: args.tab,
        date_added: new Date().toISOString().slice(0, 10),
        time_added: new Date().toISOString().slice(11, 19),
      };
      for (const k of ["title", "notes", "subscription_plan", "signup_date", "card_ending"]) {
        if (args?.[k] !== undefined) insert[k] = args[k];
      }
      const { data, error } = await ctx.userClient.from("distrokid_accounts").insert(insert).select("id, email").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, accountId: (data as any).id, email: (data as any).email };
    }
    if (name === "update_distrokid_account") {
      const patch: any = {};
      for (const k of ["title", "status", "tab", "notes", "subscription_plan", "subscription_status", "account_status", "amount"]) {
        if (args?.[k] !== undefined) patch[k] = args[k];
      }
      const { data, error } = await ctx.userClient.from("distrokid_accounts").update(patch).eq("id", args?.accountId).select("id").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, accountId: (data as any).id };
    }
    if (name === "create_distrokid_release") {
      if (!args?.accountId || !args?.title) {
        return { ok: false, error: "accountId aur title dono required hain" };
      }
      const title = String(args.title).trim();
      const artist = args?.artist_name ? String(args.artist_name).trim() : null;
      // Dedup guard: same account + case-insensitive title (+ artist/release_date if provided)
      let dupQ: any = ctx.userClient
        .from("distrokid_releases")
        .select("id, title, artist_name, release_date")
        .eq("account_id", args.accountId)
        .ilike("title", title);
      if (artist) dupQ = dupQ.ilike("artist_name", artist);
      if (args?.release_date) dupQ = dupQ.eq("release_date", args.release_date);
      const { data: existing } = await dupQ.limit(1);
      if (existing && existing.length > 0) {
        return {
          ok: false,
          duplicate: true,
          existingReleaseId: existing[0].id,
          error: `Duplicate: "${existing[0].title}" already exists for this account (id: ${existing[0].id}). Use update_distrokid_release instead, ya user se explicit confirm lo before creating another.`,
        };
      }
      const insert: any = { account_id: args.accountId, title };
      if (artist) insert.artist_name = artist;
      const RELEASE_FIELDS = [
        "type", "release_date", "notes",
        "upc", "album_uid", "isrcs", "cover_url", "genre", "sub_genre", "language", "label", "explicit",
        "platforms", "submitted_at", "live_at", "ig_audio_url",
        "spotify_url", "apple_url", "youtube_url",
        "featured_artists", "composers", "lyricists", "copyright_line", "phonogram_line",
        "tracks", "track_durations",
      ];
      for (const k of RELEASE_FIELDS) {
        if (args?.[k] !== undefined) insert[k] = args[k];
      }
      normalizeReleasePayload(insert);
      const { data, error } = await ctx.userClient.from("distrokid_releases").insert(insert).select("id, title").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, releaseId: (data as any).id, title: (data as any).title };
    }
    if (name === "update_distrokid_release") {
      const patch: any = {};
      const UPDATE_FIELDS = [
        "title", "artist_name", "type", "release_date", "notes",
        "active_source", "passive_source",
        "upc", "album_uid", "isrcs", "cover_url", "genre", "sub_genre", "language", "label", "explicit",
        "platforms", "submitted_at", "live_at", "ig_audio_url",
        "spotify_url", "apple_url", "youtube_url",
        "featured_artists", "composers", "lyricists", "copyright_line", "phonogram_line",
        "status_override",
        "tracks", "track_durations",
      ];
      for (const k of UPDATE_FIELDS) {
        if (args?.[k] !== undefined) patch[k] = args[k];
      }
      normalizeReleasePayload(patch);
      // Platforms are add-only: merge with whatever is already ticked.
      if (Array.isArray(patch.platforms)) {
        const { data: current } = await ctx.userClient
          .from("distrokid_releases").select("platforms").eq("id", args?.releaseId).maybeSingle();
        const existing = normalizePlatforms((current as any)?.platforms || []);
        patch.platforms = Array.from(new Set([...existing, ...patch.platforms]));
      }
      const { data, error } = await ctx.userClient.from("distrokid_releases").update(patch).eq("id", args?.releaseId).select("id, title").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, releaseId: (data as any).id, title: (data as any).title };
    }
    // NOTE: list_release_tracks is a READ tool — implemented in executeReadTool.
    if (name === "upsert_release_tracks") {
      const releaseId = String(args?.releaseId || "");
      const rows: any[] = Array.isArray(args?.tracks) ? args.tracks : [];
      if (!releaseId || rows.length === 0) return { ok: false, error: "releaseId aur tracks required" };
      const { data: existing, error: exErr } = await ctx.userClient
        .from("distrokid_release_tracks").select("id, position, ig_audio_url").eq("release_id", releaseId);
      if (exErr) return { ok: false, error: exErr.message };
      const byPos = new Map<number, any>();
      for (const e of (existing || []) as any[]) byPos.set(e.position, e);
      const norm = (v: unknown) => {
        const s = String(v ?? "").trim();
        return s.length ? s : null;
      };
      let created = 0, updated = 0;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i] || {};
        const pos = Number(r.position) > 0 ? Number(r.position) : i + 1;
        const igUrl = norm(r.ig_audio_url);
        const payload: any = {
          release_id: releaseId,
          position: pos,
          title: String(r.title || "").trim(),
          isrc: norm(r.isrc),
          duration_seconds: r.duration_seconds != null ? Number(r.duration_seconds) : null,
          active_source: norm(r.active_source),
          active_source_url: norm(r.active_source_url),
          passive_source: norm(r.passive_source),
          passive_source_url: norm(r.passive_source_url),
          ig_audio_url: igUrl,
          ig_audio_id: igUrl ? (igUrl.match(/\/reels?\/audio\/(\d+)/i)?.[1] || null) : null,
        };
        const prev = byPos.get(pos);
        if (prev) {
          if (prev.ig_audio_url !== igUrl) {
            payload.ig_live_status = null;
            payload.ig_last_checked_at = null;
            payload.ig_last_live_at = null;
            payload.ig_next_check_at = null;
          }
          const { error } = await ctx.userClient.from("distrokid_release_tracks").update(payload).eq("id", prev.id);
          if (error) return { ok: false, error: error.message };
          updated++;
        } else {
          const { error } = await ctx.userClient.from("distrokid_release_tracks").insert(payload);
          if (error) return { ok: false, error: error.message };
          created++;
        }
      }
      // Keep the release-level jsonb mirror in sync so tables/exports stay correct.
      const { data: all } = await ctx.userClient
        .from("distrokid_release_tracks").select("title, isrc, duration_seconds, ig_audio_url")
        .eq("release_id", releaseId).order("position", { ascending: true });
      const list = (all || []) as any[];
      await ctx.userClient.from("distrokid_releases").update({
        tracks: list.map((t) => t.title || ""),
        isrcs: list.map((t) => t.isrc || ""),
        track_durations: list.map((t) => t.duration_seconds ?? null),
        ig_audio_url: list.find((t) => t.ig_audio_url)?.ig_audio_url || null,
      }).eq("id", releaseId);
      return { ok: true, releaseId, created, updated, total: list.length };
    }
    if (name === "update_release_track") {
      const patch: any = {};
      const FIELDS = [
        "title", "isrc", "duration_seconds", "position",
        "active_source", "active_source_url", "passive_source", "passive_source_url", "ig_audio_url",
      ];
      for (const k of FIELDS) if (args?.[k] !== undefined) patch[k] = args[k];
      if (patch.ig_audio_url !== undefined) {
        const u = String(patch.ig_audio_url || "").trim() || null;
        patch.ig_audio_url = u;
        patch.ig_audio_id = u ? (u.match(/\/reels?\/audio\/(\d+)/i)?.[1] || null) : null;
        patch.ig_live_status = null;
        patch.ig_next_check_at = null;
      }
      const { data, error } = await ctx.userClient
        .from("distrokid_release_tracks").update(patch).eq("id", args?.trackId).select("id, release_id, position, title").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, track: data };
    }
    if (name === "delete_release_track") {
      const { error } = await ctx.userClient.from("distrokid_release_tracks").delete().eq("id", args?.trackId);
      if (error) return { ok: false, error: error.message };
      return { ok: true, trackId: args?.trackId };
    }
    if (name === "delete_distrokid_release") {

      const { error } = await ctx.userClient.from("distrokid_releases").delete().eq("id", args?.releaseId);
      if (error) return { ok: false, error: error.message };
      return { ok: true, releaseId: args.releaseId };
    }
    if (name === "create_distrokid_earning") {
      const insert: any = {
        account_id: args.accountId,
        amount_usd: args.amount_usd,
        recorded_date: args.recorded_date || new Date().toISOString().slice(0, 10),
      };
      for (const k of ["period_month", "source", "notes"]) {
        if (args?.[k] !== undefined) insert[k] = args[k];
      }
      const { data, error } = await ctx.userClient.from("distrokid_earnings").insert(insert).select("id").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, earningId: (data as any).id };
    }
    if (name === "commit_distrokid_royalties") {
      const accountId = String(args?.accountId || "");
      const rows: any[] = Array.isArray(args?.rows) ? args.rows : [];
      if (!accountId || rows.length === 0) return { ok: false, error: "accountId aur rows required" };
      const { data: releases, error: relErr } = await ctx.userClient
        .from("distrokid_releases").select("id, title, upc, isrcs").eq("account_id", accountId);
      if (relErr) return { ok: false, error: relErr.message };
      const list = (releases || []) as any[];
      const byIsrc = new Map<string, string>();
      const byUpc = new Map<string, string>();
      const byTitle = new Map<string, string>();
      for (const r of list) {
        for (const code of (Array.isArray(r.isrcs) ? r.isrcs : [])) {
          if (code) byIsrc.set(String(code).toUpperCase().replace(/[^A-Z0-9]/g, ""), r.id);
        }
        if (r.upc) byUpc.set(String(r.upc).replace(/\D/g, ""), r.id);
        if (r.title) byTitle.set(String(r.title).trim().toLowerCase(), r.id);
      }
      let saved = 0, updated = 0;
      const unmatched: any[] = [];
      const errors: string[] = [];
      for (const row of rows) {
        const isrc = String(row?.isrc || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        const upc = String(row?.upc || "").replace(/\D/g, "");
        const title = String(row?.title || "").trim().toLowerCase();
        const releaseId = byIsrc.get(isrc) || byUpc.get(upc) || byTitle.get(title);
        if (!releaseId) { unmatched.push({ title: row?.title, isrc: row?.isrc, platform: row?.platform, amount_usd: row?.amount_usd }); continue; }
        const month = String(row?.period_month || "").slice(0, 7);
        if (!/^\d{4}-\d{2}$/.test(month)) { errors.push(`bad period_month for ${row?.title}`); continue; }
        const payload: any = {
          release_id: releaseId,
          // account_id is NOT NULL in the schema — always stamp it from the target account.
          account_id: accountId,
          platform: String(row.platform),
          period_month: `${month}-01`,
          amount_usd: Number(row.amount_usd) || 0,
          // units is NOT NULL DEFAULT 0 — never send null.
          units: row?.units != null && Number.isFinite(Number(row.units)) ? Number(row.units) : 0,
          country_count: row?.country_count != null ? Number(row.country_count) : null,
          reporting_date: row?.reporting_date || null,
          source: "statement",
        };
        const { data: existing } = await ctx.userClient
          .from("distrokid_release_earnings").select("id")
          .eq("release_id", releaseId).eq("platform", payload.platform).eq("period_month", payload.period_month)
          .maybeSingle();
        if (existing?.id) {
          const { error } = await ctx.userClient.from("distrokid_release_earnings").update(payload).eq("id", existing.id);
          if (error) errors.push(error.message); else updated++;
        } else {
          const { error } = await ctx.userClient.from("distrokid_release_earnings").insert(payload);
          if (error) errors.push(error.message); else saved++;
        }
      }
      return { ok: errors.length === 0, inserted: saved, updated, unmatched, errors: errors.slice(0, 5) };
    }
    if (name === "create_distrokid_withdrawal") {
      // Duplicate guard (prompt promise): same account + same amount + same date.
      const wDate = String(args?.submitted_at || new Date().toISOString()).slice(0, 10);
      const { data: dupWd } = await ctx.userClient
        .from("distrokid_withdrawals")
        .select("id, amount_usd_submitted, submitted_at")
        .eq("account_id", args?.accountId)
        .eq("amount_usd_submitted", args?.amount_usd_submitted)
        .gte("submitted_at", `${wDate}T00:00:00`)
        .lte("submitted_at", `${wDate}T23:59:59`)
        .limit(1);
      if ((dupWd as any[])?.length) {
        const d = (dupWd as any[])[0];
        return { ok: false, duplicate: true, withdrawalId: d.id, error: `Isi account par ${wDate} ko $${args?.amount_usd_submitted} ka withdrawal pehle se hai — duplicate nahi banaya.` };
      }
      const insert: any = {
        account_id: args.accountId,
        amount_usd_submitted: args.amount_usd_submitted,
        status: args.status,
        submitted_at: args.submitted_at || new Date().toISOString(),
      };
      if (args?.notes !== undefined) insert.notes = args.notes;
      const { data, error } = await ctx.userClient.from("distrokid_withdrawals").insert(insert).select("id").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, withdrawalId: (data as any).id };
    }
    if (name === "update_distrokid_withdrawal") {
      const patch: any = {};
      for (const k of ["status", "received_date", "amount_usd_received", "inr_amount", "conversion_rate", "notes"]) {
        if (args?.[k] !== undefined) patch[k] = args[k];
      }
      const { data, error } = await ctx.userClient.from("distrokid_withdrawals").update(patch).eq("id", args?.withdrawalId).select("id").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, withdrawalId: (data as any).id };
    }
    if (name === "create_distrokid_guide") {
      const title = String(args?.title || "").trim().slice(0, 300);
      if (!title) return { ok: false, error: "title required" };
      const insert: any = {
        title,
        slug: await uniqueGuideSlug(ctx.userClient, title),
        content_md: String(args?.content_md || ""),
        status: args?.status || "draft",
      };
      for (const k of ["summary", "category_id"]) { if (args?.[k] !== undefined) insert[k] = args[k]; }
      const { data, error } = await ctx.userClient.from("distrokid_guide_articles").insert(insert).select("id, title, slug").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, articleId: (data as any).id, title: (data as any).title, slug: (data as any).slug };
    }
    if (name === "update_distrokid_guide") {
      const patch: any = {};
      for (const k of ["title", "summary", "content_md", "status"]) { if (args?.[k] !== undefined) patch[k] = args[k]; }
      const { data, error } = await ctx.userClient.from("distrokid_guide_articles").update(patch).eq("id", args?.articleId).select("id, title").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, articleId: (data as any).id, title: (data as any).title };
    }
    if (name === "create_distrokid_guide_category") {
      const catName = String(args?.name || "").trim().slice(0, 120);
      if (!catName) return { ok: false, error: "name required" };
      const slug = String(args?.slug || catName).toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80) || `cat-${Date.now()}`;
      const insert: any = { name: catName, slug };
      for (const k of ["description", "icon", "sort_order"]) { if (args?.[k] !== undefined) insert[k] = args[k]; }
      const { data, error } = await ctx.userClient.from("distrokid_guide_categories").insert(insert).select("id, name, slug").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, categoryId: (data as any).id, name: (data as any).name, slug: (data as any).slug };
    }
    if (name === "update_distrokid_guide_category") {
      const patch: any = {};
      for (const k of ["name", "description", "slug", "icon", "sort_order"]) { if (args?.[k] !== undefined) patch[k] = args[k]; }
      const { data, error } = await ctx.userClient.from("distrokid_guide_categories").update(patch).eq("id", args?.categoryId).select("id, name").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, categoryId: (data as any).id, name: (data as any).name };
    }
  } catch (e: any) {
    const msg = String(e?.message || e);
    await logHealth({ source: "notepad-chat.executeWriteTool", event_type: name, message: msg, severity: "error", user_id: ctx.userId, context: { args } });
    return { ok: false, error: msg };
  }
  await logHealth({ source: "notepad-chat.executeWriteTool", event_type: name, message: "unknown write tool", severity: "warn", user_id: ctx.userId, context: { args } });
  return { ok: false, error: "unknown write tool" };
}

function summarizeProposal(name: string, args: any): string {
  if (name === "create_note") return `Create note "${args?.title || "Untitled"}" (${String(args?.content || "").length} chars)`;
  if (name === "update_note") return `Update note ${args?.noteId}${args?.title ? ` → title "${args.title}"` : ""}${typeof args?.content === "string" ? ` (${args.content.length} chars new content)` : ""}`;
  if (name === "append_to_note") return `Append ${String(args?.content || "").length} chars to note ${args?.noteId}`;
  if (name === "create_unreplied") return `Add un-replied message "${String(args?.message || "").slice(0, 60)}"`;
  if (name === "update_unreplied") return `Update un-replied entry ${args?.entryId} (${Object.keys(args || {}).filter((k) => k !== "entryId").join(", ") || "no fields"})`;
  if (name === "delete_unreplied") return `Delete un-replied entry ${args?.entryId}`;
  if (name === "create_todo") return `Create todo "${args?.title || ""}"${args?.due_date ? ` (due ${args.due_date})` : ""}${args?.priority ? ` [${args.priority}]` : ""}`;
  if (name === "update_todo") {
    const fields = Object.keys(args || {}).filter((k) => k !== "todoId").join(", ");
    return `Update todo ${args?.todoId} (${fields || "no fields"})`;
  }
  if (name === "complete_todo") return `Mark todo ${args?.todoId} as done`;
  if (name === "delete_todo") return `Delete todo ${args?.todoId}`;
  if (name === "create_person") return `Add person "${args?.name || ""}"${args?.relation_with_me ? ` (${args.relation_with_me})` : ""}`;
  if (name === "create_distrokid_account") return `Create Distrokid account "${args?.title || args?.email || ""}" [${args?.tab || ""}]`;
  if (name === "update_distrokid_account") {
    const fields = Object.keys(args || {}).filter((k) => k !== "accountId").join(", ");
    return `Update Distrokid account ${args?.accountId} (${fields})`;
  }
  if (name === "create_distrokid_release") return `Create release "${args?.title || ""}" by ${args?.artist_name || "?"}`;
  if (name === "update_distrokid_release") {
    const fields = Object.keys(args || {}).filter((k) => k !== "releaseId").join(", ");
    return `Update release ${args?.releaseId} (${fields})`;
  }
  if (name === "delete_distrokid_release") return `Delete release ${args?.releaseId}`;
  if (name === "upsert_release_tracks") {
    const rows: any[] = Array.isArray(args?.tracks) ? args.tracks : [];
    return `Set ${rows.length} track${rows.length === 1 ? "" : "s"} (with per-track source/IG) on release ${args?.releaseId}`;
  }
  if (name === "update_release_track") {
    const fields = Object.keys(args || {}).filter((k) => k !== "trackId").join(", ");
    return `Update track ${args?.trackId} (${fields})`;
  }
  if (name === "delete_release_track") return `Delete track ${args?.trackId}`;
  if (name === "commit_distrokid_royalties") {
    const rows: any[] = Array.isArray(args?.rows) ? args.rows : [];
    const total = rows.reduce((sum, r) => sum + (Number(r?.amount_usd) || 0), 0);
    return `Save ${rows.length} royalty rows ($${total.toFixed(2)}) into release earnings`;
  }
  if (name === "create_distrokid_earning") return `Record earning $${args?.amount_usd} on account ${args?.accountId}`;
  if (name === "create_distrokid_withdrawal") return `Create withdrawal $${args?.amount_usd_submitted} (${args?.status})`;
  if (name === "update_distrokid_withdrawal") {
    const fields = Object.keys(args || {}).filter((k) => k !== "withdrawalId").join(", ");
    return `Update withdrawal ${args?.withdrawalId} (${fields})`;
  }
  if (name === "create_distrokid_guide") return `Create guide article "${args?.title || ""}" (${String(args?.content_md || "").length} chars)`;
  if (name === "update_distrokid_guide") {
    const fields = Object.keys(args || {}).filter((k) => k !== "articleId").join(", ");
    return `Update guide article ${args?.articleId} (${fields})`;
  }
  if (name === "create_distrokid_guide_category") return `Create guide category "${args?.name || ""}"`;
  if (name === "update_distrokid_guide_category") {
    const fields = Object.keys(args || {}).filter((k) => k !== "categoryId").join(", ");
    return `Update guide category ${args?.categoryId} (${fields})`;
  }
  return name;
}

// Convert stored messages (parts jsonb) → OpenAI chat messages.
// User messages with image attachments (from metadata) become multimodal content arrays.
// For the most recent user message, text-like attachments (csv/text/json/md/zip) are
// fetched from their signed URL and inlined so the model can actually read them.
const TEXT_EXT = new Set(["csv","tsv","txt","json","md","log","xml","yml","yaml"]);
const PER_ATT_CAP = 40 * 1024;
const PER_MSG_CAP = 80 * 1024;

function isTextLike(a: any): boolean {
  const name = String(a?.name || "").toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop()! : "";
  const mime = String(a?.mime || "").toLowerCase();
  if (a?.kind === "csv" || a?.kind === "text") return true;
  if (TEXT_EXT.has(ext)) return true;
  if (mime.startsWith("text/") || mime === "application/json") return true;
  return false;
}

function truncate(s: string, cap: number): string {
  if (s.length <= cap) return s;
  return s.slice(0, cap) + `\n… [truncated, ${s.length - cap} more chars]`;
}

async function inlineAttachment(a: any, budgetLeft: number): Promise<string | null> {
  if (budgetLeft <= 0) return null;
  try {
    const res = await fetch(a.url);
    if (!res.ok) return `[Could not read ${a.name || "file"}: HTTP ${res.status}]`;
    if (a.kind === "zip") {
      const { unzipSync, strFromU8 } = await import("fflate");
      const buf = new Uint8Array(await res.arrayBuffer());
      const entries = unzipSync(buf);
      const names = Object.keys(entries);
      const listing = names.map((n) => `- ${n} (${entries[n].length} bytes)`).join("\n");
      const parts: string[] = [`Archive: ${a.name || "file.zip"} (${names.length} entries)\n${listing}`];
      let left = Math.min(budgetLeft, PER_ATT_CAP) - parts[0].length;
      for (const n of names) {
        if (left <= 0) break;
        const nLow = n.toLowerCase();
        const nExt = nLow.includes(".") ? nLow.split(".").pop()! : "";
        if (!TEXT_EXT.has(nExt)) continue;
        const data = entries[n];
        if (data.length > 200 * 1024) continue;
        try {
          const txt = truncate(strFromU8(data), Math.min(left, PER_ATT_CAP));
          const block = `\n\n\`\`\`${nExt}\n# ${n}\n${txt}\n\`\`\``;
          parts.push(block);
          left -= block.length;
        } catch { /* skip binary entry */ }
      }
      return parts.join("");
    }
    if (isTextLike(a)) {
      const txt = await res.text();
      const nameLow = String(a.name || "").toLowerCase();
      const ext = nameLow.includes(".") ? nameLow.split(".").pop()! : "txt";
      return `\`\`\`${ext}\n# ${a.name || "file"}\n${truncate(txt, Math.min(budgetLeft, PER_ATT_CAP))}\n\`\`\``;
    }
    return null;
  } catch (e) {
    return `[Could not read ${a.name || "file"}: ${(e as Error).message}]`;
  }
}

async function messagesToOpenAI(rows: { role: string; parts: any; metadata?: any }[]): Promise<any[]> {
  const out: any[] = [];
  // Google models reject a history where an assistant tool_call has no matching
  // tool response (and vice-versa). Pending/rejected proposals or a trimmed
  // history window can leave orphans, which permanently 400s the whole thread.
  // Pass 1: collect every tool_call_id that actually has a result row.
  const resultsById = new Map<string, any>();
  for (const r of rows) {
    if (r.role !== "tool") continue;
    for (const p of (Array.isArray(r.parts) ? r.parts : [])) {
      if (p?.type === "tool_result" && p.tool_call_id) resultsById.set(String(p.tool_call_id), p);
    }
  }
  const consumedResultIds = new Set<string>();
  let repaired = 0;
  // Find last user row index so we only inline attachments for the current turn.
  let lastUserIdx = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].role === "user") { lastUserIdx = i; break; }
  }
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    const parts = Array.isArray(r.parts) ? r.parts : [];
    if (r.role === "user") {
      const text = parts.filter((p: any) => p?.type === "text").map((p: any) => p.text).join("");
      const meta = (r.metadata && typeof r.metadata === "object") ? r.metadata : {};
      const atts: any[] = Array.isArray(meta.attachments) ? meta.attachments : [];
      const imageAtts = atts.filter((a) => a?.kind === "image" && typeof a.url === "string");
      const otherAtts = atts.filter((a) => a?.kind !== "image" && typeof a.url === "string");

      // Inline text-like attachments only for the latest user turn.
      let inlinedNote = "";
      if (i === lastUserIdx && otherAtts.length) {
        let budget = PER_MSG_CAP;
        const chunks: string[] = [];
        for (const a of otherAtts) {
          if (isTextLike(a) || a.kind === "zip") {
            const inl = await inlineAttachment(a, budget);
            if (inl) { chunks.push(inl); budget -= inl.length; }
          }
        }
        if (chunks.length) inlinedNote = "\n\n" + chunks.join("\n\n");
      }

      const refNote = otherAtts.length
        ? otherAtts.map((a) => `[Attachment: ${a.name || "file"} (${a.kind || "file"}) ${a.url}]`).join("\n")
        : "";

      if (imageAtts.length > 0 && i === lastUserIdx) {
        // Gemini rejects remote image URLs — inline as base64 for the current turn only.
        const { parts: imgParts, failures } = await inlineImageParts(imageAtts.map((a) => a.url as string));
        const notes = failures.length
          ? failures.map((f) => `[Attached image could not be read: ${f.error}]`).join("\n")
          : "";
        const content: any[] = [];
        const combinedText = [text, refNote, inlinedNote, notes].filter(Boolean).join("\n\n").trim();
        if (combinedText) content.push({ type: "text", text: combinedText });
        content.push(...imgParts);
        if (imgParts.length === 0) {
          out.push({ role: "user", content: combinedText || "[image attachment unreadable]" });
        } else if (content.length) {
          out.push({ role: "user", content });
        }
      } else if (imageAtts.length > 0) {
        // Older turns: never resend image bytes (payload + poisoning risk).
        const stub = imageAtts.map((a) => `[Earlier screenshot: ${a.name || "image"}]`).join("\n");
        const finalText = [text, refNote, stub].filter(Boolean).join("\n\n");
        out.push({ role: "user", content: finalText || "[earlier screenshot]" });
      } else if (text.trim() || atts.length) {
        const finalText = [text, refNote, inlinedNote].filter(Boolean).join("\n\n");
        out.push({ role: "user", content: finalText });
      }
    } else if (r.role === "assistant") {
      const text = parts.filter((p: any) => p?.type === "text").map((p: any) => p.text).join("");
      const tcPart = parts.find((p: any) => p?.type === "tool_calls");
      const msg: any = { role: "assistant", content: text || "" };
      const allCalls: any[] = (tcPart && Array.isArray(tcPart.tool_calls)) ? tcPart.tool_calls : [];
      // Only keep calls whose result exists; describe the rest as plain text so
      // the model still has context but tool-call/response pairing stays exact.
      // Gemini tool history is replayable only when its provider payload is
      // preserved. Legacy normalized calls dropped thought_signature, so replay
      // them as factual text instead of sending an invalid functionCall turn.
      const replayable = (tc: any) => tc?.id && resultsById.has(String(tc.id)) && tc.provider_call?.function;
      // Gemini requires one response for every function call in an assistant
      // turn. Never replay a partial multi-call group.
      const completeGroup = allCalls.length > 0 && allCalls.every(replayable);
      const kept = completeGroup ? allCalls : [];
      const dropped = completeGroup ? [] : allCalls;
      if (kept.length > 0) {
        msg.tool_calls = kept.map((tc: any) => tc.provider_call);
      }
      if (dropped.length > 0) {
        repaired += dropped.length;
        const note = dropped.map((tc: any) => {
          const result = tc?.id ? resultsById.get(String(tc.id))?.result : null;
          return result
            ? `[Earlier ${tc?.name || "tool"} result: ${JSON.stringify(result).slice(0, 1200)}]`
            : `[pending/cancelled action: ${tc?.name || "tool"}]`;
        }).join(" ");
        msg.content = [msg.content, note].filter(Boolean).join("\n");
      }
      if (msg.content || msg.tool_calls) out.push(msg);
      // Gemini requires a function-call turn to be followed immediately by one
      // response for every call, in the same order. Approval flows persist those
      // results later (sometimes with user turns between them), so replaying DB
      // rows chronologically is invalid even when all IDs match. Rebuild each
      // completed assistant tool turn as one atomic call -> results group.
      for (const tc of kept) {
        const id = String(tc.id);
        const resultPart = resultsById.get(id);
        consumedResultIds.add(id);
        out.push({
          role: "tool",
          tool_call_id: id,
          content: truncate(typeof resultPart?.result === "string" ? resultPart.result : JSON.stringify(resultPart?.result ?? {}), TOOL_RESULT_CAP),
        });
      }
    } else if (r.role === "tool") {
      // Results are emitted beside their originating assistant message above.
      // Keeping their original DB position can separate a multi-call turn and
      // causes Gemini's "function response parts" 400.
      for (const p of parts) {
        if (p?.type === "tool_result" && p.tool_call_id && !consumedResultIds.has(String(p.tool_call_id))) repaired++;
      }
    }
  }
  if (repaired > 0) {
    console.warn(`[workspace-ai.history-repair] reconciled ${repaired} orphan tool call/result part(s)`);
  }
  return out;
}


async function loadHistoryRows(userClient: any, threadId: string) {
  // Take the MOST RECENT rows (descending + reverse); an ascending limit would
  // keep only the oldest messages and drop the current conversation context.
  const { data } = await userClient
    .from("workspace_ai_messages")
    .select("id, role, parts, metadata, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(80);
  const rows = ((data || []) as { id: string; role: string; parts: any; metadata: any; created_at: string }[]).reverse();
  // Never start the window on a dangling tool-result row (its assistant call
  // would be outside the window) — trim leading tool rows.
  let start = 0;
  while (start < rows.length && rows[start].role === "tool") start++;
  return rows.slice(start);
}


// Per-attempt wall clock for one model call. Gemini "thinking" turns can be
// slow, but a hung socket must never eat the whole function timeout — otherwise
// the SSE stream dies without ever emitting an `error`/`done` event and the UI
// hangs on "soch raha hoon" forever.
const AI_CALL_TIMEOUT_MS = 90_000;

// 429 do tarah ke hote hain:
//  - real rate limit (thodi der baad chalega)  → backoff retry karo
//  - quota/billing exhausted (aaj nahi chalega) → retry bekaar, turant batao
function isQuotaExhausted(body: string): boolean {
  const t = String(body || "").toLowerCase();
  return t.includes("exceeded your current quota")
    || t.includes("quota_exceeded")
    || t.includes("insufficient_quota")
    || t.includes("resource_exhausted")
    || t.includes("billing");
}

function retryDelayMs(res: Response, attempt: number): number {
  const ra = Number(res.headers.get("retry-after"));
  if (Number.isFinite(ra) && ra > 0) return Math.min(ra * 1000, 10_000);
  return 500 * 2 ** attempt;
}

// Quota khatam hone par sasste model par gir jaate hain — inka quota alag hota hai.
const MODEL_FALLBACKS: Record<string, string[]> = {
  deep: ["fast", "lite"],
  fast: ["lite"],
  lite: [],
};




// Real token streaming. Upstream SSE ko parse karke onDelta se live text bahar
// bhejta hai, aur turn khatam hone par wahi normalized `message` shape deta hai
// jo non-streaming call deta tha (tool_calls + thought_signature ke saath).
// Retry sirf tab jab pehla token aane se pehle fail hua ho — warna user ko
// duplicate text dikhega.
async function callAIStream(
  apiKey: string,
  messages: any[],
  tools: any[],
  clientSignal: AbortSignal | undefined,
  onDelta: (text: string) => void,
  model: string = CHAT_MODEL,
): Promise<{ message: any; usage: any }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (clientSignal?.aborted) {
      const e: any = new Error("client disconnected");
      e.clientAborted = true;
      throw e;
    }
    const body: any = { model, messages, stream: true, stream_options: { include_usage: true } };
    if (tools.length) { body.tools = tools; body.tool_choice = "auto"; }
    let emitted = false;
    // Provider chup ho jaaye (koi byte na aaye) to hamesha ke liye latakna nahi
    // chahiye — 90s idle par stream abort karke error/retry path pe jaate hain.
    const IDLE_MS = 90_000;
    const ac = new AbortController();
    const onClientAbort = () => ac.abort();
    clientSignal?.addEventListener("abort", onClientAbort);
    let idleTimedOut = false;
    try {
      const res = await fetch(GEMINI_CHAT_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        const quota = res.status === 429 && isQuotaExhausted(text);
        if (!quota && (res.status === 429 || res.status >= 500) && attempt < 2) {
          await new Promise((r) => setTimeout(r, retryDelayMs(res, attempt)));
          continue;
        }
        const err: any = new Error(`AI provider ${res.status}: ${text.slice(0, 200)}`);
        err.status = res.status;
        if (quota) err.quotaExhausted = true;
        throw err;
      }


      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let content = "";
      const calls: any[] = [];
      let usage: any = null;
      let extra: any = null;

      while (true) {
        let idleTimer: number | undefined;
        const idle = new Promise<never>((_, rej) => {
          idleTimer = setTimeout(() => {
            idleTimedOut = true;
            ac.abort();
            rej(new Error("AI stream idle timeout"));
          }, IDLE_MS) as unknown as number;
        });
        let value: Uint8Array | undefined;
        let done = false;
        try {
          const r = await Promise.race([reader.read(), idle]);
          value = r.value; done = r.done;
        } finally {
          clearTimeout(idleTimer);
        }
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const chunks = buf.split("\n\n");
        buf = chunks.pop() || "";
        for (const chunk of chunks) {
          for (const line of chunk.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            let obj: any;
            try { obj = JSON.parse(payload); } catch { continue; }
            if (obj.usage) usage = obj.usage;
            const delta = obj?.choices?.[0]?.delta;
            if (!delta) continue;
            if (typeof delta.content === "string" && delta.content) {
              content += delta.content;
              emitted = true;
              onDelta(delta.content);
            }
            if (delta.extra_content) extra = { ...(extra || {}), ...delta.extra_content };
            if (Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                const idx = typeof tc.index === "number" ? tc.index : calls.length;
                const slot = calls[idx] || (calls[idx] = { id: "", type: "function", function: { name: "", arguments: "" } });
                if (tc.id) slot.id = tc.id;
                if (tc.type) slot.type = tc.type;
                // Gemini thinking models ship thought_signature alongside the call;
                // ye verbatim carry hona zaroori hai warna next turn 400 deta hai.
                for (const [k, v] of Object.entries(tc)) {
                  if (k === "index" || k === "id" || k === "type" || k === "function") continue;
                  (slot as any)[k] = v;
                }
                if (tc.function?.name) slot.function.name += tc.function.name;
                if (typeof tc.function?.arguments === "string") slot.function.arguments += tc.function.arguments;
                for (const [k, v] of Object.entries(tc.function || {})) {
                  if (k === "name" || k === "arguments") continue;
                  (slot.function as any)[k] = v;
                }
              }
            }
          }
        }
      }

      const toolCalls = calls.filter(Boolean);
      const message: any = { role: "assistant", content: content || null };
      if (toolCalls.length) message.tool_calls = toolCalls;
      if (extra) message.extra_content = extra;
      return { message, usage };
    } catch (e: any) {
      if (clientSignal?.aborted) {
        const ce: any = new Error("client disconnected");
        ce.clientAborted = true;
        throw ce;
      }
      if (e?.status) throw e;
      if (!emitted && attempt < 2) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        continue;
      }
      const err: any = new Error(
        idleTimedOut
          ? "AI stream 90s tak chup raha (idle timeout)"
          : `AI stream failed: ${String(e?.message || e).slice(0, 200)}`,
      );
      err.status = 503;
      throw err;
    } finally {
      clientSignal?.removeEventListener("abort", onClientAbort);
    }
  }
  throw new Error("AI provider unavailable");
}



/**
 * Reads the last few turns of a thread and asks the lite model for a topic-based
 * title (never a copy of the first message). Best-effort: null on any failure.
 */
async function generateSmartTitle(apiKey: string, transcript: string): Promise<string | null> {
  try {
    const prompt = `Below is the beginning of a chat between a user and their workspace assistant. Understand what the conversation is actually ABOUT (the topic / task), then write a short title for it.

Rules:
- 3–6 words, specific and descriptive of the topic.
- Do NOT copy or paraphrase the user's message verbatim.
- Match the user's language (Hinglish / Hindi / English).
- No quotes, no trailing period, no emoji. Output only the title.

CONVERSATION:
${transcript.slice(0, 4000)}

Title:`;
    const res = await fetch(GEMINI_CHAT_URL, {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GEMINI_LITE_MODEL,
        messages: [
          { role: "system", content: "You write concise, specific chat titles. 3–6 words. No quotes." },
          { role: "user", content: prompt },
        ],
        max_tokens: 40,
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    let title: string = j?.choices?.[0]?.message?.content || "";
    title = title.replace(/^["'`\s]+|["'`\s.]+$/g, "").replace(/\s+/g, " ").trim();
    if (!title) return null;
    if (title.length > 60) title = title.slice(0, 57) + "...";
    return title;
  } catch {
    return null;
  }
}

/**
 * Auto-names a thread from the conversation itself. Runs for the first few turns
 * only, and never after the user renamed the chat manually (title_auto = false).
 */
async function maybeAutoTitleThread(
  userClient: any,
  apiKey: string,
  threadId: string,
  enq: (o: any) => void,
): Promise<string | null> {
  try {
    const { data: th } = await userClient
      .from("workspace_ai_threads")
      .select("title, title_auto")
      .eq("id", threadId)
      .maybeSingle();
    if (!th) return null;
    if ((th as any).title_auto === false) return null;

    const { data: rows } = await userClient
      .from("workspace_ai_messages")
      .select("role, parts")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(12);
    const msgs = (rows || []) as Array<{ role: string; parts: any }>;
    const userTurns = msgs.filter((m) => m.role === "user").length;
    if (userTurns === 0 || userTurns > 4) return null;

    const textOf = (parts: any) =>
      (Array.isArray(parts) ? parts : [])
        .map((p: any) => (p?.type === "text" ? String(p.text || "") : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

    const transcript = msgs
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => `${m.role === "user" ? "USER" : "ASSISTANT"}: ${textOf(m.parts).slice(0, 700)}`)
      .filter((l) => l.length > 10)
      .join("\n");
    if (!transcript) return null;

    const smart = await generateSmartTitle(apiKey, transcript);
    if (!smart || smart === (th as any).title) return null;

    await userClient.from("workspace_ai_threads").update({ title: smart }).eq("id", threadId);
    enq({ type: "title", threadId, title: smart });
    return smart;
  } catch (e) {
    console.warn("auto title fail", e);
    return null;
  }
}



export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const LOVABLE_API_KEY = process.env["GEMINI_API_KEY"];
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_ANON_KEY"]!, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const userId = userData.user.id;
  const adminClient = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!);
  const { data: roleRow } = await adminClient.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  type Attachment = { url: string; name: string; kind: "image" | "pdf" | "csv" | "zip" | "text" | "file"; mime?: string };
  type MentionRef = { noteId: string; title: string };
  type Body = {
    threadId?: string | null;
    message?: string | null;
    agent?: AgentId;
    mode?: AiMode;
    currentNoteId?: string | null;
    selectedText?: string | null;
    mentionedNoteIds?: string[];
    mentions?: MentionRef[];
    attachments?: Attachment[];
    autoApprove?: boolean;
    model?: string;
    approval?: { toolCallId: string; decision: "approve" | "reject"; edits?: { title?: string; content?: string } };
  };
  let body: Body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const isApproval = !!body.approval;
  const autoApprove = body.autoApprove === true;
  if (!isApproval && (!body.message || !body.message.trim())) {
    return new Response(JSON.stringify({ error: "message required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const requestedAgent: AgentId = "merged"; // Workspace AI is unified
  const mode: AiMode = body.mode === "editor" ? "editor" : body.mode === "viewer" ? "viewer" : "auto";
  // Model picker: UI se aayi choice ko allowlist se resolve karo.
  const modelChoice = typeof body.model === "string" && MODEL_CHOICES[body.model] ? body.model : "fast";
  // Quota fallback ke liye mutable — deep → fast → lite.
  let activeModelChoice = modelChoice;
  let chatModel = MODEL_CHOICES[modelChoice];


  const mentionedNoteIds = Array.isArray(body.mentionedNoteIds) ? body.mentionedNoteIds.filter(Boolean).slice(0, 8) : [];
  const attachments: Attachment[] = Array.isArray(body.attachments) ? body.attachments.slice(0, MAX_ATTACHMENTS) : [];
  type ContextRef = { type: string; id: string; label?: string };
  const contextRefs: ContextRef[] = Array.isArray((body as any).contextRefs)
    ? (body as any).contextRefs.filter((r: any) => r && typeof r.type === "string" && typeof r.id === "string").slice(0, 10)
    : [];
  const requestedFolderId = typeof (body as any).folderId === "string" && /^[0-9a-f-]{36}$/i.test((body as any).folderId)
    ? (body as any).folderId
    : null;

  // 1) Resolve thread.
  let threadId = body.threadId || null;
  let threadTitle = "New chat";
  let agent: AgentId = requestedAgent;
  if (threadId) {
    const { data: t } = await userClient.from("workspace_ai_threads").select("id, title").eq("id", threadId).maybeSingle();
    if (!t) threadId = null;
    else threadTitle = (t as any).title;
  }
  if (!threadId) {
    if (isApproval) {
      return new Response(JSON.stringify({ error: "approval needs threadId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    threadTitle = "New chat";
    let folderId: string | null = null;
    if (requestedFolderId) {
      const { data: ownFolder } = await userClient
        .from("workspace_ai_folders")
        .select("id")
        .eq("id", requestedFolderId)
        .maybeSingle();
      folderId = (ownFolder as any)?.id || null;
    }
    const { data: created, error: cErr } = await userClient.from("workspace_ai_threads").insert({
      user_id: userId, title: threadTitle, folder_id: folderId,
    }).select("id, title").single();
    if (cErr || !created) {
      return new Response(JSON.stringify({ error: "thread create failed", detail: cErr?.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    threadId = (created as any).id;
    threadTitle = (created as any).title;
  }

  // 2) Handle approval branch OR new user message.
  let pauseForPendingApprovals = false;
  if (isApproval) {
    const { toolCallId, decision, edits } = body.approval!;
    const rows = await loadHistoryRows(userClient, threadId!);
    let proposalArgs: any = null;
    let proposalName: string = "";
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      if (r.role !== "assistant") continue;
      const parts = Array.isArray(r.parts) ? r.parts : [];
      const tcPart = parts.find((p: any) => p?.type === "tool_calls");
      if (!tcPart) continue;
      const tc = tcPart.tool_calls?.find((x: any) => x.id === toolCallId);
      if (tc) { proposalArgs = tc.args; proposalName = tc.name; break; }
    }
    // The 80-row history window can push an older proposal out of scope, which
    // used to fail approval with a confusing 404. Fall back to a full-thread
    // scan for the exact tool_call id.
    if (!proposalName) {
      const { data: allRows } = await userClient
        .from("workspace_ai_messages")
        .select("parts")
        .eq("thread_id", threadId)
        .eq("role", "assistant")
        .order("created_at", { ascending: false })
        .limit(500);
      for (const r of ((allRows || []) as any[])) {
        const parts = Array.isArray(r.parts) ? r.parts : [];
        const tcPart = parts.find((p: any) => p?.type === "tool_calls");
        const tc = tcPart?.tool_calls?.find((x: any) => x.id === toolCallId);
        if (tc) { proposalArgs = tc.args; proposalName = tc.name; break; }
      }
    }

    if (!proposalName) {
      await logHealth({ source: "notepad-chat.approval", event_type: "proposal_not_found", message: `toolCallId ${toolCallId} history me nahi mila`, severity: "error", user_id: userId, thread_id: threadId, agent });
      return new Response(JSON.stringify({ error: "Ye action card purana ho gaya hai — chat refresh karke dobara try karein." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let result: any;
    let status: "approved" | "rejected" = decision === "approve" ? "approved" : "rejected";
    if (mode === "viewer" && decision === "approve") {
      status = "rejected";
      result = { ok: false, rejected: true, message: "Viewer mode is read-only. Switch to Editor or Auto mode to make changes." };
    } else if (decision === "approve") {
      const finalArgs = { ...proposalArgs, ...(edits || {}) };
      result = await executeWriteTool(proposalName, finalArgs, { userClient, userId });
      if (!(result as any).ok) {
        status = "rejected";
        await logHealth({ source: "notepad-chat.approval", event_type: proposalName, message: String((result as any)?.error || "write failed"), severity: "error", user_id: userId, thread_id: threadId, agent, context: { args: finalArgs } });
      }
    } else {
      result = { ok: false, rejected: true, message: "User rejected this action." };
    }

    const { error: approvalSaveError } = await userClient.from("workspace_ai_messages").insert({
      thread_id: threadId, user_id: userId, role: "tool",
      parts: [{ type: "tool_result", tool_call_id: toolCallId, name: proposalName, status, result }],
    });
    if (approvalSaveError) {
      await logHealth({ source: "notepad-chat.approval", event_type: "result_save_failed", message: approvalSaveError.message, severity: "error", user_id: userId, thread_id: threadId, agent, context: { tool: proposalName, status } });
      return new Response(JSON.stringify({ error: `Action ka result save nahi hua: ${approvalSaveError.message}`, applied: status === "approved" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // A Gemini multi-tool turn must receive every tool result together. If
    // other approval cards from the same turn are unresolved, persist this
    // decision and pause instead of sending an invalid partial continuation.
    const origin = rows.find((row: any) => row.role === "assistant" && (row.parts || []).some((part: any) => part?.type === "tool_calls" && (part.tool_calls || []).some((call: any) => call.id === toolCallId)));
    const originCalls = (origin?.parts || []).find((part: any) => part?.type === "tool_calls")?.tool_calls || [];
    const existingResultIds = new Set<string>();
    for (const row of rows) for (const part of (row.parts || [])) if (part?.type === "tool_result" && part.tool_call_id) existingResultIds.add(String(part.tool_call_id));
    existingResultIds.add(toolCallId);
    pauseForPendingApprovals = originCalls.some((call: any) => !existingResultIds.has(String(call.id)));
  } else {
    // Save user message with metadata (mentions + attachments) so chips reload across sessions.
    const userMeta: Record<string, unknown> = {};
    if (Array.isArray(body.mentions) && body.mentions.length) userMeta.mentions = body.mentions.slice(0, 8);
    if (attachments.length) userMeta.attachments = attachments;
    const { error: userMessageError } = await userClient.from("workspace_ai_messages").insert({
      thread_id: threadId, user_id: userId, role: "user",
      parts: [{ type: "text", text: body.message }],
      metadata: userMeta,
    });
    if (userMessageError) {
      return new Response(JSON.stringify({ error: "message save failed", detail: userMessageError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  // 3) Build context block (current note + mentions only for the Notes agent).
  let contextBlock = "";
  if ((agent as string) === "notes" && body.currentNoteId) {
    const { data: note } = await userClient.from("workspace_notes").select("id, title, content").eq("id", body.currentNoteId).maybeSingle();
    if (note) {
      const content = String((note as any).content || "").slice(0, 6000);
      contextBlock = `\n\n---\nCURRENT NOTE (open in editor):\nid: ${(note as any).id}\ntitle: ${(note as any).title || "(untitled)"}\n\n${content}\n---`;
    }
  }
  if (body.selectedText && body.selectedText.trim()) {
    contextBlock += `\n\nSELECTED TEXT:\n"""\n${body.selectedText.slice(0, 2000)}\n"""`;
  }

  if ((agent as string) === "notes" && mentionedNoteIds.length > 0) {
    const { data: mNotes } = await userClient
      .from("workspace_notes")
      .select("id, title, content")
      .in("id", mentionedNoteIds);
    const list = ((mNotes || []) as any[]);
    if (list.length) {
      const blocks = list.map((n) => `- id: ${n.id}\n  title: ${n.title || "(untitled)"}\n  content:\n${String(n.content || "").slice(0, 4000)}`).join("\n\n");
      contextBlock += `\n\nMENTIONED NOTES (user explicitly referenced these — use as primary context):\n${blocks}`;
    }
  }

  // Merged agent: hydrate @-mentions across notes / todos / DK entities.
  if (agent === "merged" && contextRefs.length > 0) {
    const byType = contextRefs.reduce<Record<string, string[]>>((acc, r) => {
      (acc[r.type] ||= []).push(r.id); return acc;
    }, {});
    const blocks: string[] = [];
    if (byType.note?.length) {
      const { data } = await userClient.from("workspace_notes").select("id, title, content").in("id", byType.note);
      for (const n of (data || []) as any[]) {
        blocks.push(`[NOTE id=${n.id}] ${n.title || "(untitled)"}\n${String(n.content || "").slice(0, 3000)}`);
      }
    }
    if (byType.todo?.length) {
      const { data } = await userClient.from("personal_todos").select("id, title, description, status, priority, due_date").in("id", byType.todo);
      for (const t of (data || []) as any[]) {
        blocks.push(`[TODO id=${t.id}] ${t.title} (status=${t.status}, priority=${t.priority || "-"}, due=${t.due_date || "-"})\n${t.description || ""}`);
      }
    }
    if (byType.dk_account?.length) {
      const { data } = await userClient.from("distrokid_accounts").select("id, email, title, status, tab, subscription_plan, lifetime_earning_usd, signup_date, notes").in("id", byType.dk_account);
      for (const a of (data || []) as any[]) {
        blocks.push(`[DK_ACCOUNT id=${a.id}] ${a.title || a.email} · ${a.status}/${a.tab} · plan=${a.subscription_plan || "-"} · lifetime=$${a.lifetime_earning_usd || 0} · signup=${a.signup_date || "-"}\n${a.notes || ""}`);
      }
    }
    if (byType.dk_release?.length) {
      const { data } = await userClient.from("distrokid_releases").select("id, title, artist_name, type, release_date, account_id, expected_earning_usd, notes").in("id", byType.dk_release);
      for (const r of (data || []) as any[]) {
        blocks.push(`[DK_RELEASE id=${r.id}] ${r.title} by ${r.artist_name || "-"} · ${r.type || "-"} · released=${r.release_date || "-"} · earned=$${r.expected_earning_usd || 0}\n${r.notes || ""}`);
      }
    }
    if (byType.dk_withdrawal?.length) {
      const { data } = await userClient.from("distrokid_withdrawals").select("id, account_id, amount_usd_submitted, amount_inr_received, status, submitted_date, received_date, notes").in("id", byType.dk_withdrawal);
      for (const w of (data || []) as any[]) {
        blocks.push(`[DK_WITHDRAWAL id=${w.id}] $${w.amount_usd_submitted} → ₹${w.amount_inr_received || 0} · ${w.status} · submitted=${w.submitted_date} received=${w.received_date || "-"}\n${w.notes || ""}`);
      }
    }
    if (blocks.length) {
      contextBlock += `\n\nUSER-MENTIONED ITEMS (analyze these as primary context):\n${blocks.join("\n\n")}`;
    }
  }


  if (attachments.length > 0) {
    const lines = attachments.map((a) => `- ${a.name || "file"} (${a.kind}) ${a.url}`).join("\n");
    contextBlock += `\n\nATTACHMENTS:\n${lines}\n(Images are visible to you directly. For PDF/CSV, the file URL is provided but you cannot fetch it — ask the user to paste relevant text if needed.)`;
  }

  // 4) Pre-emptive RAG retrieval (Notes agent only — DK agent uses its own tools).
  let sourcesEvent: { noteId: string; title: string }[] = [];
  let sourcesBlock = "";
  if ((agent as string) === "notes" && !isApproval && body.message) {
    const vec = await embedQuery(LOVABLE_API_KEY, body.message);
    if (vec) {
      const { data } = await userClient.rpc("match_note_chunks", { query_embedding: vec as any, match_count: 8 });
      const rows = ((data || []) as any[]).filter((r) => r.similarity > 0.4 && r.note_id !== body.currentNoteId);
      const noteIds = Array.from(new Set(rows.map((r) => r.note_id))).slice(0, 4);
      if (noteIds.length) {
        const { data: notes } = await userClient.from("workspace_notes").select("id, title").in("id", noteIds);
        const titleMap = new Map(((notes || []) as any[]).map((n) => [n.id, n.title || "Untitled"]));
        sourcesEvent = noteIds.map((id) => ({ noteId: id as string, title: titleMap.get(id) || "Untitled" }));
        const snippets = rows.slice(0, 5).map((r, i) => `Source ${i + 1} (${titleMap.get(r.note_id) || "Untitled"}, id=${r.note_id}):\n${String(r.content || "").slice(0, 800)}`);
        sourcesBlock = `\n\nPRE-RETRIEVED SOURCES (use freely; you can still call search_notes for more):\n${snippets.join("\n\n")}`;
      }
    }
  }

  const routingQuery = body.message || (isApproval ? "continue approved workspace action" : "");
  const activeTools = toolsForAgent(agent, mode, routingQuery);
  const memoryBlock = await loadMemoriesForPrompt(userClient, userId, agent);
  const systemContent = systemForAgent(agent, mode) + memoryBlock + (contextBlock ? `\n\nCONTEXT:${contextBlock}` : "") + sourcesBlock;

  // 5) Agent loop (non-streaming for tool turns).
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const enq = (ev: any) => { try { controller.enqueue(encoder.encode(sse(ev))); } catch {} };
      enq({ type: "thread", threadId, title: threadTitle });
      if (sourcesEvent.length) enq({ type: "sources", sources: sourcesEvent });

      try {
        if (pauseForPendingApprovals) {
          enq({ type: "done", assistantMessageId: null });
          controller.close();
          return;
        }
        const initialHistoryRows = await loadHistoryRows(userClient, threadId!);
        const runtimeMessages = [
          { role: "system", content: systemContent },
          ...await messagesToOpenAI(initialHistoryRows),
        ];
        const usageTotals = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, steps: 0, model: modelChoice };
        // Bulk-run ledger: step-limit par ruk jaayein to user ko batana hai ki
        // kitne items actually ban gaye aur kaunse fail hue.
        const writeLedger: { name: string; ok: boolean; label: string }[] = [];
        const ledgerSummary = () => {
          if (writeLedger.length === 0) return "";
          const okList = writeLedger.filter((w) => w.ok);
          const failList = writeLedger.filter((w) => !w.ok);
          const lines = [`\n\n**Is turn me: ${okList.length} ho gaye, ${failList.length} fail.**`];
          if (okList.length) lines.push(okList.map((w) => `- ✅ ${w.label}`).join("\n"));
          if (failList.length) lines.push(failList.map((w) => `- ❌ ${w.label}`).join("\n"));
          return lines.join("\n");
        };
        for (let step = 0; step < MAX_AGENT_STEPS; step++) {
          // Client gaya (stop / thread switch / naya send) → server-side loop bhi
          // ruk jaaye, warna duplicate tool writes ho sakte hain.
          if (req.signal.aborted) {
            await logHealth({ source: "notepad-chat.loop", event_type: "client_aborted", severity: "info", user_id: userId, thread_id: threadId, agent, context: { step } });
            try { controller.close(); } catch {}
            return;
          }
          enq({ type: "phase", phase: "thinking" });
          let sawFirstToken = false;
          const onDelta = (piece: string) => {
            if (!sawFirstToken) { sawFirstToken = true; enq({ type: "phase", phase: "writing" }); }
            enq({ type: "delta", text: piece });
          };

          let choice: any = null;
          let stepUsage: any = null;
          // Selected model ka quota khatam ho to ek-ek karke sasste model par giro.
          // Sirf tab jab abhi tak koi token stream nahi hua (duplicate text se bachne ke liye).
          for (;;) {
            try {
              const out = await callAIStream(
                LOVABLE_API_KEY, runtimeMessages, activeTools, req.signal, onDelta, chatModel,
              );
              choice = out.message;
              stepUsage = out.usage;
              break;
            } catch (e: any) {
              const next = e?.quotaExhausted && !sawFirstToken
                ? (MODEL_FALLBACKS[activeModelChoice] || []).find((m) => MODEL_CHOICES[m])
                : undefined;
              if (!next) throw e;
              await logHealth({ source: "notepad-chat.loop", event_type: "quota_exhausted", severity: "warn", user_id: userId, thread_id: threadId, agent, context: { from: activeModelChoice, to: next, step } });
              activeModelChoice = next;
              chatModel = MODEL_CHOICES[next];
              usageTotals.model = next;
              enq({ type: "notice", message: `${MODEL_LABELS[activeModelChoice] || activeModelChoice} model par switch kiya — pehle wale model ka quota khatam tha.` });
            }
          }

          if (!choice) throw new Error("empty AI response");
          if (stepUsage) {
            usageTotals.prompt_tokens += Number(stepUsage.prompt_tokens || 0);
            usageTotals.completion_tokens += Number(stepUsage.completion_tokens || 0);
            usageTotals.total_tokens += Number(stepUsage.total_tokens || 0);
          }
          usageTotals.steps = step + 1;

          const text: string = choice.content || "";
          const toolCalls = Array.isArray(choice.tool_calls) ? choice.tool_calls : [];

          if (toolCalls.length === 0) {
            // Text already streamed live above; ab usko DB me persist karo.
            enq({ type: "phase", phase: "writing" });
            let assistantMessageId: string | null = null;
            if (text.trim()) {
              const { data: saved, error: finalSaveError } = await userClient.from("workspace_ai_messages").insert({
                thread_id: threadId, user_id: userId, role: "assistant",
                parts: [{ type: "text", text }],
                metadata: { usage: { ...usageTotals } },
              }).select("id").single();
              if (finalSaveError) throw new Error(`Could not save reply: ${finalSaveError.message}`);
              assistantMessageId = (saved as any)?.id || null;
            }
            enq({ type: "usage", usage: { ...usageTotals } });

            await userClient.from("workspace_ai_threads").update({ updated_at: new Date().toISOString(), last_message_at: new Date().toISOString() }).eq("id", threadId);

            // Topic-based auto title, refined over the first few turns.
            const autoTitle = await maybeAutoTitleThread(userClient, LOVABLE_API_KEY as string, threadId as string, enq);
            if (autoTitle) threadTitle = autoTitle;

            enq({ type: "done", assistantMessageId });
            controller.close();
            return;
          }


          // Persist assistant message with tool_calls.
          const normalizedCalls = toolCalls.map((tc: any) => {
            if (!tc?.id || !tc?.function?.name) throw new Error("Model returned an invalid tool call");
            let parsed: any;
            try { parsed = JSON.parse(tc.function.arguments || "{}"); }
            catch { throw new Error(`Invalid arguments for ${tc.function.name}`); }
            return { id: tc.id, name: tc.function.name, args: parsed, provider_call: tc };
          });
          const { error: callSaveError } = await userClient.from("workspace_ai_messages").insert({
            thread_id: threadId, user_id: userId, role: "assistant",
            parts: [
              ...(text ? [{ type: "text", text }] : []),
              { type: "tool_calls", tool_calls: normalizedCalls },
            ],
          });
          if (callSaveError) throw new Error(`Could not save tool call: ${callSaveError.message}`);
          runtimeMessages.push(choice);
          if (text) enq({ type: "delta", text: "\n\n" });

          // Process tool calls. Multiple write calls in a single turn are supported:
          // with auto-approve ON they are all executed here; with it OFF every write
          // call in this turn becomes its own approval card.
          let stoppedForApproval = false;
          // Bulk progress: ek hi turn me kai tool calls hon to UI ko done/total bhejo.
          const batchTotal = normalizedCalls.length;
          let batchDone = 0;
          if (batchTotal > 1) enq({ type: "batch", done: 0, total: batchTotal });
          const tickBatch = () => {
            batchDone++;
            if (batchTotal > 1) enq({ type: "batch", done: batchDone, total: batchTotal });
          };
          for (const tc of normalizedCalls) {
            const isWrite = APPROVAL_TOOLS.has(tc.name);
            if (isWrite && !autoApprove) {
              enq({
                type: "proposal", toolCallId: tc.id, name: tc.name, args: tc.args,
                summary: summarizeProposal(tc.name, tc.args),
              });
              stoppedForApproval = true;
              continue;
            }
            if (isWrite && mode === "viewer") {
              const res = { ok: false, rejected: true, message: "Viewer mode is read-only." };
              const { error: viewerSaveError } = await userClient.from("workspace_ai_messages").insert({
                thread_id: threadId, user_id: userId, role: "tool",
                parts: [{ type: "tool_result", tool_call_id: tc.id, name: tc.name, status: "rejected", result: res }],
              });
              if (viewerSaveError) throw new Error(`Could not save tool result: ${viewerSaveError.message}`);
              runtimeMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(res) });
              enq({ type: "tool_result", toolCallId: tc.id, name: tc.name, status: "rejected", result: res });
              tickBatch();
              continue;
            }
            enq({ type: "tool_start", toolCallId: tc.id, name: tc.name, args: tc.args });
            const toolStartedAt = Date.now();
            const res = isWrite
              ? await executeWriteTool(tc.name, tc.args, { userClient, userId })
              : await executeReadTool(tc.name, tc.args, { userClient, apiKey: LOVABLE_API_KEY, userId, attachments });
            const toolDurationMs = Date.now() - toolStartedAt;
            const status = isWrite ? ((res as any)?.ok ? "approved" : "rejected") : "auto";
            const { error: toolSaveError } = await userClient.from("workspace_ai_messages").insert({
              thread_id: threadId, user_id: userId, role: "tool",
              parts: [{ type: "tool_result", tool_call_id: tc.id, name: tc.name, status, result: capToolResult(res), args: tc.args, duration_ms: toolDurationMs }],
            });
            if (toolSaveError) throw new Error(`Could not save tool result: ${toolSaveError.message}`);
            runtimeMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify(capToolResult(res)),
            });
            enq({ type: "tool_result", toolCallId: tc.id, name: tc.name, status, result: res, durationMs: toolDurationMs });
            if (isWrite) {
              writeLedger.push({
                name: tc.name,
                ok: !!(res as any)?.ok,
                label: `${summarizeProposal(tc.name, tc.args)}${(res as any)?.ok ? "" : ` — ${String((res as any)?.error || "fail")}`}`,
              });
            }
            if (isWrite && !(res as any)?.ok) {
              await logHealth({ source: "notepad-chat.autoapprove", event_type: tc.name, message: String((res as any)?.error || "write failed"), severity: "error", user_id: userId, thread_id: threadId, agent, context: { args: tc.args } });
            }
            // Emit memory-lifecycle event so the UI can flash a "Memory updated" chip.
            if (tc.name === "remember" && (res as any)?.ok) {
              enq({ type: "memory", action: "saved", kind: (tc.args?.kind || "fact"), content: String(tc.args?.content || "").slice(0, 140) });
            } else if (tc.name === "forget_memory" && (res as any)?.ok) {
              enq({ type: "memory", action: "forgot", content: "" });
            }
            tickBatch();
          }
          if (batchTotal > 1) enq({ type: "batch", done: batchDone, total: batchTotal, complete: true });

          if (stoppedForApproval) {
            await userClient.from("workspace_ai_threads").update({ updated_at: new Date().toISOString(), last_message_at: new Date().toISOString() }).eq("id", threadId);
            await maybeAutoTitleThread(userClient, LOVABLE_API_KEY as string, threadId as string, enq);
            enq({ type: "done", assistantMessageId: null });
            controller.close();
            return;
          }
          // else loop continues for next AI turn
        }
        // Turn-limit note ko DB me bhi save karo, warna reload par nishaan nahi bachta.
        const stepNote = "_(max steps reached — kaam adhoora ruk gaya, agle message me continue bolein.)_" + ledgerSummary();
        const { data: noteSaved } = await userClient.from("workspace_ai_messages").insert({
          thread_id: threadId, user_id: userId, role: "assistant",
          parts: [{ type: "text", text: stepNote }],
          metadata: { system_note: "max_steps_reached", usage: { ...usageTotals } },
        }).select("id").single();
        await userClient.from("workspace_ai_threads").update({ updated_at: new Date().toISOString(), last_message_at: new Date().toISOString() }).eq("id", threadId);
        enq({ type: "delta", text: stepNote });
        await logHealth({ source: "notepad-chat.loop", event_type: "max_steps_reached", severity: "warn", user_id: userId, thread_id: threadId, agent });
        enq({ type: "usage", usage: { ...usageTotals } });
        await maybeAutoTitleThread(userClient, LOVABLE_API_KEY as string, threadId as string, enq);
        enq({ type: "done", assistantMessageId: (noteSaved as any)?.id || null });

        controller.close();
      } catch (err: any) {
        if (err?.clientAborted || req.signal.aborted) {
          // User ne stop kiya ya thread switch — koi error card nahi dikhana.
          try { controller.close(); } catch {}
          return;
        }
        const msg = String(err?.message || err);
        console.error("agent error", err);
        const quota = !!err?.quotaExhausted;
        await logHealth({ source: "notepad-chat.loop", event_type: quota ? "quota_exhausted" : "agent_error", message: msg, severity: "error", user_id: userId, thread_id: threadId, agent, context: { model: activeModelChoice } });
        const status = Number(err?.status) || 500;
        const publicMessage = quota
          ? "Gemini API key ka quota khatam ho gaya hai (Google AI Studio me plan/billing check karein). Retry se fayda nahi hoga — quota reset hone ya key upgrade hone tak reply nahi aayega."
          : status === 429
            ? "AI abhi busy hai (rate limit). Thodi der baad dobara try karein."
            : status >= 500
              ? "AI provider se reply complete nahi hua. Dobara try karein."
              : "Reply process nahi ho paaya. Chat refresh karke dobara try karein.";
        enq({ type: "error", message: publicMessage, status, quota });

        try { controller.close(); } catch {}
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
