/* =========================================================
   JAZIEL ADMIN PANEL
   Vanilla JS, no build step, no framework, no server.
   Talks directly to the GitHub REST API from the browser
   using a Personal Access Token the admin supplies at
   runtime. That token is kept in memory (or, optionally,
   sessionStorage for the current tab only) — it is NEVER
   written to source, articles.json, or localStorage.

   AI writing is done by Google Gemini, but the Gemini API
   key never touches the browser: this panel writes a small
   request file to the repo and triggers a GitHub Actions
   workflow (.github/workflows/ai-writer.yml) that holds the
   real GEMINI_API_KEY as a GitHub Actions secret and writes
   the result back to the repo for this panel to pick up.
   ========================================================= */

(() => {
"use strict";

/* =========================================================
   CONSTANTS
   ========================================================= */

const SETTINGS_KEY = "jaziel_admin_settings_v1";     // non-secret: owner/repo/branch
const TOKEN_SESSION_KEY = "jaziel_admin_token_v1";     // only used if admin opts in
const DRAFTS_KEY = "jaziel_admin_drafts_v1";           // local drafts, browser-only

const DEFAULT_SETTINGS = {
  owner: "Jaziel-Story",
  repo: "jaziel-story.github.io",
  branch: "main",
  siteUrl: "https://jaziel-story.github.io/"
};

const ARTICLES_PATH = "articles.json";
const IMAGES_DIR = "assets/images/articles";
const AI_WORKFLOW_FILE = "ai-writer.yml";
const AI_REQUEST_DIR = "admin/ai-requests";
const AI_RESULT_DIR = "admin/ai-results";

/* =========================================================
   STATE
   ========================================================= */

const state = {
  settings: loadSettings(),
  token: sessionStorage.getItem(TOKEN_SESSION_KEY) || "",
  articles: [],
  articlesSha: null,
  articlesLoaded: false,
  categories: [],
  editor: null,       // working copy of the article being edited
  editorMode: null,   // "new" | "edit"
  editorOriginalSlug: null,
  editorOriginalId: null,
  pendingCoverFile: null,
  pendingBodyImageFiles: {}, // index -> File
  aiPoll: null
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

/* =========================================================
   UTILITIES
   ========================================================= */

function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return [...root.querySelectorAll(sel)]; }

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Unicode-safe base64 helpers (chunked, so large text doesn't blow the call stack)
function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function b64ToUtf8(b64) {
  const binary = atob(String(b64 || "").replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function safeExt(filename) {
  const m = /\.([a-zA-Z0-9]+)$/.exec(filename || "");
  const ext = m ? m[1].toLowerCase() : "jpg";
  return /^(jpg|jpeg|png|webp|gif)$/.test(ext) ? ext : "jpg";
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
function validateImageFile(file, label = "Image") {
  if (!file) throw new Error(label + " file is missing.");
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error(label + " must be JPG, PNG, WebP, or GIF.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error(label + " is too large. Maximum size is 10 MB.");
  return true;
}
function isValidImageUrl(value) {
  try { const url = new URL(String(value || "").trim()); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; }
}
function imagePathUsedByOtherArticle(path, currentArticleId) {
  return state.articles.some(article => {
    if (!article || article.id === currentArticleId) return false;
    if (article.cover === path) return true;
    return (article.images || []).some(img => (typeof img === "string" ? img : img && img.src) === path);
  });
}
function uniqueUploadPath(basePath, currentArticleId) {
  if (!imagePathUsedByOtherArticle(basePath, currentArticleId)) return basePath;
  const dot = basePath.lastIndexOf(".");
  const stem = dot >= 0 ? basePath.slice(0, dot) : basePath;
  const ext = dot >= 0 ? basePath.slice(dot) : "";
  return stem + "-" + Date.now() + ext;
}

/* ---------- Toasts ---------- */

function toast(message, type = "info") {
  const root = $("#toastRoot");
  const el = document.createElement("div");
  el.className = `toast${type === "error" ? " toast-error" : type === "success" ? " toast-success" : ""}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

/* ---------- Confirm modal ---------- */

function confirmDialog(message) {
  return new Promise(resolve => {
    const modal = $("#confirmModal");
    $("#confirmMessage").textContent = message;
    modal.hidden = false;
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");

    const cleanup = (result) => {
      modal.hidden = true;
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      resolve(result);
    };
    const okBtn = $("#confirmOk");
    const cancelBtn = $("#confirmCancel");
    const onOk = () => cleanup(true);
    const onCancel = () => cleanup(false);
    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
  });
}

/* =========================================================
   GITHUB API LAYER
   ========================================================= */

function apiBase() {
  return `https://api.github.com/repos/${state.settings.owner}/${state.settings.repo}`;
}

function ghHeaders(extra = {}) {
  const headers = {
    "Accept": "application/vnd.github+json",
    ...extra
  };
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
  return headers;
}

async function ghRequest(path, opts = {}) {
  const res = await fetch(`${apiBase()}${path}`, {
    ...opts,
    headers: ghHeaders(opts.headers)
  });
  return res;
}

/** GET a file's contents. Returns null on 404. Throws on other errors. */
async function ghGetFile(path, { binary = false } = {}) {
  const res = await ghRequest(`/contents/${path}?ref=${encodeURIComponent(state.settings.branch)}&t=${Date.now()}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read failed for ${path} (${res.status})`);
  const data = await res.json();
  return {
    sha: data.sha,
    base64: data.content,
    text: binary ? null : b64ToUtf8((data.content || "").replace(/\n/g, ""))
  };
}

/** Create or update a file. base64Content must already be base64. */
async function ghPutFile(path, base64Content, message, sha) {
  const body = {
    message,
    content: base64Content,
    branch: state.settings.branch
  };
  if (sha) body.sha = sha;

  const res = await ghRequest(`/contents/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const detail = await safeErrorText(res);
    throw new Error(`GitHub write failed for ${path} (${res.status}): ${detail}`);
  }
  return res.json();
}

async function ghDeleteFile(path, sha, message) {
  const res = await ghRequest(`/contents/${path}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha, branch: state.settings.branch })
  });
  return res.ok;
}

async function ghTriggerWorkflow(workflowFile, inputs) {
  const res = await ghRequest(`/actions/workflows/${workflowFile}/dispatches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: state.settings.branch, inputs })
  });
  if (!res.ok) {
    const detail = await safeErrorText(res);
    throw new Error(`Could not start the AI Writer workflow (${res.status}): ${detail}`);
  }
  return true;
}

async function safeErrorText(res) {
  try {
    const j = await res.json();
    return j.message || JSON.stringify(j);
  } catch {
    return res.statusText;
  }
}

async function testConnection() {
  const res = await ghRequest("");
  if (!res.ok) throw new Error(`Repository not reachable (${res.status})`);
  return res.json();
}

/* =========================================================
   ARTICLES DATA LAYER
   ========================================================= */

async function loadArticlesFresh() {
  const file = await ghGetFile(ARTICLES_PATH);
  if (!file) throw new Error("articles.json was not found in the repository.");
  let parsed;
  try {
    parsed = JSON.parse(file.text);
  } catch {
    throw new Error("articles.json is not valid JSON.");
  }
  state.articles = Array.isArray(parsed.articles) ? parsed.articles : [];
  state.articlesSha = file.sha;
  state.articlesLoaded = true;
  state.categories = uniqueCategories(state.articles);
  return state.articles;
}

function uniqueCategories(articles) {
  return [...new Set(articles.map(a => a.category).filter(Boolean))].sort();
}

async function saveArticlesArray(newArray, commitMessage) {
  if (!state.articlesLoaded || !state.articlesSha) throw new Error("Articles are not loaded. Reload the admin panel before publishing.");
  const baselineSha = state.articlesSha;
  const latest = await ghGetFile(ARTICLES_PATH);
  if (!latest) throw new Error("articles.json could not be found — refusing to publish.");
  if (latest.sha !== baselineSha) throw new Error("Publish conflict: articles.json changed elsewhere after this editor loaded it. Reload the Articles list, reopen the article, and publish again so no newer changes are overwritten.");
  const payload = { articles: newArray };
  const contentStr = JSON.stringify(payload, null, 2) + "
";
  const result = await ghPutFile(ARTICLES_PATH, utf8ToB64(contentStr), commitMessage, latest.sha);
  state.articles = newArray;
  state.articlesSha = result.content ? result.content.sha : null;
  state.categories = uniqueCategories(newArray);
  return result;
}

function nextArticleId(articles) {
  let max = 0;
  for (const a of articles) {
    const m = /^story-(\d+)$/.exec(a.id || "");
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `story-${String(max + 1).padStart(3, "0")}`;
}

function findRelatedSuggestions(articles, current, limit = 6) {
  const currentTags = new Set(current.tags || []);
  return articles
    .filter(a => a.id !== current.id)
    .map(a => {
      let score = 0;
      if (a.category && current.category && a.category === current.category) score += 2;
      if (Array.isArray(a.tags)) score += a.tags.filter(t => currentTags.has(t)).length;
      return { article: a, score };
    })
    .filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(e => e.article);
}

/* =========================================================
   ROUTER
   ========================================================= */

function currentRoute() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);
  return { view: parts[0] || "dashboard", params: parts.slice(1) };
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", () => {
  setupChrome();
  render();
});

function setupChrome() {
  const menuToggle = $("#menuToggle");
  const sidebar = $("#sidebar");

  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  $all(".admin-sidebar a").forEach(a => {
    a.addEventListener("click", () => {
      if (sidebar) sidebar.classList.remove("open");
    });
  });

  // Preview modal must ALWAYS start closed.
  const previewModal = $("#previewModal");
  if (previewModal) {
    previewModal.hidden = true;
    previewModal.style.display = "none";
    previewModal.setAttribute("aria-hidden", "true");
  }

  // Use delegated events so Close still works even if the modal markup
  // is replaced or rendered after setupChrome().
  document.addEventListener("click", (event) => {
    const closeButton = event.target.closest("#previewClose");
    if (closeButton) {
      event.preventDefault();
      event.stopPropagation();
      closePreview();
      return;
    }

    // Clicking the dark backdrop closes the preview, but clicking
    // inside the preview dialog does not.
    const modal = $("#previewModal");
    if (modal && event.target === modal) {
      closePreview();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePreview();
  });

  // Confirm modal must ALWAYS start closed. Some CSS/HTML combinations can
  // otherwise display it before confirmDialog() has been called.
  const confirmModal = $("#confirmModal");
  if (confirmModal) {
    confirmModal.hidden = true;
    confirmModal.style.display = "none";
    confirmModal.setAttribute("aria-hidden", "true");
  }

  updateConnBadge();
}

function closePreview() {
  const modal = $("#previewModal");
  if (!modal) return;
  modal.hidden = true;
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
}

function updateConnBadge() {
  const badge = $("#connBadge");
  const configured = Boolean(state.settings.owner && state.settings.repo);
  const hasToken = Boolean(state.token);
  badge.textContent = !configured
    ? "Repository not set"
    : hasToken
      ? `${state.settings.owner}/${state.settings.repo} · token active`
      : `${state.settings.owner}/${state.settings.repo} · read-only`;
  badge.classList.toggle("is-connected", hasToken);
}

function setActiveNav(view) {
  $all(".admin-sidebar a").forEach(a => {
    a.classList.toggle("active", a.dataset.nav === view);
  });
}

async function render() {
  const { view, params } = currentRoute();
  setActiveNav(view === "editor" ? "editor" : view);
  const root = $("#view");

  try {
    if (view === "dashboard") return renderDashboard(root);
    if (view === "articles") return renderArticlesList(root);
    if (view === "search") return renderArticlesList(root, { focusSearch: true });
    if (view === "editor") return renderEditor(root, params[0] || "new");
    if (view === "settings") return renderSettings(root);
    if (view === "help") return renderHelp(root);
    root.innerHTML = `<p class="empty-state">Unknown view.</p>`;
  } catch (err) {
    console.error(err);
    root.innerHTML = `<div class="panel"><p class="field-error">${escapeHTML(err.message || String(err))}</p></div>`;
  }
}

/* =========================================================
   DASHBOARD VIEW
   ========================================================= */

async function renderDashboard(root) {
  root.innerHTML = `<p class="loading-text">Loading dashboard…</p>`;

  if (!state.settings.owner || !state.settings.repo) {
    root.innerHTML = emptySettingsNotice();
    return;
  }

  try {
    await loadArticlesFresh();
  } catch (err) {
    root.innerHTML = `
      <div class="admin-page-title"><h1>Dashboard</h1></div>
      <div class="panel"><p class="field-error">Unable to load articles.json: ${escapeHTML(err.message)}</p></div>
    `;
    return;
  }

  const articles = state.articles;
  const sorted = [...articles].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  const latest = sorted.slice(0, 5);

  root.innerHTML = `
    <div class="admin-page-title">
      <h1>Dashboard</h1>
      <a class="btn" href="#/editor/new">➕ New Article</a>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-value">${articles.length}</div><div class="stat-label">Total Articles</div></div>
      <div class="stat-card"><div class="stat-value">${articles.length}</div><div class="stat-label">Published Articles</div></div>
      <div class="stat-card"><div class="stat-value">${state.categories.length}</div><div class="stat-label">Categories</div></div>
      <div class="stat-card"><div class="stat-value">${latest[0] ? escapeHTML(formatDate(latest[0].date)) : "—"}</div><div class="stat-label">Latest Article</div></div>
    </div>

    <div class="panel">
      <h2 class="mt-0">Recent Articles</h2>
      ${latest.length ? `
        <table class="admin-table">
          <thead><tr><th></th><th>Title</th><th>Category</th><th>Date</th><th></th></tr></thead>
          <tbody>
            ${latest.map(a => `
              <tr>
                <td><div class="row-thumb" style="${a.cover ? `background-image:url('${escapeHTML(coverUrlFor(a.cover))}')` : ""}"></div></td>
                <td>${escapeHTML(a.title || "")}</td>
                <td><span class="badge">${escapeHTML(a.category || "—")}</span></td>
                <td>${escapeHTML(formatDate(a.date))}</td>
                <td><a class="btn btn-sm btn-ghost" href="#/editor/${encodeURIComponent(a.slug)}">Edit</a></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : `<p class="empty-state">No articles yet. Create your first one.</p>`}
    </div>
  `;
}

function coverUrlFor(cover) {
  if (!cover) return "";
  if (/^https?:\/\//.test(cover)) return cover;
  return `${state.settings.siteUrl.replace(/\/$/, "")}/${cover.replace(/^\//, "")}`;
}

function emptySettingsNotice() {
  return `
    <div class="admin-page-title"><h1>Welcome to Jaziel Admin</h1></div>
    <div class="panel">
      <p>Before you begin, open <a href="#/settings">Settings</a> and confirm the repository this panel should read and write:
      owner <strong>${escapeHTML(state.settings.owner)}</strong>, repo <strong>${escapeHTML(state.settings.repo)}</strong>.</p>
      <p>To publish, edit, or delete articles you'll also need a GitHub Personal Access Token with <code>Contents: Read & write</code>
      (and <code>Actions: Read & write</code> if you want to use the AI Writer). The token stays in this browser tab only.</p>
      <a class="btn" href="#/settings">Go to Settings</a>
    </div>
  `;
}

/* =========================================================
   ARTICLES LIST VIEW
   ========================================================= */

async function renderArticlesList(root, { focusSearch = false } = {}) {
  root.innerHTML = `<p class="loading-text">Loading articles…</p>`;

  if (!state.settings.owner || !state.settings.repo) {
    root.innerHTML = emptySettingsNotice();
    return;
  }

  try {
    await loadArticlesFresh();
  } catch (err) {
    root.innerHTML = `<div class="panel"><p class="field-error">Unable to load articles.json: ${escapeHTML(err.message)}</p></div>`;
    return;
  }

  root.innerHTML = `
    <div class="admin-page-title">
      <h1>Articles</h1>
      <a class="btn" href="#/editor/new">➕ New Article</a>
    </div>

    <div class="panel">
      <div class="field-row">
        <div class="field">
          <label for="listSearch">Search</label>
          <input type="search" id="listSearch" placeholder="Search by title, category, or tag…">
        </div>
        <div class="field">
          <label for="listCategory">Category</label>
          <select id="listCategory">
            <option value="">All categories</option>
            ${state.categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("")}
          </select>
        </div>
      </div>

      <table class="admin-table">
        <thead><tr><th></th><th>Title</th><th>Category</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody id="listBody"></tbody>
      </table>
      <p id="listEmpty" class="empty-state" hidden>No articles match your filters.</p>
    </div>
  `;

  const searchInput = $("#listSearch");
  const categorySelect = $("#listCategory");

  const draw = () => {
    const q = searchInput.value.trim().toLowerCase();
    const cat = categorySelect.value;
    const filtered = state.articles.filter(a => {
      const matchesCat = !cat || a.category === cat;
      const haystack = [a.title, a.category, a.description, ...(a.tags || [])].join(" ").toLowerCase();
      const matchesQ = !q || haystack.includes(q);
      return matchesCat && matchesQ;
    });

    const sorted = [...filtered].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    $("#listBody").innerHTML = sorted.map(rowHTML).join("");
    $("#listEmpty").hidden = sorted.length > 0;

    $all("[data-action]", $("#listBody")).forEach(btn => {
      btn.addEventListener("click", () => handleListAction(btn.dataset.action, btn.dataset.id));
    });
  };

  function rowHTML(a) {
    return `
      <tr>
        <td><div class="row-thumb" style="${a.cover ? `background-image:url('${escapeHTML(coverUrlFor(a.cover))}')` : ""}"></div></td>
        <td>${escapeHTML(a.title || "(untitled)")}</td>
        <td><span class="badge">${escapeHTML(a.category || "—")}</span></td>
        <td>${escapeHTML(formatDate(a.date))}</td>
        <td><span class="badge badge-published">Published</span></td>
        <td>
          <div class="row-actions">
            <a class="btn btn-sm btn-ghost" href="#/editor/${encodeURIComponent(a.slug)}">Edit</a>
            <button class="btn btn-sm btn-ghost" data-action="preview" data-id="${escapeHTML(a.id)}" type="button">Preview</button>
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${escapeHTML(a.id)}" type="button">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }

  searchInput.addEventListener("input", draw);
  categorySelect.addEventListener("change", draw);
  if (focusSearch) searchInput.focus();
  draw();
}

async function handleListAction(action, id) {
  const article = state.articles.find(a => a.id === id);
  if (!article) return;

  if (action === "preview") {
    openPreview(article);
  } else if (action === "delete") {
    const ok = await confirmDialog("Are you sure you want to delete this article?");
    if (!ok) return;
    await deleteArticle(article);
  }
}

async function deleteArticle(article) {
  if (!state.token) {
    toast("A GitHub token with write access is required to delete articles. Add one in Settings.", "error");
    return;
  }
  try {
    const remaining = state.articles.filter(a => a.id !== article.id);
    await saveArticlesArray(remaining, `Admin: delete article "${article.title || article.slug}"`);
    await removeOrphanedImages(article, remaining);
    toast("Article deleted and published.", "success");
    render();
  } catch (err) {
    console.error(err);
    toast(`Delete failed: ${err.message}`, "error");
  }
}

async function removeOrphanedImages(deletedArticle, remainingArticles) {
  const stillUsed = new Set();
  remainingArticles.forEach(a => {
    if (a.cover) stillUsed.add(a.cover);
    (a.images || []).forEach(img => {
      const src = typeof img === "string" ? img : img && img.src;
      if (src) stillUsed.add(src);
    });
  });

  const candidates = [];
  if (deletedArticle.cover) candidates.push(deletedArticle.cover);
  (deletedArticle.images || []).forEach(img => {
    const src = typeof img === "string" ? img : img && img.src;
    if (src) candidates.push(src);
  });

  for (const path of candidates) {
    if (stillUsed.has(path)) continue;
    if (!path.startsWith(IMAGES_DIR + "/")) continue; // never touch files outside our own upload folder
    try {
      const file = await ghGetFile(path, { binary: true });
      if (file) await ghDeleteFile(path, file.sha, `Admin: remove unused image for "${deletedArticle.title || deletedArticle.slug}"`);
    } catch (err) {
      console.warn("Could not remove image", path, err);
    }
  }
}

/* =========================================================
   EDITOR VIEW
   ========================================================= */

function blankArticle() {
  return {
    id: "",
    title: "",
    slug: "",
    description: "",
    category: "",
    date: todayISO(),
    readTime: "",
    dek: "",
    cover: "",
    intro: "",
    sections: [{ heading: "", paragraphs: [""] }],
    images: [],
    bibleVerse: { text: "", reference: "" },
    closing: "",
    seo: { title: "", description: "" },
    og: { title: "", description: "", image: "" },
    tags: [],
    relatedArticles: [],
    featured: false
  };
}

async function renderEditor(root, slugParam) {
  root.innerHTML = `<p class="loading-text">Loading editor…</p>`;

  if (!state.settings.owner || !state.settings.repo) {
    root.innerHTML = emptySettingsNotice();
    return;
  }

  try {
    await loadArticlesFresh();
  } catch (err) {
    root.innerHTML = `<div class="panel"><p class="field-error">Unable to load articles.json: ${escapeHTML(err.message)}</p></div>`;
    return;
  }

  if (slugParam === "new") {
    state.editor = blankArticle();
    state.editorMode = "new";
    state.editorOriginalSlug = null;
    state.editorOriginalId = null;
  } else {
    const found = state.articles.find(a => a.slug === decodeURIComponent(slugParam));
    if (!found) {
      root.innerHTML = `<div class="panel"><p class="field-error">Article not found.</p></div>`;
      return;
    }
    state.editor = JSON.parse(JSON.stringify(found));
    state.editor.bibleVerse = state.editor.bibleVerse || { text: "", reference: "" };
    state.editor.seo = state.editor.seo || { title: "", description: "" };
    state.editor.og = state.editor.og || { title: "", description: "", image: "" };
    if (!Array.isArray(state.editor.sections) || !state.editor.sections.length) {
      state.editor.sections = [{ heading: "", paragraphs: [""] }];
    }
    state.editorMode = "edit";
    state.editorOriginalSlug = found.slug;
    state.editorOriginalId = found.id;
  }
  state.pendingCoverFile = null;
  state.pendingBodyImageFiles = {};

  root.innerHTML = editorShellHTML();
  bindEditorEvents(root);
  fillEditorForm();
}

function editorShellHTML() {
  const heading = state.editorMode === "new" ? "New Article" : "Edit Article";
  return `
    <div class="admin-page-title">
      <h1>${heading}</h1>
      <div class="btn-row" style="margin-top:0">
        <button class="btn btn-ghost" id="btnSaveDraft" type="button">💾 Save Draft</button>
        <button class="btn btn-ghost" id="btnLoadDraft" type="button">📂 Load Draft</button>
        <button class="btn btn-ghost" id="btnClearDraft" type="button">🗑 Clear Draft</button>
        <button class="btn btn-ghost" id="btnPreview" type="button">👁 Preview</button>
        <button class="btn" id="btnPublish" type="button">🚀 Publish</button>
      </div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" data-tab="content" type="button">Content</button>
      <button class="tab-btn" data-tab="images" type="button">Images</button>
      <button class="tab-btn" data-tab="tags" type="button">Tags &amp; Related</button>
      <button class="tab-btn" data-tab="seo" type="button">SEO &amp; OG</button>
      <button class="tab-btn" data-tab="ai" type="button">AI Writer</button>
    </div>

    <div id="tab-content" class="tab-panel panel">
      <div class="field-row">
        <div class="field" id="f-title"><label>Title *</label><input type="text" id="inTitle"></div>
        <div class="field" id="f-slug"><label>Slug *</label><input type="text" id="inSlug"><p class="hint">Auto-generated from the title. You can edit it manually.</p></div>
      </div>
      <div class="field-row">
        <div class="field" id="f-category"><label>Category *</label><input type="text" id="inCategory" list="categoryList"><datalist id="categoryList">${state.categories.map(c => `<option value="${escapeHTML(c)}">`).join("")}</datalist></div>
        <div class="field" id="f-date"><label>Date *</label><input type="date" id="inDate"></div>
        <div class="field" id="f-readtime"><label>Read Time</label><input type="text" id="inReadTime" placeholder="5 min read"></div>
      </div>
      <div class="field" id="f-description"><label>Description *</label><textarea id="inDescription" rows="2"></textarea></div>
      <div class="field" id="f-dek"><label>Dek</label><textarea id="inDek" rows="2"></textarea></div>
      <div class="field" id="f-intro"><label>Intro *</label><textarea id="inIntro" rows="3"></textarea></div>

      <div class="field">
        <label>Sections *</label>
        <div id="sectionsList"></div>
        <button class="btn btn-sm btn-ghost" id="btnAddSection" type="button">+ Add Section</button>
      </div>

      <div class="field" id="f-closing"><label>Closing</label><textarea id="inClosing" rows="2"></textarea></div>

      <div class="field-row">
        <div class="field"><label>Bible Verse Text</label><textarea id="inVerseText" rows="2"></textarea></div>
        <div class="field"><label>Bible Verse Reference</label><input type="text" id="inVerseRef" placeholder="e.g. Psalm 23:1"></div>
      </div>

      <div class="checkbox-row"><input type="checkbox" id="inFeatured"> <label for="inFeatured" style="margin:0">Feature this article on the homepage</label></div>
    </div>

    <div id="tab-images" class="tab-panel panel" hidden>
      <div class="field">
        <label>Cover Image</label>
        <div class="dropzone" id="coverDrop">Click or drop an image here to use as the cover</div>
        <input type="file" id="coverFile" accept="image/*" hidden>
        <div class="field"><label class="hint" style="font-weight:400">…or paste an external image URL</label><input type="url" id="inCoverUrl" placeholder="https://…"></div>
        <div class="image-thumb-row" id="coverPreviewRow"></div>
      </div>

      <div class="field">
        <label>Body Images</label>
        <div id="bodyImagesList"></div>
        <button class="btn btn-sm btn-ghost" id="btnAddImage" type="button">+ Add Image</button>
      </div>
    </div>

    <div id="tab-tags" class="tab-panel panel" hidden>
      <div class="field">
        <label>Tags</label>
        <div class="tag-input-row" id="tagsRow">
          <input type="text" id="tagInput" placeholder="Type a tag and press Enter">
        </div>
      </div>
      <div class="field">
        <label>Related Articles</label>
        <button class="btn btn-sm btn-ghost" id="btnSuggestRelated" type="button">✨ Suggest based on category &amp; tags</button>
        <div id="relatedList" style="margin-top:10px"></div>
      </div>
    </div>

    <div id="tab-seo" class="tab-panel panel" hidden>
      <button class="btn btn-sm btn-ghost" id="btnAutofillSeo" type="button">Auto-fill from article content</button>
      <div class="field" style="margin-top:12px"><label>SEO Title</label><input type="text" id="inSeoTitle"></div>
      <div class="field"><label>SEO Description</label><textarea id="inSeoDesc" rows="2"></textarea></div>
      <div class="field"><label>OG Title</label><input type="text" id="inOgTitle"></div>
      <div class="field"><label>OG Description</label><textarea id="inOgDesc" rows="2"></textarea></div>
      <div class="field"><label>OG Image URL</label><input type="url" id="inOgImage" placeholder="Defaults to the cover image"></div>
      <p class="hint">Canonical URL is generated automatically as <code>${escapeHTML(state.settings.siteUrl)}articles/&lt;slug&gt;.html</code></p>
    </div>

    <div id="tab-ai" class="tab-panel panel" hidden>
      <p class="muted">Paste a raw article draft and Gemini (run inside a GitHub Actions workflow, never in the browser) will turn it into Jaziel's format for your review. Nothing is applied automatically — you choose what to keep.</p>
      <div class="field"><label>Raw Article Text *</label><textarea id="aiRawText" rows="8" placeholder="Paste the raw article or notes here…"></textarea></div>
      <div class="field-row">
        <div class="field"><label>Title Hint</label><input type="text" id="aiTitleHint"></div>
        <div class="field"><label>Category Hint</label><input type="text" id="aiCategoryHint"></div>
      </div>
      <div class="field"><label>Extra Instructions</label><textarea id="aiInstructions" rows="2" placeholder="Tone, angle, things to emphasize…"></textarea></div>
      <button class="btn" id="btnGenerateAI" type="button">🤖 Generate with Gemini</button>
      <div id="aiStatusBox" class="ai-status-box" hidden></div>
    </div>
  `;
}

function bindEditorEvents(root) {
  $all(".tab-btn", root).forEach(btn => {
    btn.addEventListener("click", () => {
      $all(".tab-btn", root).forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      $all(".tab-panel", root).forEach(p => { p.hidden = true; });
      $(`#tab-${btn.dataset.tab}`).hidden = false;
    });
  });

  $("#inTitle").addEventListener("input", () => {
    state.editor.title = $("#inTitle").value;
    if (state.editorMode === "new" && !state.editor._slugManuallyEdited) {
      const slug = slugify(state.editor.title);
      $("#inSlug").value = slug;
      state.editor.slug = slug;
    }
  });
  $("#inSlug").addEventListener("input", () => {
    state.editor._slugManuallyEdited = true;
    state.editor.slug = slugify($("#inSlug").value);
  });
  $("#inCategory").addEventListener("input", () => { state.editor.category = $("#inCategory").value; });
  $("#inDate").addEventListener("input", () => { state.editor.date = $("#inDate").value; });
  $("#inReadTime").addEventListener("input", () => { state.editor.readTime = $("#inReadTime").value; });
  $("#inDescription").addEventListener("input", () => { state.editor.description = $("#inDescription").value; });
  $("#inDek").addEventListener("input", () => { state.editor.dek = $("#inDek").value; });
  $("#inIntro").addEventListener("input", () => { state.editor.intro = $("#inIntro").value; });
  $("#inClosing").addEventListener("input", () => { state.editor.closing = $("#inClosing").value; });
  $("#inVerseText").addEventListener("input", () => { state.editor.bibleVerse.text = $("#inVerseText").value; });
  $("#inVerseRef").addEventListener("input", () => { state.editor.bibleVerse.reference = $("#inVerseRef").value; });
  $("#inFeatured").addEventListener("change", () => { state.editor.featured = $("#inFeatured").checked; });

  $("#btnAddSection").addEventListener("click", () => {
    state.editor.sections.push({ heading: "", paragraphs: [""] });
    renderSections();
  });

  // Images
  $("#coverDrop").addEventListener("click", () => $("#coverFile").click());
  $("#coverFile").addEventListener("change", e => handleCoverFile(e.target.files[0]));
  ["dragover", "dragleave", "drop"].forEach(evt => {
    $("#coverDrop").addEventListener(evt, e => {
      e.preventDefault();
      $("#coverDrop").classList.toggle("dragover", evt === "dragover");
      if (evt === "drop" && e.dataTransfer.files[0]) handleCoverFile(e.dataTransfer.files[0]);
    });
  });
  $("#inCoverUrl").addEventListener("input", () => {
    const value = $("#inCoverUrl").value.trim();
    $("#inCoverUrl").setCustomValidity(value && !isValidImageUrl(value) ? "Use a valid http(s) image URL." : "");
    state.editor.cover = value;
    state.pendingCoverFile = null;
    renderCoverPreview();
  });
  $("#btnAddImage").addEventListener("click", () => {
    state.editor.images.push({ src: "", alt: "", caption: "" });
    renderBodyImages();
  });

  // Tags
  $("#tagInput").addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = $("#tagInput").value.trim().replace(/,$/, "");
      if (val && !state.editor.tags.includes(val)) {
        state.editor.tags.push(val);
        renderTags();
      }
      $("#tagInput").value = "";
    }
  });
  $("#btnSuggestRelated").addEventListener("click", () => {
    const suggestions = findRelatedSuggestions(state.articles, state.editor, 8);
    suggestions.forEach(s => {
      if (!state.editor.relatedArticles.some(r => r.slug === s.slug)) {
        state.editor.relatedArticles.push({ title: s.title, slug: s.slug });
      }
    });
    renderRelated();
    toast(`${suggestions.length} suggestion(s) added — remove any you don't want.`, "info");
  });

  // SEO
  $("#inSeoTitle").addEventListener("input", () => { state.editor.seo.title = $("#inSeoTitle").value; });
  $("#inSeoDesc").addEventListener("input", () => { state.editor.seo.description = $("#inSeoDesc").value; });
  $("#inOgTitle").addEventListener("input", () => { state.editor.og.title = $("#inOgTitle").value; });
  $("#inOgDesc").addEventListener("input", () => { state.editor.og.description = $("#inOgDesc").value; });
  $("#inOgImage").addEventListener("input", () => { state.editor.og.image = $("#inOgImage").value; });
  $("#btnAutofillSeo").addEventListener("click", () => {
    $("#inSeoTitle").value = state.editor.seo.title = state.editor.seo.title || `${state.editor.title} | Jaziel`;
    $("#inSeoDesc").value = state.editor.seo.description = state.editor.seo.description || state.editor.description;
    $("#inOgTitle").value = state.editor.og.title = state.editor.og.title || state.editor.title;
    $("#inOgDesc").value = state.editor.og.description = state.editor.og.description || state.editor.description;
    toast("SEO fields filled from title/description.", "info");
  });

  // AI
  $("#btnGenerateAI").addEventListener("click", runAIWriter);

  // Top actions
  $("#btnSaveDraft").addEventListener("click", saveDraft);
  $("#btnLoadDraft").addEventListener("click", loadDraft);
  $("#btnClearDraft").addEventListener("click", clearDraft);
  $("#btnPreview").addEventListener("click", () => openPreview(buildArticleFromEditor(false)));
  $("#btnPublish").addEventListener("click", publishEditorArticle);
}

function fillEditorForm() {
  const e = state.editor;
  $("#inTitle").value = e.title || "";
  $("#inSlug").value = e.slug || "";
  $("#inCategory").value = e.category || "";
  $("#inDate").value = e.date || todayISO();
  $("#inReadTime").value = e.readTime || "";
  $("#inDescription").value = e.description || "";
  $("#inDek").value = e.dek || "";
  $("#inIntro").value = e.intro || "";
  $("#inClosing").value = e.closing || "";
  $("#inVerseText").value = (e.bibleVerse && e.bibleVerse.text) || "";
  $("#inVerseRef").value = (e.bibleVerse && e.bibleVerse.reference) || "";
  $("#inFeatured").checked = Boolean(e.featured);
  $("#inCoverUrl").value = /^https?:\/\//.test(e.cover || "") ? e.cover : "";
  $("#inSeoTitle").value = (e.seo && e.seo.title) || "";
  $("#inSeoDesc").value = (e.seo && e.seo.description) || "";
  $("#inOgTitle").value = (e.og && e.og.title) || "";
  $("#inOgDesc").value = (e.og && e.og.description) || "";
  $("#inOgImage").value = (e.og && e.og.image) || "";

  renderSections();
  renderCoverPreview();
  renderBodyImages();
  renderTags();
  renderRelated();
}

function renderSections() {
  const wrap = $("#sectionsList");
  wrap.innerHTML = state.editor.sections.map((s, i) => `
    <div class="repeat-item" data-idx="${i}">
      ${state.editor.sections.length > 1 ? `<button class="btn btn-sm btn-ghost remove-btn" data-remove-section="${i}" type="button">✕</button>` : ""}
      <div class="field"><label>Heading</label><input type="text" data-section-heading="${i}" value="${escapeHTML(s.heading || "")}"></div>
      <div class="field"><label>Paragraphs (one per line)</label><textarea rows="4" data-section-paragraphs="${i}">${escapeHTML((s.paragraphs || []).join("\n"))}</textarea></div>
    </div>
  `).join("");

  $all("[data-section-heading]", wrap).forEach(el => {
    el.addEventListener("input", () => { state.editor.sections[+el.dataset.sectionHeading].heading = el.value; });
  });
  $all("[data-section-paragraphs]", wrap).forEach(el => {
    el.addEventListener("input", () => {
      state.editor.sections[+el.dataset.sectionParagraphs].paragraphs = el.value.split("\n").filter(p => p.trim() !== "");
    });
  });
  $all("[data-remove-section]", wrap).forEach(el => {
    el.addEventListener("click", () => {
      state.editor.sections.splice(+el.dataset.removeSection, 1);
      renderSections();
    });
  });
}

function handleCoverFile(file) {
  if (!file) return;
  try { validateImageFile(file, "Cover image"); } catch (err) { toast(err.message, "error"); return; }
  state.pendingCoverFile = file;
  state.editor.cover = ""; // will be filled in on publish once uploaded
  $("#inCoverUrl").value = "";
  renderCoverPreview(URL.createObjectURL(file));
}

function renderCoverPreview(overrideUrl) {
  const row = $("#coverPreviewRow");
  const url = overrideUrl || (state.editor.cover ? coverUrlFor(state.editor.cover) : "");
  row.innerHTML = url ? `<div class="image-thumb" style="background-image:url('${escapeHTML(url)}')"></div>` : `<p class="muted" style="font-size:.8rem">No cover selected yet.</p>`;
}

function renderBodyImages() {
  const wrap = $("#bodyImagesList");
  wrap.innerHTML = state.editor.images.map((img, i) => `
    <div class="repeat-item" data-idx="${i}">
      <button class="btn btn-sm btn-ghost remove-btn" data-remove-image="${i}" type="button">✕</button>
      <div class="field"><label>Image</label>
        <input type="file" accept="image/*" data-image-file="${i}">
        <p class="hint">or URL:</p>
        <input type="url" data-image-url="${i}" value="${escapeHTML(typeof img === "string" ? img : img.src || "")}" placeholder="https://…">
      </div>
      <div class="field"><label>Alt text</label><input type="text" data-image-alt="${i}" value="${escapeHTML(img.alt || "")}"></div>
      <div class="field"><label>Caption</label><input type="text" data-image-caption="${i}" value="${escapeHTML(img.caption || "")}"></div>
    </div>
  `).join("");

  $all("[data-image-file]", wrap).forEach(el => {
    el.addEventListener("change", () => {
      const idx = +el.dataset.imageFile;
      const file = el.files[0];
      if (!file) return;
      try { validateImageFile(file, "Body image " + (idx + 1)); } catch (err) { el.value = ""; toast(err.message, "error"); return; }
      state.pendingBodyImageFiles[idx] = file;
      state.editor.images[idx].src = "";
    });
  });
  $all("[data-image-url]", wrap).forEach(el => {
    el.addEventListener("input", () => {
      const idx = +el.dataset.imageUrl;
      const value = el.value.trim();
      el.setCustomValidity(value && !isValidImageUrl(value) ? "Use a valid http(s) image URL." : "");
      state.editor.images[idx].src = value;
      delete state.pendingBodyImageFiles[idx];
    });
  });
  $all("[data-image-alt]", wrap).forEach(el => {
    el.addEventListener("input", () => { state.editor.images[+el.dataset.imageAlt].alt = el.value; });
  });
  $all("[data-image-caption]", wrap).forEach(el => {
    el.addEventListener("input", () => { state.editor.images[+el.dataset.imageCaption].caption = el.value; });
  });
  $all("[data-remove-image]", wrap).forEach(el => {
    el.addEventListener("click", () => {
      const idx = +el.dataset.removeImage;
      state.editor.images.splice(idx, 1);

      // state.pendingBodyImageFiles maps editor array-index -> staged File.
      // Removing a row shifts every later row down by one, so any staged
      // file at an index above idx must be re-keyed to idx-1, or a body
      // image picked for a later row silently stops lining up with its
      // row (and either gets uploaded to the wrong slot or dropped) once
      // publishEditorArticle() walks this object by index.
      const reindexed = {};
      Object.entries(state.pendingBodyImageFiles).forEach(([key, file]) => {
        const k = +key;
        if (k < idx) reindexed[k] = file;
        else if (k > idx) reindexed[k - 1] = file;
        // k === idx: that row (and its staged file) was just removed.
      });
      state.pendingBodyImageFiles = reindexed;

      renderBodyImages();
    });
  });
}

function renderTags() {
  const row = $("#tagsRow");
  const input = $("#tagInput");
  row.querySelectorAll(".tag-pill").forEach(el => el.remove());
  state.editor.tags.forEach((tag, i) => {
    const pill = document.createElement("span");
    pill.className = "tag-pill";
    pill.innerHTML = `${escapeHTML(tag)} <button type="button" data-remove-tag="${i}">✕</button>`;
    row.insertBefore(pill, input);
  });
  $all("[data-remove-tag]", row).forEach(btn => {
    btn.addEventListener("click", () => {
      state.editor.tags.splice(+btn.dataset.removeTag, 1);
      renderTags();
    });
  });
}

function renderRelated() {
  const wrap = $("#relatedList");
  if (!state.editor.relatedArticles.length) {
    wrap.innerHTML = `<p class="muted" style="font-size:.85rem">No related articles selected yet.</p>`;
    return;
  }
  wrap.innerHTML = state.editor.relatedArticles.map((r, i) => `
    <span class="tag-pill">${escapeHTML(r.title)} <button type="button" data-remove-related="${i}">✕</button></span>
  `).join(" ");
  $all("[data-remove-related]", wrap).forEach(btn => {
    btn.addEventListener("click", () => {
      state.editor.relatedArticles.splice(+btn.dataset.removeRelated, 1);
      renderRelated();
    });
  });
}

/* ---------- Drafts (localStorage, browser-only) ---------- */

function draftKeyFor() {
  return state.editorMode === "new" ? "new" : (state.editorOriginalSlug || "new");
}

function loadAllDrafts() {
  try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) || "{}"); } catch { return {}; }
}

