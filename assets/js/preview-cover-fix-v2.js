/* =========================================================
   NEW ARTICLE PREVIEW COVER V2

   A newly selected cover is a browser File until Publish uploads it.
   The normal article renderer can render stored covers, but New Article
   needs a temporary object URL before publication.

   This helper only patches the visual Preview. It does not modify
   state.editor.cover, articles.json, or Article Schema v1.
   ========================================================= */

(() => {
  "use strict";

  const resolveCoverUrl = value => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^(?:https?:|data:|blob:)/i.test(raw)) return raw;
    try {
      return new URL(raw.replace(/^\/+/, ""), `${window.location.origin}/`).href;
    } catch {
      return raw;
    }
  };

  if (typeof window.coverUrlFor !== "function") {
    window.coverUrlFor = resolveCoverUrl;
  }

  let activeObjectUrl = "";

  function revokeObjectUrl() {
    if (activeObjectUrl) {
      URL.revokeObjectURL(activeObjectUrl);
      activeObjectUrl = "";
    }
  }

  function pendingCoverUrl() {
    const fileInput = document.querySelector("#coverFile");
    const file = fileInput?.files?.[0];
    if (file) {
      revokeObjectUrl();
      activeObjectUrl = URL.createObjectURL(file);
      return activeObjectUrl;
    }

    const url = document.querySelector("#inCoverUrl")?.value?.trim() || "";
    return url ? resolveCoverUrl(url) : "";
  }

  function patchNewArticlePreview() {
    const root = document.querySelector("#previewRoot");
    const article = root?.querySelector(".article");
    if (!article) return;

    // Stored covers are already handled by admin.js. Never duplicate one.
    if (article.querySelector(".article-cover img")) return;

    const src = pendingCoverUrl();
    if (!src) return;

    const cover = document.createElement("div");
    cover.className = "article-cover";

    const img = document.createElement("img");
    img.src = src;
    img.alt = document.querySelector("#inTitle")?.value?.trim() || "Cover image";
    img.loading = "eager";

    cover.appendChild(img);
    article.insertBefore(cover, article.firstChild);
  }

  function afterPreviewClick() {
    // The Admin Preview handler is registered on a dynamically-created
    // button. Delegation below fires after that handler; two animation
    // frames ensure the modal DOM has been rendered before patching it.
    requestAnimationFrame(() => {
      requestAnimationFrame(patchNewArticlePreview);
    });
  }

  document.addEventListener("click", event => {
    if (event.target?.closest?.("#btnPreview")) afterPreviewClick();
    if (event.target?.closest?.("#previewClose")) revokeObjectUrl();
  });
})();
