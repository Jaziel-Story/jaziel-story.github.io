/* JAZIEL ADMIN — Draft media preview v2
   Loads repository-backed cover/body images after Load Draft.
   Visual-only; Article Schema v1 and draft storage are unchanged.
*/
(() => {
  "use strict";

  const REPO = "Jaziel-Story/jaziel-story.github.io";
  const BRANCH = "main";
  const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/`;

  const resolveRepoUrl = value => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^(?:https?:|data:|blob:)/i.test(raw)) return raw;
    return `${RAW_BASE}${raw.replace(/^\/+/, "")}`;
  };

  function installStyles() {
    if (document.getElementById("draftMediaPreviewStyles")) return;
    const style = document.createElement("style");
    style.id = "draftMediaPreviewStyles";
    style.textContent = `
      .draft-media-preview{margin:10px 0 14px;padding:10px;border:1px solid rgba(127,127,127,.22);border-radius:12px;background:rgba(127,127,127,.06)}
      .draft-media-preview-label{font-size:.78rem;font-weight:700;letter-spacing:.02em;margin-bottom:7px;opacity:.78}
      .draft-media-preview img{display:block;max-width:100%;width:auto;max-height:320px;border-radius:9px;object-fit:contain;background:#eee}
      .draft-media-preview-status{font-size:.8rem;opacity:.62}
      .draft-media-preview-error{font-size:.8rem;color:#b42318}
    `;
    document.head.appendChild(style);
  }

  function imageBox(host, label, src) {
    let box = host.querySelector(":scope > .draft-media-preview");
    if (!box) {
      box = document.createElement("div");
      box.className = "draft-media-preview";
      host.appendChild(box);
    }
    box.innerHTML = src
      ? `<div class="draft-media-preview-label">${label}</div><div class="draft-media-preview-status">Loading image from GitHub…</div><img alt="${label.replace(/"/g, "&quot;")}" style="display:none">`
      : `<div class="draft-media-preview-status">No repository image path saved in this draft.</div>`;
    if (!src) return;
    const img = box.querySelector("img");
    img.onload = () => { img.style.display = "block"; box.querySelector(".draft-media-preview-status")?.remove(); };
    img.onerror = () => { img.style.display = "none"; const status = box.querySelector(".draft-media-preview-status"); if (status) { status.className = "draft-media-preview-error"; status.textContent = "GitHub image could not be loaded."; } };
    img.src = src;
  }

  function coverPreview() {
    const input = document.querySelector("#inCoverUrl");
    if (!input) return;
    const host = input.closest(".field, .form-group, .editor-field") || input.parentElement;
    if (!host) return;
    imageBox(host, "Cover Preview", resolveRepoUrl(input.value));
  }

  function bodyPreviews() {
    const list = document.querySelector("#bodyImagesList");
    if (!list) return;
    [...list.querySelectorAll(".repeat-item")].forEach((item, i) => {
      const input = item.querySelector("[data-image-url]");
      imageBox(item, `Body Image ${i + 1} — Draft Preview`, resolveRepoUrl(input?.value));
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
    if (attempts++ < 20) setTimeout(boot, 250);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
