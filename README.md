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
assets/css/article-pagination.css  Article pagination UI
assets/js/main.js     Shared frontend logic (reads articles.json)
assets/js/article-pagination.js  Article pagination helper (max 2 sections/page)
assets/js/home-featured-minimal.js  Lightweight homepage presentation helper
assets/js/home-latest-final.js      Single homepage data/render loader
assets/images/articles/  Article images (cover + body), uploaded via the Admin Panel
assets/images/og/         Website Open Graph cover image
```

The homepage intentionally uses one dedicated data/render loader so
`main.js` does not initialize the same homepage twice. Article Schema v1
remains unchanged and locked.

## Article pagination

Articles now use a UI-only pagination layer without changing Article Schema v1.
When an article has more than two sections, the article is split into pages with
a maximum of **2 sections per page**. The first page is the default when no
`page` query parameter is present.

- 1–2 sections → 1 page, no pagination.
- 3–4 sections → 2 pages.
- 5–6 sections → 3 pages.
- 7–8 sections → 4 pages.
- Page URLs use `?page=1`, `?page=2`, `?page=3`, etc.
- Each non-final page provides a **Continue Reading** button.
- Numbered page links show **Page X of Y**.
- Section images remain mapped sequentially: Section 1 → Image 1, Section 2 → Image 2, and so on.
- Static generated article pages and the dynamic article view use the same pagination rule.

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

### 2026-09-13 — Article pagination implemented

- **Priority:** P1 / improve long-article readability and continuation flow while keeping Article Schema v1 unchanged.
- **Files changed:** `assets/js/article-pagination.js`, `assets/css/article-pagination.css`, `article.html`, `.github/workflows/generate-static-articles.yml`.
- **Change:** Added max-2-sections-per-page pagination, default Page 1 behavior, numbered page navigation, Page X of Y status, Continue Reading CTA, sequential section/image mapping, and static-page generation support.
- **URL behavior:** Static article pages use `articles/{slug}.html?page=N`; Page 1 is also the default when `page` is absent. The dynamic fallback uses `article.html?slug={slug}&page=N`.
- **SEO:** Static generated pages retain the base article canonical at generation time; the pagination helper updates the canonical/OG URL for the active page in the browser.
- **Important cleanup:** Removed the stale `assets/js/link-fix.js` script reference from `article.html`; the obsolete helper remains deleted and is not restored.
- **Reason:** User approved pagination design A+B+C and the recommendation that missing `page` defaults to Page 1.
- **Commits:** `b6c2362564b9f405618b5411219d9f2c791d1251`, `ba70730c3ed0cdea69751206f15b96d1d48feca1`, `6eacf514d273c20c6785d9fed2f0b446126663ce`, `35962fc55d94eaad8bb999511648bc355a1accf8`, `bf8d4609cf17b22b695d493e4e4b86d55e6bdfba`.
- **Verification:** `node --check` passed for the pagination helper and generator test script. A local fixture generator test confirmed 5 sections produce 3 page containers, Continue Reading controls, Page 1 of 3, and sequential images 1–5. Fresh GitHub Actions and live Pages verification remain pending.
- **Deployment:** GitHub Actions/static-page regeneration and live browser verification pending.
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION.

### 2026-09-13 — Website OG cover metadata

- **Priority:** P2 / add the website Open Graph/social sharing cover.
- **Files changed:** `assets/images/og/jaziel-og-cover.png`, `index.html`.
- **Change:** Added the Jaziel OG cover image and website-level Open Graph/Twitter metadata pointing to it.
- **Reason:** User requested a website OG cover.
- **Commit:** `afcfa4ad5f7301fc319c6f0c722792268393cbb2` for the metadata update; image rename/addition was committed immediately before it in `99f919e87a390aeeb266942a9472f0102f9cc4c1`.
- **Verification:** User confirmed the OG image appears successfully. Source metadata was also checked against the repository file path.
- **Deployment:** User confirmed the image appears; broader social-platform cache verification is not claimed.
- **Status:** DONE / USER VERIFIED.

### 2026-09-13 — Contact email updated

- **Priority:** P2 / replace the public placeholder contact address with the real site-owner email supplied by the user.
- **File changed:** `contact.html`.
- **Change:** Replaced `hello@jaziel-story.example` with `michaelgilroyjitmau2@gmail.com` in both the visible email link and its `mailto:` target; removed the placeholder instruction.
- **Reason:** The user confirmed the correct contact email.
- **Commit:** `59069f9ccd8d97bde1dead9fa5859aa3e2d681a6`.
- **Verification:** Source update committed successfully. No Article Schema or application JavaScript was changed.
- **Deployment:** GitHub Pages deployment/live rendering still requires confirmation after the commit.
- **Status:** DONE / NEEDS LIVE DEPLOYMENT VERIFICATION.

### 2026-09-13 — Admin P1–P2 audit hardening

- **Priority:** P1–P2 / prevent known regressions, observer feedback loops, stale browser code, and image/draft inconsistencies.
- **P1:** `.github/workflows/generate-static-articles.yml` no longer creates or injects the obsolete `link-fix.js`, preventing future article generation from restoring the removed global observer.
- **P1:** `assets/js/admin-section-labels.js` no longer uses a persistent `MutationObserver`. It uses bounded event-driven refreshes after editor navigation/add/remove actions, covering dynamic editor rendering without an observer feedback loop.
- **P1:** `assets/js/admin-preview-order-fix.js` now targets `#btnPreview` and retries for a few animation frames so asynchronous Preview rendering is handled without a persistent observer or interval.
- **P1/P2:** `assets/js/ai-writer-category-fix.js` no longer observes the whole document. Its temporary observer is scoped to the active AI status/view and disconnects after success or failure.
- **P2:** `assets/js/image-manager.js` now accepts safe Jaziel repository image paths as well as HTTP(S) image URLs, while retaining the existing 10 MB/type guard.
- **P2:** draft image persistence now clears stale body-image IndexedDB entries by draft-key prefix before saving the current selection.
- **Cache protection:** audited Admin helper scripts are cache-busted in `admin/index.html`.
- **Schema:** Article Schema v1 was not changed.
- **Files changed:** `.github/workflows/generate-static-articles.yml`, `assets/js/admin-section-labels.js`, `assets/js/ai-writer-category-fix.js`, `assets/js/image-manager.js`, `assets/js/admin-preview-order-fix.js`, `admin/index.html`.
- **Commits:** `09cb3be8d3373c69ff70d84bac692f690d473ab0`, `4d111022dda3645763322d7970f47b07a785193e`, `75b5322707d2b6633497b24a56695c6807faf93e`, `e8d43ef9541105c131ade130b2027f4705d8b999`, `b6da7f8bf41f125300549f2d983a12248db1449f`, `b215a6488313b57637758587d40f242cf3a8b50a`, `8b80a7dccc7c59c10a86c363dfdfa27d6f2e4d60`.
- **Verification:** The JavaScript workflow successfully passed on earlier hardening commits `e8d43ef...`, `b6da7f8...`, and `b215a648...`. The latest section-label refinement was additionally checked with `node --check`. Full fresh workflow and live Admin E2E verification remain pending.
- **Deployment:** GitHub Pages/live verification pending.
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION.

