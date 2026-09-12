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

### Recovery — restore stable admin source
- **Status:** NEEDS DEPLOYMENT VERIFICATION
- **Files:** `admin/admin.js`, `admin/index.html`
- **Change:** Restored `admin/admin.js` to the known source from commit `b4f462aa409bae53c6352a586c9c67377d1d7c6f` (blob `2efe32fa7baf32503aed7eac57d4fe1fbb039365`) and restored `admin/index.html` to the direct `admin.js` loading version (blob `58ed6858bc0b49b1b9ff98a92ba8bd10c6e87642`).
- **Commit:** `65334865f9d484f3f4133267a5951743ac48630a`
- **Reason:** Remove the risky runtime repair path and return to a source version explicitly committed as the admin syntax repair.

### Cleanup — remove obsolete runtime loader
- **Status:** DONE IN REPOSITORY / NEEDS DEPLOYMENT VERIFICATION
- **File:** `admin/admin-loader-fix.js`
- **Commit:** `26c58117d3900eca3bee8ee6a744925b4ac105ce`
- **Reason:** `admin/index.html` no longer references the runtime loader, so the obsolete repair file was removed to prevent future confusion.

### Project memory — change log
- **Status:** ACTIVE
- **File:** `CHANGELOG.md`
- **Commit:** `1402eeb1f72de198e810e6185c7f4b7a7cbdeb31` (created), followed by this update.
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
