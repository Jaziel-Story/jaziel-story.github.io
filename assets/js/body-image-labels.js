/* =========================================================
   JAZIEL ADMIN — Body Image Numbering
   Visual labels only. Article Schema v1 remains unchanged.
   ========================================================= */

(() => {
  "use strict";

  function labelBodyImages() {
    const list = document.querySelector("#bodyImagesList");
    if (!list) return;

    [...list.querySelectorAll(":scope > .repeat-item")].forEach((item, index) => {
      let marker = item.querySelector(":scope > .body-image-marker");
      if (!marker) {
        marker = document.createElement("div");
        marker.className = "body-image-marker";
        marker.setAttribute("aria-hidden", "true");
        item.prepend(marker);
      }
      marker.textContent = `Image ${index + 1}`;

      let hint = item.querySelector(":scope > .body-image-flow-hint");
      if (!hint) {
        hint = document.createElement("p");
        hint.className = "body-image-flow-hint";
        item.insertBefore(hint, item.querySelector(".field") || null);
      }
      hint.textContent = `Displayed after Section ${index + 1}`;
    });
  }

  function init() {
    labelBodyImages();
    const list = document.querySelector("#bodyImagesList");
    if (list) {
      new MutationObserver(labelBodyImages).observe(list, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
