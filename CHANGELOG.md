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

## 2026-09-13

### Admin P1–P2 audit hardening
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1–P2 / prevent known regressions, observer feedback loops, stale browser code, and image/draft inconsistencies.
- **P1 — static generator regression guard:** `.github/workflows/generate-static-articles.yml` no longer creates or injects the obsolete `link-fix.js`. This prevents a future `articles.json` publish from restoring the removed global link-fixing observer.
- **P1 — section label observer loop:** `assets/js/admin-section-labels.js` now refreshes labels from section add/remove events instead of a persistent `MutationObserver`. This prevents label updates from triggering another observer cycle.
- **P1 — Preview timing hardening:** `assets/js/admin-preview-order-fix.js` now targets `#btnPreview` and retries for a few animation frames. This handles asynchronous Preview rendering without a permanent observer or interval.
- **P1/P2 — AI category observer scope:** `assets/js/ai-writer-category-fix.js` no longer observes the whole document. Its temporary observer is limited to the active AI status/view and disconnects after success or failure.
- **P2 — image URL compatibility:** `assets/js/image-manager.js` now accepts safe Jaziel repository image paths as well as HTTP(S) URLs, matching the Admin renderer and body-image preview behavior. The existing file type and 10 MB size guards remain.
- **P2 — draft image cleanup:** `assets/js/image-manager.js` now removes stale body-image IndexedDB entries by draft-key prefix before saving the current selection. This prevents removed/reordered images from surviving into a later draft restore.
- **Cache protection:** `admin/index.html` received cache-busted versions for the audited helper scripts so deployed browsers do not keep executing stale helper code.
- **Article Schema v1:** unchanged and locked.
- **Files changed:** `.github/workflows/generate-static-articles.yml`, `assets/js/admin-section-labels.js`, `assets/js/ai-writer-category-fix.js`, `assets/js/image-manager.js`, `assets/js/admin-preview-order-fix.js`, `admin/index.html`.
- **Commits:**
  - `09cb3be8d3373c69ff70d84bac692f690d473ab0` — stop generator restoring link-fix
  - `4d111022dda3645763322d7970f47b07a785193e` — remove section label observer loop
  - `e8d43ef9541105c131ade130b2027f4705d8b999` — scope AI category observer
  - `b6da7f8bf41f125300549f2d983a12248db1449f` — harden image validation/draft cleanup
  - `b215a6488313b57637758587d40f242cf3a8b50a` — harden Preview async ordering
  - `8b80a7dccc7c59c10a86c363dfdfa27d6f2e4d60` — cache-bust audited Admin helpers
- **Verification:** Source-level audit completed. `.github/workflows/validate-javascript.yml` is configured to run `node --check` over all JavaScript files. A fresh workflow run and live Admin E2E test are still required before these changes are marked fully verified.
- **Deployment:** GitHub Pages deployment/live Admin verification pending.

### Protected-fix rule added
- **Purpose:** prevent future debugging from accidentally undoing fixes that already solved known regressions.
- `README.md` now contains a **Protected fixes register** and a bug-investigation rule.
- Protected baseline includes the homepage loader consolidation, event-driven Admin section labels, scoped AI category watcher, one-shot Preview order repair, image validation/preview compatibility, the generator prohibition on recreating `link-fix.js`, and locked `articles.json` / Schema v1.
- **Rule:** A future bug must first be reproduced and classified as a regression or an independent defect. Inspect the current protected version and its commit before changing it. Do not restore a removed observer/loader or change Schema v1 merely because the affected area is nearby.

## 2026-09-12

