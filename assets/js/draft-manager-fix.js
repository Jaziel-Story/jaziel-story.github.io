/* JAZIEL DRAFT UX FIX v1
   Replaces the old polling/duplicate-block draft manager.
   - No 10-second background GitHub polling.
   - Save updates an existing draft instead of refusing it.
   - Load reads only the draft directory and selected draft.
   - GitHub requests have a timeout so the UI cannot spin forever.
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
  const toast = (message, type = "info") => {
    const root = $("#toastRoot"); if (!root) return;
    const el = document.createElement("div");
    el.className = `toast${type === "error" ? " toast-error" : type === "success" ? " toast-success" : ""}`;
    el.textContent = message; root.appendChild(el); setTimeout(() => el.remove(), 5000);
  };
  function settings() {
    try { return { owner: REPO.split("/")[0], repo: REPO.split("/")[1], branch: BRANCH, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") }; }
    catch { return { owner: REPO.split("/")[0], repo: REPO.split("/")[1], branch: BRANCH }; }
  }
  function token() { try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; } }
  function api(path) { const s = settings(); return `https://api.github.com/repos/${encodeURIComponent(s.owner)}/${encodeURIComponent(s.repo)}${path}`; }
  function headers(json = false) { const h = { Accept: "application/vnd.github+json" }; const t = token(); if (t) h.Authorization = `Bearer ${t}`; if (json) h["Content-Type"] = "application/json"; return h; }
  async function request(path, options = {}) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const r = await fetch(api(path), { ...options, headers: headers(Boolean(options.body)), signal: controller.signal });
      if (!r.ok) { let msg = r.statusText; try { const j = await r.json(); msg = j.message || msg; } catch {} const e = new Error(`GitHub ${r.status}: ${msg}`); e.status = r.status; throw e; }
      return r.status === 204 ? null : r.json();
    } catch (e) { if (e.name === "AbortError") throw new Error("GitHub request timed out after 30 seconds. Check your connection/token and try again."); throw e; }
    finally { clearTimeout(timer); }
  }
  function b64utf8(s) { const x = atob(String(s || "").replace(/\n/g, "")); const b = Uint8Array.from(x, c => c.charCodeAt(0)); return new TextDecoder().decode(b); }
  function utf8b64(s) { const b = new TextEncoder().encode(s); let x = ""; for (let i = 0; i < b.length; i += 0x8000) x += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(x); }
  function fileToB64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => { const r = String(reader.result || ""), i = r.indexOf(","); resolve(i >= 0 ? r.slice(i + 1) : r); }; reader.onerror = () => reject(new Error("Could not read image file.")); reader.readAsDataURL(file); }); }
  function imageExt(file) { const t = String(file?.type || "").toLowerCase(); return t === "image/png" ? "png" : t === "image/webp" ? "webp" : t === "image/gif" ? "gif" : "jpg"; }
  function imagePath(slug, kind, index, file) { return `${IMAGE_DIR}/${slug}-${kind === "cover" ? "cover" : `body-${Number(index) + 1}`}.${imageExt(file)}`; }
  async function getFile(path) { try { const d = await request(`/contents/${path}?ref=${encodeURIComponent(BRANCH)}&t=${Date.now()}`); return { sha: d.sha, text: d.content ? b64utf8(d.content) : "", data: d }; } catch (e) { if (e.status === 404) return null; throw e; } }
  async function putFile(path, content, message, sha) { const body = { message, content, branch: BRANCH }; if (sha) body.sha = sha; return request(`/contents/${path}`, { method: "PUT", body: JSON.stringify(body) }); }
  async function uploadImage(path, file, label) { const existing = await getFile(path); const b64 = await fileToB64(file); await putFile(path, b64, `Admin: upload ${label}`, existing?.sha); return path; }
  function slug() { return String($("#inSlug")?.value || "").trim(); }
  function collectArticle() {
    const v = id => $(id)?.value || "";
    const sections = $$(`[data-section-heading]`).map((h, i) => ({ heading: h.value.trim(), paragraphs: String($(`[data-section-paragraphs="${i}"]`)?.value || "").split("\n").filter(Boolean) }));
    const images = $$("#bodyImagesList .repeat-item").map(item => ({ src: item.querySelector("[data-image-url]")?.value.trim() || "", alt: item.querySelector("[data-image-alt]")?.value.trim() || "", caption: item.querySelector("[data-image-caption]")?.value.trim() || "" }));
    const tags = $$("#tagsRow .tag-pill").map(x => x.textContent.replace(/\s*✕\s*$/, "").trim()).filter(Boolean);
    return { id: "", title: v("#inTitle").trim(), slug: slug(), description: v("#inDescription").trim(), category: v("#inCategory").trim(), date: v("#inDate"), readTime: v("#inReadTime").trim(), dek: v("#inDek").trim(), cover: v("#inCoverUrl").trim(), intro: v("#inIntro").trim(), sections, images, bibleVerse: { text: v("#inVerseText").trim(), reference: v("#inVerseRef").trim() }, closing: v("#inClosing").trim(), seo: { title: v("#inSeoTitle").trim(), description: v("#inSeoDesc").trim() }, og: { title: v("#inOgTitle").trim(), description: v("#inOgDesc").trim(), image: v("#inOgImage").trim() }, tags, relatedArticles: Array.isArray(window.__jazielDraftRelated) ? window.__jazielDraftRelated : [], featured: Boolean($("#inFeatured")?.checked) };
  }
  function makeDraft(article) { const now = new Date().toISOString(); return { draftVersion: 1, draftStatus: "draft", draftMeta: { slug: article.slug, createdAt: loaded.draft?.draftMeta?.createdAt || now, updatedAt: now, createdBy: loaded.draft?.draftMeta?.createdBy || "Admin Panel", updatedBy: "Admin Panel" }, article, imageRecommendations: { cover: { description: "Recommended editorial cover image matching the article topic.", prompt: `Professional editorial cover image for: ${article.title}. Realistic, cinematic journalism photography, no text, no watermark, 16:9.`, aspectRatio: "16:9" }, sections: (article.sections || []).map((s, i) => ({ section: i + 1, description: `Supporting editorial image for section ${i + 1}: ${s.heading || article.title}.`, prompt: `Realistic editorial photography illustrating: ${s.heading || article.title}. Professional news website style, no text, no watermark, 16:9.`, aspectRatio: "16:9" })) } }; }
  function validate(d) { if (!d || d.draftVersion !== 1 || d.draftStatus !== "draft" || !d.draftMeta?.slug || !d.article || d.article.slug !== d.draftMeta.slug) throw new Error("Invalid Draft JSON Contract v1.0."); return d; }
  async function getDraft(s) { const f = await getFile(`${DRAFT_DIR}/${encodeURIComponent(s)}.json`); if (!f) return null; return { sha: f.sha, draft: validate(JSON.parse(f.text)) }; }
  async function listDrafts() { const d = await request(`/contents/${DRAFT_DIR}?ref=${encodeURIComponent(BRANCH)}&t=${Date.now()}`); return Array.isArray(d) ? d.filter(x => x.type === "file" && x.name.endsWith(".json")).map(x => x.name.slice(0, -5)) : []; }
  function setValue(sel, value) { const el = $(sel); if (!el) return; el.value = value ?? ""; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }
  async function ensureCount(selector, button, count) { for (let i = $$(selector).length; i < count; i++) { $(button)?.click(); await new Promise(r => setTimeout(r, 0)); } }
  async function applyDraft(d) {
    const a = d.article;
    setValue("#inTitle", a.title); setValue("#inSlug", a.slug); setValue("#inCategory", a.category); setValue("#inDate", a.date); setValue("#inReadTime", a.readTime); setValue("#inDescription", a.description); setValue("#inDek", a.dek); setValue("#inIntro", a.intro); setValue("#inClosing", a.closing); setValue("#inVerseText", a.bibleVerse?.text); setValue("#inVerseRef", a.bibleVerse?.reference); setValue("#inCoverUrl", a.cover); setValue("#inSeoTitle", a.seo?.title); setValue("#inSeoDesc", a.seo?.description); setValue("#inOgTitle", a.og?.title); setValue("#inOgDesc", a.og?.description); setValue("#inOgImage", a.og?.image);
    const f = $("#inFeatured"); if (f) f.checked = Boolean(a.featured);
    await ensureCount("[data-section-heading]", "#btnAddSection", Math.max(1, a.sections?.length || 1));
    const sections = $$("[data-section-heading]"); sections.slice(a.sections?.length || 0).forEach(el => el.closest(".repeat-item")?.querySelector("[data-remove-section]")?.click());
    (a.sections || []).forEach((s, i) => { setValue(`[data-section-heading="${i}"]`, s.heading); setValue(`[data-section-paragraphs="${i}"]`, (s.paragraphs || []).join("\n")); });
    await ensureCount("#bodyImagesList [data-image-url]", "#btnAddImage", a.images?.length || 0);
    const rows = $$("#bodyImagesList .repeat-item"); rows.slice(a.images?.length || 0).forEach(item => item.querySelector("[data-remove-image]")?.click());
    (a.images || []).forEach((img, i) => { setValue(`#bodyImagesList [data-image-url="${i}"]`, img.src || ""); setValue(`#bodyImagesList [data-image-alt="${i}"]`, img.alt || ""); setValue(`#bodyImagesList [data-image-caption="${i}"]`, img.caption || ""); });
    window.__jazielDraftRelated = a.relatedArticles || [];
    const tagInput = $("#tagInput"); if (tagInput) { $$("#tagsRow .tag-pill button[data-remove-tag]").forEach(b => b.click()); (a.tags || []).forEach(t => { tagInput.value = t; tagInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); }); }
    loaded.slug = d.draftMeta.slug; loaded.draft = d; toast(`Draft loaded: ${d.draftMeta.slug}`, "success");
  }
  async function saveDraft() {
    const s = slug(); if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) throw new Error("A valid lowercase article slug is required before saving a draft.");
    if (!token()) throw new Error("A GitHub token with Contents write access is required to save drafts.");
    const article = collectArticle(); const existing = await getDraft(s);
    const coverFile = $("#coverFile")?.files?.[0] || null;
    if (coverFile) article.cover = await uploadImage(imagePath(s, "cover", 0, coverFile), coverFile, "cover image");
    const rows = $$("#bodyImagesList .repeat-item");
    for (let i = 0; i < rows.length; i++) { const file = rows[i].querySelector("[data-image-file]")?.files?.[0] || null; if (!file) continue; article.images[i] = article.images[i] || { src: "", alt: "", caption: "" }; article.images[i].src = await uploadImage(imagePath(s, "body", i, file), file, `body image ${i + 1}`); }
    const draft = makeDraft(article); const result = await putFile(`${DRAFT_DIR}/${encodeURIComponent(s)}.json`, utf8b64(JSON.stringify(draft, null, 2) + "\n"), `${existing ? "Update" : "Create"} draft: ${s}`, existing?.sha);
    loaded.sha = result.content?.sha || null; loaded.slug = s; loaded.draft = draft;
    setValue("#inCoverUrl", article.cover); article.images.forEach((img, i) => setValue(`#bodyImagesList [data-image-url="${i}"]`, img.src || ""));
    toast(existing ? "Draft updated and saved to GitHub." : "Draft saved to GitHub.", "success");
  }
  async function loadDraft() {
    if (!token()) throw new Error("A GitHub token with Contents read access is required to load drafts.");
    const drafts = await listDrafts(); let selected = slug();
    if (!selected || !drafts.includes(selected)) { if (!drafts.length) throw new Error("No GitHub drafts found."); selected = prompt(`Available drafts:\n\n${drafts.join("\n")}\n\nEnter draft slug to load:`); }
    if (!selected) return; const found = await getDraft(selected.trim()); if (!found) throw new Error("Draft not found."); await applyDraft(found.draft); loaded.sha = found.sha;
  }
  async function clearDraft() {
    if (!token()) throw new Error("A GitHub token with Contents write access is required to clear drafts.");
    const s = loaded.slug || slug(); if (!s) throw new Error("Enter or load a draft slug first."); const found = await getDraft(s); if (!found) throw new Error("Draft not found on GitHub."); if (!confirm(`Delete GitHub draft “${s}”? This cannot be undone.`)) return;
    await request(`/contents/${DRAFT_DIR}/${encodeURIComponent(s)}.json`, { method: "DELETE", body: JSON.stringify({ message: `Delete draft: ${s}`, sha: found.sha, branch: BRANCH }) });
    loaded.sha = loaded.slug = loaded.draft = null; toast("GitHub draft deleted.", "success");
  }
  function install() {
    document.addEventListener("click", async e => {
      const b = e.target.closest?.("#btnSaveDraft, #btnLoadDraft, #btnClearDraft"); if (!b) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (b.dataset.busy === "1") return; b.dataset.busy = "1"; const original = b.innerHTML; b.disabled = true; b.innerHTML = `<span class="spinner"></span> ${b.id === "btnSaveDraft" ? "Saving…" : b.id === "btnLoadDraft" ? "Loading…" : "Deleting…"}`;
      try { if (b.id === "btnSaveDraft") await saveDraft(); else if (b.id === "btnLoadDraft") await loadDraft(); else await clearDraft(); }
      catch (err) { console.error(err); toast(err.message || String(err), "error"); }
      finally { b.dataset.busy = "0"; b.disabled = false; b.innerHTML = original; }
    }, true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true }); else install();
})();
