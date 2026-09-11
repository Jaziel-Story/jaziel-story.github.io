/* =========================================================
   NEW ARTICLE PREVIEW MEDIA V4

   Covers and body image files are browser-local until Publish.
   The normal article renderer can render stored GitHub paths and
   manually entered image URLs. New local files need temporary object
   URLs before publication.

   This helper patches only the visual Preview. It does not modify
   state.editor, articles.json, or Article Schema v1.

   V4 also hardens the Preview against a missing-section DOM result:
   the editor form is the source of truth for the section list, so any
   section that is present in the editor but absent from the rendered
   preview is restored before staged body images are placed.
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

  function getEditorSectionRows() {
    return [...document.querySelectorAll("#sectionsList .repeat-item[data-idx]")]
      .map((row, position) => {
        const headingInput = row.querySelector(`[data-section-heading="${position}"]`)
          || row.querySelector("[data-section-heading]");
        const paragraphsInput = row.querySelector(`[data-section-paragraphs="${position}"]`)
          || row.querySelector("[data-section-paragraphs]");

        const heading = headingInput?.value?.trim() || "";
        const paragraphs = (paragraphsInput?.value || "")
          .split("\n")
          .map(p => p.trim())
          .filter(Boolean);

        return { index: position, heading, paragraphs };
      })
      .filter(section => section.heading || section.paragraphs.length);
  }

  function makeSectionNodes(section) {
    const nodes = [];

    if (section.heading) {
      const h2 = document.createElement("h2");
      h2.textContent = section.heading;
      h2.dataset.previewSectionIndex = String(section.index);
      nodes.push(h2);
    }

    section.paragraphs.forEach(text => {
      const p = document.createElement("p");
      p.textContent = text;
      p.dataset.previewSectionIndex = String(section.index);
      nodes.push(p);
    });

    return nodes;
  }

  function patchMissingSections() {
    const root = document.querySelector("#previewRoot");
    const body = root?.querySelector(".article-body");
    if (!body) return;

    const sections = getEditorSectionRows();
    if (!sections.length) return;

    // If every section heading already made it into the normal renderer,
    // there is nothing to repair. This keeps the normal preview untouched.
    const renderedHeadings = body.querySelectorAll("h2").length;
    const expectedHeadingCount = sections.filter(s => s.heading).length;
    if (renderedHeadings >= expectedHeadingCount) return;

    const sectionNodes = [];
    sections.forEach(section => sectionNodes.push(...makeSectionNodes(section)));

    // The intro is the first paragraph in the article body. Keep it intact;
    // rebuild the section paragraphs/headings after it.
    const intro = [...body.children].find(el =>
      el.tagName === "P" && !el.classList.contains("article-closing")
    );

    [...body.querySelectorAll("h2")].forEach(el => el.remove());

    // Remove normal-rendered section paragraphs but preserve the intro.
    const stop = body.querySelector(".article-figure, .verse-block, .article-closing");
    [...body.children].forEach(el => {
      if (el === intro || el === stop) return;
      if (el.tagName === "P") el.remove();
    });

    const insertionPoint = body.querySelector(".article-figure, .verse-block, .article-closing") || null;
    sectionNodes.forEach(node => {
      if (insertionPoint) body.insertBefore(node, insertionPoint);
      else body.appendChild(node);
    });
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
      .filter(item => item.file)
      .sort((a, b) => a.idx - b.idx);
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
        const closing = body.querySelector(".article-closing");
        if (closing) body.insertBefore(figure, closing);
        else body.appendChild(figure);
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
        patchMissingSections();
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
