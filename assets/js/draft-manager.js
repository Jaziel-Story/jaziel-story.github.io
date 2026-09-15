/* JAZIEL DRAFT MANAGER v1
   GitHub-backed Draft JSON Contract v1.0.
   Article Schema v1 is unchanged. No binary image data is stored in drafts.
*/
(() => {
  "use strict";
  const REPO = "Jaziel-Story/jaziel-story.github.io";
  const BRANCH = "main";
  const DRAFT_DIR = "admin/drafts";
  const IMAGE_DIR = "assets/images/articles";
  const SETTINGS_KEY = "jaziel_admin_settings_v1";
  const TOKEN_KEY = "jaziel_admin_token_v1";
  const loaded = { sha: null, slug: null, draft: null };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  function settings() { try { return { owner: REPO.split("/")[0], repo: REPO.split("/")[1], branch: BRANCH, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") }; } catch { return { owner: REPO.split("/")[0], repo: REPO.split("/")[1], branch: BRANCH }; } }
  function token() { try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; } }
  function api(path) { const s = settings(); return `https://api.github.com/repos/${encodeURIComponent(s.owner)}/${encodeURIComponent(s.repo)}${path}`; }
  function headers(json = false) { const h = { Accept: "application/vnd.github+json" }; const t = token(); if (t) h.Authorization = `Bearer ${t}`; if (json) h["Content-Type"] = "application/json"; return h; }
  function toast(message, type = "info") { const root = $("#toastRoot"); if (root) { const el = document.createElement("div"); el.className = `toast${type === "error" ? " toast-error" : type === "success" ? " toast-success" : ""}`; el.textContent = message; root.appendChild(el); setTimeout(() => el.remove(), 5000); } }
  function utf8b64(s) { const b = new TextEncoder().encode(s); let x = ""; for (let i = 0; i < b.length; i += 0x8000) x += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(x); }
  function b64utf8(s) { const x = atob(String(s || "").replace(/\n/g, "")); const b = Uint8Array.from(x, c => c.charCodeAt(0)); return new TextDecoder().decode(b); }
  function fileToB64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => { const result = String(reader.result || ""); const comma = result.indexOf(","); resolve(comma >= 0 ? result.slice(comma + 1) : result); }; reader.onerror = () => reject(new Error("Could not read image file.")); reader.readAsDataURL(file); }); }
  function imageExt(file) { const type = String(file?.type || "").toLowerCase(); if (type === "image/png") return "png"; if (type === "image/webp") return "webp"; if (type === "image/gif") return "gif"; return "jpg"; }
  function imagePath(s, kind, index, file) { const suffix = kind === "cover" ? "cover" : `body-${Number(index) + 1}`; return `${IMAGE_DIR}/${s}-${suffix}.${imageExt(file)}`; }
  async function request(path, options = {}) { const r = await fetch(api(path), { ...options, headers: headers(Boolean(options.body)) }); if (!r.ok) { let msg = r.statusText; try { const j = await r.json(); msg = j.message || msg; } catch {} const e = new Error(`GitHub ${r.status}: ${msg}`); e.status = r.status; throw e; } return r.status === 204 ? null : r.json(); }
  async function getContentFile(path) { try { return await request(`/contents/${path}?ref=${encodeURIComponent(BRANCH)}&t=${Date.now()}`); } catch (e) { if (e.status === 404) return null; throw e; } }
  async function uploadImage(path, file, label) { const b64 = await fileToB64(file); const existing = await getContentFile(path); const body = { message: `Upload ${label}: ${path.split("/").pop()}`, content: b64, branch: BRANCH }; if (existing?.sha) body.sha = existing.sha; await request(`/contents/${path}`, { method: "PUT", body: JSON.stringify(body) }); return path; }
  function slug() { return String($("#inSlug")?.value || "").trim(); }
  function requireSlug() { const s = slug(); if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) throw new Error("A valid lowercase article slug is required before saving a draft."); return s; }
  function collectArticle() {
    const v = id => $(id)?.value || "";
    const sections = $$("[data-section-heading]").map((h, i) => ({ heading: h.value.trim(), paragraphs: String($("[data-section-paragraphs=\"" + i + "\"]")?.value || "").split("\n").filter(Boolean) }));
    const images = $$("#bodyImagesList .repeat-item").map(item => ({ src: item.querySelector("[data-image-url]")?.value.trim() || "", alt: item.querySelector("[data-image-alt]")?.value.trim() || "", caption: item.querySelector("[data-image-caption]")?.value.trim() || "" }));
    const tags = $$("#tagsRow .tag-pill").map(x => x.textContent.replace(/\s*✕\s*$/, "").trim()).filter(Boolean);
    return { id: "", title: v("#inTitle").trim(), slug: slug(), description: v("#inDescription").trim(), category: v("#inCategory").trim(), date: v("#inDate"), readTime: v("#inReadTime").trim(), dek: v("#inDek").trim(), cover: v("#inCoverUrl").trim(), intro: v("#inIntro").trim(), sections, images, bibleVerse: { text: v("#inVerseText").trim(), reference: v("#inVerseRef").trim() }, closing: v("#inClosing").trim(), seo: { title: v("#inSeoTitle").trim(), description: v("#inSeoDesc").trim() }, og: { title: v("#inOgTitle").trim(), description: v("#inOgDesc").trim(), image: v("#inOgImage").trim() }, tags, relatedArticles: Array.isArray(window.__jazielDraftRelated) ? window.__jazielDraftRelated : [], featured: Boolean($("#inFeatured")?.checked) };
  }
  function recommendations(article) { return { cover: { description: "Recommended editorial cover image matching the article topic.", prompt: `Professional editorial cover image for: ${article.title}. Realistic, cinematic journalism photography, no text, no watermark, 16:9.`, aspectRatio: "16:9" }, sections: (article.sections || []).map((s, i) => ({ section: i + 1, description: `Supporting editorial image for section ${i + 1}: ${s.heading || article.title}.`, prompt: `Realistic editorial photography illustrating: ${s.heading || article.title}. Professional news website style, no text, no watermark, 16:9.`, aspectRatio: "16:9" })) }; }
  function makeDraft(article) { const now = new Date().toISOString(); return { draftVersion: 1, draftStatus: "draft", draftMeta: { slug: article.slug, createdAt: loaded.draft?.draftMeta?.createdAt || now, updatedAt: now, createdBy: loaded.draft?.draftMeta?.createdBy || "Admin Panel", updatedBy: "Admin Panel" }, article, imageRecommendations: recommendations(article) }; }
  function validateDraft(d) { if (!d || d.draftVersion !== 1 || d.draftStatus !== "draft" || !d.draftMeta?.slug || !d.article || d.article.slug !== d.draftMeta.slug || !d.imageRecommendations) throw new Error("Invalid Draft JSON Contract v1.0."); if (!Array.isArray(d.article.sections) || !Array.isArray(d.article.images) || !Array.isArray(d.article.tags) || !Array.isArray(d.article.relatedArticles)) throw new Error("Draft Article Schema is incomplete."); return d; }
  async function getDraft(s) { try { const d = await request(`/contents/${DRAFT_DIR}/${encodeURIComponent(s)}.json?ref=${encodeURIComponent(BRANCH)}&t=${Date.now()}`); return { sha: d.sha, draft: validateDraft(JSON.parse(b64utf8(d.content))) }; } catch (e) { if (e.status === 404) return null; throw e; } }
  async function cleanupPublishedDrafts() {
    const items = await request(`/contents/${DRAFT_DIR}?ref=${encodeURIComponent(BRANCH)}&t=${Date.now()}`);
    const drafts = Array.isArray(items) ? items.filter(x => x.type === "file" && x.name.endsWith(".json")).map(x => x.name.slice(0, -5)) : [];
    if (!drafts.length) return [];
    const articles = await request(`/contents/articles.json?ref=${encodeURIComponent(BRANCH)}&t=${Date.now()}`);
    const parsed = JSON.parse(b64utf8(articles.content));
    const published = new Set((parsed.articles || []).map(a => a && a.slug).filter(Boolean));
    const removed = [];
    for (const s of drafts) {
      if (!published.has(s)) continue;
      try {
        const found = await getDraft(s);
        if (!found) continue;
        await request(`/contents/${DRAFT_DIR}/${encodeURIComponent(s)}.json`, { method: "DELETE", body: JSON.stringify({ message: `Admin: remove published draft "${s}"`, sha: found.sha, branch: BRANCH }) });
        removed.push(s);
      } catch (err) {
        console.warn("Could not remove published draft", s, err);
      }
    }
    if (removed.length) toast(`Removed ${removed.length} published draft${removed.length === 1 ? "" : "s"} from Drafts.`, "info");
    return removed;
  }
  async function listDrafts() {
    try {
      const items = await request(`/contents/${DRAFT_DIR}?ref=${encodeURIComponent(BRANCH)}&t=${Date.now()}`);
      const drafts = Array.isArray(items) ? items.filter(x => x.type === "file" && x.name.endsWith(".json")).map(x => x.name.slice(0, -5)) : [];
      if (!drafts.length) return [];
      const articles = await request(`/contents/articles.json?ref=${encodeURIComponent(BRANCH)}&t=${Date.now()}`);
      const parsed = JSON.parse(b64utf8(articles.content));
      const published = new Set((parsed.articles || []).map(a => a && a.slug).filter(Boolean));
      const stale = drafts.filter(s => published.has(s));
      for (const s of stale) {
        try {
          const found = await getDraft(s);
          if (!found) continue;
          await request(`/contents/${DRAFT_DIR}/${encodeURIComponent(s)}.json`, { method: "DELETE", body: JSON.stringify({ message: `Admin: remove published draft "${s}"`, sha: found.sha, branch: BRANCH }) });
        } catch (err) {
          console.warn("Could not remove published draft", s, err);
        }
      }
      return drafts.filter(s => !published.has(s));
    } catch (e) {
      if (e.status === 404) return [];
      throw e;
    }
  }
  async function checkDuplicate(s) { const existingDraft = await getDraft(s); if (existingDraft && (!loaded.draft || loaded.slug !== s)) throw new Error(`A GitHub draft already exists for slug “${s}”. Load it before updating it.`); const articles = await request(`/contents/articles.json?ref=${encodeURIComponent(BRANCH)}&t=${Date.now()}`); const parsed = JSON.parse(b64utf8(articles.content)); if ((parsed.articles || []).some(a => a.slug === s)) throw new Error(`This slug is already published: ${s}`); }
  async function uploadSelectedImages(s, article) {
    const coverInput = $("#coverFile");
    const coverFile = coverInput?.files?.[0] || null;
    if (coverFile) { const path = imagePath(s, "cover", 0, coverFile); await uploadImage(path, coverFile, "cover image"); article.cover = path; }
    const bodyItems = $$("#bodyImagesList .repeat-item");
    for (let i = 0; i < bodyItems.length; i++) {
      const file = bodyItems[i].querySelector('[data-image-file]')?.files?.[0] || null;
      if (!file) continue;
      const path = imagePath(s, "body", i, file);
      await uploadImage(path, file, `body image ${i + 1}`);
      if (!article.images[i]) article.images[i] = { src: "", alt: "", caption: "" };
      article.images[i].src = path;
    }
  }
  async function saveDraft() {
    const s = requireSlug();
    if (!token()) throw new Error("A GitHub token with Contents write access is required to save drafts.");
    const article = collectArticle();
    await checkDuplicate(s);
    await uploadSelectedImages(s, article);
    const existing = await getDraft(s);
    const draft = makeDraft(article);
    const body = { message: `${existing ? "Update" : "Create"} draft: ${s}`, content: utf8b64(JSON.stringify(draft, null, 2) + "\n"), branch: BRANCH };
    if (existing) body.sha = existing.sha;
    const result = await request(`/contents/${DRAFT_DIR}/${encodeURIComponent(s)}.json`, { method: "PUT", body: JSON.stringify(body) });
    loaded.sha = result.content?.sha || null; loaded.slug = s; loaded.draft = draft;
    setValue("#inCoverUrl", article.cover);
    article.images.forEach((img, i) => setValue(`#bodyImagesList [data-image-url=\"${i}\"]`, img.src || ""));
    toast("Draft and selected images saved to GitHub.", "success");
  }
  function setValue(selector, value) { const el = $(selector); if (!el) return; el.value = value ?? ""; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }
  function setSimpleFields(a) { setValue("#inTitle", a.title); setValue("#inSlug", a.slug); setValue("#inCategory", a.category); setValue("#inDate", a.date); setValue("#inReadTime", a.readTime); setValue("#inDescription", a.description); setValue("#inDek", a.dek); setValue("#inIntro", a.intro); setValue("#inClosing", a.closing); setValue("#inVerseText", a.bibleVerse?.text); setValue("#inVerseRef", a.bibleVerse?.reference); setValue("#inCoverUrl", a.cover); setValue("#inSeoTitle", a.seo?.title); setValue("#inSeoDesc", a.seo?.description); setValue("#inOgTitle", a.og?.title); setValue("#inOgDesc", a.og?.description); setValue("#inOgImage", a.og?.image); const f = $("#inFeatured"); if (f) { f.checked = Boolean(a.featured); f.dispatchEvent(new Event("change", { bubbles: true })); } }
  async function ensureCount(selector, button, count) { for (let i = $$(selector).length; i < count; i++) { $(button)?.click(); await new Promise(r => setTimeout(r, 0)); } }
  async function applySections(a) { await ensureCount("[data-section-heading]", "#btnAddSection", Math.max(1, a.sections.length)); const current = $$("[data-section-heading]"); current.slice(a.sections.length).forEach(el => el.closest(".repeat-item")?.querySelector("[data-remove-section]")?.click()); (a.sections || []).forEach((s, i) => { setValue(`[data-section-heading=\"${i}\"]`, s.heading); setValue(`[data-section-paragraphs=\"${i}\"]`, (s.paragraphs || []).join("\n")); }); }
  async function applyImages(a) { await ensureCount("#bodyImagesList [data-image-url]", "#btnAddImage", a.images.length); const current = $$("#bodyImagesList .repeat-item"); current.slice(a.images.length).forEach(item => item.querySelector("[data-remove-image]")?.click()); (a.images || []).forEach((img, i) => { setValue(`#bodyImagesList [data-image-url=\"${i}\"]`, img.src || ""); setValue(`#bodyImagesList [data-image-alt=\"${i}\"]`, img.alt || ""); setValue(`#bodyImagesList [data-image-caption=\"${i}\"]`, img.caption || ""); }); }
  function applyTags(a) { window.__jazielDraftRelated = a.relatedArticles || []; const input = $("#tagInput"); if (input) { $$("#tagsRow .tag-pill button[data-remove-tag]").forEach(b => b.click()); (a.tags || []).forEach(t => { input.value = t; input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); }); } }
  async function applyDraft(d) { const a = d.article; setSimpleFields(a); await applySections(a); await applyImages(a); applyTags(a); loaded.slug = d.draftMeta.slug; loaded.draft = d; toast(`Draft loaded: ${d.draftMeta.slug}`, "success"); }
  async function loadDraft() { if (!token()) throw new Error("A GitHub token with Contents read access is required to load drafts."); const drafts = await listDrafts(); if (!drafts.length) throw new Error("No GitHub drafts found."); const current = slug(); const selected = drafts.includes(current) ? current : prompt(`Available drafts:\n\n${drafts.join("\n")}\n\nEnter draft slug to load:`); if (!selected) return; const found = await getDraft(selected.trim()); if (!found) throw new Error("Draft not found."); await applyDraft(found.draft); loaded.sha = found.sha; }
  async function clearDraft() { if (!token()) throw new Error("A GitHub token with Contents write access is required to clear drafts."); const s = loaded.slug || slug(); if (!s) throw new Error("Enter or load a draft slug first."); const found = await getDraft(s); if (!found) throw new Error("Draft not found on GitHub."); if (!confirm(`Delete GitHub draft “${s}”? This cannot be undone.`)) return; await request(`/contents/${DRAFT_DIR}/${encodeURIComponent(s)}.json`, { method: "DELETE", body: JSON.stringify({ message: `Delete draft: ${s}`, sha: found.sha, branch: BRANCH }) }); loaded.sha = null; loaded.slug = null; loaded.draft = null; toast("GitHub draft deleted.", "info"); }
  function startPublishedDraftCleanup() {
    if (!token()) return;
    let running = false;
    const run = async () => {
      if (running || document.hidden) return;
      running = true;
      try { await cleanupPublishedDrafts(); } catch (err) { console.warn("Published draft cleanup check failed", err); }
      running = false;
    };
    run();
    window.addEventListener("focus", run);
    setInterval(run, 10000);
  }
  function install() { document.addEventListener("click", async e => { const b = e.target.closest?.("#btnSaveDraft, #btnLoadDraft, #btnClearDraft"); if (!b) return; e.preventDefault(); e.stopImmediatePropagation(); try { if (b.id === "btnSaveDraft") await saveDraft(); else if (b.id === "btnLoadDraft") await loadDraft(); else await clearDraft(); } catch (err) { console.error(err); toast(err.message || String(err), "error"); } }, true); startPublishedDraftCleanup(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true }); else install();
})();
