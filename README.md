# Jaziel — Trending Stories

A static, GitHub Pages–hosted trending-stories site, plus an Admin Panel
for creating and managing articles without hand-editing `articles.json`.

Live site: https://jaziel-story.github.io/

## Site structure (unchanged)

```
index.html         Homepage
article.html        Single article view (?slug=…)
search.html          Search
category.html        Category browsing
about.html, contact.html, privacy.html, terms.html
articles.json        All article data (root of the repo — do not move)
assets/css/style.css  Shared stylesheet
assets/js/main.js     Shared frontend logic (reads articles.json)
assets/images/articles/  Article images (cover + body), uploaded via the Admin Panel
```

None of the files above changed behavior — the Admin Panel writes the exact
same `articles.json` schema the site already reads.

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
Access Token** inside the panel for what permissions you need, and
**Help** inside the panel for an honest description of what is and isn't
secure about this setup on static GitHub Pages hosting.

### How it works, in short

- The Admin Panel is a static page. It has no backend of its own.
- To publish, edit, or delete an article, it calls the GitHub REST API
  directly from your browser using a Personal Access Token you provide at
  runtime (Settings tab). That token is kept in memory, or in
  `sessionStorage` for the current tab only if you opt in — it is never
  written to any file in this repository.
- The **AI Writer** (Google Gemini) never sees your Gemini key from the
  browser. The panel commits your raw text to `admin/ai-requests/`, then
  triggers the `.github/workflows/ai-writer.yml` GitHub Actions workflow,
  which holds `GEMINI_API_KEY` as a GitHub Actions secret, calls Gemini
  on GitHub's servers, and writes the structured result to
  `admin/ai-results/` for the panel to pick up. You always review the
  generated draft before publishing — nothing is auto-published.

### One-time setup for the AI Writer

1. Get a Gemini API key from Google AI Studio.
2. In this repository: **Settings → Secrets and variables → Actions →
   New repository secret**, name it `GEMINI_API_KEY`, and paste the key.
3. In the Admin Panel's Settings tab, add a GitHub Personal Access Token
   scoped to this repository with `Contents: Read and write` and
   `Actions: Read and write`.

The Gemini model used is configured in one place:
`GEMINI_MODEL` at the top of `.github/scripts/generate-article.mjs`
(currently `gemini-3.8-flash`). If Google recommends a different model
later, update that single constant — no other file needs to change.

### GitHub Actions in this repo

- `.github/workflows/validate-articles.yml` — runs automatically on every
  change to `articles.json` and fails the check if the schema is broken
  (missing required fields, duplicate slugs/ids, invalid dates, etc.).
- `.github/workflows/validate-javascript.yml` — checks JavaScript syntax
  with Node.js on JavaScript changes, helping catch parser errors before
  deployment.
- `.github/workflows/ai-writer.yml` — runs on demand, triggered by the
  Admin Panel, to turn raw text into a structured article draft with
  Gemini.

## Repository Change Log

**Important rule:** Every repository change must be recorded here and in
`CHANGELOG.md`. Before making another fix, check these logs and the recent
Git commits first. Do not repeat a change that is already marked DONE unless
a regression is confirmed.

### 2026-09-12 — Admin Panel recovery

- Fixed the Admin Panel JavaScript parser error identified from the Claude
  repair bundle: the `[data-image-url]` input listener inside
  `renderBodyImages()` was missing a closing `}`.
- Restored the Admin Panel to a clean source before applying the targeted
  syntax repair, instead of performing another broad rewrite.
- Removed the obsolete runtime loader and temporary repair workflow after
  recovery.
- Added permanent JavaScript syntax validation through
  `.github/workflows/validate-javascript.yml`.
- Added/maintained `CHANGELOG.md` as the detailed history for repository
  changes.
- **Live verification:** Admin Dashboard is now loading successfully and
  displays the existing article, category, and dashboard statistics.
- **Article Schema v1:** unchanged and remains locked.

### 2026-09-12 — Related Stories

- Fixed relative image paths for Related Stories on generated static article
  pages. This is retained as a targeted fix and should not be reimplemented
  unless a regression is observed.

### 2026-09-12 — Most Popular

- Fixed Most Popular metadata visibility/contrast on the homepage.
- This fix is already complete; do not repeat it unless a new regression is
  confirmed.

## Monetization

Adsterra ad slots (`.ad-slot` elements) are unchanged. The Admin Panel does
ot manage ad code.
