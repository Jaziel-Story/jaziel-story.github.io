# Jaziel — Trending Stories

A static, GitHub Pages–hosted trending-stories site, plus an Admin Panel
for creating and managing articles without hand-editing `articles.json`.

Live site: https://jaziel-story.github.io/

## Site structure (unchanged)

```
index.html         Homepage
article.html        Single article view (?slug=…)
search.html          Search
category.html        Category browsing
about.html, contact.html, privacy.html, terms.html
articles.json        All article data (root of the repo — do not move)
assets/css/style.css  Shared stylesheet
assets/js/main.js     Shared frontend logic (reads articles.json)
assets/images/articles/  Article images (cover + body), uploaded via the Admin Panel
```

None of the files above changed behavior — the Admin Panel writes the exact
same `articles.json` schema the site already reads.

## Admin Panel

```
admin/index.html      Admin Panel UI (Dashboard, Articles, Editor, Settings, Help)
admin/admin.css        Admin-only styles (reuses the site's design tokens)
admin/admin.js         All admin logic — talks to GitHub directly from the browser
admin/ai-requests/     AI Writer request files (created/cleared automatically)
admin/ai-results/      AI Writer result files (created automatically)
```

Open `admin/index.html` on the deployed site (e.g.
`https://jaziel-story.github.io/admin/`) to use it. See **Settings → GitHub
Access Token** inside the panel for what permissions you need, and
**Help** inside the panel for an honest description of what is and isn't
secure about this setup on static GitHub Pages hosting.

### How it works, in short

- The Admin Panel is a static page. It has no backend of its own.
- To publish, edit, or delete an article, it calls the GitHub REST API
  directly from your browser using a Personal Access Token you provide at
  runtime (Settings tab). That token is kept in memory, or in
  `sessionStorage` for the current tab only if you opt in — it is never
  written to any file in this repository.
- The **AI Writer** (Google Gemini) never sees your Gemini key from the
  browser. The panel commits your raw text to `admin/ai-requests/`, then
  triggers the `.github/workflows/ai-writer.yml` GitHub Actions workflow,
  which holds `GEMINI_API_KEY` as a GitHub Actions secret, calls Gemini
  on GitHub's servers, and writes the structured result to
  `admin/ai-results/` for the panel to pick up. The workflow waits for the
  request file to be visible on `main` before processing it, preventing the
  request-checkout race that previously caused a valid AI generation to fail
  before the result could be committed. You always review the generated
  draft before publishing — nothing is auto-published.

### One-time setup for the AI Writer

1. Get a Gemini API key from Google AI Studio.
2. In this repository: **Settings → Secrets and variables → Actions →
   New repository secret**, name it `GEMINI_API_KEY`, and paste the key.
3. In the Admin Panel's Settings tab, add a GitHub Personal Access Token
   scoped to this repository with `Contents: Read and write` and
   `Actions: Read and write`.

The Gemini model used is configured in one place:
`GEMINI_MODEL` at the top of `.github/scripts/generate-article.mjs`
(currently `gemini-3.8-flash`). If Google recommends a different model
later, update that single constant — no other file needs to change.

### GitHub Actions in this repo

- `.github/workflows/validate-articles.yml` — runs automatically on every
  change to `articles.json` and fails the check if the schema is broken
  (missing required fields, duplicate slugs/ids, invalid dates, etc.).
- `.github/workflows/validate-javascript.yml` — checks JavaScript syntax
  with Node.js on JavaScript changes, helping catch parser errors before
  deployment.
- `.github/workflows/ai-writer.yml` — runs on demand, triggered by the
  Admin Panel, to turn raw text into a structured article draft with
  Gemini. It waits for the requested file to reach the latest `main` before
  generation.

## Repository Change Log

**Important rule:** Every repository change must be recorded here and in
`CHANGELOG.md`. Before making another fix, check these logs and the recent
Git commits first. Do not repeat a change that is already marked DONE unless
a regression is confirmed.

### 2026-09-12 — Admin Panel recovery & audit

- Fixed the Admin Panel JavaScript parser issue from the Claude repair
  bundle: the `[data-image-url]` input listener in `renderBodyImages()` was
  missing a closing `}`.
- Restored a clean `admin/admin.js` source and avoided another broad rewrite.
- Removed obsolete runtime/one-time repair mechanisms after recovery.
- Added permanent JavaScript syntax validation with
  `.github/workflows/validate-javascript.yml`.
- Updated the Admin script cache-busting version in `admin/index.html`.
- **Live verification:** the deployed Admin Dashboard now loads correctly;
  the previous `Loading admin panel...` state is gone. The screenshot shows
  Dashboard, Articles, New Article, Search, Settings, Help, article count,
  category count, latest article, and Recent Articles.
