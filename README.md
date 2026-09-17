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

Search and Category pages also have one dedicated runtime owner:
`search-category-fix.js`. The shared `main.js` keeps only the common helpers
needed by other pages and does not initialize Search or Category. This prevents
duplicate `articles.json` fetches, event listeners, and competing renders while
preserving the existing Search/Category UI and URL structure.

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
- Static article pages receive canonical/description/OG metadata and static `Article` JSON-LD generated from `articles.json`; the pagination helper maintains the active-page structured-data signal at runtime without changing Article Schema v1.
- Static article Page 1 uses the canonical article URL; Page 2+ use the active `?page=N` URL for canonical/OG/structured-data signals.
- Dynamic `article.html?slug=...` remains a legacy fallback; the sitemap points only to canonical static article URLs.
- Search/category query pages are intentionally not listed in the sitemap.

## Verification roadmap — after SEO, pagination SEO, Article JSON-LD, and image optimization

The implementation work for the current SEO/performance milestone is complete. The next step is **verification before adding new features**.

### 13. Live SEO Verification — P0

- Verify a live static article Page 1.
- Verify Page 2 and Page 3 where available.
- Confirm canonical URLs match the active page policy.
- Confirm `og:url` follows the active page URL.
- Confirm `rel="prev"` / `rel="next"` behavior where applicable.
- Confirm static `Article` JSON-LD is present in the generated HTML.
- Confirm runtime pagination does not create duplicate `Article` JSON-LD blocks.
- Confirm generated static HTML contains the expected SEO metadata without requiring JavaScript for crawler discovery.

### 14. Performance Verification — P1

- Confirm article cover images use eager loading and high fetch priority.
- Confirm body images remain lazy-loaded and asynchronous.
- Check for unnecessary image loading or duplicated requests.
- Check image dimensions/layout stability and identify any remaining CLS risk.
- Do not change image behavior unless a measurable regression is reproduced.

### 15. Static Generator E2E — P0

- Verify the latest GitHub Actions generator run completes successfully.
- Verify generated article files are committed to `main`.
- Verify sitemap regeneration remains synchronized with article generation.
- Verify GitHub Pages deployment completes successfully.
- Confirm the live site serves the generated static article after deployment.

### 16. Search / Category SEO Audit — P1

- Inspect `search.html` and `category.html` and their related JavaScript.
- Confirm query/result pages follow the intended indexability policy.
- Confirm search/category query URLs are not accidentally added to the sitemap.
- Check canonical, robots, and metadata behavior for these pages.
- Confirm Search and Category have a single runtime owner and do not register duplicate fetches/listeners/renders.

### 17. Publishing Safety — P1

- Verify publish → static generation → sitemap → Pages deployment as one safe flow.
- Verify duplicate-publish protection and recovery behavior.
- Confirm failed generation cannot be mistaken for a successful publish.
- Preserve the shared writer concurrency protection.
- Record any reproduced publishing regression before changing the protected workflow logic.

### Current priority rule

**Do not start the AI Writer work yet.** Complete verification items **13–17** first. AI Writer remains postponed until the SEO, pagination SEO, static Article JSON-LD, performance, generator E2E, search/category SEO, and publishing-safety checks are verified.

## Workflow push hardening

On 2026-09-13, the static article generator was hardened after a real Admin publish exposed a race between the static generator and sitemap workflow. The generator successfully created the article HTML but its push was rejected because another workflow had updated `main` first.

- `.github/workflows/generate-static-articles.yml` now uses the shared `jaziel-main-writers` concurrency group with `cancel-in-progress: false`.
- `.github/workflows/generate-sitemap.yml` uses the same writer lock so repository-writing workflows are serialized instead of racing on `main`.
- Both workflows fetch `origin/main`, rebase before pushing, retry up to three times, and fail safely if the push still cannot be completed.
- The Admin test article `Jaziel Image Upload Test` was successfully regenerated as `articles/jaziel-image-upload-test.html` after the fix, including its 3 sections, images, pagination, closing, and ad slots.
- Article Schema v1, pagination rules, and article content structure were not changed.

This approach follows GitHub Actions concurrency behavior: workflows sharing a concurrency group can be serialized, preventing simultaneous repository-writing runs from conflicting.

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