function saveDraft() {
  const drafts = loadAllDrafts();
  drafts[draftKeyFor()] = { editor: state.editor, savedAt: new Date().toISOString() };
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  toast("Draft saved in this browser (not published).", "success");
}

function loadDraft() {
  const drafts = loadAllDrafts();
  const draft = drafts[draftKeyFor()];
  if (!draft) { toast("No draft found for this article.", "error"); return; }
  state.editor = draft.editor;
  fillEditorForm();
  toast(`Draft loaded (saved ${new Date(draft.savedAt).toLocaleString()}).`, "info");
}

function clearDraft() {
  const drafts = loadAllDrafts();
  delete drafts[draftKeyFor()];
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  toast("Draft cleared.", "info");
}

/* ---------- Validation ---------- */

function validateEditor() {
  const e = state.editor;
  const errors = {};

  if (!e.title || !e.title.trim()) errors.title = "Title is required.";
  if (!e.slug || !e.slug.trim()) errors.slug = "Slug is required.";
  else if (e.slug === "new") errors.slug = "The slug \"new\" is reserved for the new-article editor route.";
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.slug)) errors.slug = "Slug must be lowercase letters, numbers, and hyphens only.";
  else {
    const clash = state.articles.find(a => a.slug === e.slug && a.id !== state.editorOriginalId);
    if (clash) errors.slug = "This slug is already used by another article.";
  }
  if (!e.category || !e.category.trim()) errors.category = "Category is required.";
  if (!e.date || Number.isNaN(new Date(e.date).getTime())) errors.date = "A valid date is required.";
  if (!e.description || !e.description.trim()) errors.description = "Description is required.";
  if (!e.intro || !e.intro.trim()) errors.intro = "Intro is required.";
  const hasSection = (e.sections || []).some(s => (s.heading && s.heading.trim()) || (s.paragraphs || []).some(p => p.trim()));
  if (!hasSection) errors.sections = "At least one section with content is required.";

  return errors;
}

