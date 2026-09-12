/* =========================================================
   JAZIEL — Home Featured Card: Minimal Overlay
   Homepage only: show category + title on featured image.
   Article Schema v1 remains unchanged.
   ========================================================= */

(() => {
  "use strict";

  function applyMinimalFeatured() {
    const card = document.querySelector(".featured-card");
    if (!card) return;

    const description = card.querySelector(".featured-content > p");
    const meta = card.querySelector(".featured-content > .story-meta");
    const title = card.querySelector(".featured-content > h2");

    if (description) description.hidden = true;
    if (meta) meta.hidden = true;

    if (title) {
      title.style.fontSize = "clamp(1.25rem, 4vw, 2.2rem)";
      title.style.lineHeight = "1.12";
      title.style.maxWidth = "90%";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyMinimalFeatured();

    const card = document.querySelector(".featured-card");
    if (card) {
      const observer = new MutationObserver(applyMinimalFeatured);
      observer.observe(card, { childList: true, subtree: true, characterData: true });
    }
  });
})();
