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

### Body image section-sync helper created — not active
- **Status:** CREATED / NOT ACTIVE / NEEDS INTEGRATION VERIFICATION
- **Priority:** P1 / keep the Admin Images tab aligned with the number of article sections.
- **Files:** `assets/js/draft-images-section-sync.js`.
- **Change:** Added a bounded helper that detects article section headings, adds missing body-image slots up to the section count, and supplies default alt/caption values without changing Article Schema v1 or image storage rules.
- **Reason:** The Lizzie draft has 6 sections but only 4 `article.images` entries, so Body Image 5 and 6 were missing from the Admin Images tab.
- **Commit:** `ff1085135f2e4a92d5ddf9085094fdb4e735458f` (`Sync body image slots with article sections`).
- **Verification:** `node --check` passed for the helper. Repository inspection subsequently confirmed that `admin/index.html` does **not** load this helper, so it is not active in the deployed Admin and must not be described as a completed fix.
- **Deployment:** Helper file exists on `main`, but runtime activation is still pending.

## 2026-09-13

### Workflow push hardening
- **Status:** IMPLEMENTED / PIPELINE LIVE VERIFICATION CONTINUES
- **Priority:** P1 / prevent the real `main` push race that caused a published Admin article to exist in `articles.json` while its generated static HTML remained only inside a failed workflow runner.
- **Files:** `.github/workflows/generate-static-articles.yml`, `.github/workflows/generate-sitemap.yml`.
- **Change:** Added the shared `jaziel-main-writers` concurrency group with queued execution. Both repository-writing workflows now fetch `origin/main`, rebase before pushing, retry up to three times, and fail safely if a push still cannot be completed.
- **Reason:** A real Admin publish caused the generator's push to be rejected as non-fast-forward when the sitemap workflow updated `main` first.
- **Commits:** `fff782a471f8118addd1b9cf8bb1c4d300969a7e`, `30a629014ddb521e3e18d8f4699323c157332619`, `10a00e0469ae15d88fb6246864689cb1b973a9c1`, `6bafaaaa326889233335429ed185b9bbc146d05a`.
- **Verification:** The generator successfully regenerated and pushed `articles/jaziel-image-upload-test.html`. The generated page contains the test article's cover, three sections/images, pagination, closing, and ad slots.
- **Schema:** Article Schema v1 and pagination behavior were not changed.

### SEO/indexability foundation
- **Status:** IMPLEMENTED / LIVE SEARCH CONSOLE VERIFICATION IN PROGRESS
- **Priority:** P1 / remove technical discovery gaps found in the repository SEO audit.
- **Files:** `robots.txt`, `sitemap.xml`, `.github/workflows/generate-sitemap.yml`, `index.html`, `assets/js/article-pagination.js`.
- **Change:** Added robots.txt with sitemap declaration; added sitemap and automatic regeneration from `articles.json`; added homepage canonical and WebSite JSON-LD; added Article JSON-LD for static article pages; kept pagination and Article Schema v1 unchanged.
- **Canonical policy:** Static paginated article URLs use the active page URL as their canonical signal (`?page=N` for Page 2+). The legacy dynamic `article.html?slug=...` route is not included in the sitemap.
- **Reason:** Audit found no robots.txt, sitemap.xml, homepage canonical, or article structured data.
- **Verification:** Source was re-audited after changes. Google Search Console ownership was verified, the homepage was confirmed indexed, the sitemap was submitted, and the correct Lady Gaga static URL was submitted for indexing.

### Adsterra site-wide integration
- **Status:** DEPLOYED / LIVE TESTING CONTINUES
- **Priority:** P1 / add approved Adsterra formats without changing Article Schema or pagination.
- **Files:** ad integration helper and static article generation path.
- **Change:** Added site-wide Popunder and Social Bar, responsive 300×250 desktop/tablet and 320×50 mobile banners, and Native Banner handling with duplicate-container protection.
- **Important rule:** Popunder/Social Bar load once per HTML document; Adult Ads and Smartlink were not enabled.
- **Verification:** GitHub Actions validation and Pages deployment succeeded. Homepage testing showed Social Bar and banner delivery; blank ad slots were treated as network no-fill rather than code failure.
- **Commit:** `4175a362763009610e630b0552a52ce58bd5088d` (`4175a36`).

### Article pagination display refinement
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P2 / refine Page 2 readability without changing pagination behavior.
- **Files:** `assets/js/article-pagination.js`.
- **Change:** Kept the article title visible on every pagination page while showing dek and read-time/date metadata only on Page 1. The cover remains Page-1-only.
- **Reason:** User approved the cleaner continuation design.
- **Commits:** `d23190ddec29c1b1cfbd735a3a43ced8a177e137`, `41d9920695782654ac0b7e066544f770a2c8816a`, `67f423b6edb6ffb24e29b8daaab970945cb47e65`.
- **Verification:** Source audit confirmed continuation sections/images without the cover; user visually confirmed the cover is gone from Page 2.

