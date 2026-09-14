/* JAZIEL ADMIN — Preview section/image order fix
   UI-only helper. Article Schema v1 remains unchanged.
   Preview order is deterministic: Cover → Intro → Section 1 + Body 1 …
   Section 6 + Body 6 → Bible Verse → Closing. */
(() => {
  "use strict";

  function bodyImageNumber(figure) {
    const img = figure?.querySelector?.("img");
    const src = String(img?.getAttribute("src") || "");
    const match = src.match(/body-(\d+)(?:\.[a-z0-9]+)?(?:[?#].*)?$/i);
    return match ? Number(match[1]) : null;
  }

  function reorderPreviewImages() {
    const root = document.getElementById("previewRoot");
    if (!root) return false;

    const headings = [...root.querySelectorAll("h2")];
    const figures = [...root.querySelectorAll("figure.article-figure")];
    if (!headings.length || !figures.length) return false;

    // The editor may render figures in an unexpected order after Load Draft.
    // Use the repository filename suffix (body-1 … body-6) as the stable
    // identity, then place each image immediately after its matching section.
    const ordered = figures
      .map((figure, originalIndex) => ({
        figure,
        number: bodyImageNumber(figure),
        originalIndex
      }))
      .sort((a, b) => {
        const an = a.number ?? Number.MAX_SAFE_INTEGER;
        const bn = b.number ?? Number.MAX_SAFE_INTEGER;
        return an - bn || a.originalIndex - b.originalIndex;
      });

    ordered.forEach(({ figure }) => figure.remove());

    ordered.forEach(({ figure, number }, index) => {
      const targetNumber = number || index + 1;
      const nextHeading = headings[targetNumber];

      if (nextHeading?.parentNode) {
        nextHeading.parentNode.insertBefore(figure, nextHeading);
        return;
      }

      // Body 6 belongs after Section 6 and before the Bible Verse/Closing.
      const anchor = root.querySelector(
        ".verse-block, .article-closing, .tag-list, .article-tags, .tags"
      );
      if (anchor?.parentNode) anchor.parentNode.insertBefore(figure, anchor);
      else root.appendChild(figure);
    });

    return true;
  }

  function schedulePreviewOrderFix() {
    // Preview rendering can finish asynchronously after the click handler.
    // A bounded set of animation-frame attempts catches the completed render
    // without leaving an observer or interval running in the Admin Panel.
    let attempts = 0;
    const tryFix = () => {
      attempts += 1;
      if (reorderPreviewImages() || attempts >= 10) return;
      requestAnimationFrame(tryFix);
    };
    requestAnimationFrame(tryFix);
  }

  document.addEventListener("click", event => {
    if (event.target?.closest?.("#btnPreview")) schedulePreviewOrderFix();
  }, true);
})();
