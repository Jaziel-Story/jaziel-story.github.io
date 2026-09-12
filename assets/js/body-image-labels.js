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
        display:flex;
        align-items:center;
        margin:0 0 8px;
        padding:7px 10px;
        border-radius:9px;
        background:var(--text);
        color:var(--surface);
        font-size:.82rem;
        font-weight:700;
        letter-spacing:.01em;
      }
      .body-image-flow-hint {
        margin:-2px 0 10px;
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
        item.prepend(marker);
      }
      marker.textContent = `Body Image ${index + 1}`;

      let hint = item.querySelector(":scope > .body-image-flow-hint");
      if (!hint) {
        hint = document.createElement("p");
        hint.className = "body-image-flow-hint";
        item.insertBefore(hint, item.querySelector(".field") || null);
      }
      hint.textContent = `Displayed after Heading ${index + 1}`;
    });
  }

  function watchList(list) {
    if (!list || list.dataset.bodyImageLabelsBound === "1") return;
    list.dataset.bodyImageLabelsBound = "1";
    labelBodyImages();
    new MutationObserver(labelBodyImages).observe(list, { childList: true, subtree: true });
  }

  function scan() {
    addStyles();
    const list = document.querySelector("#bodyImagesList");
    if (list) watchList(list);
  }

  function init() {
    scan();
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
