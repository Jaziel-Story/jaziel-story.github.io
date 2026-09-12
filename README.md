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

- `.github/workflows/validate-articles.yml` — validates `articles.json`.
- `.github/workflows/validate-javascript.yml` — checks JavaScript syntax with
  Node.js on JavaScript changes.
- `.github/workflows/ai-writer.yml` — runs on demand, triggered by the Admin
  Panel, to turn raw text into a structured article draft with Gemini.

## Repository Change Log

**Important rule:** Every repository change must be recorded here and in
`CHANGELOG.md`. Before making another fix, check these logs and the recent Git
commits first. Do not repeat a change that is already marked DONE unless a
regression is confirmed.

### 2026-09-13 — Admin P1–P2 audit hardening

- **Priority:** P1–P2 / prevent known regressions, observer feedback loops,
  stale browser code, and image/draft inconsistencies.
- **P1:** `.github/workflows/generate-static-articles.yml` no longer creates or
  injects the obsolete `link-fix.js`, preventing future article generation from
  restoring the removed global observer.
- **P1:** `assets/js/admin-section-labels.js` no longer uses a persistent
  `MutationObserver`. It uses bounded event-driven refreshes after editor
  navigation/add/remove actions, covering dynamic editor rendering without an
  observer feedback loop.
- **P1:** `assets/js/admin-preview-order-fix.js` now targets `#btnPreview` and
  retries for a few animation frames so asynchronous Preview rendering is
  handled without a persistent observer or interval.
- **P1/P2:** `assets/js/ai-writer-category-fix.js` no longer observes the whole
  document. Its temporary observer is scoped to the active AI status/view and
  disconnects after success or failure.
- **P2:** `assets/js/image-manager.js` now accepts safe Jaziel repository image
  paths as well as HTTP(S) image URLs, while retaining the existing 10 MB/type
  guard.
- **P2:** draft image persistence now clears stale body-image IndexedDB entries
  by draft-key prefix before saving the current selection.
- **Cache protection:** audited Admin helper scripts are cache-busted in
  `admin/index.html`.
- **Schema:** Article Schema v1 was not changed.
- **Files changed:** `.github/workflows/generate-static-articles.yml`,
  `assets/js/admin-section-labels.js`, `assets/js/ai-writer-category-fix.js`,
  `assets/js/image-manager.js`, `assets/js/admin-preview-order-fix.js`,
  `admin/index.html`.
- **Commits:** `09cb3be8d3373c69ff70d84bac692f690d473ab0`,
  `4d111022dda3645763322d7970f47b07a785193e`,
  `75b5322707d2b6633497b24a56695c6807faf93e`,
  `e8d43ef9541105c131ade130b2027f4705d8b999`,
  `b6da7f8bf41f125300549f2d983a12248db1449f`,
  `b215a6488313b57637758587d40f242cf3a8b50a`,
  `8b80a7dccc7c59c10a86c363dfdfa27d6f2e4d60`.
- **Verification:** The JavaScript workflow successfully passed on earlier
  hardening commits `e8d43ef...`, `b6da7f8...`, and `b215a648...`. The latest
  section-label refinement was additionally checked with `node --check`.
  Full fresh workflow and live Admin E2E verification remain pending.
- **Deployment:** GitHub Pages/live verification pending.
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION.

### Protected fixes register — do not revert without a confirmed regression

These are protected baseline fixes. If a future bug appears, **do not
immediately modify or remove these files because they look related**. First
reproduce the bug, inspect the current version, check this README and
`CHANGELOG.md`, and compare the relevant commit.

- `index.html` + `home-featured-minimal.js` + `home-latest-final.js` — homepage
  loader/observer consolidation. Do not restore deleted competing loaders.
- `assets/js/admin-section-labels.js` — bounded event-driven labels; do not
  restore a persistent DOM observer without a reproduced regression.
- `assets/js/ai-writer-category-fix.js` — scoped active-generation watch; do not
  restore a document-wide observer.
- `assets/js/admin-preview-order-fix.js` — bounded animation-frame Preview
  repair; do not replace it with a permanent observer/interval without proof.
