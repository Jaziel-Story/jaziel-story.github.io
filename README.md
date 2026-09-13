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
robots.txt             Crawler rules and sitemap declaration
sitemap.xml            Canonical URL sitemap
.github/workflows/generate-sitemap.yml  Automatic sitemap regeneration
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
- The article cover appears only on Page 1. Page 2 and later retain the article title but do not repeat the dek/read-time metadata.
- Static article Page 1 and later `?page=N` URLs receive active-page canonical/OG URL signals at runtime.

## SEO / indexability baseline

- `robots.txt` allows normal crawling and declares `sitemap.xml`.
- `sitemap.xml` contains the homepage, core informational pages, and canonical static article URLs.
- `.github/workflows/generate-sitemap.yml` rebuilds the sitemap from `articles.json` whenever article data changes.
- `index.html` has a self-referencing canonical URL and `WebSite` JSON-LD.
- Static article pages retain canonical/description/OG metadata and now receive `Article` JSON-LD from the pagination helper without changing Article Schema v1.
- Dynamic `article.html?slug=...` remains a legacy fallback; the sitemap points only to canonical static article URLs.
- Search/category query pages are intentionally not listed in the sitemap.

## Workflow push hardening

On 2026-09-13, the static article generator was hardened after a real Admin publish exposed a race between the static generator and sitemap workflow. The generator successfully created the article HTML but its push was rejected because another workflow had updated `main` first.

- `.github/workflows/generate-static-articles.yml` now uses the shared `jaziel-main-writers` concurrency group with `cancel-in-progress: false`.
- `.github/workflows/generate-sitemap.yml` uses the same writer lock so repository-writing workflows are serialized instead of racing on `main`.
- Both workflows fetch `origin/main`, rebase before pushing, retry up to three times, and fail safely if the push still cannot be completed.
- The Admin test article `Jaziel Image Upload Test` was successfully regenerated as `articles/jaziel-image-upload-test.html` after the fix, including its 3 sections, images, pagination, closing, and ad slots.
- Article Schema v1, pagination rules, and article content structure were not changed.

This approach follows GitHub Actions concurrency behavior: workflows sharing a concurrency group can be serialized, preventing simultaneous repository-writing runs from conflicting. citeturn0search0turn0search1

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
- `.github/workflows/generate-sitemap.yml` — regenerates the XML sitemap from the current article list.
- `.github/workflows/generate-static-articles.yml` — generates canonical static article HTML from `articles.json` and safely writes the generated files back to `main`.

## Repository Change Log

**Important rule:** Every repository change must be recorded here and in
`CHANGELOG.md`. Before making another fix, check these logs and the recent Git
commits first. Do not repeat a change that is already marked DONE unless a
regression is confirmed.

### 2026-09-13 — Workflow push hardening

- **Priority:** P1 / prevent the real `main` push race that caused a published Admin article to exist in `articles.json` while its generated static HTML remained only inside a failed workflow runner.
- **Files changed:** `.github/workflows/generate-static-articles.yml`, `.github/workflows/generate-sitemap.yml`.
- **Change:** Added the shared `jaziel-main-writers` concurrency group with queued execution, plus fetch/rebase/retry push handling in both repository-writing workflows.
- **Reason:** A real Admin publish produced a non-fast-forward rejection in the generator when the sitemap workflow pushed first.
- **Commits:** `fff782a471f8118addd1b9cf8bb1c4d300969a7e`, `30a629014ddb521e3e18d8f4699323c157332619`, `10a00e0469ae15d88fb6246864689cb1b973a9c1`, `6bafaaaa326889233335429ed185b9bbc146d05a`.
- **Verification:** Generator successfully created `articles/jaziel-image-upload-test.html` and pushed it to `main`. The generated page contains the test article's cover, three sections/images, pagination, closing, and ad slots.
- **Status:** IMPLEMENTED / PIPELINE LIVE VERIFICATION CONTINUES.

### 2026-09-13 — SEO/indexability foundation

- **Priority:** P1 / remove technical discovery gaps found in the repository SEO audit.
- **Files changed:** `robots.txt`, `sitemap.xml`, `.github/workflows/generate-sitemap.yml`, `index.html`, `assets/js/article-pagination.js`.
- **Change:** Added robots.txt with the sitemap declaration; added sitemap and automatic regeneration from `articles.json`; added homepage canonical and WebSite JSON-LD; added Article JSON-LD for static article pages; kept pagination and Article Schema v1 unchanged.
- **Canonical policy:** Static paginated article URLs use the active page URL as their canonical signal (`?page=N` for Page 2+). The legacy dynamic `article.html?slug=...` route is not included in the sitemap.
- **Reason:** The audit found no robots.txt, sitemap.xml, homepage canonical, or article structured data.
- **Article Schema:** unchanged and locked.
- **Verification:** Source was re-audited after each change. Sitemap escaping was corrected before finalizing. Search Console live indexing was subsequently tested for the homepage and a correct static Lady Gaga URL.
- **Status:** IMPLEMENTED / LIVE SEARCH CONSOLE VERIFICATION IN PROGRESS.

