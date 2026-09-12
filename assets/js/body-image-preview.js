/* =========================================================
   JAZIEL ADMIN — Body Image Previews
   Adds visual thumbnails for each body-image field.
   Article Schema v1 remains unchanged.
   ========================================================= */

(() => {
  "use strict";

  const URL_RE = /^https?:\/\//i;

  function ensurePreview(item, index) {
    let box = item.querySelector(":scope > .body-image-preview");
    if (!box) {
      box = document.createElement("div");
      box.className = "body-image-preview";
      item.insertBefore(box, item.querySelector(".field") || null);
    }

    const fileInput = item.querySelector("[data-image-file]");
    const urlInput = item.querySelector("[data-image-url]");
    let src = "";

    if (fileInput && fileInput.files && fileInput.files[0]) {
      src = URL.createObjectURL(fileInput.files[0]);
      box.dataset.objectUrl = src;
    } else if (urlInput && URL_RE.test(urlInput.value.trim())) {
      src = urlInput.value.trim();
    }

    const oldObjectUrl = box.dataset.lastObjectUrl;
    if (oldObjectUrl && oldObjectUrl !== src && oldObjectUrl.startsWith("blob:")) {
      URL.revokeObjectURL(oldObjectUrl);
    }

    if (src) {
      box.dataset.lastObjectUrl = src;
      box.innerHTML = `<img src="${src.replace(/"/g, "&quot;")}" alt="Preview of Image ${index + 1}"><span>Image ${index + 1} preview</span>`;
    } else {
      box.dataset.lastObjectUrl = "";
      box.innerHTML = `<div class="body-image-preview-empty">No image selected</div>`;
    }
  }

  function refresh() {
    const list = document.querySelector("#bodyImagesList");
    if (!list) return;
    [...list.querySelectorAll(":scope > .repeat-item")].forEach((item, index) => ensurePreview(item, index));
  }

  function bindInputs() {
    const list = document.querySelector("#bodyImagesList");
    if (!list || list.dataset.previewBound === "1") return;
    list.dataset.previewBound = "1";
    list.addEventListener("change", event => {
      if (event.target.matches("[data-image-file]")) refresh();
    });
    list.addEventListener("input", event => {
      if (event.target.matches("[data-image-url]")) refresh();
    });
  }

  function init() {
    refresh();
    bindInputs();
    const list = document.querySelector("#bodyImagesList");
    if (list) new MutationObserver(() => { refresh(); bindInputs(); }).observe(list, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
