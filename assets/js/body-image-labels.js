/* JAZIEL ADMIN — Body Image Labels
   Visual-only helper. Article Schema v1 is unchanged. */
(() => {
  "use strict";

  function styles() {
    if (document.getElementById("bodyImageMarkerStyles")) return;
    const s = document.createElement("style");
    s.id = "bodyImageMarkerStyles";
    s.textContent = `
      .body-image-marker{display:flex;align-items:center;margin:0 0 8px;padding:8px 10px;border-radius:9px;background:var(--text,#111);color:var(--surface,#fff);font-size:.82rem;font-weight:700;letter-spacing:.01em}
      .body-image-flow-hint{margin:-2px 0 10px;color:var(--muted,#777);font-size:.76rem}
    `;
    document.head.appendChild(s);
  }

  function apply() {
    const list = document.getElementById("bodyImagesList");
    if (!list) return false;
    [...list.children].filter(el => el.classList && el.classList.contains("repeat-item")).forEach((item, i) => {
      let marker = item.querySelector(":scope > .body-image-marker");
      if (!marker) {
        marker = document.createElement("div");
        marker.className = "body-image-marker";
        item.prepend(marker);
      }
      marker.textContent = `Body Image ${i + 1}`;

      let hint = item.querySelector(":scope > .body-image-flow-hint");
      if (!hint) {
        hint = document.createElement("p");
        hint.className = "body-image-flow-hint";
        const field = item.querySelector(":scope > .field");
        if (field) item.insertBefore(hint, field); else item.appendChild(hint);
      }
      hint.textContent = `Displayed after Heading ${i + 1}`;
    });
    return true;
  }

  function scheduleApply() {
    setTimeout(apply, 0);
  }

  function init() {
    styles();
    apply();
    // renderBodyImages() rebuilds the list after Add Image/remove. Refresh
    // after relevant UI events instead of observing the entire document.
    document.addEventListener("click", e => {
      if (e.target.closest?.("#btnAddImage, [data-remove-image]")) scheduleApply();
    }, true);
    document.addEventListener("change", e => {
      if (e.target.matches?.("[data-image-file]")) scheduleApply();
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})();
