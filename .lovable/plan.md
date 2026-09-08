# Workspace AI mein Experiential Labs ke 4 free/promotional models add karna

## Maqsad
Workspace AI ke model dropdown mein screenshots mein dikh rahe 4 promotional models add karne hain, taaki sirf Gemini models hi nahi, balki Experiential Labs ke free/promotional models bhi select kar sakein.

## Models jo add honge
Sirf user ke screenshots aur "free/promotional" filter se ye 4 models:

| Label | Slug |
|-------|------|
| Qwen3.8 27B (free) | `qwen3.8-27b` |
| DeepSeek V4 Flash (free) | `deepseek-v4-flash` |
| GPT-5.6 Luna (free) | `gpt-5.6-luna` |
| GPT-6 Astra (free) | `gpt-6-astra` |

## Kaam ka kram

1. **Client-side dropdown update**
   - `src/lib/workspaceAiStorage.ts` ke `MODEL_OPTIONS` array mein upar ke 4 models add karna.
   - Existing Gemini options waise hi rahengi.

2. **Server-side model allowlist**
   - `src/lib/edge/workspace-ai.server.ts` ke `MODEL_OPTIONS` Set mein ye 4 slugs add karna, taaki server galat model id reject na kare.

3. **Provider routing (`callModel`)**
   - Agar selected model `qwen3.8-27b`, `deepseek-v4-flash`, `gpt-5.6-luna`, ya `gpt-6-astra` hai, toh usse Experiential Labs ke OpenAI-compatible API par bhejna:
     - Base URL: `https://api.experientiallabs.ai/v1/chat/completions`
     - Auth: `Authorization: Bearer <EXPERIENTIAL_LABS_API_KEY>`
     - Body mein `model` slug waise hi bhejna (e.g. `gpt-6-astra`).
   - Baaki models (Gemini ids) pehle jaisa hi Gemini/Lovable chain par chalenge.

4. **Secret**
   - Experiential Labs ka API key user ko provide karna hoga: `EXPERIENTIAL_LABS_API_KEY` secret.
   - Ye external provider key hai, isliye Lovable managed `LOVABLE_API_KEY` alag hai.

5. **Verify**
   - Build check.
   - Admin panel `/heena/admin/ai` par dropdown mein 4 naye options dikhne chahiye.
   - Ek test prompt bhejke Experiential Labs model se response aana chahiye (key add hone ke baad).

## Files jo change hongi
- `src/lib/workspaceAiStorage.ts`
- `src/lib/edge/workspace-ai.server.ts`

## Dependencies / credentials
- `EXPERIENTIAL_LABS_API_KEY` secret required hai — user ko provide karna hoga.
