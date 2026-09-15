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