## Admin Draft & Image Regression Prevention

These rules are mandatory for future Admin draft, editor, and image fixes. They are based on the real regressions found while loading and editing the Victoria Beckham draft on 2026-09-16.

### Draft loading must update application state, not only the visible form

- A successful **Load Draft** action is not considered fixed merely because the success toast appears or the HTML inputs show values.
- The loader must use the actual persisted draft payload shape. Current drafts may contain the article under `draft.article`; compatibility with a direct article payload must remain supported where applicable.
- After loading, values must be synchronized with the Admin application's internal `state.editor`, not only assigned to DOM `.value` properties.
- Fields that normally use `input`/`change` listeners must receive the same events or an equivalent official state-update path used by the editor.
- Before declaring the fix complete, test **Load Draft → editor fields → sections → body images → Save Draft → Publish validation**.

### Draft image paths must be verified against the repository

- Never assume a draft image URL is valid because it contains the expected slug.
- For every cover/body image referenced by a repository-backed draft, verify that the exact file exists under `assets/images/articles/`.
- Verify the exact filename, extension, slug spelling, and body-image numbering. A `.webp` reference is not interchangeable with an existing `.jpg` file.
- For an article with N body sections, verify the intended N body-image paths and their sequential mapping before declaring the draft ready.
- A preview showing only a URL or a blank image area must trigger a repository-file check before changing frontend code.

### Required verification sequence for future Admin draft/image fixes

1. Inspect the current draft JSON in `admin/drafts/`.
2. Inspect the actual files in `assets/images/articles/`.
3. Inspect the current loader/editor state flow and its event listeners before changing code.
4. Reproduce the reported symptom and identify the exact root cause.
5. Make the smallest targeted change; do not broadly rewrite `admin/admin.js`.
6. Run JavaScript syntax validation for changed JavaScript.
7. Confirm the deployed GitHub Pages workflow completes successfully.
8. Hard-refresh the Admin Panel and retest the exact user flow.
9. For draft loading, verify both **visible DOM values** and **publish-time application state**.
10. For images, verify both **repository file existence** and **Admin preview rendering**.
11. Only after these checks pass may a fix be marked DONE.

### Cache and deployment rule

When a client-side Admin helper changes, the deployed script must be cache-busted when needed, and the verification must be performed against the deployed version rather than only the repository source.

### Protected debugging rule

Do not guess at a new fix from the symptom alone. First inspect the persisted data, the current runtime state flow, the exact event/listener path, the repository files, and the recent commits. If the same bug has already been fixed, treat a new report as a possible deployment/cache/data mismatch until a new regression is reproduced.

### One important limitation

These rules reduce recurrence and make regressions easier to detect; they do not guarantee that a future bug can never occur. A future report must still be reproduced and classified before code is changed.

### One-time setup for the AI Writer

1. Get a Gemini API key from Google AI Studio.
2. In this repository: **Settings → Secrets and variables → Actions → New repository secret**, name it `GEMINI_API_KEY`, and paste the key.
3. In the Admin Panel's Settings tab, add a GitHub Personal Access Token scoped to this repository with `Contents: Read and write` and `Actions: Read and write`.

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
- `.github/workflows/generate-sitemap.yml` — regenerates the XML sitemap from `articles.json`.
- `.github/workflows/generate-static-articles.yml` — generates canonical static article HTML from `articles.json` and safely writes the generated files back to `main`.

## Repository Change Log

**Important rule:** Every repository change must be recorded here and in
`CHANGELOG.md`. Before making another fix, check these logs and the recent Git
commits first. Do not repeat a change that is already marked DONE unless a
regression is confirmed.

### 2026-09-18 — Search / Category duplicate initialization fix

- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1 / eliminate duplicate `articles.json` fetches, event listeners, and competing renders without changing the existing Search/Category UI or routing.
- **Files changed:** `assets/js/main.js`.
- **Change:** Removed the Search and Category page initialization calls and their duplicate page-specific implementations from the shared `main.js`. `search-category-fix.js` remains the sole runtime owner for Search and Category behavior on those pages, including its normalization, canonical category resolution, latest-first result sorting, and `popstate` handling.
- **Reason:** Both `main.js` and `search-category-fix.js` were registering `DOMContentLoaded` handlers and independently fetching `articles.json` on `search.html` and `category.html`. Both also attached Search form listeners, causing duplicate fetch/render work and competing URL/render updates.
- **Scope:** Runtime ownership cleanup only. Search/Category HTML, CSS, URL format, visible layout, Article Schema v1, homepage category ordering, pagination, ads, publishing flow, sitemap, and Admin Panel were not changed.
- **Audit result:** `search.html` and `category.html` both load `main.js` followed by `search-category-fix.js`. `main.js` contained its own Search/Category initialization and rendering, while `search-category-fix.js` contained a second complete implementation with stronger normalization and routing handling. The safe consolidation point was to keep the dedicated hardening helper active and remove the competing implementations from `main.js`.
- **Verification before change:** README, CHANGELOG, `search.html`, `category.html`, both JavaScript files, and the recent commit history were inspected. The resulting `main.js` was reviewed for preserved shared Home/Article helpers and the dedicated Search/Category ownership comment. The repository's `validate-javascript.yml` workflow should verify syntax on the changed JavaScript. Live GitHub Pages Search/Category verification remains required.
- **Commit:** `84e3abc942aefd8cd9d6d8265455678eabf96a4c` (`Remove duplicate search and category initialization`).
- **Article Schema:** unchanged and locked.

### 2026-09-18 — Homepage category order follows article recency

- **Priority:** P2 / keep `Latest` and `Popular` fixed while automatically ordering the remaining category links by the recency of their newest article.
- **Files changed:** `assets/js/home-latest-final.js`, `index.html`.
- **Change:** The homepage category navigation now keeps `Latest` first and `Popular` second, then derives unique category links from the already newest-first article list. The first occurrence of each category determines its position, so a newly published or recently updated article moves its category toward the front automatically. `Latest` and `Popular` are excluded from the dynamic category list to avoid duplicates.
- **Reason:** The previous homepage category navigation was hard-coded (`Amazing`, `World`, `Entertainment`, `Technology`, `People`) and could become stale when new article categories were added or when the newest article belonged to a different category.
- **Scope:** Targeted homepage navigation change only. Article Schema v1, category page routing/filtering, search, pagination, ads, publishing flow, sitemap, and Admin Panel were not changed.
- **Cache-bust:** `index.html` now loads `home-latest-final.js?v=20260918a` so deployed browsers do not remain on the previous cached homepage loader.
- **Verification before change:** README and CHANGELOG were inspected first. Current `index.html`, `home-latest-final.js`, `category.html`, `search-category-fix.js`, and recent commits were reviewed. The homepage was confirmed to use `home-latest-final.js` as its dedicated data/render loader, while `body[data-page="home-static"]` prevents `main.js` from initializing the homepage.
- **Verification:** The changed JavaScript source was reviewed for syntax and the category-order logic uses the existing newest-first sort, including `updatedAt`/`updated` fallbacks when present and `date` otherwise. Live GitHub Pages visual verification is still required.
- **Commits:** `7a5941dae14b84e18b18fdfd5830f6d3d2681a0d` (`Make homepage categories follow latest articles`), `1541e131c4d9a88400b3b4134dbd3e4c9621049f` (`Cache-bust homepage category ordering`), `5e4bc022e1305f3d90e9e4ce35dc4e10ffcbeab8` (`Document dynamic homepage category order`).
- **Article Schema:** unchanged and locked.

### 2026-09-16 — GA4 Article Analytics foundation

- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1 / establish reliable traffic and article-read measurement before building the Admin Analytics dashboard.
- **GA4 Property:** `Jaziel Story`.
- **Web stream:** `Jaziel Story Website` — `https://jaziel-story.github.io`.
- **Measurement ID:** `G-HC6NTTN5KP`.
- **Files:** `assets/js/jaziel-analytics.js`, `index.html`, `article.html`, `assets/js/article-pagination.js`, `category.html`, `all.html`, `privacy.html`.
- **Change:** Added a shared GA4 loader and an `article_view` event. Article events record the article slug, article title, pagination page, and whether the view is paginated or All Page. Static generated article pages load the same analytics module through `article-pagination.js`, so future generated pages inherit tracking without manually editing every generated HTML file.
- **Reason:** Jaziel is a static GitHub Pages site, so analytics must remain separate from Article Schema v1 while still identifying article-level readership.
- **Scope:** No `views` field or analytics data was added to `articles.json`; Article Schema v1 remains unchanged. Admin Panel analytics reporting is a later phase that can consume GA4 data.
- **Privacy:** Updated `privacy.html` so the public policy no longer incorrectly states that Jaziel has no analytics.
- **Verification before change:** Repository search confirmed no existing GA4/Google Analytics implementation. Homepage and dynamic article heads were inspected. Static article generation was inspected and confirmed to load `article-pagination.js`, allowing the analytics loader to cover generated article pages without rewriting the generator workflow.
- **Commits:** `e1349ed7301082d2651baff2a1ceb647eefbd254` (`Add Jaziel GA4 analytics tracking`), `f12b8e778e7b5449afaf26593f46e3f12d8aec1c` (`Load GA4 tracking on homepage`), `bbb45ef35282d02200eb049e2e5b955bb317bd62` (`Load GA4 tracking on dynamic article page`), `faaf165b055795d1c41381aeec9159572d9779c4` (`Load GA4 tracking on static article pages`), `33b7b976c803f1c23627ce82fac0714a1a10177c` (`Update privacy policy for GA4 analytics`), `0350a12d686b2cbfb1e888ddeba462b2dbc5f564` (`Load GA4 tracking on category pages`), `690c3832765e8a36ddd8e6c9f67c9299298b0304` (`Load GA4 tracking on all stories page`).
- **Article Schema:** unchanged and locked.
- **Next verification:** Wait for GitHub Pages deployment, then open the live site and verify the GA4 Realtime report receives the visit and the `article_view` event appears when an article is opened.

### 2026-09-16 — All Page Continue Reading visibility fix

- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1 / the static All Page must hide all `Continue Reading` controls when all article sections are displayed together.
- **Files changed:** `assets/css/article-pagination.css`.
- **Change:** Added `.article-continue[hidden] { display: none; }` so the HTML `hidden` state applied by `article-pagination.js` cannot be overridden by the base `.article-continue { display: flex; }` rule.
- **Reason:** On All Page, the pagination helper correctly set the non-final `Continue Reading` links to `hidden`, but the stylesheet's `display: flex` rule overrode that state. This caused a `Continue Reading` button to remain visible between Body Image 2 and the next section.
- **Root cause:** CSS specificity/cascade conflict between the `.article-continue` display rule and the browser's `hidden` presentation behavior.
- **Scope:** CSS-only targeted fix. Article Schema v1, pagination page size, section/image mapping, generated article HTML, and All Page rendering logic were not changed.
- **Commit:** `e08a20cb3d69b55e180c9f32562974b9f1ee87c` (`Fix All Page Continue Reading visibility`).
- **Verification before change:** Current `assets/js/article-pagination.js` was inspected and confirmed to set `link.hidden = allPage`; the generated Victoria Beckham article HTML was inspected and confirmed to contain the expected `article-continue` elements inside numbered page sections; `assets/css/article-pagination.css` was inspected and confirmed to define `display: flex` without a matching hidden-state override.
- **Verification after change:** Repository CSS update committed successfully. Live GitHub Pages verification is required before marking DONE.
- **Article Schema:** unchanged and locked.

### 2026-09-16 — Admin draft/image regression prevention documentation

- **Status:** DOCUMENTED / PREVENTION RULES ACTIVE
- **Priority:** P1 / prevent recurrence of the Admin draft-loading and image-path/preview regressions reproduced during the Victoria Beckham draft workflow.
- **Files changed:** `README.md`.
- **Change:** Added mandatory regression-prevention rules covering persisted draft payload mapping, synchronization with `state.editor`, event-driven field updates, exact repository image-path verification, section-to-image mapping, cache/deployment verification, and the required Admin end-to-end test sequence.
- **Reason:** The previous incident showed that a successful Load Draft toast could occur while the editor's internal state remained empty, and that draft image URLs could point to filenames that did not exist even though the correct six image files were present in the repository.
- **Related fixes already implemented:** `f6be15eb3463fad283b9eab726242135917e6e7e`, `709686df20e9e677c0b0b3a8c67e4289c8b6d973`, `4ae8af49c644ab885e7c7640aa90b8bdd4f94735`, `04a662c1bc23c91934e27d71ce73982fac835707`.
- **Article Schema:** unchanged and locked.
- **Verification:** README was re-audited against the current repository rules and recent commits. No application logic was changed by this documentation update.
- **Status:** DOCUMENTED / PREVENTION RULES ACTIVE.

