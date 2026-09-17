/* JAZIEL ADMIN — Draft chooser UI v2
   This file owns only the clickable Load Draft chooser.
   All draft reads, validation, state synchronization, and image verification
   are delegated to window.JazielDraftManager.
*/
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const toast = (message, type = "info") => {
    const root = $("#toastRoot");
    if (!root) return;
    const el = document.createElement("div");
    el.className = `toast${type === "error" ? " toast-error" : type === "success" ? " toast-success" : ""}`;
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  };
  const esc = value => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  function close() { $("#jazielDraftChooser")?.remove(); }
  function styles() {
    if ($("#jazielDraftChooserStyles")) return;
    const s = document.createElement("style");
    s.id = "jazielDraftChooserStyles";
    s.textContent = `#jazielDraftChooser{z-index:95}.jdc-box{max-width:720px!important}.jdc-title{margin:0 0 5px;font-size:1.15rem}.jdc-sub{margin:0 0 16px;color:var(--muted);font-size:.82rem}.jdc-list{display:flex;flex-direction:column;gap:8px}.jdc-card{display:block;width:100%;text-align:left;padding:13px 14px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--text);cursor:pointer;font:inherit}.jdc-card:hover{background:var(--bg);border-color:var(--text)}.jdc-title2{font-weight:700;line-height:1.35}.jdc-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:5px;color:var(--muted);font-size:.74rem}.jdc-slug{margin-top:5px;color:var(--muted);font-size:.7rem;word-break:break-all}.jdc-close{margin-top:14px;width:100%;justify-content:center}`;
    document.head.appendChild(s);
  }
  async function chooser() {
    const manager = window.JazielDraftManager;
    if (!manager) { toast("Draft manager is not ready. Refresh the Admin Panel and try again.", "error"); return; }
    styles();
    close();
    const o = document.createElement("div");
    o.id = "jazielDraftChooser";
    o.className = "modal-overlay";
    o.innerHTML = `<div class="modal-box jdc-box"><h3 class="jdc-title">Load Draft</h3><p class="jdc-sub">Choose an article to load it directly into the editor.</p><div class="jdc-list"><div class="jdc-sub">Loading drafts…</div></div><button class="btn btn-ghost jdc-close" type="button">Cancel</button></div>`;
    document.body.appendChild(o);
    o.querySelector(".jdc-close").onclick = close;
    try {
      const drafts = await manager.listDrafts();
      const list = o.querySelector(".jdc-list");
      if (!o.isConnected) return;
      if (!drafts.length) { list.innerHTML = '<div class="jdc-sub">No GitHub drafts found.</div>'; return; }
      list.innerHTML = "";
      drafts.forEach(d => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "jdc-card";
        b.innerHTML = `<div class="jdc-title2">${esc(d.title)}</div><div class="jdc-meta"><span>${esc(d.category)}</span>${d.readTime ? `<span>•</span><span>${esc(d.readTime)}</span>` : ""}</div><div class="jdc-slug">${esc(d.slug)}</div>`;
        b.onclick = async () => {
          b.disabled = true;
          try {
            await manager.loadBySlug(d.slug);
            close();
          } catch (e) {
            console.error(e);
            toast(e.message || String(e), "error");
            b.disabled = false;
          }
        };
        list.appendChild(b);
      });
      list.querySelector("button")?.focus();
    } catch (e) {
      close();
      console.error(e);
      toast(e.message || String(e), "error");
    }
  }
  document.addEventListener("click", e => {
    const b = e.target.closest?.("#btnLoadDraft");
    if (!b) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    chooser();
  }, true);
  window.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
})();