### 2026-09-13 — Adsterra site-wide integration

- **Priority:** P1 / add approved Adsterra formats without changing Article Schema or pagination.
- **Files:** ad integration helper and static article generation path.
- **Change:** Added site-wide Popunder and Social Bar, responsive 300×250 desktop/tablet and 320×50 mobile banners, and Native Banner handling with duplicate-container protection.
- **Important rule:** Popunder/Social Bar load once per HTML document; Adult Ads and Smartlink were not enabled.
- **Verification:** GitHub Actions validation and Pages deployment succeeded. Homepage testing showed Social Bar and banner delivery; blank ad slots were treated as network no-fill rather than code failure.
- **Commit:** `4175a362763009610e630b0552a52ce58bd5088d` (`4175a36`).
- **Status:** DEPLOYED / LIVE TESTING CONTINUES.

### 2026-09-13 — Article pagination display refinement

- **Priority:** P2 / refine continuation display without changing pagination behavior.
- **Files changed:** `assets/js/article-pagination.js`.
- **Change:** Kept the article title visible on every pagination page while hiding dek/read-time/date metadata after Page 1. The cover remains Page-1-only.
- **Reason:** Cleaner Page 2 presentation while retaining article context.
- **Commits:** `d23190ddec29c1b1cfbd735a3a43ced8a177e137`, `41d9920695782654ac0b7e066544f770a2c8816a`, `67f423b6edb6ffb24e29b8daaab970945cb47e65`.
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION.

### 2026-09-13 — Article pagination implemented

- **Priority:** P1 / improve long-article readability while keeping Article Schema v1 unchanged.
- **Files changed:** `assets/js/article-pagination.js`, `assets/css/article-pagination.css`, `article.html`, `.github/workflows/generate-static-articles.yml`.
- **Change:** Added maximum-2-sections-per-page pagination, numbered navigation, Page X of Y, Continue Reading, sequential section/image mapping, and static generation support.
- **URL behavior:** Static article pages use `articles/{slug}.html?page=N`; missing `page` means Page 1. Dynamic fallback uses `article.html?slug={slug}&page=N`.
- **Cleanup:** Removed the stale `assets/js/link-fix.js` script reference from `article.html`.
- **Commits:** `b6c2362564b9f405618b5411219d9f2c791d1251`, `ba70730c3ed0cdea69751206f15b96d1d48feca1`, `6eacf514d273c20c6785d9fed2f0b446126663ce`, `35962fc55d94eaad8bb999511648bc355a1accf8`, `bf8d4609cf17b22b695d493e4e4b86d55e6bdfba`.
- **Verification:** `node --check` passed and a 5-section fixture produced 3 pages with ordered images.
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION.

### 2026-09-13 — Website OG cover metadata

- **Priority:** P2 / add website Open Graph/social sharing cover.
- **Files changed:** `assets/images/og/jaziel-og-cover.png`, `index.html`.
- **Change:** Added the Jaziel OG cover and website-level Open Graph/Twitter metadata.
- **Commits:** `99f919e87a390aeeb266942a9472f0102f9cc4c1`, `afcfa4ad5f7301fc319c6f0c722792268393cbb2`.
- **Verification:** User confirmed the OG image appears successfully.
- **Status:** DONE / USER VERIFIED.

### 2026-09-13 — Contact email updated

- **Priority:** P2 / replace public placeholder contact address.
- **File:** `contact.html`.
- **Change:** Replaced `hello@jaziel-story.example` with the user-confirmed contact email in the visible link and mailto target.
- **Commit:** `59069f9ccd8d97bde1dead9fa5859aa3e2d681a6`.
- **Status:** DONE / NEEDS LIVE DEPLOYMENT VERIFICATION.

### 2026-09-13 — Admin P1–P2 audit hardening

- **Priority:** P1–P2 / prevent known regressions, observer feedback loops, stale browser code, and image/draft inconsistencies.
- **Files changed:** `.github/workflows/generate-static-articles.yml`, `assets/js/admin-section-labels.js`, `assets/js/ai-writer-category-fix.js`, `assets/js/image-manager.js`, `assets/js/admin-preview-order-fix.js`, `admin/index.html`.
- **Change:** Removed persistent observers from audited helpers, bounded Preview repair to the Preview action, scoped AI status watching, added safe repository-image URL support, cleaned stale draft-image IndexedDB entries, and cache-busted audited Admin helpers.
- **Article Schema v1:** unchanged and locked.
- **Commits:** `09cb3be8d3373c69ff70d84bac692f690d473ab0`, `4d111022dda3645763322d7970f47b07a785193e`, `75b5322707d2b6633497b24a56695c6807faf93e`, `e8d43ef9541105c131ade130b2027f4705d8b999`, `b6da7f8bf41f125300549f2d983a12248db1449f`, `b215a6488313b57637758587d40f242cf3a8b50a`, `8b80a7dccc7c59c10a86c363dfdfa27d6f2e4d60`.
- **Verification:** JavaScript validation passed on the hardening commits and `node --check` passed for the section-label refinement.
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION.

