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

### 2026-09-13 — Admin P1–P2 audit hardening

- **Priority:** P1–P2 / prevent known regressions, observer feedback loops,
  stale browser code, and image/draft inconsistencies.
- **P1 fix:** `.github/workflows/generate-static-articles.yml` no longer creates
  or injects the obsolete `link-fix.js`. This prevents a future `articles.json`
  publish from silently restoring the removed global link-fixing observer.
- **P1 fix:** `assets/js/admin-section-labels.js` no longer uses a persistent
  `MutationObserver`. Section labels refresh only after section add/remove
  events, preventing a label-update/DOM-observer feedback loop.
- **P1 fix:** `assets/js/admin-preview-order-fix.js` now targets `#btnPreview`
  and retries for a few animation frames so asynchronous Preview rendering is
  handled without a persistent observer or interval.
- **P1/P2 fix:** `assets/js/ai-writer-category-fix.js` no longer observes the
  whole document. Its temporary observer is scoped to the active AI status/view
  and disconnects after success or failure.
- **P2 fix:** `assets/js/image-manager.js` now accepts safe Jaziel repository
  image paths as well as HTTP(S) image URLs, matching the Admin renderer and
  body-image preview behavior. It also keeps the existing 10 MB/type guard.
- **P2 fix:** draft image persistence now clears stale body-image IndexedDB
  entries by draft-key prefix before saving the current selection, preventing
  removed/reordered images from surviving into a later draft restore.
- **Cache protection:** changed Admin helper scripts received cache-busted
  query versions in `admin/index.html` so browsers do not continue executing
  older helper code after deployment.
- **Schema:** Article Schema v1 was not changed.
- **Files changed:** `.github/workflows/generate-static-articles.yml`,
  `assets/js/admin-section-labels.js`, `assets/js/ai-writer-category-fix.js`,
  `assets/js/image-manager.js`, `assets/js/admin-preview-order-fix.js`,
  `admin/index.html`.
- **Commits:**
  - `09cb3be8d3373c69ff70d84bac692f690d473ab0` — stop generator restoring link-fix
  - `4d111022dda3645763322d7970f47b07a785193e` — remove section label observer loop
  - `e8d43ef9541105c131ade130b2027f4705d8b999` — scope AI category observer
  - `b6da7f8bf41f125300549f2d983a12248db1449f` — harden image validation/draft cleanup
  - `b215a6488313b57637758587d40f242cf3a8b50a` — harden Preview async ordering
  - `8b80a7dccc7c59c10a86c363dfdfa27d6f2e4d60` — cache-bust audited Admin helpers
- **Verification:** Source-level audit completed. The repository's JavaScript
  validation workflow is configured to run `node --check` over all `.js` files;
  a fresh workflow run and live Admin E2E test are still required before these
  changes are marked fully verified.
- **Deployment:** GitHub Pages deployment/live Admin verification pending.
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION.

### Protected fixes register — do not revert without a confirmed regression

These fixes are now part of the repository's protected baseline. If a future
bug appears, **do not immediately modify or remove these files because they
look related**. First reproduce the bug, inspect the current version, check
this README and `CHANGELOG.md`, and compare the relevant commit before changing
anything.

- `index.html` + `home-featured-minimal.js` + `home-latest-final.js` — homepage
  loader/observer consolidation. Do not restore deleted competing loaders.
- `assets/js/admin-section-labels.js` — event-driven labels; do not restore a
  document/subtree MutationObserver without a reproduced regression.
- `assets/js/ai-writer-category-fix.js` — scoped active-generation watch; do not
  restore a document-wide observer.
- `assets/js/admin-preview-order-fix.js` — one-shot animation-frame Preview
  repair; do not replace it with a permanent observer/interval without proof.
- `assets/js/image-manager.js` + `assets/js/body-image-preview.js` — image
  validation/preview compatibility for repository paths and local files.
- `.github/workflows/generate-static-articles.yml` — must not recreate
  `assets/js/link-fix.js` or inject it into pages.
- `articles.json` — single source of truth and Article Schema v1; do not change
  its structure as a workaround for an Admin UI bug.

**Bug investigation rule:** When a new bug is reported, first identify whether
it is a regression in one of the protected fixes or an independent defect.
Use the smallest targeted fix. Record the affected protected commit, the new
commit, verification, deployment result, and whether the old fix remains
intact. Never "clean up" a protected fix merely because it is nearby code.

### 2026-09-12 — Admin Preview image order fix

- **Priority:** P1 / user screenshot confirmed Body Images were rendered after
  Section 3 instead of in section order.
- **Finding:** The live Preview showed both existing body figures at the end of
  the article content. The user has intentionally postponed the missing
  Section 3 image, so the required behavior is: Body Image 1 after Section 1,
  Body Image 2 after Section 2, and no image after Section 3 until one is added.
- **Fix:** Added `assets/js/admin-preview-order-fix.js`. It runs once after the
  Preview button is clicked, identifies the Preview `h2` sections and existing
  `figure.article-figure` elements, then inserts figure `i` immediately before
  heading `i+1`. This produces the intended section order without a
  `MutationObserver` and without changing article data.
- **Fix:** Loaded the helper from `admin/index.html` with a cache-busted version.
- **Files changed:** `admin/index.html`, `assets/js/admin-preview-order-fix.js`.
- **Commit:** `8e8c3af2288eac967a47452fd5ae6f5e96c017f0` — helper;
  `d134c30290e30a3fa285b54899812145f659c47a` — Admin loader.
- **Verification:** Helper JavaScript syntax was checked before commit. The
  uploaded live screenshot was used to confirm the exact ordering defect.
  Live post-deploy verification is still required.
- **Deployment:** NEEDS GITHUB PAGES DEPLOYMENT + USER LIVE VERIFICATION.
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION.
- **Article Schema v1:** unchanged and remains locked.

### 2026-09-12 — Admin Preview stability + Body Image relative-path fix

- **Priority:** P1 / user-reported Preview refresh/stuck behavior and missing
  Body Image previews for repository-relative paths.
- **Finding:** The additional `admin-preview-section-mapping.js` helper used a
  `MutationObserver` on `#previewRoot`. Further audit confirmed the core
  `admin.js` Preview renderer was not producing the required live section/image
  order, so the extra observer approach was removed and replaced by the
  one-shot order fix recorded above.
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

- Admin Preview image section ordering fix and its latest async-render hardening.
- Admin Preview stability fix and Body Image relative-path preview fix.
- Homepage duplicate-loader/observer cleanup.
- AI Writer P1 workflow fix.
- New P1–P2 observer/image/draft hardening from 2026-09-13.

### 🔴 Needs user input

- `contact.html` still contains the placeholder email
  `hello@jaziel-story.example`. It must be replaced with the real contact
  email; no email address will be invented by the audit.

### 🟠 AI Writer verification pending

- The P1 workflow fix is implemented but must be tested with a new AI Writer
  request before it is marked fully verified.
- AI request/result files are still repository-backed and therefore public in
  a public repository. This remains an architecture/privacy consideration;
  it was not changed in this audit because moving the transport would require
  a separate design decision and could break the current AI flow.

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