function showValidationErrors(errors) {
  $all(".field.has-error").forEach(f => f.classList.remove("has-error"));
  $all(".field-error.js-error").forEach(f => f.remove());

  const map = { title: "f-title", slug: "f-slug", category: "f-category", date: "f-date", description: "f-description", intro: "f-intro" };
  Object.entries(errors).forEach(([key, msg]) => {
    const fieldId = map[key];
    if (!fieldId) return;
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.add("has-error");
    const p = document.createElement("p");
    p.className = "field-error js-error";
    p.textContent = msg;
    field.appendChild(p);
  });
}

/* ---------- Build final article object ---------- */

function buildArticleFromEditor(forPublish) {
  const e = state.editor;
  return {
    id: e.id || (state.editorMode === "edit" ? state.editorOriginalId : nextArticleId(state.articles)),
    title: e.title.trim(),
    slug: e.slug.trim(),
    description: e.description.trim(),
    category: e.category.trim(),
    date: e.date,
    readTime: e.readTime.trim(),
    dek: e.dek.trim(),
    cover: e.cover || "",
    intro: e.intro.trim(),
    sections: (e.sections || []).filter(s => (s.heading && s.heading.trim()) || (s.paragraphs || []).length),
    images: (e.images || []).filter(img => (typeof img === "string" ? img : img.src)),
    bibleVerse: (e.bibleVerse && (e.bibleVerse.text || e.bibleVerse.reference)) ? e.bibleVerse : undefined,
    closing: e.closing.trim(),
    seo: { title: (e.seo && e.seo.title) || "", description: (e.seo && e.seo.description) || "" },
    og: { title: (e.og && e.og.title) || "", description: (e.og && e.og.description) || "", image: (e.og && e.og.image) || e.cover || "" },
    tags: e.tags || [],
    relatedArticles: (e.relatedArticles || []).map(r => r.slug || r),
    featured: Boolean(e.featured)
  };
}

