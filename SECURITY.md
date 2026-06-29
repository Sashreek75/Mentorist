# Mentorist — Security Notes & Hardening Backlog

This file documents the security posture after the June 2026 audit, the fixes
that were applied, and the items that still require action (some need decisions
or credentials that can't be changed from code alone).

## Action required by a maintainer (do these ASAP)

1. **Rotate the Supabase `service_role` key.** It was previously committed in
   `wipe-clean.js` and is therefore compromised (anyone with the git history
   has full, RLS-bypassing access to the database and auth users). Generate a
   new service key in the Supabase dashboard and invalidate the old one. The
   script now reads the key from `SUPABASE_SERVICE_ROLE_KEY` instead of a
   literal, but rotation is still mandatory.
2. **Rotate the Gemini API key.** It was previously embedded in client HTML
   (`recommendations.html`) and is publicly extractable. Create a new key in
   Google AI Studio, put it in `.env` as `GEMINI_API_KEY`, and the server proxy
   will use it. Never put the key back into client code.
3. **Purge both keys from git history** (e.g. `git filter-repo` or BFG), since
   removing them from the current files does not remove them from old commits.

## Fixed in this pass

- Removed the hardcoded Gemini key from `recommendations.html`; all AI calls now
  go through the server proxy which holds the key server-side.
- Removed the `service_role` key literal from `wipe-clean.js` (now env-based).
- Removed the `email.startsWith("admin")` rule that let anyone register
  `admin@anything.com` and self-promote to admin. Admin now requires the
  verified `@mentorist.org` domain (`shared.js`, `auth.html`).
- Escaped user-controlled content rendered via `innerHTML` (stored-XSS fixes)
  in `mentordashboard.html`, `admin.html`, `studentdashboard.html`, `vault.html`.
- Added an authentication gate to `vault.html` (archived Q&A was world-readable).
- Added **server-side rate limiting** to the recommendation API
  (`recommend-ai-server.js`): per-IP/hour and per-user/day. The old client-side
  localStorage quota is trivially bypassable and is now only a UX hint.
- Added light prompt-injection mitigation (strip code fences, cap user text).

## Still open — Row Level Security (needs a deliberate rollout)

Every table currently has `using (true) / with check (true)` policies for the
`anon` role, i.e. **any anonymous client with the public anon key can read,
modify, or delete every row** (all student PII, roles, applications). The app's
"auth" is effectively cosmetic because authorization is enforced only in
client-side JavaScript.

This was **not** flipped automatically because the entire app currently reads
and writes through the anon key with no authenticated Supabase session, so
simply tightening RLS would break the live app. Proper fix (recommended order):

1. Ensure the client performs real authenticated Supabase calls (it already has
   sessions via `supabaseClient.auth`), then
2. Replace the permissive policies with row-scoped ones, e.g.
   - `mentorist_profiles`: a user may select/update only `where email = auth.jwt()->>'email'`; admins (a server-set claim, **not** an email prefix) may see all.
   - `mentorist_questions` / `mentorist_recommendations`: scope to the owning student; mentors/admins via a verified role claim.
   - Remove `anon` write policies entirely; writes should require `authenticated`.
3. Move admin designation to a server-controlled source (a DB column or a custom
   JWT claim set by a trusted process), never an email pattern.

## Other notes

- The Supabase **anon** key is public by design and is fine to ship in client
  code; the risk above comes from the permissive RLS, not the anon key itself.
- Destructive maintenance scripts (`wipe-clean.js`, `clear-data.js`,
  `reset-users.js`, `unban.mjs`) operate directly on production data. Keep them
  out of any deployment and require explicit env confirmation before running.
