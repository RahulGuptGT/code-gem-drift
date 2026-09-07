# Rahul Gupta - Public

@project:59432f93-9d11-46f4-9809-d745ab427ca2:"Rahul Gupta" Badhiya! Ab docs/split/README.md ke Step 2 se shuru karo:

1. Code copy karo — `docs/split/public-file-manifest.txt` me jo 124 files hain, woh naye project me copy karo.  

   - Pages, components, hooks, lib, styles — sab.

   - `admin-cleanup-notes.txt` dekh kar `AdminDashboard.tsx` se personal imports hata do.

2. Schema copy karo — `docs/split/dump-public-schema.sql` ko naye Supabase ke SQL Editor me chalao.  

   - Isse saari public tables, GRANTs, RLS policies, indexes, triggers ban jaayenge.

3. Data migrate karo — README me Step 4 ka `pg_dump` command use karo, ya CSV export/import karo.

Uske baad edge functions + secrets, verify, aur domain switch.

Agar kisi step me error aaye ya kuch samajh na aaye, toh exact file/error yahan paste karo — main fix kar dunga.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://code-gem-drift.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/aba0d39e-3707-42a1-9d18-c5e53ab3f635).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
