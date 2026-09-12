/* JAZIEL ADMIN — Preview section/image order fix
   UI-only helper. Article Schema v1 remains unchanged.
   Runs once after the user opens Preview; no MutationObserver. */
(() => {
  "use strict";

  function reorderPreviewImages() {
    const root = document.getElementById("previewRoot");
    if (!root) return;

    const headings = [...root.querySelectorAll("h2")];
    const figures = [...root.querySelectorAll("figure.article-figure")];
    if (!headings.length || !figures.length) return;

    figures.forEach(figure => figure.remove());

    figures.forEach((figure, index) => {
      const nextHeading = headings[index + 1];
      if (nextHeading) {
        nextHeading.parentNode.insertBefore(figure, nextHeading);
        return;
      }

      const tags = root.querySelector(".article-tags, .tags");
      if (tags && tags.parentNode) {
        tags.parentNode.insertBefore(figure, tags);
      } else {
        root.appendChild(figure);
      }
    });
  }

  document.addEventListener("click", event => {
    const trigger = event.target.closest?.("button, a");
    if (!trigger) return;

    const label = (trigger.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (!label.includes("preview")) return;

    setTimeout(reorderPreviewImages, 0);
  }, true);
})();
