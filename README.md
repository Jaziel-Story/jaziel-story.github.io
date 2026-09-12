# Jaziel — Trending Stories

A static, GitHub Pages–hosted trending-stories site, plus an Admin Panel
for creating and managing articles without hand-editing `articles.json`.

Live site: https://jaziel-story.github.io/

## Site structure

```
index.html         Homepage
article.html       Single article view (?slug=…)
search.html        Search
category.html      Category browsing
about.html, contact.html, privacy.html, terms.html
articles.json      All article data (root of the repo — do not move)
assets/css/style.css  Shared stylesheet
assets/js/main.js     Shared frontend logic (reads articles.json)
assets/js/home-featured-minimal.js  Lightweight homepage presentation helper
assets/js/home-latest-final.js      Single homepage data/render loader
assets/images/articles/  Article images (cover + body), uploaded via the Admin Panel
```

The homepage intentionally uses one dedicated data/render loader so
`main.js` does not initialize the same homepage twice. Article Schema v1
remains unchanged and locked.

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
Access Token** inside the panel for what permissions you need, and **Help**
inside the panel for an honest description of what is and isn't secure about
this setup on static GitHub Pages hosting.

### How it works, in short

- The Admin Panel is a static page. It has no backend of its own.
- To publish, edit, or delete an article, it calls the GitHub REST API directly
  from your browser using a Personal Access Token you provide at runtime
  (Settings tab). That token is kept in memory, or in `sessionStorage` for the
  current tab only if you opt in — it is never written to any file in this
  repository.
- The **AI Writer** (Google Gemini) never sees your Gemini key from the browser.
  The panel commits your raw text to `admin/ai-requests/`, then triggers the
  `.github/workflows/ai-writer.yml` GitHub Actions workflow, which holds
  `GEMINI_API_KEY` as a GitHub Actions secret, calls Gemini on GitHub's servers,
  and writes the structured result to `admin/ai-results/` for the panel to pick
  up. You always review the generated draft before publishing — nothing is
  auto-published.

### One-time setup for the AI Writer

1. Get a Gemini API key from Google AI Studio.
2. In this repository: **Settings → Secrets and variables → Actions → New
   repository secret**, name it `GEMINI_API_KEY`, and paste the key.
3. In the Admin Panel's Settings tab, add a GitHub Personal Access Token scoped
   to this repository with `Contents: Read and write` and `Actions: Read and write`.

The Gemini model used is configured in one place:
`GEMINI_MODEL` at the top of `.github/scripts/generate-article.mjs`
(currently `gemini-3.8-flash`). If Google recommends a different model later,
update that single constant — no other file needs to change.

### GitHub Actions in this repo

- `.github/workflows/validate-articles.yml` — runs automatically on every
  change to `articles.json` and fails the check if the schema is broken
  (missing required fields, duplicate slugs/ids, invalid dates, etc.).
- `.github/workflows/validate-javascript.yml` — checks JavaScript syntax with
  Node.js on JavaScript changes, helping catch parser errors before deployment.
- `.github/workflows/ai-writer.yml` — runs on demand, triggered by the Admin
  Panel, to turn raw text into a structured article draft with Gemini. It waits
  for the request file to reach the latest `main` before generation.

## Repository Change Log

**Important rule:** Every repository change must be recorded here and in
`CHANGELOG.md`. Before making another fix, check these logs and the recent Git
commits first. Do not repeat a change that is already marked DONE unless a
regression is confirmed.

### 2026-09-12 — Admin Preview stability + Body Image relative-path fix

- **Priority:** P1 / user-reported Preview refresh/stuck behavior and missing
  Body Image previews for repository-relative paths.
- **Finding:** The additional `admin-preview-section-mapping.js` helper used a
  `MutationObserver` on `#previewRoot`. Further audit confirmed the core
  `admin.js` Preview renderer already maps `images[i]` to `sections[i]` in the
  locked Schema v1 parallel-array model, so the extra observer was unnecessary.
- **Fix:** Removed `assets/js/admin-preview-section-mapping.js` and its script
  include from `admin/index.html`. `admin/admin.js` remains untouched.
- **Fix:** Updated `assets/js/body-image-preview.js` so relative repository
  paths such as `assets/images/articles/...` resolve to the deployed site
  origin instead of being rejected as invalid because they are not absolute
  HTTP URLs.
- **Files changed:** `admin/index.html`, `assets/js/body-image-preview.js`.
- **File removed:** `assets/js/admin-preview-section-mapping.js`.
- **Commits:**
  - `3bc626b6f7521f1bf96512f5585dd28cc4b1836d` — accept relative Body Image paths
  - `9bac5ef22f98f850c97079df431ea0c63be4da90` — remove Preview observer and bump cache
  - `56e7a982294e438464c4f0a91a26a147fc228753` — remove redundant mapping helper
- **Verification:** Source reviewed against the reported behavior. JavaScript
  syntax verification and live Preview/Edit testing are still required.
- **Deployment:** NEEDS GITHUB PAGES DEPLOYMENT + USER LIVE VERIFICATION.
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION.
- **Article Schema v1:** unchanged and remains locked.

### 2026-09-12 — Homepage performance consolidation

- **Priority:** P1 / user-reported homepage performance problem.
- **Symptom:** Homepage could feel heavy and sometimes appear to refresh.
- **Root cause:** The homepage had multiple competing data loaders plus
  MutationObservers watching homepage DOM changes, causing duplicate requests
  and repeated DOM work.
- **Fix:** Homepage now uses one dedicated `home-latest-final.js` data/render
  path; obsolete loaders/observers were removed.
- **Article Schema v1:** unchanged and remains locked.

### 2026-09-12 — Admin Panel recovery & audit

- Fixed the Admin Panel JavaScript parser issue from the Claude repair bundle.
- Restored a clean `admin/admin.js` source and avoided another broad rewrite.
- Removed obsolete runtime/one-time repair mechanisms after recovery.
- Added permanent JavaScript syntax validation with
  `.github/workflows/validate-javascript.yml`.
- The deployed Admin Panel was verified working by user screenshot.

## Current Audit Status

### 🟢 Verified / do not repeat

- Admin Panel loads successfully on the live site.
- Most Popular metadata fix is complete.
- Related Stories static image-path fix is implemented.
- Article Schema v1 is locked and unchanged.

### 🟡 Needs live verification

- Admin Preview stability fix and Body Image relative-path preview fix.
- Homepage duplicate-loader/observer cleanup.
- AI Writer P1 workflow fix.

### 🔴 Needs user input

- `contact.html` still contains the placeholder email
  `hello@jaziel-story.example`. It must be replaced with the real contact
  email; no email address will be invented by the audit.

### 🟠 AI Writer verification pending

- The P1 workflow fix is implemented but must be tested with a new AI Writer
  request before it is marked fully verified.

## Change-control rule

For every future repository change:

1. Inspect the current repository and recent commits first.
2. Check this README and `CHANGELOG.md` before making another fix.
3. Make the smallest safe change possible.
4. Do not touch Article Schema v1 unless explicitly approved.
5. Verify syntax/build/workflow status before declaring success.
6. Record the exact files, reason, commit SHA, verification, and deployment
   status in both this README and `CHANGELOG.md`.
7. If a change is reverted or superseded, record that explicitly so it is never
   accidentally repeated.

## Monetization

Adsterra ad slots (`.ad-slot` elements) are unchanged. The Admin Panel does not
manage ad code.
