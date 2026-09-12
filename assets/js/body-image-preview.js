/* JAZIEL ADMIN — Body Image Previews
   Visual-only helper. Article Schema v1 is unchanged. */
(() => {
  "use strict";

  function apply() {
    const list = document.getElementById("bodyImagesList");
    if (!list) return;
    [...list.children].filter(el => el.classList && el.classList.contains("repeat-item")).forEach((item, i) => {
      let box = item.querySelector(":scope > .body-image-preview");
      if (!box) {
        box = document.createElement("div");
        box.className = "body-image-preview";
        item.insertBefore(box, item.querySelector(":scope > .field") || null);
      }

      const fileInput = item.querySelector("[data-image-file]");
      const urlInput = item.querySelector("[data-image-url]");
      let src = "";
      if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const old = box.dataset.objectUrl || "";
        const key = `${file.name}|${file.size}|${file.lastModified}`;
        if (old && box.dataset.fileKey === key) src = old;
        else {
          if (old.startsWith("blob:")) URL.revokeObjectURL(old);
          src = URL.createObjectURL(file);
          box.dataset.objectUrl = src;
          box.dataset.fileKey = key;
        }
      } else if (urlInput && /^https?:\/\//i.test(urlInput.value.trim())) {
        src = urlInput.value.trim();
        const old = box.dataset.objectUrl || "";
        if (old.startsWith("blob:")) URL.revokeObjectURL(old);
        box.dataset.objectUrl = "";
        box.dataset.fileKey = "";
      } else {
        const old = box.dataset.objectUrl || "";
        if (old.startsWith("blob:")) URL.revokeObjectURL(old);
        box.dataset.objectUrl = "";
        box.dataset.fileKey = "";
      }

      if (src) {
        box.innerHTML = `<div class="body-image-preview-label">Body Image ${i + 1} Preview</div><img src="${src.replace(/"/g,"&quot;")}" alt="Preview of Body Image ${i + 1}">`;
      } else {
        box.innerHTML = `<div class="body-image-preview-empty">No image selected</div>`;
      }
    });
  }

  function init() {
    apply();
    document.addEventListener("change", e => {
      if (e.target.matches && e.target.matches("[data-image-file]")) setTimeout(apply, 0);
    }, true);
    document.addEventListener("input", e => {
      if (e.target.matches && e.target.matches("[data-image-url]")) setTimeout(apply, 0);
    }, true);
    new MutationObserver(() => apply()).observe(document.body, { childList:true, subtree:true });
    setInterval(apply, 500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})();