- Removed the completed one-time repair workflow in commit
  `93c8332bd088464677d7f10eb9bf12a54c1ae3b6` so emergency repair code does
  not remain in the normal architecture.
- **Article Schema v1:** unchanged and remains locked.

### 2026-09-12 — AI Writer P1 race-condition fix

- **Priority:** P1 / proven production workflow bug.
- **File changed:** `.github/workflows/ai-writer.yml`
- **Root cause:** A request commit could exist on `main` while a manually
  dispatched workflow started from the preceding branch SHA. The runner
  could therefore fail to see the request file even though the Admin Panel
  had successfully committed it. The affected test showed Gemini generation
  succeeding but the final result/cleanup step failing because the request
  file was absent from the checked-out revision.
- **Fix:** After checkout, the workflow now fetches `origin/main` repeatedly
  for up to 60 seconds and only continues once the exact
  `admin/ai-requests/<request_id>.json` exists on `origin/main`; it then resets
  to that latest revision before running Gemini.
- **Commit:** `4c1f0d561c39b7c82001e6e7584e1ca1749e1a66`
- **Verification:** Source change reviewed against the proven failure mode.
  A fresh end-to-end AI Writer run is still required to mark the fix fully
  VERIFIED LIVE.
- **Article Schema v1:** unchanged and remains locked.

### 2026-09-12 — Related Stories

- Fixed relative image paths for Related Stories on generated static article
  pages. This is retained as a targeted fix and should not be reimplemented
  unless a regression is observed.

### 2026-09-12 — Most Popular

- Fixed Most Popular metadata visibility/contrast on the homepage.
- This fix is already complete; do not repeat it unless a new regression is
  confirmed.

### 2026-09-12 — Body Image Add freeze fix

- **Priority:** P1 / proven Admin UI freeze when adding a Body Image.
- **Files changed:** `assets/js/body-image-preview.js`, `assets/js/body-image-labels.js`
- **Root cause:** Both visual helper scripts used a `MutationObserver` and a
  500 ms `setInterval` to call `apply()`. The same `apply()` functions mutate
  the DOM they were observing (preview `innerHTML`, labels, and hints), which
  can create a feedback loop and monopolize the browser main thread after
  `renderBodyImages()` rebuilds the Body Images list.
- **Fix:** Removed the document-wide `MutationObserver` and repeating
  `setInterval` from both helpers. They now refresh only after relevant
  Add/Remove Image, file-change, or URL-input events. This keeps the visual
  helpers responsive without changing the editor state or Article Schema v1.
- **Commits:** `2f50a8ccabaef69054490f883be18e51b6c148da`,
  `b33c07f5dfbd958b910281e264e40e6b1ddcf41d`
- **Verification:** The source changes are targeted and preserve the existing
  Body Image rendering behavior. The repository JavaScript syntax workflow
  must pass before this is considered fully verified.
- **Article Schema v1:** unchanged and remains locked.

## Current Audit Status

### 🟢 Verified / do not repeat

- Admin Panel loads successfully on the live site.
- Most Popular metadata fix is complete.
- Related Stories static image-path fix is implemented.
- The Body Image Add freeze fix is implemented; live click/file-selection
  verification is pending deployment/cache refresh.
- Article Schema v1 is locked and unchanged.

### 🔴 Needs user input

- `contact.html` still contains the placeholder email
  `hello@jaziel-story.example`. It must be replaced with the real contact
  email; no email address will be invented by the audit.

### 🟡 Needs further audit before modification

- Search/category JavaScript responsibilities appear duplicated across
  multiple files; map all listeners before refactoring.
- AI request/result JSON files are stored in the public repository; review
  privacy and cleanup strategy before changing architecture.
- SEO improvements such as sitemap/robots and JSON-LD Article structured data
  can be considered separately from the current Admin repair.

### 🟠 AI Writer verification pending

- The P1 workflow fix is implemented but must be tested with a new AI Writer
  request. Do not mark it as fully verified until the new request produces a
  result and the request/result commit completes successfully.

## Change-control rule

For every future repository change:

1. Inspect the current repository and recent commits first.
2. Check this README and `CHANGELOG.md` before proposing a fix.
3. Make the smallest targeted change possible.
4. Do not touch Article Schema v1 unless explicitly approved.
5. Verify syntax/build/workflow status before declaring success.
6. Record the exact files, reason, commit SHA, verification, and deployment
   status in both this README and `CHANGELOG.md`.
7. If a change is reverted or superseded, record that explicitly so it is
   never accidentally repeated.

## Monetization

Adsterra ad slots (`.ad-slot` elements) are unchanged. The Admin Panel does
not manage ad code.
