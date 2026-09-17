# Jaziel — Change Log

This file is the project memory for repository changes. Read it before making a new change.

## Project rules

- **Article Schema v1 is LOCKED.** Do not change its structure unless the user explicitly approves a schema change.
- Before proposing or implementing a fix, inspect the current repository and recent commits first.
- Do not repeat a fix that is already marked **DONE** unless a new regression is confirmed.
- Prefer the smallest safe change. Do not rewrite or minify a large file when a targeted change is sufficient.
- After every code change, verify syntax/build/workflow status before declaring success.
- Record every repository change here with its purpose, files, commit, verification, and status.
- If a previous fix is later reverted or superseded, record that explicitly instead of treating the old fix as still active.

## 2026-09-16 — GA4 Article Analytics foundation

### GA4 tracking and article-view events
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

## 2026-09-16 — All Page Continue Reading visibility fix

### Static All Page regression
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1 / the static All Page must hide all `Continue Reading` controls when all article sections are displayed together.
- **Files:** `assets/css/article-pagination.css`.
- **Change:** Added `.article-continue[hidden] { display: none; }` so the HTML `hidden` state applied by `article-pagination.js` cannot be overridden by the base `.article-continue { display: flex; }` rule.
- **Reason:** On All Page, the pagination helper correctly set the non-final `Continue Reading` links to `hidden`, but the stylesheet's `display: flex` rule overrode that state. This caused a `Continue Reading` button to remain visible between Body Image 2 and the next section.
- **Root cause:** CSS specificity/cascade conflict between the `.article-continue` display rule and the browser's `hidden` presentation behavior.
- **Scope:** CSS-only targeted fix. Article Schema v1, pagination page size, section/image mapping, generated article HTML, and All Page rendering logic were not changed.
- **Commit:** `e08a20cb3d69b55e1809c1f32562974b9f1ee87c` (`Fix All Page Continue Reading visibility`).
- **Verification before change:** Current `assets/js/article-pagination.js` was inspected and confirmed to set `link.hidden = allPage`; the generated Victoria Beckham article HTML was inspected and confirmed to contain the expected `article-continue` elements inside numbered page sections; `assets/css/article-pagination.css` was inspected and confirmed to define `display: flex` without a matching hidden-state override.
- **Verification after change:** Repository CSS update committed successfully. Live GitHub Pages verification is required before marking DONE.
- **Article Schema:** unchanged and locked.

## 2026-09-16 — Admin draft/image regression prevention documentation

### Regression prevention rules
- **Status:** DOCUMENTED / PREVENTION RULES ACTIVE
- **Priority:** P1 / prevent recurrence of the Admin draft-loading and image-path/preview regressions reproduced during the Victoria Beckham draft workflow.
- **Files:** `README.md`.
- **Change:** Added mandatory rules covering persisted draft payload mapping, synchronization with `state.editor`, event-driven field updates, exact repository image-path verification, section-to-image mapping, cache/deployment verification, and the required Admin end-to-end test sequence.
- **Reason:** The previous incident showed that a successful Load Draft toast could occur while the editor's internal state remained empty, and that draft image URLs could point to filenames that did not exist even though the correct six image files were present in the repository.
- **Related fixes already implemented:** `f6be15eb3463fad283b9eab726242135917e6e7e`, `709686df20e9e677c0b0b3a8c67e4289c8b6d973`, `4ae8af49c644ab885e7c7640aa90b8bdd4f94735`, `04a662c1bc23c91934e27d71ce73982fac835707`.
- **Article Schema:** unchanged and locked.
- **Verification:** README was re-audited against the current repository rules and recent commits. No application logic was changed by this documentation update.
- **Deployment:** Documentation changes committed to `main`; no application deployment change was required.

## 2026-09-15 — Jaziel Story author/byline display

### Homepage byline
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P2 / establish a consistent editorial byline on homepage story cards without changing Article Schema v1.
- **Files:** `index.html`.
- **Change:** Added `By Jaziel Story` to the homepage featured story, latest story cards, and Most Popular cards.
- **Reason:** User selected **Jaziel Story** as the public editorial author name.
- **Verification:** Repository source inspection confirmed the byline is present in all current homepage story metadata blocks.
- **Deployment:** Committed to `main` in `daec9dea81ff6817a8380c35a363bb0e2544c7f6`, then completed the Most Popular coverage in `83b65bfc4cb70cb603fd053927cb35eecd1811cf`.

### Article-page byline
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P2 / show the selected editorial byline on article pages and related story cards.
- **Files:** `article.html`.
- **Change:** Added a bounded, presentation-only DOM refresh that prepends `By Jaziel Story` to article metadata and related-story card metadata after the dynamic article content is rendered.
- **Reason:** Keep article presentation consistent with the homepage while avoiding any Article Schema v1 change.
- **Article Schema:** unchanged and locked; no `author` field was added to `articles.json`.
- **Verification:** Source inspection confirmed the script is bounded to 20 attempts at 100 ms intervals and marks processed metadata nodes to prevent duplication.
- **Deployment:** Committed to `main` in `996b898eb7f8edfdb26b258bd2ce4c8a14cfc734`.

