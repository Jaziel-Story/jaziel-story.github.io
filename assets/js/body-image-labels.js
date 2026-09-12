/* =========================================================
   JAZIEL ADMIN — Body Image Numbering
   Visual labels only. Article Schema v1 remains unchanged.
   ========================================================= */

(() => {
  "use strict";

  function addStyles() {
    if (document.getElementById("bodyImageMarkerStyles")) return;
    const style = document.createElement("style");
    style.id = "bodyImageMarkerStyles";
    style.textContent = `
      .body-image-marker {
        display:inline-flex;
        align-items:center;
        margin:-2px 0 10px;
        padding:5px 10px;
        border-radius:999px;
        background:var(--text);
        color:var(--surface);
        font-size:.78rem;
        font-weight:700;
        letter-spacing:.02em;
      }
      .body-image-flow-hint {
        margin:-4px 0 12px;
        color:var(--muted);
        font-size:.76rem;
      }
    `;
    document.head.appendChild(style);
  }

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
    addStyles();
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
