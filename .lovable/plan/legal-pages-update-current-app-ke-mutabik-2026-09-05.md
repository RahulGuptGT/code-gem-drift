# Legal Pages Update — Current App ke Mutabik

Saare 5 legal pages (`/legal/privacy-policy`, `/legal/terms-and-conditions`, `/legal/disclaimer`, `/legal/refund-policy`, `/legal/cancellation-policy`) abhi purane site ke hisaab se likhe hain — sirf donations/Razorpay ka zikr hai. Ab app mein memberships, gated content, book aur Instamojo aa gaye hain, isliye sab rewrite honge.

## Refund & Cancellation (sabse important)

- **Clear statement:** Normally hum **refund offer nahi karte** — plan lene se pehle details, plan features aur preview content (free chapters, free POV posts) dekh kar hi purchase karein.
- **Rare cases mein 7-day refund:** accidental/duplicate payment, unauthorized transaction, ya technical error (jaise payment ho gaya par access nahi mila) — in cases mein transaction ke **7 din ke andar** request par refund consider kiya jayega.
- **Refund contact:** `rahul@rahulgupta.online` par email, transaction ID aur payment date ke saath. Response 3 business days mein.
- **Cancellation:** Signature (monthly) plan user kabhi bhi cancel kar sakta hai — current paid period tak access rahega, agle billing par charge nahi hoga; cancel karne par pichhle payment ka refund nahi milta. Sovereign one-time hai, cancel/refund applicable nahi.
- Cancellation policy page par bhi same 7-day rare-case refund rule ka cross-reference.

## Privacy Policy

- Ab collect hota hai: account info (name, email — signup), membership/plan data, reading progress, referral activity.
- Payment processors: **Instamojo** (subscriptions) + **Razorpay** (donations) — card/bank details hum store nahi karte.
- Data storage/auth: Supabase; analytics usage data.
- User rights: access/correction/deletion request via email.

## Terms & Conditions

- Membership tiers (Starter free, Signature monthly, Sovereign one-time) aur unka access scope.
- Content rules: gated POV posts aur book chapters sirf active members ke liye; account sharing / content redistribution allowed nahi.
- Payments Instamojo/Razorpay ke through; pricing badal sakti hai (existing members ko prior notice).
- Refund/cancellation ka pointer respective pages par.
- Account termination misuse par.

## Disclaimer

- Content personal views/opinions hain, professional/financial/legal advice nahi.
- Earnings/results koi guarantee nahi; external links ki responsibility nahi.

## Technical details

- Sirf ye 5 files edit hongi: `src/components/pages/legal/{PrivacyPolicy,TermsAndConditions,Disclaimer,RefundPolicy,CancellationPolicy}.tsx` — same `LegalLayout` aur `Section` pattern use hoga, koi route/structure change nahi.
- Har page par "Last updated: September 2026" aur refund/contact email `rahul@rahulgupta.online` consistent rahega.
- Build verify karke har page browser mein check karunga.
