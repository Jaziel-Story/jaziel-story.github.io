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

## 2026-09-12

### Admin Preview image order fix
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1 / user screenshot confirmed existing body images were rendered after Section 3 instead of in section order.
- **Finding:** The live Preview screenshot showed both existing `figure.article-figure` elements after the third section. The missing Section 3 image is intentionally postponed. Desired behavior is therefore image 1 after Section 1, image 2 after Section 2, and no image after Section 3 until a third image is added.
- **Fix:** Added `assets/js/admin-preview-order-fix.js`. The helper runs once after the Preview button is clicked, collects Preview `h2` section headings and existing body figures, removes the figures temporarily, then inserts figure `i` immediately before heading `i+1`. No `MutationObserver` is used.
- **Fix:** Added the helper to `admin/index.html` with a cache-busted version.
- **Files changed:** `assets/js/admin/index.html`, `assets/js/admin-preview-order-fix.js`.
- **Commits:** `8e8c3af2288eac967a47452fd5ae6f5e96c017f0` — helper; `d134c30290e30a3fa285b54899812145f659c47a` — loader.
- **Verification:** Helper JavaScript syntax was checked before commit. The user-provided live screenshot was used to confirm the ordering defect. Post-deploy live verification is still required.
- **Deployment:** NEEDS GITHUB PAGES DEPLOYMENT + USER LIVE VERIFICATION.
- **Article Schema v1:** unchanged and remains locked.

### Admin Preview stability + Body Image relative-path fix
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1 / user-reported Preview refresh/stuck behavior and missing Body Image previews for repository-relative paths.
- **Finding:** The newly added `admin-preview-section-mapping.js` introduced a `MutationObserver` on `#previewRoot`. The core `admin.js` Preview renderer already maps `images[i]` to `sections[i]` in the locked Schema v1 parallel-array model, so the extra observer was unnecessary and could interfere with Preview opening/rendering.
- **Fix:** Removed the redundant `assets/js/admin-preview-section-mapping.js` and its script include from `admin/index.html`. `admin/admin.js` was not rewritten.
- **Fix:** Updated `assets/js/body-image-preview.js` so repository-relative paths such as `assets/images/articles/...` resolve to the deployed site origin instead of being rejected as invalid because they are not absolute HTTP URLs.
- **Files changed:** `admin/index.html`, `assets/js/body-image-preview.js`.
- **File removed:** `assets/js/admin-preview-section-mapping.js`.
- **Commits:**
  - `3bc626b6f7521f1bf96512f5585dd28cc4b1836d` — accept relative Body Image paths
  - `9bac5ef22f98f850c97079df431ea0c63be4da90` — remove Preview observer and bump Admin cache versions
  - `56e7a982294e438464c4f0a91a26a147fc228753` — remove redundant mapping helper
- **Verification:** Source reviewed against the reported behavior. The Body Image helper remains visual-only and does not alter article data or Schema v1. Live Preview/Edit testing and repository JavaScript workflow verification are still required.
- **Deployment:** NEEDS GITHUB PAGES DEPLOYMENT + USER LIVE VERIFICATION.
- **Article Schema v1:** unchanged and remains locked.

### Admin Preview section/image mapping — superseded
- **Status:** SUPERSEDED / REVERTED
- **Priority:** P1 / user-reported Admin Preview ordering problem.
- **Original commits:** `1dffe6892795eae230f4cb390a3e5d584d1d379f`, `89428821e921f3ddea6d8c90e70843f38b5dbc25`.
- **Original approach:** Added `assets/js/admin-preview-section-mapping.js` to move body images after matching section headings.
- **Why superseded:** Further audit showed the core Preview renderer already performs the section/image index mapping. The extra DOM observer was redundant and was removed after the user reported Preview refresh/stuck behavior.
- **Replacement:** Keep the native `admin.js` index mapping and avoid an additional Preview observer.

### Homepage performance consolidation — duplicate loaders and observers removed
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1 / user-reported homepage performance problem.
- **Symptom:** Homepage could feel heavy and sometimes appear to refresh.
- **Root cause:** The homepage had multiple competing data loaders (`main.js`, `home-latest.js`, `home-latest-final.js`, and an inline fallback) plus MutationObservers watching homepage DOM changes. This caused duplicate requests and repeated DOM work.
- **Fix:** `index.html` now uses one dedicated homepage renderer, `home-latest-final.js`. The body uses `data-page="home-static"` so `main.js` keeps shared behavior without initializing a second homepage renderer.
- **Fix:** Removed obsolete `home-latest.js` and `link-fix.js` and removed the MutationObserver from `home-featured-minimal.js`.
- **Files changed:** `index.html`, `assets/js/home-featured-minimal.js`.
- **Files removed:** `assets/js/home-latest.js`, `assets/js/link-fix.js`.
- **Commits:** `aa690bb0658960d0d3b0871e2e7452b73db3f10b`, `184a89b922fb860079dcd80efadfd87bbc97122b`, `f58ab89ccda1b0183ef636b76b4da46ed0de67cd`, `83bb01c1d20d82de509a4467d2906675fe8a7580`.
- **Article Schema v1:** unchanged and remains locked.

### Live verification — Admin Panel recovered
- **Status:** VERIFIED LIVE
- **Evidence:** User screenshot showed the deployed Admin Dashboard rendering successfully; the previous `Loading admin panel...` state was gone.
- **Result:** Admin Panel JavaScript executes successfully in the deployed site.
- **Article Schema v1:** unchanged and remains locked.

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
- Do not perform another broad rewrite of `admin/admin.js` unless a new regression is reproduced and the current source is inspected first.

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
- **Note:** The later relative-path fix is a targeted continuation of this helper's behavior.

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

### 🔴 Contact email is still a placeholder
- **File:** `contact.html`
- **Current value:** `hello@jaziel-story.example`
- **Status:** NEEDS USER INPUT / NOT FIXED
- **Reason:** Do not invent an email address.

### 🟡 Search/category code duplication
- **Status:** NEEDS FURTHER AUDIT
- **Reason:** Search/category behavior appears across multiple JavaScript files. Refactor only after mapping all event listeners and responsibilities.

### 🟡 AI request/result JSON files
- **Status:** NEEDS FURTHER AUDIT
- **Reason:** Raw AI request/result JSON files are stored in the public repository. Review privacy and cleanup strategy before changing architecture.

### 🟡 SEO enhancements
- **Status:** RECOMMENDATION / NOT FIXED
- Potential items include sitemap/robots, JSON-LD Article structured data, and ensuring fallback/dynamic article routes do not create duplicate indexing concerns.