### 2026-09-15 — Jaziel Story author/byline display

- **Priority:** P2 / establish a consistent editorial byline for the homepage and article view without changing Article Schema v1.
- **Files changed:** `index.html`, `article.html`.
- **Change:** Homepage featured/latest/popular story metadata now displays `By Jaziel Story`. The dynamic article page also prepends `By Jaziel Story` to article metadata and related-story cards through a bounded presentation-only refresh.
- **Reason:** User selected **Jaziel Story** as the public editorial author name for the site.
- **Article Schema:** unchanged and locked; no `author` field was added to `articles.json`.
- **Verification:** Repository source was inspected after the edits; the homepage contains the byline in featured/latest/popular cards, and `article.html` contains the bounded byline presentation logic for the article metadata and related cards.
- **Deployment:** Changes committed to `main`; live browser verification remains pending.

### 2026-09-15 — Documentation reconciliation for previously undocumented Admin draft/image changes

- **Priority:** P2 / reconcile the repository documentation gap found before continuing the Admin draft/image work.
- **Files changed:** `admin/drafts/lizzie-velasquez-cyberbullying-courage-story.json`, `assets/js/draft-manager.js`, `admin/index.html`, `assets/js/draft-images-section-sync.js` (the last file was created but is not currently loaded by the Admin).
- **Change:** Recorded the previously undocumented Lizzie draft update (`7ec68999af3dde0f99de2549f51c47858b3fa050`), GitHub draft image persistence fix (`5d2b6386d0937ae7272049cf881f083a5461b446`), cache-bust (`f338e8c9c164712879aa740933f4599585cd713e`), and body-image section-sync helper creation (`ff1085135f2e4a92d5ddf9085094fdb4e735458f`). The helper is explicitly recorded as **not active** because `admin/index.html` does not load it.
- **Reason:** Every repository change must have an auditable record before new fixes are made. This closes the documentation gap without changing Article Schema v1, pagination, generator, sitemap, or Adsterra.
- **Verification:** README and CHANGELOG were reconciled against the recent Git history and the current repository files. The helper's `node --check` result and its inactive runtime state are explicitly documented.
- **Documentation commit:** This README update is committed together with the corresponding CHANGELOG reconciliation.
- **Status:** DOCUMENTATION RECONCILED / READY FOR NEXT FIX.

### 2026-09-13 — Workflow push hardening

- **Priority:** P1 / prevent the real `main` push race that caused a published Admin article to exist in `articles.json` while its generated static HTML remained only inside a failed workflow runner.
- **Files changed:** `.github/workflows/generate-static-articles.yml`, `.github/workflows/generate-sitemap.yml`.
- **Change:** Added the shared `jaziel-main-writers` concurrency group with queued execution, plus fetch/rebase/retry push handling in both repository-writing workflows.
- **Reason:** A real Admin publish produced a non-fast-forward rejection in the generator when the sitemap workflow pushed first.
- **Commits:** `fff782a471f8118addd1b9cf8bb1c4d300969a7e`, `30a629014ddb521e3e18d8f4699323c157332619`, `10a00e0469ae15d88fb6246864689cb1b973a9c1`, `6bafaaaa326889233335429ed185b9bbc146d05a`.
- **Verification:** Generator successfully created `articles/jaziel-image-upload-test.html` and pushed it to `main`. The generated page contains the test article's cover, three sections, images, pagination, closing, and ad slots.
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
- **Change:** Kept the article title visible on every pagination page while hiding the dek/read-time/date metadata after Page 1. The cover remains Page-1-only.
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

### 2026-09-13 — Website OG cover metadata

