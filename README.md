# Crayon Rush

Cloudflare Pages + Pages Functions + D1 version of the Rush game.

## Rules implemented

- X username is locked server-side. A duplicate X username is rejected.
- Wallet is locked server-side. A duplicate wallet is rejected.
- Daily reset: 00:00 UTC.
- Unlimited game attempts.
- Only the highest RP run each UTC day adds to the player's RP balance.
- Previous days remain banked.
- 1,000 RP = 1 game WL.
- Game WL pool: 200 total. The database starts at 13 claimed (187 remaining) for current testing.
- Daily Top 3 leaderboard is server-side.
- One-use game sessions, timing checks, movement validation, score ceiling, and basic request/origin protection.

## Cloudflare setup

1. Create a D1 database named `crayon-rush-db`.
2. Copy its database ID into `wrangler.jsonc`.
3. Run `schema.sql` against the production D1 database.
4. In your Pages project, bind D1 as `DB`.
5. Deploy the GitHub repo through Workers & Pages.
6. Optional but recommended: create a Turnstile widget and add a secret named `TURNSTILE_SECRET`.
7. Add your custom domain after the `*.pages.dev` deployment works.

## Important security note

Typing an X username proves uniqueness inside Crayon Rush, but does NOT prove ownership of that X account. Real X ownership requires OAuth / Sign in with X.

Browser games cannot be made cheat-proof. This repo moves rewards, daily-best logic, WL claims, wallets and leaderboard state server-side and rejects obvious impossible/replayed runs. For higher-value rewards, add stronger server-generated spawn validation and/or manual review of Top 3.

## GitHub → Cloudflare Pages

- Framework preset: None
- Production branch: `main`
- Build command: leave blank
- Build output directory: `.`
- Root directory: `/`
- Functions directory: automatically detected at `/functions`

## D1 binding

Cloudflare Dashboard → Workers & Pages → your Pages project → Settings → Bindings → Add → D1 database:
- Variable name: `DB`
- Database: `crayon-rush-db`

Redeploy after adding the binding.
