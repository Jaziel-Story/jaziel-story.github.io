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

### Live verification — Admin Panel recovered
- **Status:** VERIFIED LIVE
- **Evidence:** User screenshot shows the deployed `/admin/` page successfully rendering Dashboard, article count, category count, latest article, Recent Articles, and Edit action. The previous `Loading admin panel...` state is gone.
- **Result:** Admin Panel JavaScript is executing successfully in the deployed site.
- **Article Schema v1:** unchanged and remains locked.

### Cleanup — one-time admin repair workflow
- **Status:** DONE / REMOVED
- **File:** `.github/workflows/one-time-admin-source-repair.yml`
- **Removal commit:** `93c8332bd088464677d7f10eb9bf12a54c1ae3b6`
- **Reason:** The emergency repair workflow is no longer needed after the Admin Panel is live and working. It must not remain as normal project architecture.

### Fix tracking — Most Popular metadata
- **Status:** DONE
- **File:** `assets/css/popular-fix.css`
- **Purpose:** Keep Most Popular metadata readable on the light homepage.
- **Commits:** `04628df976399e4435b6cdff4880dcf0669e42ee`, `85dcca3367804cac57ab6fff58eaceae05db5f94`
- **Do not repeat:** This fix is already completed.

### Fix tracking — Related Stories static image path
- **Status:** DONE / VERIFY IN DEPLOYMENT
- **File:** `assets/js/related-articles.js`
- **Purpose:** Resolve article cover paths correctly when Related Stories runs on `/articles/{slug}.html`.
- **Commit:** `0516ea890c61b43041925bb980a94c2aaeab1f3f`

### Safeguard added — JavaScript syntax validation
- **Status:** ADDED / MUST PASS
- **File:** `.github/workflows/validate-javascript.yml`
- **Commit:** `ab238b9e1bd09bb8c772dd8c52833b12e9194117`
- **Purpose:** Run `node --check` against every JavaScript file in the repository on JavaScript changes or manual dispatch, so future parse errors are caught before a fix is declared complete.

### Recovery — direct admin source repair history
- **Status:** SUPERSEDED HISTORY / FINAL SOURCE IS WORKING LIVE
- **File:** `admin/admin.js`
- Earlier malformed source versions caused `Unexpected token ')'` and `Loading admin panel...` failures. Several emergency repair commits were attempted during troubleshooting.
- The incomplete manual replacement `517e3d61f5b4fcb4b000478d12e087bfe053ffa5` is invalid and must never be reused.
- The final clean source was restored from the known-good `8c7abfa494d8b8de6de35c576472fb4c896ce473` basis, with final repository commit `5e625f2c4474543b350b14aa3be44b7d616ba2f3`.
- A later targeted Claude forensic repair was also applied to the `renderBodyImages()` `[data-image-url]` listener: the missing closing `}` was the confirmed syntax defect in the supplied repair bundle.
- The Admin Panel is now verified live by the user's screenshot.
- **Do not perform another broad rewrite of `admin/admin.js` unless a new regression is reproduced and the current source is inspected first.**

### Admin deployment cache bust
- **Status:** DONE / VERIFIED LIVE
- **File:** `admin/index.html`
- **Commit:** `2822ba6a33336f0dea59c206fb5a7e147f98f8c5`
- **Change:** Updated the Admin script URL to `admin.js?v=20260912-4` so the deployed browser would not keep serving an older broken source.
- **Verification:** The user's deployed Admin Dashboard now loads successfully.

### Cleanup — obsolete runtime loader
- **Status:** DONE
- **File:** `admin/admin-loader-fix.js`
- **Commit:** `26c58117d3900eca3bee8ee6a744925b4ac105ce`
- **Reason:** The Admin Panel now loads the real `admin.js` directly; the temporary runtime loader was removed to avoid hiding future source errors.

### Documentation rule
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
- **Reason:** The page itself tells the owner to replace it with a real contact email. Do not invent an email address.

### 🟡 Search/category code duplication
- **Status:** NEEDS FURTHER AUDIT
- **Reason:** Search/category behavior appears across multiple JavaScript files. Refactor only after mapping all event listeners and responsibilities.

### 🟡 AI request/result files
- **Status:** NEEDS FURTHER AUDIT
- **Reason:** Raw AI request/result JSON files are stored in the public repository. Review privacy and cleanup strategy before changing architecture.

### 🟡 SEO enhancements
- **Status:** RECOMMENDATION / NOT FIXED
- Potential items include sitemap/robots, JSON-LD Article structured data, and ensuring fallback/dynamic article routes do not create duplicate indexing concerns.