### Article pagination implemented
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1 / improve long-article readability and continuation flow while keeping Article Schema v1 unchanged.
- **Files:** `assets/js/article-pagination.js`, `assets/css/article-pagination.css`, `article.html`, `.github/workflows/generate-static-articles.yml`.
- **Change:** Added maximum-2-sections-per-page pagination, numbered navigation, Page X of Y, Continue Reading, sequential section/image mapping, and static generation support.
- **URL behavior:** Static pages use `articles/{slug}.html?page=N`; missing `page` means Page 1. Dynamic fallback uses `article.html?slug={slug}&page=N`.
- **Cleanup:** Removed the stale `assets/js/link-fix.js` script reference from `article.html`.
- **Commits:** `b6c2362564b9f405618b5411219d9f2c791d1251`, `ba70730c3ed0cdea69751206f15b96d1d48feca1`, `6eacf514d273c20c6785d9fed2f0b446126663ce`, `35962fc55d94eaad8bb999511648bc355a1accf8`, `bf8d4609cf17b22b695d493e4e4b86d55e6bdfba`.
- **Verification:** `node --check` passed for the pagination helper and generator test script. A 5-section fixture confirmed 3 pages, Continue Reading controls, Page 1 of 3, and sequential images 1–5.

### Website OG cover metadata
- **Status:** DONE / USER VERIFIED
- **Priority:** P2 / add website Open Graph/social sharing cover.
- **Files:** `assets/images/og/jaziel-og-cover.png`, `index.html`.
- **Change:** Added the Jaziel OG cover and website-level Open Graph/Twitter metadata.
- **Commits:** `99f919e87a390aeeb266942a9472f0102f9cc4c1`, `afcfa4ad5f7301c319c6f0c722792268393cbb2`.
- **Verification:** User confirmed the OG image appears successfully.

### Contact email updated
- **Status:** DONE / NEEDS LIVE DEPLOYMENT VERIFICATION
- **Priority:** P2 / replace public placeholder contact address.
- **File:** `contact.html`.
- **Change:** Replaced the placeholder contact address with the user-confirmed address in the visible link and mailto target.
- **Commit:** `59069f9ccd8d97bde1dead9fa5859aa3e2d681a6`.

### Admin P1–P2 audit hardening
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1–P2 / prevent known regressions, observer feedback loops, stale browser code, and image/draft inconsistencies.
- **P1:** Static generator no longer creates/injects obsolete `link-fix.js`.
- **P1:** `assets/js/admin-section-labels.js` uses bounded event-driven refreshes instead of a persistent MutationObserver.
- **P1:** `assets/js/admin-preview-order-fix.js` uses bounded animation-frame retries for asynchronous Preview rendering.
- **P1/P2:** `assets/js/ai-writer-category-fix.js` scopes its temporary observer to the active AI status/view and disconnects it after success/failure.
- **P2:** `assets/js/image-manager.js` accepts safe Jaziel repository image paths as well as HTTP(S) URLs and retains the 10 MB/type guard.
- **P2:** Draft image persistence clears stale body-image IndexedDB entries by draft-key prefix before saving the current selection.
- **Cache protection:** `admin/index.html` cache-busts audited helper scripts.
- **Files:** `.github/workflows/generate-static-articles.yml`, `assets/js/admin-section-labels.js`, `assets/js/ai-writer-category-fix.js`, `assets/js/image-manager.js`, `assets/js/admin-preview-order-fix.js`, `admin/index.html`.
- **Commits:** `09cb3be8d3373c69ff70d84bac692f690d473ab0`, `4d111022dda3645763322d7970f47b07a785193e`, `75b5322707d2b6633497b24a56695c6807faf93e`, `e8d43ef9541105c131ade130b2027f4705d8b999`, `b6da7f8bf41f125300549f2d983a12248db1449f`, `b215a6488313b57637758587d40f242cf3a8b50a`, `8b80a7dccc7c59c10a86c363dfdfa27d6f2e4d60`.
- **Verification:** JavaScript validation passed on the hardening commits and `node --check` passed for the section-label refinement.
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION.

### Protected-fix baseline
- **Purpose:** prevent future debugging from accidentally undoing fixes that already solved known regressions.
- Protected fixes include homepage loader/observer consolidation, bounded Admin section-label refreshes, scoped AI category watching, bounded Preview ordering repair, image validation/preview compatibility, the generator prohibition on recreating `link-fix.js`, and locked `articles.json` / Schema v1.
- **Rule:** Reproduce and classify a future bug before changing a protected fix. Inspect the current version and its commit first.

## 2026-09-12

### Admin Preview image order fix
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1 / body images must appear after their matching section.
- **Fix:** Added `assets/js/admin-preview-order-fix.js`, later hardened with bounded animation-frame retries.
- **Commits:** `8e8c3af2288eac967a47452fd5ae6f5e96c017f0`, `d134c30290e30a3fa285b54899812145f659c47a`, later `b215a6488313b57637758587d40f242cf3a8b50a`.

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
- **Status:** NEEDS FURTHER AUDIT
- **Reason:** Search/category behavior appears across multiple JavaScript files. Refactor only after mapping all event listeners and responsibilities.

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
