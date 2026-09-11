/* =========================================================
   NEW ARTICLE PREVIEW MEDIA V3

   Covers and body image files are browser-local until Publish.
   The normal article renderer can render stored GitHub paths and
   manually entered image URLs. New local files need temporary object
   URLs before publication.

   This helper patches only the visual Preview. It does not modify
   state.editor, articles.json, or Article Schema v1.
   ========================================================= */

(() => {
  "use strict";

  const resolveMediaUrl = value => {
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
    window.coverUrlFor = resolveMediaUrl;
  }

  let activeCoverObjectUrl = "";
  const activeBodyObjectUrls = [];

  function revokeObjectUrls() {
    if (activeCoverObjectUrl) {
      try { URL.revokeObjectURL(activeCoverObjectUrl); } catch {}
      activeCoverObjectUrl = "";
    }
    while (activeBodyObjectUrls.length) {
      try { URL.revokeObjectURL(activeBodyObjectUrls.pop()); } catch {}
    }
  }

  function pendingCoverUrl() {
    const fileInput = document.querySelector("#coverFile");
    const file = fileInput?.files?.[0];
    if (file) {
      if (activeCoverObjectUrl) {
        try { URL.revokeObjectURL(activeCoverObjectUrl); } catch {}
      }
      activeCoverObjectUrl = URL.createObjectURL(file);
      return activeCoverObjectUrl;
    }

    const url = document.querySelector("#inCoverUrl")?.value?.trim() || "";
    return url ? resolveMediaUrl(url) : "";
  }

  function getStagedBodyRows() {
    return [...document.querySelectorAll("#bodyImagesList [data-image-file]")]
      .map(fileInput => {
        const idx = Number(fileInput.dataset.imageFile);
        const file = fileInput.files?.[0] || null;
        const altInput = document.querySelector(`#bodyImagesList [data-image-alt="${idx}"]`);
        const captionInput = document.querySelector(`#bodyImagesList [data-image-caption="${idx}"]`);
        return {
          idx,
          file,
          alt: altInput?.value?.trim() || "",
          caption: captionInput?.value?.trim() || ""
        };
      })
      .filter(item => item.file);
  }

  function makeBodyFigure(item) {
    const objectUrl = URL.createObjectURL(item.file);
    activeBodyObjectUrls.push(objectUrl);

    const figure = document.createElement("figure");
    figure.className = "article-figure preview-staged-body-image";
    figure.dataset.previewBodyImageIndex = String(item.idx);

    const img = document.createElement("img");
    img.src = objectUrl;
    img.alt = item.alt || "Article image";
    img.loading = "eager";
    figure.appendChild(img);

    if (item.caption) {
      const caption = document.createElement("figcaption");
      caption.textContent = item.caption;
      figure.appendChild(caption);
    }

    return figure;
  }

  function patchCover() {
    const root = document.querySelector("#previewRoot");
    const article = root?.querySelector(".article");
    if (!article) return;

    // Stored covers are already handled by admin.js. Never duplicate one.
    if (article.querySelector(".article-cover img")) return;

    const src = pendingCoverUrl();
    if (!src) return;

    const cover = document.createElement("div");
    cover.className = "article-cover preview-staged-cover";

    const img = document.createElement("img");
    img.src = src;
    img.alt = document.querySelector("#inTitle")?.value?.trim() || "Cover image";
    img.loading = "eager";

    cover.appendChild(img);
    article.insertBefore(cover, article.firstChild);
  }

  function patchBodyImages() {
    const root = document.querySelector("#previewRoot");
    const body = root?.querySelector(".article-body");
    if (!body) return;

    const rows = getStagedBodyRows();
    if (!rows.length) return;

    const headings = [...body.querySelectorAll("h2")];
    rows.forEach((item, position) => {
      if (body.querySelector(`[data-preview-body-image-index="${item.idx}"]`)) return;

      const figure = makeBodyFigure(item);
      const heading = headings[position];

      // Body image #1 follows Section 1, #2 follows Section 2, etc.
      if (!heading) {
        body.appendChild(figure);
        return;
      }

      const nextHeading = headings[position + 1];
      if (nextHeading) {
        body.insertBefore(figure, nextHeading);
      } else {
        const closing = body.querySelector(".article-closing");
        if (closing) body.insertBefore(figure, closing);
        else body.appendChild(figure);
      }
    });
  }

  function patchPreview() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        patchCover();
        patchBodyImages();
      });
    });
  }

  // Capture phase is intentional: the Admin Preview button handler is
  // registered by admin.js, while this helper loads afterward. We only
  // schedule the DOM patch; the normal Preview renderer still runs first.
  document.addEventListener("click", event => {
    if (event.target?.closest?.("#btnPreview")) {
      revokeObjectUrls();
      patchPreview();
    }
    if (event.target?.closest?.("#previewClose")) revokeObjectUrls();
  }, true);
})();
