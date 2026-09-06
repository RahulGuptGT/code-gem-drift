# Instamojo ko Test Mode me chalana

Payment gateway abhi Instamojo ke review me hai (live keys pe "documents reviewing" dikh raha hai), isliye abhi ke liye poore payment flow ko **test mode** me rakhenge. Isme asli paisa nahi katega — test card se pura flow (checkout → webhook → plan activation) safely test ho sakta hai.

## Changes

1. **`INSTAMOJO_MODE` = `test` set karna** — ye ek setting hai jo code pehle se padhta hai; test mode me checkout `test.instamojo.com` ke against chalega, live `www.instamojo.com` nahi. Bas ye setting daalni hai, code me koi badlav nahi.

2. **Test credentials (aapko lene honge):** Screenshot me jo keys dikh rahi hain wo **live** (`www.instamojo.com`) ki hain. Instamojo khud kehta hai live aur test keys compatible nahi hote. Isliye:
   - `https://test.instamojo.com` par login karke wahan ke **Private API Key** aur **Private Auth Token** lena hoga (API & Plugins section).
   - Main secure form kholunga jisme aap ye do test keys dalenge — wo existing live keys ki jagah save ho jayengi (abhi live mode use hi nahi ho raha, to koi loss nahi).
   - Optional: test ka **Private Salt** bhi webhook signature check ke liye le sakte hain.

3. **Verify:** Settings lagne ke baad pricing page se ek test checkout chala kar dekhenge ki test payment link banta hai.

## Baad me live karna

Jab Instamojo ka review approve ho jaye, sirf live keys wapas dal kar `INSTAMOJO_MODE` ko `live` karna hoga — code me kuch badalna nahi padega.

## Note (security)

Screenshot me aapki live API keys visible hain. Ye keys kabhi kisi ke saath share na karein; agar lagta hai wo kahin leak ho gayi hain to Instamojo dashboard se regenerate kar lein.

## Technical details

- `src/lib/payments.functions.ts` ka `instamojoBase()` pehle se hi `INSTAMOJO_MODE` env read karta hai (`test` → `https://test.instamojo.com/api/1.1`).
- Secrets store me `INSTAMOJO_MODE=test` set hoga; `INSTAMOJO_API_KEY` / `INSTAMOJO_AUTH_TOKEN` test values se update honge (secure form ke through).
