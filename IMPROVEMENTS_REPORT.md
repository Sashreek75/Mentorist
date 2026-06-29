# Mentorist — Audit & Overhaul Report (June 2026)

A full audit of the codebase (Node.js server + Supabase + vanilla multi-page
HTML/JS) and a focused set of fixes across three areas: the AI recommendation
engine, security/correctness, and UI/UX. This report summarizes what was found,
what changed, how the AI engine now works, and what remains.

---

## 1. Major issues found

### AI recommendation engine
- **Two parallel engines, one of them dead.** The live page only rendered a
  Gemini markdown response; the richer structured engine in
  `recommendation-core.js` (scoring, ranking, dedupe, roadmaps) was never
  reachable from any page.
- **No internal-data awareness.** The AI knew nothing about Mentorist's own
  mentors or broadcast opportunities; it could only suggest generic external
  programs hardcoded in prompt strings.
- **Phantom personalization.** The prompt referenced fields the onboarding quiz
  never collected (learning style, support needs, etc.) while *dropping* fields
  it did collect (e.g. weekly time availability).
- **No memory / no dedupe.** Nothing was persisted, so the engine could not
  "avoid repeating recommendations" or improve over time.
- **No live grounding.** Google Search grounding existed in git history but had
  been removed; the engine relied purely on the model's training data.
- **Invalid default model** (`gemini-3.1-flash-lite`) burned a failed request on
  every call before falling back.

### Security (critical)
- **`service_role` key committed** in `wipe-clean.js` — full RLS-bypassing
  database/auth access for anyone with the repo.
- **Gemini API key embedded in client HTML** — publicly extractable.
- **Admin self-promotion**: `email.startsWith("admin")` made anyone who
  registered `admin@…` an admin.
- **Wide-open RLS**: all tables allow `anon` full read/write/delete.
- **Multiple stored XSS** sinks (mentor alerts, admin applications/questions,
  topic chips, vault question ids) rendered unescaped via `innerHTML`.
- **`vault.html` had no auth gate** — archived student Q&A was world-readable.

### Bugs / correctness
- Duplicate `renderSummary()` and `finish()` definitions in `onboarding.html`.
- Dashboards rendered blank if a background sync rejected (no `.catch`).
- Guard redirects kept executing (`window.location.href` without `return`).
- Dead `#who` nav anchor; `wipe-clean.js` referenced a non-existent table and
  the wrong primary-key column.

### UI / UX
- A good design-token system in `shared.css` was undermined by per-page
  reinvented "luxury" components and ~80 hardcoded colors.
- No keyboard focus states anywhere; interactive `<div>`s without keyboard
  support; contrast failures on helper text; no `prefers-reduced-motion`.
- `mentor-review.html` didn't even link `shared.css` and showed ASCII
  placeholder "icons" ("OK", "LOCK").

---

## 2. Improvements implemented

### AI engine (`recommend-ai-server.js`, rewritten)
- **Internal-data retrieval**: on each request the server queries Supabase for
  available Mentorist mentors (with expertise) and current broadcast
  opportunities, and injects them as an "INTERNAL MENTORIST INVENTORY" block the
  model is told to prefer.
- **Recommendation history + dedupe**: a new `mentorist_recommendations` table
  stores each result; recent items are injected as an "ALREADY RECOMMENDED — do
  not repeat" block, so advice stays fresh across sessions.
- **Real personalization**: prompt now uses the fields actually collected
  (including weekly time availability) and requires a per-item *"Why this fits
  you"* line plus a Now/Next/Later roadmap for planning requests.
- **Live grounding with graceful fallback**: tries Google Search grounding,
  falls back to a plain call, then to the offline core playbook — every external
  failure (Gemini or Supabase) degrades to a clean JSON error or offline result
  instead of crashing.
- **Server-side rate limiting** (per-IP/hour, per-user/day) and CORS handling.
- **Feedback loop**: `/api/feedback` records thumbs up/down per recommendation.
- **Valid model list** (`gemini-2.5-flash`, `gemini-2.0-flash`,
  `gemini-flash-latest`) and an informative `/health` endpoint.
