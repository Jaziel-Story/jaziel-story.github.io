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

const SETTINGS_KEY = "jaziel_admin_settings_v1";
const TOKEN_SESSION_KEY = "jaziel_admin_token_v1";
const DRAFTS_KEY = "jaziel_admin_drafts_v1";

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

const state = {
  settings: loadSettings(),
  token: sessionStorage.getItem(TOKEN_SESSION_KEY) || "",
  articles: [],
  articlesSha: null,
  articlesLoaded: false,
  categories: [],
  editor: null,
  editorMode: null,
  editorOriginalSlug: null,
  editorOriginalId: null,
  pendingCoverFile: null,
  pendingBodyImageFiles: {},
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
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); }
function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return [...root.querySelectorAll(sel)]; }
function escapeHTML(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;"); }
function slugify(text) { return String(text || "").toLowerCase().trim().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); }
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function formatDate(dateString) { if (!dateString) return ""; const date = new Date(`${dateString}T00:00:00`); if (Number.isNaN(date.getTime())) return dateString; return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function uid(prefix = "id") { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
function utf8ToB64(str) { const bytes = new TextEncoder().encode(str); let binary = ""; const chunk = 0x8000; for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk)); return btoa(binary); }
function b64ToUtf8(b64) { const binary = atob(String(b64 || "").replace(/\n/g, "")); const bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i); return new TextDecoder().decode(bytes); }
function fileToBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => { const result = String(reader.result || ""); const comma = result.indexOf(","); resolve(comma >= 0 ? result.slice(comma + 1) : result); }; reader.onerror = () => reject(new Error("Could not read file")); reader.readAsDataURL(file); }); }
function safeExt(filename) { const m = /\.([a-zA-Z0-9]+)$/.exec(filename || ""); const ext = m ? m[1].toLowerCase() : "jpg"; return /^(jpg|jpeg|png|webp|gif)$/.test(ext) ? ext : "jpg"; }
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
function validateImageFile(file, label = "Image") { if (!file) throw new Error(label + " file is missing."); if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error(label + " must be JPG, PNG, WebP, or GIF."); if (file.size > MAX_IMAGE_BYTES) throw new Error(label + " is too large. Maximum size is 10 MB."); return true; }
function isValidImageUrl(value) { try { const url = new URL(String(value || "").trim()); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; } }
function imagePathUsedByOtherArticle(path, currentArticleId) { return state.articles.some(article => { if (!article || article.id === currentArticleId) return false; if (article.cover === path) return true; return (article.images || []).some(img => (typeof img === "string" ? img : img && img.src) === path); }); }
function uniqueUploadPath(basePath, currentArticleId) { if (!imagePathUsedByOtherArticle(basePath, currentArticleId)) return basePath; const dot = basePath.lastIndexOf("."); const stem = dot >= 0 ? basePath.slice(0, dot) : basePath; const ext = dot >= 0 ? basePath.slice(dot) : ""; return stem + "-" + Date.now() + ext; }
function toast(message, type = "info") { const root = $("#toastRoot"); const el = document.createElement("div"); el.className = `toast${type === "error" ? " toast-error" : type === "success" ? " toast-success" : ""}`; el.textContent = message; root.appendChild(el); setTimeout(() => el.remove(), 5000); }
function confirmDialog(message) { return new Promise(resolve => { const modal = $("#confirmModal"); $("#confirmMessage").textContent = message; modal.hidden = false; modal.style.display = "flex"; modal.setAttribute("aria-hidden", "false"); const cleanup = result => { modal.hidden = true; modal.style.display = "none"; modal.setAttribute("aria-hidden", "true"); okBtn.removeEventListener("click", onOk); cancelBtn.removeEventListener("click", onCancel); resolve(result); }; const okBtn = $("#confirmOk"); const cancelBtn = $("#confirmCancel"); const onOk = () => cleanup(true); const onCancel = () => cleanup(false); okBtn.addEventListener("click", onOk); cancelBtn.addEventListener("click", onCancel); }); }