/* ---------- Publish ---------- */

async function publishEditorArticle() {
  const errors = validateEditor();
  showValidationErrors(errors);
  if (Object.keys(errors).length) {
    toast("Please fix the highlighted fields before publishing.", "error");
    return;
  }
  if (!state.token) {
    toast("A GitHub token with Contents write access is required to publish. Add one in Settings.", "error");
    return;
  }

  const publishBtn = $("#btnPublish");
  publishBtn.disabled = true;
  publishBtn.innerHTML = `<span class="spinner"></span> Publishing…`;

  try {
    const slug = state.editor.slug.trim();
    const title = state.editor.title.trim();
    const uploadedImagePaths = [];

    // Upload cover if a new file was selected. This runs BEFORE
    // buildArticleFromEditor() and writes the final path back onto
    // state.editor.cover, so the built article already has the real path.
    if (state.pendingCoverFile) {
      const ext = safeExt(state.pendingCoverFile.name);
      const candidatePath = `${IMAGES_DIR}/${slug}-cover.${ext}`;
      const path = uniqueUploadPath(candidatePath, state.editorOriginalId);
      const b64 = await fileToBase64(state.pendingCoverFile);
      const existing = await ghGetFile(path, { binary: true });
      await ghPutFile(path, b64, `Admin: upload cover image for "${title}"`, existing ? existing.sha : undefined);
      uploadedImagePaths.push(path);
      state.editor.cover = path;
    }

    // Upload body images. This runs BEFORE buildArticleFromEditor() and
    // writes each uploaded file's real GitHub path onto
    // state.editor.images[idx].src (using the editor's own indices, which
    // stay aligned with pendingBodyImageFiles).
    const pendingEntries = Object.entries(state.pendingBodyImageFiles);
    console.log(`[publish] ${pendingEntries.length} staged body image file(s) at publish time:`,
      pendingEntries.map(([idxStr]) => +idxStr));

    for (const [idxStr, file] of pendingEntries) {
      const idx = +idxStr;
      if (!state.editor.images[idx]) {
        console.warn(`[publish] pendingBodyImageFiles had a file for index ${idx}, but state.editor.images[${idx}] does not exist — skipping (index likely went stale after an image row was removed before publishing).`);
        continue;
      }
      try {
        const ext = safeExt(file.name);
        const candidatePath = `${IMAGES_DIR}/${slug}-${idx + 1}.${ext}`;
        const path = uniqueUploadPath(candidatePath, state.editorOriginalId);
        const b64 = await fileToBase64(file);
        const existing = await ghGetFile(path, { binary: true });
        await ghPutFile(path, b64, `Admin: upload image ${idx + 1} for "${title}"`, existing ? existing.sha : undefined);
        uploadedImagePaths.push(path);
        state.editor.images[idx].src = path;
        console.log(`[publish] body image ${idx} uploaded ->`, path);
      } catch (imgErr) {
        // Re-throw with a specific message so this failure is distinguishable
        // from a cover-upload or articles.json-save failure in the toast, and
        // so it's obvious in the console which image and which GitHub call
        // failed instead of the publish just silently leaving articles.json
        // unchanged with images: [].
        throw new Error(`Body image ${idx + 1} upload failed: ${imgErr.message}`);
      }
    }
    // Every staged file has now been uploaded and written back onto
    // state.editor.images; nothing should still be pending.
    state.pendingBodyImageFiles = {};

    const previousArticle = state.editorMode === "edit"
      ? state.articles.find(a => a.id === state.editorOriginalId)
      : null;

    const article = buildArticleFromEditor(true);

    // Explicitly (re)build article.images straight from state.editor.images
    // rather than trusting buildArticleFromEditor()'s internal filter alone.
    // This is the exact array that gets written into articles.json, so we
    // guarantee here — at the last possible point before saving — that any
    // image with a real src (just-uploaded file, or a manually typed URL)
    // is included with its src/alt/caption intact, and that article.images
    // can never silently come back empty while state.editor.images has a
    // valid uploaded image sitting in it.
    article.images = (state.editor.images || [])
      .filter(img => (typeof img === "string" ? img : img && img.src))
      .map(img => (typeof img === "string"
        ? { src: img, alt: "", caption: "" }
        : { src: img.src, alt: img.alt || "", caption: img.caption || "" }));
    console.log(`[publish] article.images about to be saved (${article.images.length}):`, article.images);

    if (!article.og.image && article.cover) article.og.image = article.cover;

    // Merge into the article list
    let nextArticles;
    if (state.editorMode === "new") {
      nextArticles = [...state.articles, article];
    } else {
      nextArticles = state.articles.map(a => a.id === state.editorOriginalId ? article : a);
    }

    await saveArticlesArray(nextArticles, `Admin: ${state.editorMode === "new" ? "publish" : "update"} article "${article.title}"`);

    // CRUD cleanup: remove replaced images after an edit
    if (previousArticle) {
      await removeOrphanedImages(previousArticle, nextArticles);
    }

    clearDraft();
    toast("Published. It may take up to a minute to appear on GitHub Pages.", "success");
    window.location.hash = `#/editor/${encodeURIComponent(article.slug)}`;
  } catch (err) {
    console.error(err);
    const referenced = new Set();
    state.articles.forEach(a => {
      if (a.cover) referenced.add(a.cover);
      (a.images || []).forEach(img => { const src = typeof img === "string" ? img : img && img.src; if (src) referenced.add(src); });
    });
    for (const path of uploadedImagePaths || []) {
      if (referenced.has(path)) continue;
      try { const file = await ghGetFile(path, { binary: true }); if (file) await ghDeleteFile(path, file.sha, "Admin: rollback failed image upload"); }
      catch (cleanupErr) { console.warn("Could not roll back uploaded image", path, cleanupErr); }
    }
    toast(`Publishing failed. Please try again. (${err.message})`, "error");
  } finally {
    publishBtn.disabled = false;
    publishBtn.innerHTML = "🚀 Publish";
  }
}

