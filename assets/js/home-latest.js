/* =========================================================
   JAZIEL — Homepage Latest Story
   Keeps the homepage featured story tied to the newest article.
   Article Schema v1 remains unchanged.
   ========================================================= */

(() => {
  "use strict";

  const ARTICLES_URL = "articles.json";

  function sortNewestFirst(articles) {
    return articles
      .map((article, index) => ({ article, index }))
      .sort((a, b) => {
        const dateDiff = new Date(b.article.date || 0) - new Date(a.article.date || 0);
        return dateDiff || b.index - a.index;
      })
      .map(entry => entry.article);
  }

  function articleUrl(article) {
    return `articles/${encodeURIComponent(article.slug || "")}.html`;
  }

  function applyLatest(article) {
    const card = document.querySelector(".featured-card");
    if (!card || !article) return;

    const category = card.querySelector(".story-category");
    const title = card.querySelector("h2");
    const description = card.querySelector("p");
    const meta = card.querySelector(".story-meta");
    const image = card.querySelector(".featured-image");

    if (category) category.textContent = article.category || "Latest Story";
    if (title) title.textContent = article.title || "";
    if (description) description.textContent = article.description || article.dek || "";
    if (meta) meta.textContent = [article.readTime, article.date].filter(Boolean).join(" · ");
    if (image && article.cover) {
      image.style.backgroundImage = `url('${article.cover.replace(/'/g, "\\'")}')`;
      image.style.backgroundSize = "cover";
      image.style.backgroundPosition = "center";
    }
    card.href = articleUrl(article);
  }

  async function init() {
    try {
      const response = await fetch(`${ARTICLES_URL}?homeLatest=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const articles = Array.isArray(data.articles) ? data.articles : [];
      const latest = sortNewestFirst(articles)[0];
      if (!latest) return;

      // Main.js may render its own featured choice. Re-apply the newest article
      // whenever Main.js changes the featured card content.
      const card = document.querySelector(".featured-card");
      if (card) {
        const observer = new MutationObserver(() => applyLatest(latest));
        observer.observe(card, { childList: true, subtree: true, characterData: true });
      }
      applyLatest(latest);
    } catch (error) {
      console.warn("Jaziel latest homepage story:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
