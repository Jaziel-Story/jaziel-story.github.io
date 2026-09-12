/* JAZIEL ADMIN — preview image/section mapping helper */
(() => {
  "use strict";

  function mapPreviewImages() {
    const body = document.querySelector("#previewRoot .article-body");
    if (!body) return;

    const sections = [...body.querySelectorAll("h2")];
    const figures = [...body.querySelectorAll("figure.article-figure")];
    if (!sections.length || !figures.length) return;

    sections.forEach((heading, index) => {
      const nextHeading = sections[index + 1] || null;
      const figure = figures[index];
      if (!figure) return;

      let cursor = heading.nextElementSibling;
      let anchor = heading;
      while (cursor && cursor !== nextHeading) {
        if (cursor.tagName === "P") anchor = cursor;
        cursor = cursor.nextElementSibling;
      }
      anchor.parentNode.insertBefore(figure, anchor.nextSibling);
    });
  }

  function init() {
    const root = document.getElementById("previewRoot");
    if (!root) return;

    let busy = false;
    const observer = new MutationObserver(() => {
      if (busy) return;
      busy = true;
      observer.takeRecords();
      mapPreviewImages();
      busy = false;
    });

    observer.observe(root, { childList: true, subtree: true });
    mapPreviewImages();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
