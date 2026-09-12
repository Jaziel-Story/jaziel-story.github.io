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

### Article pagination implemented
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1 / improve long-article readability and continuation flow while keeping Article Schema v1 unchanged.
- **Files:** `assets/js/article-pagination.js`, `assets/css/article-pagination.css`, `article.html`, `.github/workflows/generate-static-articles.yml`.
- **Change:** Added a UI-only pagination layer with a maximum of 2 sections per page, default Page 1 behavior, numbered page links, Page X of Y status, Continue Reading CTA, and sequential section/image mapping. Static generation now emits page containers and pagination controls without creating extra HTML files.
- **URL behavior:** Static pages use `articles/{slug}.html?page=N`; missing `page` means Page 1. Dynamic fallback uses `article.html?slug={slug}&page=N`.
- **Schema:** Article Schema v1 and `articles.json` structure were not changed.
- **Cleanup:** Removed the stale `assets/js/link-fix.js` script reference from `article.html`; the deleted obsolete helper was not restored.
- **Reason:** User approved pagination design A+B+C and the recommendation that an absent `page` parameter defaults to Page 1.
- **Commits:** `b6c2362564b9f405618b5411219d9f2c791d1251`, `ba70730c3ed0cdea69751206f15b96d1d48feca1`, `6eacf514d273c20c6785d9fed2f0b446126663ce`, `35962fc55d94eaad8bb999511648bc355a1accf8`, `bf8d4609cf17b22b695d493e4e4b86d55e6bdfba`.
- **Verification:** `node --check` passed for `article-pagination.js` and the extracted static generator script. A local fixture test confirmed 5 sections produce 3 page containers, Continue Reading controls, Page 1 of 3, and images 1–5 in order. Fresh GitHub Actions and live Pages verification remain pending.
- **Deployment:** Pending GitHub Actions regeneration and live browser verification.

### Website OG cover metadata
- **Status:** DONE / USER VERIFIED
- **Priority:** P2 / add the website Open Graph/social sharing cover.
- **Files:** `assets/images/og/jaziel-og-cover.png`, `index.html`.
- **Change:** Added the Jaziel OG cover and website-level Open Graph/Twitter metadata pointing to the cover.
- **Reason:** User requested a website OG cover.
- **Commits:** `99f919e87a390aeeb266942a9472f0102f9cc4c1` for the image file/rename and `afcfa4ad5f7301fc319c6f0c722792268393cbb2` for metadata.
- **Verification:** User confirmed the OG image appears successfully; repository source metadata was also checked.
- **Deployment:** User-confirmed image visibility; broader social-platform cache verification is not claimed.

### Contact email updated
- **Status:** DONE / NEEDS LIVE DEPLOYMENT VERIFICATION
- **Priority:** P2 / replace the public placeholder contact address with the real site-owner email supplied by the user.
- **File:** `contact.html`
- **Change:** Replaced `hello@jaziel-story.example` with `michaelgilroyjitmau2@gmail.com` in both the visible email link and its `mailto:` target, and removed the placeholder instruction.
- **Reason:** The user confirmed the correct contact email.
- **Commit:** `59069f9ccd8d97bde1dead9fa5859aa3e2d681a6`.
- **Verification:** GitHub contents update succeeded. No JavaScript, article data, or Article Schema v1 structure was changed.
- **Deployment:** GitHub Pages/live rendering requires confirmation after deployment.

### Admin P1–P2 audit hardening
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1–P2 / prevent known regressions, observer feedback loops, stale browser code, and image/draft inconsistencies.
- **P1 — static generator regression guard:** `.github/workflows/generate-static-articles.yml` no longer creates or injects obsolete `link-fix.js`. A future `articles.json` generation therefore cannot silently restore the removed global link-fixing observer.
- **P1 — section labels:** `assets/js/admin-section-labels.js` no longer uses a persistent `MutationObserver`. It now uses bounded event-driven refreshes after editor navigation and section add/remove actions, including delayed refreshes for dynamically rendered editor content.
- **P1 — Preview timing:** `assets/js/admin-preview-order-fix.js` now targets `#btnPreview` and retries for a bounded number of animation frames so asynchronous Preview rendering is handled without a permanent observer or interval.
- **P1/P2 — AI category watcher:** `assets/js/ai-writer-category-fix.js` no longer observes the whole document. Its temporary observer is scoped to the active AI status/view and disconnects after success or failure.
- **P2 — image URL compatibility:** `assets/js/image-manager.js` now accepts safe Jaziel repository image paths as well as HTTP(S) URLs while retaining the existing 10 MB/type guard.
- **P2 — draft image cleanup:** `assets/js/image-manager.js` now removes stale body-image IndexedDB entries by draft-key prefix before saving the current selection, preventing removed/reordered images from surviving into a later draft restore.
- **Cache protection:** `admin/index.html` received cache-busted versions for the audited helper scripts.
- **Article Schema v1:** unchanged and locked.
- **Files changed:** `.github/workflows/generate-static-articles.yml`, `assets/js/admin-section-labels.js`, `assets/js/ai-writer-category-fix.js`, `assets/js/image-manager.js`, `assets/js/admin-preview-order-fix.js`, `admin/index.html`.
- **Commits:** `09cb3be8d3373c69ff70d84bac692f690d473ab0`, `4d111022dda3645763322d7970f47b07a785193e`, `75b5322707d2b6633497b24a56695c6807faf93e`, `e8d43ef9541105c131ade130b2027f4705d8b999`, `b6da7f8bf41f125300549f2d983a12248db1449f`, `b215a6488313b57637758587d40f242cf3a8b50a`, `8b80a7dccc7c59c10a86c363dfdfa27d6f2e4d60`.
- **Verification:** JavaScript validation successfully passed on hardening commits `e8d43ef...`, `b6da7f8...`, and `b215a648...`. The latest section-label refinement `75b53227...` was also checked with `node --check`. Fresh full workflow and live Admin E2E testing remain pending.
- **Deployment:** GitHub Pages/live verification pending.