### Protected fixes register — do not revert without a confirmed regression

These are protected baseline fixes. If a future bug appears, do not immediately modify or remove these files because they look related. First reproduce the bug, inspect the current version, check this README and `CHANGELOG.md`, and compare the relevant commit.

- `index.html` + `home-featured-minimal.js` + `home-latest-final.js` — homepage loader/observer consolidation. Do not restore deleted competing loaders.
- `assets/js/admin-section-labels.js` — bounded event-driven labels; do not restore a persistent DOM observer without a reproduced regression.
- `assets/js/ai-writer-category-fix.js` — scoped active-generation watch; do not restore a document-wide observer.
- `assets/js/admin-preview-order-fix.js` — bounded animation-frame Preview repair; do not replace it with a permanent observer/interval without proof.
- `assets/js/image-manager.js` + `assets/js/body-image-preview.js` — image validation/preview compatibility for repository paths and local files.
- `.github/workflows/generate-static-articles.yml` — must not recreate `assets/js/link-fix.js` or inject it into pages.
- `articles.json` — single source of truth and Article Schema v1; do not change its structure as a workaround for an Admin UI bug.

### 2026-09-12 — Admin Preview image order fix

- **Priority:** P1 / body images must appear after their matching section.
- **Fix:** Added `assets/js/admin-preview-order-fix.js`; later hardened with bounded animation-frame retries.
- **Commits:** `8e8c3af2288eac967a47452fd5ae6f5e96c017f0`, `d134c30290e30a3fa285b54899812145f659c47a`, later `b215a6488313b57637758587d40f242cf3a8b50a`.
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION.

### 2026-09-12 — Admin Preview stability + Body Image relative-path fix

- **Fix:** Removed the persistent Preview mapping observer approach and updated `body-image-preview.js` to resolve relative repository paths.
- **Commits:** `3bc626b6f7521f1bf96512f5585dd28cc4b1836d`, `9bac5ef22f98f850c97079df431ea0c63be4da90`, `56e7a982294e438464c4f0a91a26a147fc228753`.
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION.

### 2026-09-12 — Homepage performance consolidation

- **Priority:** P1 / user-reported homepage performance problem.
- **Fix:** Homepage now uses one dedicated data/render path; obsolete loaders and observers were removed.
- **Commits:** `aa690bb0658960d0d3b0871e2e7452b73db3f10b`, `184a89b922fb860079dcd80efadfd87bbc97122b`, `f58ab89ccda1b0183ef636b76b4da46ed0de67cd`, `83bb01c1d20d82de509a4467d2906675fe8a7580`.
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION.

## Current Audit Status

### 🟢 Verified / do not repeat

- Admin Panel loads successfully on the live site.
- Article Schema v1 is locked and unchanged.
- Website OG cover image was confirmed visible by the user.
- SEO foundation files are present in the repository.
- Static generator successfully regenerated the Admin test article after workflow push hardening.

### 🟡 Needs live verification

- Final GitHub Pages deployment after the latest workflow/documentation commits.
- Article pagination across 1-, 2-, 3-, 4-, 5-, and 6-section articles.
- Latest Page-2 display refinement.
- Google Search Console sitemap processing and URL Inspection for new articles.
- Rich Results Test / rendered JSON-LD validation for article pages.
- Full Admin Edit Article and Draft end-to-end testing.

### 🟠 AI Writer privacy / E2E review pending

- AI request/result JSON remains repository-backed. In a public repository, those contents can be publicly readable. Moving this transport would be a separate architecture decision.
- A fresh end-to-end AI Writer test is still required.

## Change-control rule

For every future repository change:

1. Inspect the current repository and recent commits first.
2. Check this README and `CHANGELOG.md` before making another fix.
3. Make the smallest safe change possible.
4. Do not touch Article Schema v1 unless explicitly approved.
5. Verify syntax/build/workflow status before declaring success.
6. Record the exact files, reason, commit SHA, verification, and deployment status in both this README and `CHANGELOG.md`.
7. If a change is reverted or superseded, record that explicitly.

## Monetization

Adsterra ad slots (`.ad-slot` elements) are unchanged. The Admin Panel does not manage ad code.