- **Status:** DONE / USER VERIFIED
- **Priority:** P2 / add website Open Graph/social sharing cover.
- **Files changed:** `assets/images/og/jaziel-og-cover.png`, `index.html`.
- **Change:** Added the Jaziel OG cover and website-level Open Graph/Twitter metadata.
- **Commits:** `99f919e87a390aeeb266942a9472f0102f9cc4c1`, `afcfa4ad5f7301c319c6f0c722792268393cbb2`.
- **Verification:** User confirmed the OG image appears successfully.

### 2026-09-13 — Contact email updated

- **Priority:** P2 / replace public placeholder contact address.
- **File:** `contact.html`.
- **Change:** Replaced the placeholder contact address with the user-confirmed contact email in the visible link and mailto target.
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

### Protected-fix baseline — do not revert without a confirmed regression

- `index.html` + `home-featured-minimal.js` + `home-latest-final.js` — homepage loader/observer consolidation. Do not restore deleted competing loaders.
- `assets/js/admin-section-labels.js` — bounded event-driven labels; do not restore a persistent DOM observer without a reproduced regression.
- `assets/js/ai-writer-category-fix.js` — scoped active-generation watch; do not restore a document-wide observer.
- `assets/js/admin-preview-order-fix.js` — bounded animation-frame Preview repair; do not replace it with a permanent observer/interval without proof.
- `assets/js/image-manager.js` + `assets/js/body-image-preview.js` — image validation/preview compatibility for repository paths and local files.
- `.github/workflows/generate-static-articles.yml` — must not recreate `assets/js/link-fix.js` or inject it into pages.
- `articles.json` — single source of truth and Article Schema v1; do not change its structure as a workaround for an Admin UI bug.

## 2026-09-12

### Admin Preview image order fix
- **Priority:** P1 / body images must appear after their matching section.
- **Fix:** Added `assets/js/admin-preview-order-fix.js`, later hardened with bounded animation-frame retries.
- **Commits:** `8e8c3af2288eac967a47452fd5ae6f5e96c017f0`, `d134c30290e30a3fa285b54899812145f659c47a`, later `b215a6488313b57637758587d40f242cf3a8b50a`.
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION.

### Admin Preview stability + Body Image relative-path fix
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Fix:** Removed the persistent Preview mapping observer approach and updated `body-image-preview.js` to resolve relative repository paths.
- **Commits:** `3bc626b6f7521f1bf96512f5585dd28cc4b1836d`, `9bac5ef22f98f850c97079df431ea0c63be4da90`, `56e7a982294e438464c4f0a91a26a147fc228753`.

### Admin Preview section/image mapping — superseded
- **Status:** SUPERSEDED / REVERTED
- **Original commits:** `1dffe6892795eae230f4cb390a3e5d584d1d379f`, `89428821e921f3ddea6d8c90e70843f38b5dbc25`.
- **Original approach:** Persistent DOM observer to move body images after matching headings.
- **Why superseded:** Observer-based DOM repair was unstable and unnecessary as a permanent mechanism.
- **Replacement:** `admin-preview-order-fix.js` uses bounded animation-frame repair tied to Preview.

### Homepage performance consolidation
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1 / user-reported homepage performance problem.
- **Fix:** Homepage now uses one dedicated data/render path; obsolete loaders and observers were removed.
- **Commits:** `aa690bb0658960d0d3b0871e2e7452b73db3f10b`, `184a89b922fb860079dcd80efadfd87bbc97122b`, `f58ab89ccda1b0183ef636b76b4da46ed0de67cd`, `83bb01c1d20d82de509a4467d2906675fe8a7580`.

### Live verification — Admin Panel recovered
- **Status:** VERIFIED LIVE
- **Evidence:** User screenshot showed the deployed Admin Dashboard rendering successfully.

### Cleanup — one-time admin repair workflow
- **Status:** DONE / REMOVED
- **File:** `.github/workflows/one-time-admin-source-repair.yml`
- **Removal commit:** `93c8332bd088464677d7f10eb9bf12a54c1ae3b6`.

### Most Popular metadata
- **Status:** DONE
- **File:** `assets/css/popular-fix.css`
- **Commits:** `04628df976399e4435b6cdff4880dcf0669e42ee`, `85dcca3367804cac57ab6fff58eaceae05db5f94`.

