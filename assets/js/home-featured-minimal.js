/* =========================================================
   JAZIEL — Home Featured Card: Minimal Overlay
   Homepage only: show category + title on featured image.
   Article Schema v1 remains unchanged.
   ========================================================= */

(() => {
  "use strict";

  function applyMobileLayoutFix() {
    if (document.getElementById("jaziel-mobile-layout-fix")) return;
    const style = document.createElement("style");
    style.id = "jaziel-mobile-layout-fix";
    style.textContent = "@media (max-width:759px){html,body{max-width:100%;overflow-x:hidden}.container{width:calc(100% - 44px);max-width:100%;min-width:0;margin-left:auto;margin-right:auto}.featured-card{width:100%;max-width:100%;min-width:0;margin-left:0;margin-right:0}.featured-image,.featured-overlay{width:100%;max-width:100%}.featured-content{width:100%;min-width:0;padding:20px}.featured-content h2{max-width:88%;overflow-wrap:anywhere}}";
    document.head.appendChild(style);
  }

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
    applyMobileLayoutFix();
    applyMinimalFeatured();

    const card = document.querySelector(".featured-card");
    if (card) {
      const observer = new MutationObserver(applyMinimalFeatured);
      observer.observe(card, { childList: true, subtree: true, characterData: true });
    }
  });
})();
