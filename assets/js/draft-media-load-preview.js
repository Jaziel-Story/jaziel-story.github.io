/* JAZIEL ADMIN — Draft media preview
   Shows repository-backed cover/body images after Load Draft.
   Visual-only; Article Schema v1 and draft storage are unchanged.
*/
(() => {
  "use strict";

  const resolveSrc = value => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^(?:https?:|data:|blob:)/i.test(raw)) return raw;
    try { return new URL(raw.replace(/^\/+/, ""), `${location.origin}/`).href; }
    catch { return raw; }
  };

  function installStyles() {
    if (document.getElementById("draftMediaPreviewStyles")) return;
    const style = document.createElement("style");
    style.id = "draftMediaPreviewStyles";
    style.textContent = `
      .draft-media-preview{margin:10px 0 14px;padding:10px;border:1px solid rgba(127,127,127,.22);border-radius:12px;background:rgba(127,127,127,.06)}
      .draft-media-preview-label{font-size:.78rem;font-weight:700;letter-spacing:.02em;margin-bottom:7px;opacity:.78}
      .draft-media-preview img{display:block;max-width:100%;width:auto;max-height:320px;border-radius:9px;object-fit:contain;background:#eee}
      .draft-media-preview-empty{font-size:.8rem;opacity:.58}
    `;
    document.head.appendChild(style);
  }

  function coverPreview() {
    const input = document.querySelector("#inCoverUrl");
    if (!input) return;
    const src = resolveSrc(input.value);
    const host = input.closest(".field, .form-group, .editor-field") || input.parentElement;
    if (!host) return;
    let box = host.querySelector(":scope > .draft-media-preview");
    if (!box) {
      box = document.createElement("div");
      box.className = "draft-media-preview";
      host.appendChild(box);
    }
    box.innerHTML = src
      ? `<div class="draft-media-preview-label">Cover Preview</div><img src="${src.replace(/"/g,"&quot;")}" alt="Cover preview">`
      : `<div class="draft-media-preview-empty">No cover image</div>`;
  }

  function bodyPreviews() {
    const list = document.querySelector("#bodyImagesList");
    if (!list) return;
    [...list.querySelectorAll(".repeat-item")].forEach((item, i) => {
      const input = item.querySelector("[data-image-url]");
      const src = resolveSrc(input?.value || "");
      let box = item.querySelector(":scope > .draft-media-preview");
      if (!box) {
        box = document.createElement("div");
        box.className = "draft-media-preview";
        item.insertBefore(box, item.firstElementChild);
      }
      box.innerHTML = src
        ? `<div class="draft-media-preview-label">Body Image ${i + 1} — Draft Preview</div><img src="${src.replace(/"/g,"&quot;")}" alt="Draft preview of Body Image ${i + 1}">`
        : `<div class="draft-media-preview-empty">No image selected</div>`;
    });
  }

  function apply() { installStyles(); coverPreview(); bodyPreviews(); }
  function schedule() { setTimeout(apply, 50); }

  document.addEventListener("input", e => {
    if (e.target.matches?.("#inCoverUrl, [data-image-url]")) schedule();
  }, true);
  document.addEventListener("change", e => {
    if (e.target.matches?.("#inCoverUrl, [data-image-url]")) schedule();
  }, true);
  document.addEventListener("click", e => {
    if (e.target.closest?.("#btnAddImage, [data-remove-image], #btnLoadDraft")) schedule();
  }, true);

  let attempts = 0;
  function boot() {
    apply();
    if (attempts++ < 12) setTimeout(boot, 250);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
