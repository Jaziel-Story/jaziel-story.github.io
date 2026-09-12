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

  function init() {
    styles();
    apply();
    document.addEventListener("click", () => setTimeout(apply, 0), true);
    document.addEventListener("change", () => setTimeout(apply, 0), true);
    const observer = new MutationObserver(() => apply());
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(apply, 500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})();
