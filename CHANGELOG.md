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

### Admin runtime/source repair history
- A malformed newline in `admin/admin.js` previously caused a JavaScript parse failure and prevented the Admin Panel from starting.
- A temporary runtime loader was introduced during troubleshooting, then removed, restored, and its path corrected across several commits.
- The source was rewritten in `b4f462aa409bae53c6352a586c9c67377d1d7c6f` and `8c7abfa494d8b8de6de35c576472fb4c896ce473`.
- Later troubleshooting commits included `896d50590c0851a3459280095e965106eeb07991`, `d1e6d5c30c0c0ee693d8ec7f36c6562360d99cfc`, and `10939dbf131b3cdc20cd7ed7bc4a64e595d25a56`.
- **Regression confirmed by user screenshot:** the deployed Admin Panel showed `Admin panel could not start` / `Unexpected token ')'`.

### Safeguard added — JavaScript syntax validation
- **Status:** ADDED / MUST PASS
- **File:** `.github/workflows/validate-javascript.yml`
- **Commit:** `ab238b9e1bd09bb8c772dd8c52833b12e9194117`
- **Purpose:** Run `node --check` against every JavaScript file in the repository on JavaScript changes or manual dispatch, so future parse errors are caught before a fix is declared complete.

### Recovery — direct admin source repair
- **Status:** FIXED IN REPOSITORY / NEEDS LIVE DEPLOYMENT VERIFICATION
- **File:** `admin/admin.js`
- **Root cause found:** the `btnSuggestRelated` handler contained a malformed `toast()` call where the template literal ended with a double quote instead of a backtick. That is consistent with the browser's `Unexpected token ')'` parse failure.
- **Final source basis:** restored from the clean `admin/admin.js` blob from commit `8c7abfa494d8b8de6de35c576472fb4c896ce473` (`309d9b0c461bc8110a9876ca2e675c7c5e704959`), which contains the corrected template-literal syntax.
- **Final commit:** `5e625f2c4474543b350b14aa3be44b7d616ba2f3`
- **Important:** This supersedes the earlier recovery commit `65334865f9d484f3f4133267a5951743ac48630a`; do not restore the b4 source again.
- **Verification:** Source inspection confirms the malformed `toast()` line is corrected. The repository's JS syntax workflow is the authoritative automated check; its push-run result was not exposed by the connected GitHub status wrapper during this repair.

### Admin deployment cache bust — added after live screenshot still showed Loading
- **Status:** APPLIED / NEEDS LIVE VERIFICATION
- **File:** `admin/index.html`
- **Problem:** The page was still requesting `admin.js?v=20260912-2`, the same cache-busting URL used before the final source repair. A browser/CDN could therefore continue serving the older broken JavaScript even though `main/admin.js` had been repaired.
- **Change:** Updated the script URL to `admin.js?v=20260912-4` without changing Admin logic or Article Schema v1.
- **Commit:** `2822ba6a33336f0dea59c206fb5a7e147f98f8c5`
- **Verification:** Current repository `admin/index.html` now points to the new versioned URL. Live deployment still needs to be checked.

### Temporary repair workflow — created and removed
- **Status:** REVERTED / CLEANED UP
- **File:** `.github/workflows/repair-admin-parse.yml`
- **Created by commit:** `16b47b7b6e401c968b76f6087ea574ec976f7d02`
- **Removed by commit:** `87794ed5db2dde920b978721abc3962052ef6307`
- **Purpose:** Emergency recovery mechanism to restore the known admin source from Git history and run `node --check` on the runner.
- **Reason removed:** It was a one-time repair mechanism and must not remain as normal project architecture.

### Superseded write during recovery
- **Status:** SUPERSEDED IMMEDIATELY
- **Commit:** `517e3d61f5b4fcb4b000478d12e087bfe053ffa5`
- **Issue:** An incomplete manual replacement accidentally truncated the file while attempting a direct repair.
- **Resolution:** The file was immediately restored from the known clean `8c7abfa...` blob in commit `5e625f2c...`.
- **Do not reuse:** `517e3d61...` is not a valid source state.

### Cleanup — remove obsolete runtime loader
- **Status:** DONE IN REPOSITORY / NEEDS DEPLOYMENT VERIFICATION
- **File:** `admin/admin-loader-fix.js`
- **Commit:** `26c58117d3900eca3bee8ee6a744925b4ac105ce`
- **Reason:** `admin/index.html` no longer references the runtime loader, so the obsolete repair file was removed to prevent future confusion.

### Project memory — change log
- **Status:** ACTIVE
- **File:** `CHANGELOG.md`
- **Commit:** `1402eeb1f72de198e810e6185c7f4b7a7cbdeb31` (created), followed by subsequent updates.
- **Rule:** Every future repository change must be recorded here before moving to another fix.

### Documentation rule
From this point forward, every repository change must be recorded in this file before moving on to another fix. The record must include:
1. Date
2. Priority/reason
3. Exact files changed
4. What changed
5. Why it changed
6. Commit SHA
7. Verification result
8. Deployment result when applicable
9. Whether the change is DONE, NEEDS VERIFICATION, or REVERTED