### Related Stories static image path
- **Status:** DONE / VERIFY IN DEPLOYMENT
- **File:** `assets/js/related-articles.js`
- **Commit:** `0516ea890c61b43041925bb980a94c2aaeab1f3f`.

### JavaScript syntax validation safeguard
- **Status:** ADDED / MUST PASS
- **File:** `.github/workflows/validate-javascript.yml`
- **Commit:** `ab238b9e1bd09bb8c772dd8c52833b12e9194117`.

### Admin source recovery history
- **Status:** SUPERSEDED HISTORY / FINAL SOURCE WORKING LIVE
- **File:** `admin/admin.js`
- The incomplete manual replacement `517e3d61f5b4fcb4b000478d12e087bfe053ffa5` is invalid and must never be reused.
- The final clean source was restored from the known-good `8c7abfa494d8b8de6de35c576472fb4c896ce473` basis, with final repository commit `5e625f2c4474543b350b14aa3be44b7d616ba2f3`.
- A later targeted repair fixed the missing closing `}` in the `[data-image-url]` listener in `renderBodyImages()`.
- Do not perform another broad rewrite of `admin/admin.js` unless a new regression is reproduced.

### Admin deployment cache bust
- **Status:** DONE / VERIFIED LIVE
- **File:** `admin/index.html`
- **Commit:** `2822ba6a33336f0dea59c206fb5a7e147f98f8c5`.

### Cleanup — obsolete runtime loader
- **Status:** DONE
- **File:** `admin/admin-loader-fix.js`
- **Commit:** `26c58117d3900eca3bee8ee6a744925b4ac105ce`.

### AI Writer P1 — request checkout race fix
- **Status:** IMPLEMENTED / NEEDS END-TO-END VERIFICATION
- **File:** `.github/workflows/ai-writer.yml`
- **Commit:** `4c1f0d561c39b7c82001e6e7584e1ca1749e1a66`.
- **Verification:** Fresh end-to-end AI Writer execution is still required.

### Body Image Add freeze — visual helper loop fix
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Files:** `assets/js/body-image-preview.js`, `assets/js/body-image-labels.js`
- **Commits:** `2f50a8ccabaef69054490f883be18e51b6c148da`, `b33c07f5dfbd958b910281e264e40e6b1ddcf41d`.
- **Result:** Document-wide observers and repeating interval loops were removed; relevant UI events now refresh the helpers.

## Documentation rule
Every repository change must be recorded in this file and summarized in `README.md`. The record must include:
1. Date
2. Priority/reason
3. Exact files changed
4. What changed
5. Why it changed
6. Commit SHA
7. Verification result
8. Deployment result when applicable
9. Whether the change is DONE, NEEDS VERIFICATION, or REVERTED

## Known remaining audit items

### 🟢 Workflow generator
- **Status:** HARDENED / NEEDS FINAL LIVE PIPELINE VERIFICATION
- **Result:** The previous non-fast-forward race is addressed with shared concurrency, rebase, and retry handling.

### 🟡 Article pagination
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Rule:** Maximum 2 sections per page; 1–2 sections stay on one page; longer articles use `?page=N` with numbered navigation and Continue Reading.
- **Pending:** Live verification of 1–2, 3–4, 5–6, and longer section counts, including section/image order and mobile layout.

### 🟡 AI request/result JSON privacy
- **Status:** ARCHITECTURE REVIEW REQUIRED / NOT CHANGED
- **Reason:** AI request/result JSON files are repository-backed in the current static workflow. In a public repository, their contents can be publicly readable. Moving this transport would be a separate architecture change.

### 🟡 Search/category code duplication
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Result:** Search and Category now have a single runtime owner in `search-category-fix.js`; the competing page initialization and duplicate implementations were removed from `main.js`. Live Search/Category verification remains required.

### 🟡 Draft / Edit Article E2E
- **Status:** NEXT FOCUSED TEST
- **Goal:** Confirm how Admin drafts are stored, restored, edited, and whether a draft can be prepared from ChatGPT in a way that remains available when the user later opens the Admin Panel and only needs to add the recommended images.

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