## 2026-09-15 — Documentation reconciliation for previously undocumented Admin draft/image changes

### Draft content update — Lizzie Velásquez article
- **Status:** DONE / DRAFT DATA UPDATED
- **Priority:** P2 / keep the six-section Lizzie draft content and its six image recommendations aligned with the current Article Schema v1 draft contract.
- **Files:** `admin/drafts/lizzie-velasquez-cyberbullying-courage-story.json`.
- **Change:** Updated the Lizzie draft content, including the six article sections and six `imageRecommendations.sections` entries. The draft remained repository-backed under `admin/drafts/`.
- **Reason:** Prepare the draft for the Admin image workflow while keeping Article Schema v1 unchanged.
- **Commit:** `7ec68999af3dde0f99de2549f51c47858b3fa050` (`Update draft: lizzie-velasquez-cyberbullying-courage-story`).
- **Verification:** Repository draft was inspected and confirmed to contain 6 sections and 6 image recommendations. `article.images` at that point still contained 4 image objects.
- **Deployment:** Repository change committed to `main`.

### GitHub draft image persistence fix
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1 / selected cover and body images must persist in GitHub instead of remaining only in browser-local state.
- **Files:** `assets/js/draft-manager.js`.
- **Change:** Added GitHub image upload handling for selected cover/body image files under `assets/images/articles/`, updated the draft's `cover` and body image `src` paths to repository paths, and saved the resulting Draft JSON under `admin/drafts/<slug>.json`.
- **Reason:** Draft image persistence needed to survive browser/device changes and use the repository as the source of truth.
- **Commit:** `5d2b6386d0937ae7272049cf881f083a5461b446` (`Fix GitHub draft image persistence`).
- **Verification:** Local JavaScript syntax check passed for the constructed `draft-manager.js` source before applying the change. The implementation was then cache-busted for deployment.
- **Deployment:** Repository commit reached `main`; live Admin end-to-end image upload verification remained pending.

### Draft image persistence cache-bust
- **Status:** DONE / CACHE UPDATED
- **Priority:** P2 / ensure deployed Admin browsers load the updated GitHub-backed draft image persistence logic.
- **Files:** `admin/index.html`.
- **Change:** Changed the `draft-manager.js` script version from `v=20260915-1` to `v=20260915-2`.
- **Reason:** Prevent stale browser caching from hiding the previous draft-manager fix.
- **Commit:** `f338e8c9c164712879aa740933f4599585cd713e` (`Cache-bust GitHub draft image persistence fix`).
- **Verification:** Commit diff confirmed the script version changed exactly from `20260915-1` to `20260915-2`.
- **Deployment:** Repository commit reached `main`.

## 2026-09-18 — Admin draft load timeout regression fix

### GitHub-backed image verification during Load Draft
- **Status:** VERIFIED LIVE / DONE
- **Priority:** P1 / Load Draft must not stall while validating the persisted cover/body image references.
- **Files:** `assets/js/draft-manager-fix.js`, `admin/index.html`.
- **Change:** Replaced the per-image GitHub Contents API verification during draft loading with one directory listing of `assets/images/articles/`, then checks every referenced filename locally against that listing. The exact repository path and extension are still verified; binary image content is not downloaded.
- **Root cause:** The previous loader made one GitHub Contents API request for every repository-backed image. A six-image draft therefore required six concurrent API requests during Load Draft, and one stalled request could keep the whole load pending until the 30-second request timeout shown in the Admin error toast.
- **Scope:** Targeted change to draft image-reference verification only. Article Schema v1, editor fields, publish flow, preview flow, pagination, generator, sitemap, ads, and AI Writer were not changed.
- **Verification before change:** README and CHANGELOG were inspected first. The current `draft-manager-fix.js`, `draft-load-ui.js`, `admin/index.html`, and the affected So Delicious draft were inspected. The screenshot reproduced the 30-second GitHub request timeout after selecting the draft. Repository image references in the draft use the expected `assets/images/articles/` paths.
- **Local verification:** `node --check` passed for the changed `draft-manager-fix.js` source before committing.
- **Commits:** `4fdfb08a8f0b5eeb56348fdceeecdb2ba0b4cabc` (`Fix draft load image verification timeout`), `5c8054b07557288d56e40ef365682a99883f7ef0` (`Cache-bust draft load image verification fix`).
- **Article Schema:** unchanged and locked.
- **Live end-to-end verification:** User successfully loaded the So Delicious draft after deployment without the 30-second timeout; cover and Body Images 1–5 appeared; Body Image 6 was then added for the sixth section; the draft was saved, refreshed, loaded again, and previewed successfully with the full image set; the article was then published successfully.
- **Final status:** DONE / VERIFIED BY USER IN LIVE ADMIN PANEL.
