/* =========================================================
   NEW ARTICLE PREVIEW BODY IMAGES

   Body image files are browser-local until Publish. The normal article
   renderer intentionally skips them because state.editor.images[idx].src
   is still empty before upload. This helper patches only the Preview DOM
   after the existing Admin renderer runs.

   Article Schema v1 is unchanged.
   ========================================================= */

(() => {
  "use strict";

  const activeObjectUrls = [];

  function revokeObjectUrls() {
    while (activeObjectUrls.length) {
      try { URL.revokeObjectURL(activeObjectUrls.pop()); } catch {}
    }
  }

  function getBodyRows() {
    return [...document.querySelectorAll("#bodyImagesList [data-image-file]")]
      .map(fileInput => {
        const idx = Number(fileInput.dataset.imageFile);
        const file = fileInput.files?.[0] || null;
        const urlInput = document.querySelector(`#bodyImagesList [data-image-url="${idx}"]`);
        const altInput = document.querySelector(`#bodyImagesList [data-image-alt="${idx}"]`);
        const captionInput = document.querySelector(`#bodyImagesList [data-image-caption="${idx}"]`);
        return {
          idx,
          file,
          url: urlInput?.value?.trim() || "",
          alt: altInput?.value?.trim() || "",
          caption: captionInput?.value?.trim() || ""
        };
      });
  }

  function makeFigure(item) {
    let src = item.url;
    if (item.file) {
      const objectUrl = URL.createObjectURL(item.file);
      activeObjectUrls.push(objectUrl);
      src = objectUrl;
    }
    if (!src) return null;

    const figure = document.createElement("figure");
    figure.className = "article-figure preview-staged-body-image";

    const img = document.createElement("img");
    img.src = src;
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

  function patchBodyImages() {
    const root = document.querySelector("#previewRoot");
    const body = root?.querySelector(".article-body");
    if (!body) return;

    const rows = getBodyRows().filter(item => item.file || item.url);
    if (!rows.length) return;

    // Avoid duplicating figures if the Preview already rendered a stored URL.
    const existing = body.querySelectorAll(".article-figure");
    if (existing.length >= rows.length) return;

    const headings = [...body.querySelectorAll("h2")];
    rows.forEach((item, position) => {
      if (body.querySelector(`[data-preview-body-image-index="${item.idx}"]`)) return;

      const figure = makeFigure(item);
      if (!figure) return;
      figure.dataset.previewBodyImageIndex = String(item.idx);

      // Body image #1 follows Section 1, #2 follows Section 2, etc.
      const heading = headings[position];
      if (!heading) {
        body.appendChild(figure);
        return;
      }

      const nextHeading = headings[position + 1];
      if (nextHeading) {
        body.insertBefore(figure, nextHeading);
      } else {
        // Last section image goes before the closing paragraph when present.
        const closing = body.querySelector(".article-closing");
        if (closing) body.insertBefore(figure, closing);
        else body.appendChild(figure);
      }
    });
  }

  document.addEventListener("click", event => {
    if (event.target?.closest?.("#btnPreview")) {
      revokeObjectUrls();
      requestAnimationFrame(() => {
        requestAnimationFrame(patchBodyImages);
      });
    }
    if (event.target?.closest?.("#previewClose")) revokeObjectUrls();
  }, true);
})();