### Protected-fix baseline
- **Purpose:** prevent future debugging from accidentally undoing fixes that already solved known regressions.
- Protected fixes include homepage loader/observer consolidation, bounded Admin section-label refreshes, scoped AI category watching, bounded Preview ordering repair, image validation/preview compatibility, the generator prohibition on recreating `link-fix.js`, and locked `articles.json` / Schema v1.
- **Rule:** A future bug must first be reproduced and classified as a regression or an independent defect. Inspect the current protected version and its commit before changing anything. Do not restore removed observers/loaders or change Schema v1 merely because the affected area is nearby.

## 2026-09-12

### Admin Preview image order fix
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1 / user screenshot confirmed existing body images were rendered after Section 3 instead of in section order.
- **Finding:** The live Preview screenshot showed both existing `figure.article-figure` elements after the third section. The missing Section 3 image is intentionally postponed. Desired behavior is therefore image 1 after Section 1, image 2 after Section 2, and no image after Section 3 until a third image is added.
- **Fix:** Added `assets/js/admin-preview-order-fix.js`, loaded from `admin/index.html`. The helper is UI-only and does not change article data or Schema v1.
- **Original commits:** `8e8c3af2288eac967a47452fd5ae6f5e96c017f0`, `d134c30290e30a3fa285b54899812145f659c47a`.
- **Later hardening:** `b215a6488313b57637758587d40f242cf3a8b50a` added bounded animation-frame retries for asynchronous Preview rendering.

### Admin Preview stability + Body Image relative-path fix
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1 / Preview refresh/stuck behavior and missing Body Image previews for repository-relative paths.
- **Fix:** Removed the persistent `admin-preview-section-mapping.js` observer approach and kept `admin/admin.js` untouched. Updated `body-image-preview.js` to resolve relative repository paths.
- **Commits:** `3bc626b6f7521f1bf96512f5585dd28cc4b1836d`, `9bac5ef22f98f850c97079df431ea0c63be4da90`, `56e7a982294e438464c4f0a91a26a147fc228753`.

### Admin Preview section/image mapping — superseded
- **Status:** SUPERSEDED / REVERTED
- **Original commits:** `1dffe6892795eae230f4cb390a3e5d584d1d379f`, `89428821e921f3ddea6d8c90e70843f38b5dbc25`.
- **Original approach:** Persistent DOM observer to move body images after matching headings.
- **Why superseded:** Observer-based DOM repair was unstable and unnecessary as a permanent mechanism.
- **Replacement:** `admin-preview-order-fix.js` uses a bounded animation-frame repair tied only to the Preview action.

### Homepage performance consolidation — duplicate loaders and observers removed
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Priority:** P1 / user-reported homepage performance problem.
- **Fix:** Homepage now uses one dedicated data/render path; obsolete loaders and observers were removed.
- **Commits:** `aa690bb0658960d0d3b0871e2e7452b73db3f10b`, `184a89b922fb860079dcd80efadfd87bbc97122b`, `f58ab89ccda1b0183ef636b76b4da46ed0de67cd`, `83bb01c1d20d82de509a4467d2906675fe8a7580`.

### Live verification — Admin Panel recovered
- **Status:** VERIFIED LIVE
- **Evidence:** User screenshot showed the deployed Admin Dashboard rendering successfully; the previous loading state was gone.

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

### 🟢 Contact email
- **File:** `contact.html`
- **Value:** `michaelgilroyjitmau2@gmail.com`
- **Status:** UPDATED / NEEDS LIVE DEPLOYMENT VERIFICATION
- **Reason:** User supplied and confirmed the real contact email.

### 🟡 Article pagination
- **Status:** IMPLEMENTED / NEEDS LIVE VERIFICATION
- **Rule:** Maximum 2 sections per page; 1–2 sections stay on one page; longer articles use `?page=N` with numbered navigation and Continue Reading.
- **Reason:** Improve long-story readability without changing Article Schema v1.
- **Pending:** Live verification of 1–2, 3–4, 5–6, and longer section counts, including section/image order and mobile layout.

### 🟡 AI request/result JSON privacy
- **Status:** ARCHITECTURE REVIEW REQUIRED / NOT CHANGED
- **Reason:** AI request/result JSON files are repository-backed in the current static workflow. In a public repository, their contents can be publicly readable. Moving this transport to a private/backend mechanism would be a separate architecture change; it was deliberately not mixed into this hardening pass so the working AI flow is not broken.

### 🟡 Search/category code duplication
- **Status:** NEEDS FURTHER AUDIT
- **Reason:** Search/category behavior appears across multiple JavaScript files. Refactor only after mapping all event listeners and responsibilities.

### 🟡 SEO enhancements
- **Status:** RECOMMENDATION / NOT FIXED
- Potential items include sitemap/robots, JSON-LD Article structured data, and ensuring fallback/dynamic article routes do not create duplicate indexing concerns.