/* ---------- Preview ---------- */

function openPreview(article) {
  const modal = $("#previewModal");
  const root = $("#previewRoot");
  if (!modal || !root) return;

  root.innerHTML = articlePreviewHTML(article);
  modal.hidden = false;
  modal.style.display = "";
  modal.setAttribute("aria-hidden", "false");
}

function articlePreviewHTML(article) {
  const meta = [article.readTime, formatDate(article.date)].filter(Boolean).join(" · ");
  const dek = article.dek || article.description || "";
  const coverHTML = article.cover
    ? `<div class="article-cover"><img src="${escapeHTML(coverUrlFor(article.cover))}" alt="${escapeHTML(article.title || "")}"></div>`
    : "";
  const sectionsHTML = (article.sections || []).map(s => `
    ${s.heading ? `<h2>${escapeHTML(s.heading)}</h2>` : ""}
    ${(s.paragraphs || []).map(p => `<p>${escapeHTML(p)}</p>`).join("")}
  `).join("");
  const imagesHTML = (article.images || []).map(img => {
    const src = typeof img === "string" ? img : img.src;
    if (!src) return "";
    return `<figure class="article-figure"><img src="${escapeHTML(coverUrlFor(src))}" alt="${escapeHTML(img.alt || "")}">${img.caption ? `<figcaption>${escapeHTML(img.caption)}</figcaption>` : ""}</figure>`;
  }).join("");
  const verseHTML = article.bibleVerse && article.bibleVerse.text
    ? `<blockquote class="verse-block"><p>${escapeHTML(article.bibleVerse.text)}</p>${article.bibleVerse.reference ? `<cite>${escapeHTML(article.bibleVerse.reference)}</cite>` : ""}</blockquote>`
    : "";
  const tagsHTML = (article.tags || []).length
    ? `<div class="tag-list">${article.tags.map(t => `<span class="tag-chip">#${escapeHTML(t)}</span>`).join("")}</div>`
    : "";

  return `
    <article class="article">
      ${article.category ? `<span class="story-category">${escapeHTML(article.category)}</span>` : ""}
      <h1 class="article-title">${escapeHTML(article.title || "")}</h1>
      ${dek ? `<p class="article-dek">${escapeHTML(dek)}</p>` : ""}
      <div class="story-meta">${escapeHTML(meta)}</div>
      ${coverHTML}
      <div class="article-body">
        ${article.intro ? `<p>${escapeHTML(article.intro)}</p>` : ""}
        ${sectionsHTML}
        ${imagesHTML}
        ${verseHTML}
        ${article.closing ? `<p class="article-closing">${escapeHTML(article.closing)}</p>` : ""}
      </div>
      ${tagsHTML}
    </article>
  `;
}

