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
      const currentFile = fileInput.files[0];
      const previousUrl = box.dataset.lastObjectUrl || "";
      const previousName = box.dataset.lastFileName || "";
      const previousSize = box.dataset.lastFileSize || "";

      if (previousUrl && previousName === currentFile.name && previousSize === String(currentFile.size)) {
        src = previousUrl;
      } else {
        if (previousUrl.startsWith("blob:")) URL.revokeObjectURL(previousUrl);
        src = URL.createObjectURL(currentFile);
        box.dataset.lastObjectUrl = src;
        box.dataset.lastFileName = currentFile.name;
        box.dataset.lastFileSize = String(currentFile.size);
      }
    } else if (urlInput && URL_RE.test(urlInput.value.trim())) {
      src = urlInput.value.trim();
      const previousUrl = box.dataset.lastObjectUrl || "";
      if (previousUrl.startsWith("blob:") && previousUrl !== src) URL.revokeObjectURL(previousUrl);
      box.dataset.lastObjectUrl = "";
      box.dataset.lastFileName = "";
      box.dataset.lastFileSize = "";
    }

    if (src) {
      box.innerHTML = `<img src="${src.replace(/"/g, "&quot;")}" alt="Preview of Body Image ${index + 1}"><span>Body Image ${index + 1} preview</span>`;
    } else {
      const previousUrl = box.dataset.lastObjectUrl || "";
      if (previousUrl.startsWith("blob:")) URL.revokeObjectURL(previousUrl);
      box.dataset.lastObjectUrl = "";
      box.dataset.lastFileName = "";
      box.dataset.lastFileSize = "";
      box.innerHTML = `<div class="body-image-preview-empty">No image selected</div>`;
    }
  }

  function refresh() {
    const list = document.querySelector("#bodyImagesList");
    if (!list) return;
    [...list.querySelectorAll(":scope > .repeat-item")].forEach((item, index) => ensurePreview(item, index));
  }

  function watchList(list) {
    if (!list || list.dataset.bodyImagePreviewBound === "1") return;
    list.dataset.bodyImagePreviewBound = "1";
    refresh();
    list.addEventListener("change", event => {
      if (event.target.matches("[data-image-file]")) refresh();
    });
    list.addEventListener("input", event => {
      if (event.target.matches("[data-image-url]")) refresh();
    });
    new MutationObserver(refresh).observe(list, { childList: true, subtree: true });
  }

  function scan() {
    const list = document.querySelector("#bodyImagesList");
    if (list) watchList(list);
  }

  function init() {
    scan();
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