### Admin Preview image order fix
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1 / user screenshot confirmed existing body images were rendered after Section 3 instead of in section order.
- **Finding:** The live Preview screenshot showed both existing `figure.article-figure` elements after the third section. The missing Section 3 image is intentionally postponed. Desired behavior is therefore image 1 after Section 1, image 2 after Section 2, and no image after Section 3 until a third image is added.
- **Fix:** Added `assets/js/admin-preview-order-fix.js`. The helper runs for the Preview button, collects Preview `h2` section headings and existing body figures, removes the figures temporarily, then inserts figure `i` immediately before heading `i+1`. It now retries for a few animation frames to accommodate asynchronous rendering. No persistent `MutationObserver` is used.
- **Fix:** Added the helper to `admin/index.html` with a cache-busted version.
- **Files changed:** `admin/index.html`, `assets/js/admin-preview-order-fix.js`.
- **Commits:** `8e8c3af2288eac967a47452fd5ae6f5e96c017f0` — original helper; `d134c30290e30a3fa285b54899812145f659c47a` — original loader; `b215a6488313b57637758587d40f242cf3a8b50a` — async-render hardening.
- **Verification:** Helper JavaScript syntax was checked before the original commit. Live post-deploy verification remains required.
- **Article Schema v1:** unchanged and remains locked.

### Admin Preview stability + Body Image relative-path fix
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1 / user-reported Preview refresh/stuck behavior and missing Body Image previews for repository-relative paths.
- **Finding:** The additional `admin-preview-section-mapping.js` helper used a `MutationObserver` on `#previewRoot`. The observer approach was removed after Preview refresh/stuck behavior; the required live section/image ordering is now handled by the one-shot order helper.
- **Fix:** Removed `assets/js/admin-preview-section-mapping.js` and its script include from `admin/index.html`. `admin/admin.js` remains untouched.
- **Fix:** Updated `assets/js/body-image-preview.js` so relative repository paths such as `assets/images/articles/...` resolve to the deployed site origin.
- **Commits:**
  - `3bc626b6f7521f1bf96512f5585dd28cc4b1836d` — accept relative Body Image paths
  - `9bac5ef22f98f850c97079df431ea0c63be4da90` — remove Preview observer and bump cache
  - `56e7a982294e438464c4f0a91a26a147fc228753` — remove redundant mapping helper
- **Article Schema v1:** unchanged and remains locked.

### Admin Preview section/image mapping — superseded
- **Status:** SUPERSEDED / REVERTED
- **Original commits:** `1dffe6892795eae230f4cb390a3e5d584d1d379f`, `89428821e921f3ddea6d8c90e70843f38b5dbc25`.
- **Original approach:** Added `assets/js/admin-preview-section-mapping.js` to move body images after matching section headings.
- **Why superseded:** The persistent DOM observer caused instability concerns. It was removed rather than retained as a permanent watcher.
- **Replacement:** `assets/js/admin-preview-order-fix.js` uses a bounded animation-frame repair tied only to the Preview action.

### Homepage performance consolidation — duplicate loaders and observers removed
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1 / user-reported homepage performance problem.
- **Symptom:** Homepage could feel heavy and sometimes appear to refresh.
- **Root cause:** The homepage had multiple competing data loaders and MutationObservers watching homepage DOM changes.
- **Fix:** `index.html` now uses one dedicated homepage renderer. Obsolete loaders/observers were removed.
- **Commits:** `aa690bb0658960d0d3b0871e2e7452b73db3f10b`, `184a89b922fb860079dcd80effd87bbc97122b`, `f58ab89ccda1b0183ef636b76b4da46ed0de67cd`, `83bb01c1d20d82de509a4467d2906675fe8a7580`.
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

### 🟡 AI request/result JSON privacy
- **Status:** ARCHITECTURE REVIEW REQUIRED / NOT CHANGED
- **Reason:** AI request/result JSON files are repository-backed in the current static workflow. In a public repository, their contents can be publicly readable. Moving this transport to a private/backend mechanism would be a separate architecture change; it was deliberately not mixed into this hardening pass so the working AI flow is not broken.

### 🟡 Search/category code duplication
- **Status:** NEEDS FURTHER AUDIT
- **Reason:** Search/category behavior appears across multiple JavaScript files. Refactor only after mapping all event listeners and responsibilities.

### 🟡 SEO enhancements
- **Status:** RECOMMENDATION / NOT FIXED
- Potential items include sitemap/robots, JSON-LD Article structured data, and ensuring fallback/dynamic article routes do not create duplicate indexing concerns.