/* =========================================================
   AI WRITER (Gemini via GitHub Actions)
   ========================================================= */

async function runAIWriter() {
  const rawText = $("#aiRawText").value.trim();
  if (!rawText) { toast("Paste some raw article text first.", "error"); return; }
  if (!state.token) { toast("A GitHub token with Actions write access is required for the AI Writer. Add one in Settings.", "error"); return; }

  const statusBox = $("#aiStatusBox");
  statusBox.hidden = false;
  statusBox.innerHTML = `<span class="spinner"></span> Submitting request to GitHub Actions…`;

  const requestId = uid("req");
  const request = {
    rawText,
    titleHint: $("#aiTitleHint").value.trim(),
    categoryHint: $("#aiCategoryHint").value.trim(),
    instructions: $("#aiInstructions").value.trim(),
    createdAt: new Date().toISOString()
  };

  try {
    await ghPutFile(
      `${AI_REQUEST_DIR}/${requestId}.json`,
      utf8ToB64(JSON.stringify(request, null, 2)),
      `Admin: AI Writer request ${requestId}`
    );
    await ghTriggerWorkflow(AI_WORKFLOW_FILE, { request_id: requestId });
  } catch (err) {
    statusBox.innerHTML = `<span class="field-error">Could not start the AI Writer: ${escapeHTML(err.message)}</span>`;
    return;
  }

  statusBox.innerHTML = `<span class="spinner"></span> Gemini is writing your article via GitHub Actions… this usually takes 20–60 seconds. You can check the Actions tab in your repository for live progress.`;
  pollAIResult(requestId, 0);
}

