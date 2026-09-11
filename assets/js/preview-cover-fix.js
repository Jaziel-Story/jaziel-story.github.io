/* =========================================================
   PREVIEW COVER FIX
   The admin keeps a newly selected cover File in the browser until
   Publish uploads it to GitHub. The existing preview renderer only
   knows the final article.cover path, so a new local cover can be
   missing from Preview even though it is correctly shown in the
   Images tab and will be uploaded on Publish.

   This small UI bridge runs after admin.js has rendered the preview.
   It reads the selected file directly from the file input and inserts
   a temporary object URL into the preview. It does not modify the
   article object, articles.json, or Article Schema v1.
   ========================================================= */

(() => {
  "use strict";

  /*
     admin.js uses coverUrlFor() for article preview images. The function
     was not present in the current admin runtime, so a preview containing
     a cover could stop rendering before the HTML was inserted. Define the
     resolver here before DOMContentLoaded so admin.js can safely use it.

     Local repository paths such as assets/images/articles/foo.jpg must be
     resolved from the site root, not from /admin/. External http(s) URLs
     are preserved unchanged.
  */
  if (typeof window.coverUrlFor !== "function") {
    window.coverUrlFor = value => {
      const raw = String(value || "").trim();
      if (!raw) return "";
      if (/^(?:https?:|data:|blob:)/i.test(raw)) return raw;
      try {
        return new URL(raw.replace(/^\/+/, ""), `${window.location.origin}/`).href;
      } catch {
        return raw;
      }
    };
  }

  let activeObjectUrl = "";

  function revokeActiveObjectUrl() {
    if (activeObjectUrl) {
      URL.revokeObjectURL(activeObjectUrl);
      activeObjectUrl = "";
    }
  }

  function addPendingCoverToPreview() {
    const root = document.querySelector("#previewRoot");
    const article = root && root.querySelector(".article");
    if (!root || !article) return;

    // If the normal renderer already has a cover, do nothing.
    if (article.querySelector(".article-cover img")) return;

    const fileInput = document.querySelector("#coverFile");
    const file = fileInput && fileInput.files && fileInput.files[0];
    const externalUrl = (document.querySelector("#inCoverUrl")?.value || "").trim();
    const src = file ? URL.createObjectURL(file) : externalUrl;

    if (!src) return;

    revokeActiveObjectUrl();
    if (file) activeObjectUrl = src;

    const title = document.querySelector("#inTitle")?.value || "";
    const cover = document.createElement("div");
    cover.className = "article-cover";

    const img = document.createElement("img");
    img.src = src;
    img.alt = title;
    img.loading = "eager";

    cover.appendChild(img);
    article.insertBefore(cover, article.firstChild);
  }

  function bind() {
    const previewButton = document.querySelector("#btnPreview");
    if (previewButton) {
      // admin.js already owns the click handler. This listener runs after
      // it and patches only the rendered preview when a local cover exists.
      previewButton.addEventListener("click", () => {
        requestAnimationFrame(addPendingCoverToPreview);
      });
    }

    const closeButton = document.querySelector("#previewClose");
    if (closeButton) closeButton.addEventListener("click", revokeActiveObjectUrl);

    const modal = document.querySelector("#previewModal");
    if (modal) {
      modal.addEventListener("click", event => {
        if (event.target === modal) revokeActiveObjectUrl();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }
})();