- `assets/js/image-manager.js` + `assets/js/body-image-preview.js` — image
  validation/preview compatibility for repository paths and local files.
- `.github/workflows/generate-static-articles.yml` — must not recreate
  `assets/js/link-fix.js` or inject it into pages.
- `articles.json` — single source of truth and Article Schema v1; do not change
  its structure as a workaround for an Admin UI bug.

**Bug investigation rule:** For a new bug, first classify it as a regression
in a protected fix or an independent defect. Use the smallest targeted fix.
Record the affected protected commit, the new commit, verification, deployment
result, and whether the old fix remains intact. Never "clean up" a protected
fix merely because it is nearby code.

### 2026-09-12 — Admin Preview image order fix

- **Priority:** P1 / user screenshot confirmed Body Images were rendered after
  Section 3 instead of in section order.
- **Finding:** The live Preview showed both existing body figures at the end.
  The missing Section 3 image is intentionally postponed. Required behavior:
  Body Image 1 after Section 1, Body Image 2 after Section 2, and no image after
  Section 3 until one is added.
- **Fix:** Added `assets/js/admin-preview-order-fix.js` and loaded it with a
  cache-busted script reference. Article data and Schema v1 were untouched.
- **Commits:** `8e8c3af2288eac967a47452fd5ae6f5e96c017f0`,
  `d134c30290e30a3fa285b54899812145f659c47a`.
- **Later hardening:** `b215a6488313b57637758587d40f242cf3a8b50a` added bounded
  animation-frame retries for asynchronous Preview rendering.
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION.

### 2026-09-12 — Admin Preview stability + Body Image relative-path fix

- **Priority:** P1 / Preview refresh/stuck behavior and missing Body Image
  previews for repository-relative paths.
- **Fix:** Removed the persistent `admin-preview-section-mapping.js` observer
  approach and kept `admin/admin.js` untouched. Updated
  `body-image-preview.js` to resolve relative repository paths.
- **Commits:** `3bc626b6f7521f1bf96512f5585dd28cc4b1836d`,
  `9bac5ef22f98f850c97079df431ea0c63be4da90`,
  `56e7a982294e438464c4f0a91a26a147fc228753`.
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION.

### 2026-09-12 — Homepage performance consolidation

- **Priority:** P1 / user-reported homepage performance problem.
- **Fix:** Homepage now uses one dedicated data/render path; obsolete loaders
  and observers were removed.
- **Commits:** `aa690bb0658960d0d3b0871e2e7452b73db3f10b`,
  `184a89b922fb860079dcd80efadfd87bbc97122b`,
  `f58ab89ccda1b0183ef636b76b4da46ed0de67cd`,
  `83bb01c1d20d82de509a4467d2906675fe8a7580`.
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION.

### 2026-09-12 — Admin Panel recovery & audit

- Fixed the Admin Panel JavaScript parser issue.
- Restored a clean `admin/admin.js` source and avoided another broad rewrite.
- Removed obsolete runtime/one-time repair mechanisms.
- Added permanent JavaScript syntax validation.
- The deployed Admin Panel was verified working by user screenshot.

## Current Audit Status

### 🟢 Verified / do not repeat

- Admin Panel loads successfully on the live site.
- Most Popular metadata fix is complete.
- Related Stories static image-path fix is implemented.
- Article Schema v1 is locked and unchanged.

### 🟡 Needs live verification

- Latest Admin Preview ordering/timing hardening.
- Admin Preview stability and Body Image relative-path behavior.
- Homepage loader/observer cleanup.
- AI Writer P1 workflow fix.
- New Admin P1–P2 hardening from 2026-09-13.

### 🔴 Needs user input

- `contact.html` still contains the placeholder email
  `hello@jaziel-story.example`. It must be replaced with the real contact
  email; no email address will be invented by the audit.

### 🟠 AI Writer privacy / E2E review pending

- AI request/result JSON remains repository-backed. In a public repository,
  those contents can be publicly readable. This was not moved during this
  hardening pass because changing the transport would be a separate
  architecture decision and could break the working AI flow.
- A fresh end-to-end AI Writer test is still required.

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