async function pollAIResult(requestId, attempt) {
  const statusBox = $("#aiStatusBox");
  const maxAttempts = 24; // ~2 minutes at 5s intervals

  if (attempt >= maxAttempts) {
    statusBox.innerHTML = `<span class="field-error">The AI Writer is taking longer than expected. Check the Actions tab in your GitHub repository — the result will still be written to <code>${AI_RESULT_DIR}/${requestId}.json</code> once it finishes, and you can paste it in manually if needed.</span>`;
    return;
  }

  try {
    const errFile = await ghGetFile(`${AI_RESULT_DIR}/${requestId}.error.json`);
    if (errFile) {
      const errData = JSON.parse(errFile.text);
      statusBox.innerHTML = `<span class="field-error">AI Writer failed: ${escapeHTML(errData.message || "Unknown error")}</span>`;
      return;
    }

    const resultFile = await ghGetFile(`${AI_RESULT_DIR}/${requestId}.json`);
    if (resultFile) {
      const data = JSON.parse(resultFile.text);
      applyAIResultToEditor(data);
      statusBox.innerHTML = `<span style="color:var(--success)">✓ Draft generated. Review the Content, Tags, and SEO tabs — nothing has been published yet.</span>`;
      return;
    }
  } catch (err) {
    console.warn("AI poll error", err);
  }

  setTimeout(() => pollAIResult(requestId, attempt + 1), 5000);
}