### Protected fixes register — do not revert without a confirmed regression

These are protected baseline fixes. If a future bug appears, **do not immediately modify or remove these files because they look related**. First reproduce the bug, inspect the current version, check this README and `CHANGELOG.md`, and compare the relevant commit.

- `index.html` + `home-featured-minimal.js` + `home-latest-final.js` — homepage loader/observer consolidation. Do not restore deleted competing loaders.
- `assets/js/admin-section-labels.js` — bounded event-driven labels; do not restore a persistent DOM observer without a reproduced regression.
- `assets/js/ai-writer-category-fix.js` — scoped active-generation watch; do not restore a document-wide observer.
- `assets/js/admin-preview-order-fix.js` — bounded animation-frame Preview repair; do not replace it with a permanent observer/interval without proof.
- `assets/js/image-manager.js` + `assets/js/body-image-preview.js` — image validation/preview compatibility for repository paths and local files.
- `.github/workflows/generate-static-articles.yml` — must not recreate `assets/js/link-fix.js` or inject it into pages.
- `articles.json` — single source of truth and Article Schema v1; do not change its structure as a workaround for an Admin UI bug.

**Bug investigation rule:** For a new bug, first classify it as a regression in a protected fix or an independent defect. Use the smallest targeted fix. Record the affected protected commit, the new commit, verification, deployment result, and whether the old fix remains intact. Never "clean up" a protected fix merely because it is nearby code.