- Removed the exposed client key (`recommendations.html`) and the invalid model
  id (`recommendations.js`).

### Security & correctness
- Removed the committed `service_role` key (now env-based) and fixed
  `wipe-clean.js`'s phantom table / wrong-PK deletes.
- Removed admin-by-email-prefix; admin requires the verified domain.
- Escaped all identified stored-XSS sinks using the existing `Utils.escapeHtml`.
- Added an auth gate to `vault.html`.
- De-duplicated `onboarding.html` functions; added `.catch`/render-first so a
  failed sync no longer blanks dashboards; added `return` after guard redirects;
  fixed the dead `#who` anchor; capped mentor answer length.
- Added toast `aria-live`/`role=status` so notifications are announced.

### UI / UX (`shared.css` and pages)
- Added a global `:focus-visible` outline (keyboard accessibility app-wide).
- Added a `prefers-reduced-motion` block.
- Added shadow, spacing, and semantic status tokens (and the missing
  `--shadow-soft` that `mentor-review.html` referenced).
- Bumped low-contrast helper text color to clear WCAG AA.
- Defined `.btn-sm/.btn-lg/.btn-full` as real classes; added a `.skeleton` loader.
- Linked `shared.css` in `mentor-review.html` and replaced ASCII placeholders
  with real SVG icons / proper empty states.
- Added a mobile breakpoint to `guidelines.html` (previously had none).

The dark + neon-green identity was intentionally preserved (refined, not
redesigned).

---

## 3. How the AI recommendation engine now works

1. The recommendations page collects the topic + optional free-text question and
   POSTs the normalized student profile to the server proxy (`/api/ai-strategy`).
   The key never leaves the server.
2. The server enforces rate limits, then retrieves three context sources in
   parallel (all degrade to empty on failure): **available mentors** and
   **current opportunities** from Mentorist's own database, and the student's
   **recent recommendations** for dedupe.
3. It builds a single, enriched prompt: the real student profile, the internal
   inventory (preferred), the "do-not-repeat" history, and instructions to give
   named recommendations each with a "Why this fits you" line and a roadmap.
4. It calls Gemini with Google Search grounding (falling back to a plain call,
   then to the offline `recommendation-core.js` playbook).
5. The result is persisted to `mentorist_recommendations` (enabling future
   dedupe and the thumbs up/down feedback loop) and returned as markdown.

Net effect: recommendations are grounded in Mentorist's own inventory + live
search, personalized to the onboarding/profile data, explained, non-repeating,
and resilient to outages.

---

## 4. Remaining limitations / future work

- **RLS is still permissive** (see `SECURITY.md`). This is the most important
  remaining item; it needs a deliberate rollout because the app currently uses
  the anon key for everything.
- **Keys must be rotated and purged from git history** (Gemini + service_role).
- **Feedback isn't yet surfaced in the UI** — the storage + endpoint exist; the
  thumbs up/down buttons still need to be wired into `recommendations.html`, and
  aggregate feedback can then be fed back into the prompt.
- **The structured engine** (`recommendation-core.js`) is exposed via
  `/api/recommend` but still isn't rendered on the page as structured cards; it
  could power a richer roadmap/course-track view alongside the markdown.
- **Onboarding could capture** learning style and strengths/weaknesses to deepen
  personalization (the prompt is ready for them).
- **Prompt injection** mitigation is basic; consider stronger input/output
  guarding if untrusted text volume grows.
- The engine wasn't exercised against the live Gemini/Supabase services from the
  audit environment (no outbound access); it was verified to start, serve
  `/health`, return the offline bundle, validate inputs, and fail gracefully.

---

## 5. Build / run

```bash
# from the project root, with .env containing GEMINI_API_KEY
npm run recommend:server      # starts the proxy on http://localhost:3000
# health check
curl http://localhost:3000/health
```

Apply the new migration (`supabase/migrations/20260628_mentorist_recommendations.sql`)
to your Supabase project to enable recommendation history + feedback.