function apiBase() { return `https://api.github.com/repos/${state.settings.owner}/${state.settings.repo}`; }
function ghHeaders(extra = {}) { const headers = { "Accept": "application/vnd.github+json", ...extra }; if (state.token) headers["Authorization"] = `Bearer ${state.token}`; return headers; }
async function ghRequest(path, opts = {}) { return fetch(`${apiBase()}${path}`, { ...opts, headers: ghHeaders(opts.headers) }); }
async function ghGetFile(path, { binary = false } = {}) { const res = await ghRequest(`/contents/${path}?ref=${encodeURIComponent(state.settings.branch)}&t=${Date.now()}`); if (res.status === 404) return null; if (!res.ok) throw new Error(`GitHub read failed for ${path} (${res.status})`); const data = await res.json(); return { sha: data.sha, base64: data.content, text: binary ? null : b64ToUtf8((data.content || "").replace(/\n/g, "")) }; }
async function ghPutFile(path, base64Content, message, sha) { const body = { message, content: base64Content, branch: state.settings.branch }; if (sha) body.sha = sha; const res = await ghRequest(`/contents/${path}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); if (!res.ok) { const detail = await safeErrorText(res); throw new Error(`GitHub write failed for ${path} (${res.status}): ${detail}`); } return res.json(); }
async function ghDeleteFile(path, sha, message) { const res = await ghRequest(`/contents/${path}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, sha, branch: state.settings.branch }) }); return res.ok; }
async function ghTriggerWorkflow(workflowFile, inputs) { const res = await ghRequest(`/actions/workflows/${workflowFile}/dispatches`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref: state.settings.branch, inputs }) }); if (!res.ok) { const detail = await safeErrorText(res); throw new Error(`Could not start the AI Writer workflow (${res.status}): ${detail}`); } return true; }
async function safeErrorText(res) { try { const j = await res.json(); return j.message || JSON.stringify(j); } catch { return res.statusText; } }
async function testConnection() { const res = await ghRequest(""); if (!res.ok) throw new Error(`Repository not reachable (${res.status})`); return res.json(); }