### 2026-09-12 — Admin Preview image order fix

- **Priority:** P1 / user screenshot confirmed Body Images were rendered after Section 3 instead of in section order.
- **Finding:** The live Preview showed both existing body figures at the end. The missing Section 3 image is intentionally postponed. Required behavior: Body Image 1 after Section 1, Body Image 2 after Section 2, and no image after Section 3 until one is added.
- **Fix:** Added `assets/js/admin-preview-order-fix.js` and loaded it with a cache-busted script reference. Article data and Schema v1 were untouched.
- **Commits:** `8e8c3af2288eac967a47452fd5ae6f5e96c017f0`, `d134c30290e30a3fa285b54899812145f659c47a`.
- **Later hardening:** `b215a6488313b57637758587d40f242cf3a8b50a` added bounded animation-frame retries for asynchronous Preview rendering.
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION.

### 2026-09-12 — Admin Preview stability + Body Image relative-path fix

- **Priority:** P1 / Preview refresh/stuck behavior and missing Body Image previews for repository-relative paths.
- **Fix:** Removed the persistent `admin-preview-section-mapping.js` observer approach and kept `admin/admin.js` untouched. Updated `body-image-preview.js` to resolve relative repository paths.
- **Commits:** `3bc626b6f7521f1bf96512f5585dd28cc4b1836d`, `9bac5ef22f98f850c97079df431ea0c63be4da90`, `56e7a982294e438464c4f0a91a26a147fc228753`.
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION.

### 2026-09-12 — Homepage performance consolidation

- **Priority:** P1 / user-reported homepage performance problem.
- **Fix:** Homepage now uses one dedicated data/render path; obsolete loaders and observers were removed.
- **Commits:** `aa690bb0658960d0d3b0871e2e7452b73db3f10b`, `184a89b922fb860079dcd80efadfd87bbc97122b`, `f58ab89ccda1b0183ef636b76b4da46ed0de67cd`, `83bb01c1d20d82de509a4467d2906675fe8a7580`.
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
- Admin Preview has been checked by the user and confirmed safe.
- Public Contact email is now set to the user-confirmed email address.
- Website OG cover image was confirmed visible by the user.

### 🟡 Needs live verification

- Latest Admin P1–P2 hardening.
- Homepage loader/observer cleanup.
- AI Writer P1 workflow fix.
- GitHub Pages deployment of the latest contact email change.
- Article pagination across 1-, 2-, 3-, 4-, 5-, and 6-section articles.

### 🟠 AI Writer privacy / E2E review pending

- AI request/result JSON remains repository-backed. In a public repository, those contents can be publicly readable. This was not moved during this hardening pass because changing the transport would be a separate architecture decision and could break the working AI flow.
- A fresh end-to-end AI Writer test is still required.

## Change-control rule

For every future repository change:

1. Inspect the current repository and recent commits first.
2. Check this README and `CHANGELOG.md` before making another fix.
3. Make the smallest safe change possible.
4. Do not touch Article Schema v1 unless explicitly approved.
5. Verify syntax/build/workflow status before declaring success.
6. Record the exact files, reason, commit SHA, verification, and deployment status in both this README and `CHANGELOG.md`.
7. If a change is reverted or superseded, record that explicitly so it is never accidentally repeated.

## Monetization

Adsterra ad slots (`.ad-slot` elements) are unchanged. The Admin Panel does not manage ad code.