function applyAIResultToEditor(data) {
  const e = state.editor;
  if (data.title && !e.title) { e.title = data.title; }
  if (data.title) $("#inTitle").value = e.title = e.title || data.title;
  if (data.description) $("#inDescription").value = e.description = data.description;
  if (data.dek) $("#inDek").value = e.dek = data.dek;
  if (data.intro) $("#inIntro").value = e.intro = data.intro;
  if (data.closing) $("#inClosing").value = e.closing = data.closing;
  if (Array.isArray(data.sections) && data.sections.length) {
    e.sections = data.sections.map(s => ({ heading: s.heading || "", paragraphs: Array.isArray(s.paragraphs) ? s.paragraphs : [] }));
    renderSections();
  }
  if (Array.isArray(data.tags) && data.tags.length) {
    e.tags = [...new Set([...(e.tags || []), ...data.tags])];
    renderTags();
  }
  if (data.seoTitle) $("#inSeoTitle").value = e.seo.title = data.seoTitle;
  if (data.seoDescription) $("#inSeoDesc").value = e.seo.description = data.seoDescription;

  // Automatically keep Open Graph metadata in sync with the AI-generated
  // SEO metadata. Only fill empty OG fields so a manually entered value
  // is never overwritten.
  if (!e.og.title) {
    e.og.title = e.seo.title || e.title || "";
    $("#inOgTitle").value = e.og.title;
  }
  if (!e.og.description) {
    e.og.description = e.seo.description || e.description || "";
    $("#inOgDesc").value = e.og.description;
  }
  if (!e.og.image && e.cover) {
    e.og.image = e.cover;
    $("#inOgImage").value = e.og.image;
  }

  // Read time is computed deterministically by the workflow from the
  // generated content's length — only fill it in if the admin hasn't
  // already typed one in manually.
  if (data.readTime && !e.readTime) { $("#inReadTime").value = e.readTime = data.readTime; }

  // A Bible verse is only present in the AI result when it's genuinely
  // warranted (see the AI Writer prompt) — never overwrite one the admin
  // already entered by hand.
  const hasExistingVerse = e.bibleVerse && (e.bibleVerse.text || e.bibleVerse.reference);
  if (data.bibleVerse && data.bibleVerse.text && !hasExistingVerse) {
    e.bibleVerse = { text: data.bibleVerse.text || "", reference: data.bibleVerse.reference || "" };
    $("#inVerseText").value = e.bibleVerse.text;
    $("#inVerseRef").value = e.bibleVerse.reference;
  }

  if (!e.slug) {
    const slug = slugify(e.title);
    $("#inSlug").value = slug;
    e.slug = slug;
  }
}

/* =========================================================
   SETTINGS VIEW
   ========================================================= */

function renderSettings(root) {
  root.innerHTML = `
    <div class="admin-page-title"><h1>Settings</h1></div>

    <div class="panel">
      <h2 class="mt-0">Repository</h2>
      <div class="field-row">
        <div class="field"><label>Owner</label><input type="text" id="setOwner" value="${escapeHTML(state.settings.owner)}"></div>
        <div class="field"><label>Repository</label><input type="text" id="setRepo" value="${escapeHTML(state.settings.repo)}"></div>
        <div class="field"><label>Branch</label><input type="text" id="setBranch" value="${escapeHTML(state.settings.branch)}"></div>
      </div>
      <div class="field"><label>Live site URL</label><input type="url" id="setSiteUrl" value="${escapeHTML(state.settings.siteUrl)}"></div>
      <button class="btn" id="btnSaveSettings" type="button">Save</button>
    </div>

    <div class="panel">
      <h2 class="mt-0">GitHub Access Token</h2>
      <p class="muted">Needed to publish, edit, delete articles, or run the AI Writer. Create a
      <strong>fine-grained personal access token</strong> scoped only to this repository with:
      <code>Contents: Read and write</code> and <code>Actions: Read and write</code>.
      Without a token the panel still works for browsing (read-only).</p>
      <div class="field"><label>Personal Access Token</label><input type="password" id="setToken" value="${escapeHTML(state.token)}" placeholder="github_pat_…"></div>
      <div class="checkbox-row">
        <input type="checkbox" id="setTokenPersist" ${sessionStorage.getItem(TOKEN_SESSION_KEY) ? "checked" : ""}>
        <label for="setTokenPersist" style="margin:0">Keep this token for the rest of this browser tab session (sessionStorage)</label>
      </div>
      <p class="hint">The token is <strong>never</strong> written to source files, articles.json, or localStorage. It is held only in this
      tab's memory (or sessionStorage if you check the box above), and is gone the moment you close the tab.</p>
      <div class="btn-row">
        <button class="btn" id="btnSaveToken" type="button">Save Token</button>
        <button class="btn btn-ghost" id="btnTestConnection" type="button">Test Connection</button>
        <button class="btn btn-danger" id="btnClearToken" type="button">Clear Token</button>
      </div>
      <div id="connResult" style="margin-top:10px"></div>
    </div>
  `;

  $("#btnSaveSettings").addEventListener("click", () => {
    state.settings.owner = $("#setOwner").value.trim() || DEFAULT_SETTINGS.owner;
    state.settings.repo = $("#setRepo").value.trim() || DEFAULT_SETTINGS.repo;
    state.settings.branch = $("#setBranch").value.trim() || DEFAULT_SETTINGS.branch;
    state.settings.siteUrl = $("#setSiteUrl").value.trim() || DEFAULT_SETTINGS.siteUrl;
    saveSettings();
    updateConnBadge();
    toast("Settings saved.", "success");
  });

  $("#btnSaveToken").addEventListener("click", () => {
    state.token = $("#setToken").value.trim();
    if ($("#setTokenPersist").checked && state.token) {
      sessionStorage.setItem(TOKEN_SESSION_KEY, state.token);
    } else {
      sessionStorage.removeItem(TOKEN_SESSION_KEY);
    }
    updateConnBadge();
    toast("Token set for this session.", "success");
  });

  $("#btnClearToken").addEventListener("click", () => {
    state.token = "";
    sessionStorage.removeItem(TOKEN_SESSION_KEY);
    $("#setToken").value = "";
    updateConnBadge();
    toast("Token cleared.", "info");
  });

  $("#btnTestConnection").addEventListener("click", async () => {
    const el = $("#connResult");
    el.innerHTML = `<span class="spinner"></span> Testing…`;
    try {
      const repoData = await testConnection();
      el.innerHTML = `<span style="color:var(--success)">✓ Connected to ${escapeHTML(repoData.full_name)} (default branch: ${escapeHTML(repoData.default_branch)})</span>`;
    } catch (err) {
      el.innerHTML = `<span class="field-error">${escapeHTML(err.message)}</span>`;
    }
  });
}

/* =========================================================
   HELP VIEW
   ========================================================= */

function renderHelp(root) {
  root.innerHTML = `
    <div class="admin-page-title"><h1>Help &amp; Limitations</h1></div>

    <div class="panel">
      <h2 class="mt-0">How publishing actually works</h2>
      <p>This admin panel is a static page — it has no server of its own. When you click Publish, it calls the
      GitHub REST API directly from your browser using the personal access token you provide in Settings, and commits
      the updated <code>articles.json</code> (and any uploaded images) straight to this repository. If that commit
      doesn't happen, nothing is published — you will see an error rather than a false success message.</p>
    </div>

    <div class="panel">
      <h2 class="mt-0">How the AI Writer works</h2>
      <p>Your Gemini API key is stored only as a GitHub Actions secret (<code>GEMINI_API_KEY</code>) and is never present
      in this panel's code or in your browser. When you click "Generate with Gemini," the panel commits your raw text to
      <code>${AI_REQUEST_DIR}/</code> and triggers the <code>ai-writer.yml</code> workflow. That workflow runs on GitHub's
      servers, calls Gemini with the secret key, and writes the structured result to <code>${AI_RESULT_DIR}/</code>, which
      this panel then polls for and loads into the editor for your review.</p>
    </div>

    <div class="panel">
      <h2 class="mt-0">Honest limitations</h2>
      <ul>
        <li>This is <strong>not</strong> real authentication. Anyone who obtains your token can write to the repository. Use a
        fine-grained token scoped to only this repository, and don't share this panel's URL with your token pre-filled.</li>
        <li>Unauthenticated (no token) usage is read-only and limited to about 60 GitHub API requests/hour; with a token, 5,000/hour.</li>
        <li>Draft Save/Load/Clear uses your browser's localStorage only — it is not backed up anywhere and is not "published."</li>
        <li>Image deletion is best-effort: an image is only removed from the repository when no other article references it.</li>
        <li>AI-generated content is always a draft for you to review — it is never published automatically.</li>
      </ul>
    </div>
  `;
}

})();