async function loadArticlesFresh() { const file = await ghGetFile(ARTICLES_PATH); if (!file) throw new Error("articles.json was not found in the repository."); let parsed; try { parsed = JSON.parse(file.text); } catch { throw new Error("articles.json is not valid JSON."); } state.articles = Array.isArray(parsed.articles) ? parsed.articles : []; state.articlesSha = file.sha; state.articlesLoaded = true; state.categories = uniqueCategories(state.articles); return state.articles; }
function uniqueCategories(articles) { return [...new Set(articles.map(a => a.category).filter(Boolean))].sort(); }
async function saveArticlesArray(newArray, commitMessage) {
  if (!state.articlesLoaded || !state.articlesSha) throw new Error("Articles are not loaded. Reload the admin panel before publishing.");
  const baselineSha = state.articlesSha;
  const latest = await ghGetFile(ARTICLES_PATH);
  if (!latest) throw new Error("articles.json could not be found — refusing to publish.");
  if (latest.sha !== baselineSha) throw new Error("Publish conflict: articles.json changed elsewhere after this editor loaded it. Reload the Articles list, reopen the article, and publish again so no newer changes are overwritten.");
  const payload = { articles: newArray };
  const contentStr = JSON.stringify(payload, null, 2) + "\n";
  const result = await ghPutFile(ARTICLES_PATH, utf8ToB64(contentStr), commitMessage, latest.sha);
  state.articles = newArray;
  state.articlesSha = result.content ? result.content.sha : null;
  state.categories = uniqueCategories(newArray);
  return result;
}
function nextArticleId(articles) { let max = 0; for (const a of articles) { const m = /^story-(\d+)$/.exec(a.id || ""); if (m) max = Math.max(max, parseInt(m[1], 10)); } return `story-${String(max + 1).padStart(3, "0")}`; }
function findRelatedSuggestions(articles, current, limit = 6) { const currentTags = new Set(current.tags || []); return articles.filter(a => a.id !== current.id).map(a => { let score = 0; if (a.category && current.category && a.category === current.category) score += 2; if (Array.isArray(a.tags)) score += a.tags.filter(t => currentTags.has(t)).length; return { article: a, score }; }).filter(e => e.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(e => e.article); }

function currentRoute() { const hash = window.location.hash.replace(/^#\/?/, ""); const parts = hash.split("/").filter(Boolean); return { view: parts[0] || "dashboard", params: parts.slice(1) }; }
window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", () => { setupChrome(); render(); });
function setupChrome() {
  const menuToggle = $("#menuToggle"); const sidebar = $("#sidebar");
  if (menuToggle && sidebar) menuToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
  $all(".admin-sidebar a").forEach(a => a.addEventListener("click", () => { if (sidebar) sidebar.classList.remove("open"); }));
  const previewModal = $("#previewModal"); if (previewModal) { previewModal.hidden = true; previewModal.style.display = "none"; previewModal.setAttribute("aria-hidden", "true"); }
  document.addEventListener("click", event => { const closeButton = event.target.closest("#previewClose"); if (closeButton) { event.preventDefault(); event.stopPropagation(); closePreview(); return; } const modal = $("#previewModal"); if (modal && event.target === modal) closePreview(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closePreview(); });
  const confirmModal = $("#confirmModal"); if (confirmModal) { confirmModal.hidden = true; confirmModal.style.display = "none"; confirmModal.setAttribute("aria-hidden", "true"); }
  updateConnBadge();
}
function closePreview() { const modal = $("#previewModal"); if (!modal) return; modal.hidden = true; modal.style.display = "none"; modal.setAttribute("aria-hidden", "true"); }
function updateConnBadge() { const badge = $("#connBadge"); const configured = Boolean(state.settings.owner && state.settings.repo); const hasToken = Boolean(state.token); badge.textContent = !configured ? "Repository not set" : hasToken ? `${state.settings.owner}/${state.settings.repo} · token active` : `${state.settings.owner}/${state.settings.repo} · read-only`; badge.classList.toggle("is-connected", hasToken); }
function setActiveNav(view) { $all(".admin-sidebar a").forEach(a => a.classList.toggle("active", a.dataset.nav === view)); }
async function render() { const { view, params } = currentRoute(); setActiveNav(view === "editor" ? "editor" : view); const root = $("#view"); try { if (view === "dashboard") return renderDashboard(root); if (view === "articles") return renderArticlesList(root); if (view === "search") return renderArticlesList(root, { focusSearch: true }); if (view === "editor") return renderEditor(root, params[0] || "new"); if (view === "settings") return renderSettings(root); if (view === "help") return renderHelp(root); root.innerHTML = `<p class="empty-state">Unknown view.</p>`; } catch (err) { console.error(err); root.innerHTML = `<div class="panel"><p class="field-error">${escapeHTML(err.message || String(err))}</p></div>`; } }

async function renderDashboard(root) { root.innerHTML = `<p class="loading-text">Loading dashboard…</p>`; if (!state.settings.owner || !state.settings.repo) { root.innerHTML = emptySettingsNotice(); return; } try { await loadArticlesFresh(); } catch (err) { root.innerHTML = `<div class="admin-page-title"><h1>Dashboard</h1></div><div class="panel"><p class="field-error">Unable to load articles.json: ${escapeHTML(err.message)}</p></div>`; return; } const articles = state.articles; const sorted = [...articles].sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0)); const latest = sorted.slice(0,5); root.innerHTML = `<div class="admin-page-title"><h1>Dashboard</h1><a class="btn" href="#/editor/new">➕ New Article</a></div><div class="stat-grid"><div class="stat-card"><div class="stat-value">${articles.length}</div><div class="stat-label">Total Articles</div></div><div class="stat-card"><div class="stat-value">${articles.length}</div><div class="stat-label">Published Articles</div></div><div class="stat-card"><div class="stat-value">${state.categories.length}</div><div class="stat-label">Categories</div></div><div class="stat-card"><...