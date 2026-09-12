/* JAZIEL ADMIN — Preview section/image order fix
   UI-only helper. Article Schema v1 remains unchanged.
   Runs only for the Preview button; no persistent MutationObserver. */
(() => {
  "use strict";

  function reorderPreviewImages() {
    const root = document.getElementById("previewRoot");
    if (!root) return false;

    const headings = [...root.querySelectorAll("h2")];
    const figures = [...root.querySelectorAll("figure.article-figure")];
    if (!headings.length || !figures.length) return false;

    figures.forEach(figure => figure.remove());

    figures.forEach((figure, index) => {
      const nextHeading = headings[index + 1];
      if (nextHeading?.parentNode) {
        nextHeading.parentNode.insertBefore(figure, nextHeading);
        return;
      }

      const tags = root.querySelector(".article-tags, .tags");
      if (tags?.parentNode) tags.parentNode.insertBefore(figure, tags);
      else root.appendChild(figure);
    });

    return true;
  }

  function schedulePreviewOrderFix() {
    // Preview rendering can finish asynchronously after the click handler.
    // A few animation-frame attempts are enough to catch that render without
    // leaving an observer or interval running in the Admin Panel.
    let attempts = 0;
    const tryFix = () => {
      attempts += 1;
      if (reorderPreviewImages() || attempts >= 6) return;
      requestAnimationFrame(tryFix);
    };
    requestAnimationFrame(tryFix);
  }

  document.addEventListener("click", event => {
    if (event.target?.closest?.("#btnPreview")) schedulePreviewOrderFix();
  }, true);
})();
