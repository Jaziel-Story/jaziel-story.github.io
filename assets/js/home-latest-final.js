/* JAZIEL — final homepage latest-story authority */
(() => {
  "use strict";

  const DATA_URL = `${window.location.origin}/articles.json?homepageFinal=${Date.now()}`;

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function url(article) {
    return `articles/${encodeURIComponent(article.slug || "")}.html`;
  }

  function newest(articles) {
    return articles
      .map((article, index) => ({ article, index }))
      .sort((a, b) => {
        const at = new Date(a.article.updatedAt || a.article.updated || a.article.date || 0).getTime();
        const bt = new Date(b.article.updatedAt || b.article.updated || b.article.date || 0).getTime();
        return bt - at || b.index - a.index;
      })
      .map(item => item.article);
  }

  function render(articles) {
    const sorted = newest(articles);
    const latest = sorted[0];
    if (!latest) return;

    const card = document.querySelector(".featured-card");
    const list = document.querySelector(".story-list");
    const popular = document.querySelector(".popular-list");

    if (card) {
      card.href = url(latest);
      const category = card.querySelector(".story-category");
      const title = card.querySelector("h2");
      const description = card.querySelector("p");
      const meta = card.querySelector(".story-meta");
      const image = card.querySelector(".featured-image");
      if (category) category.textContent = latest.category || "Latest Story";
      if (title) title.textContent = latest.title || "";
      if (description) description.textContent = latest.description || latest.dek || "";
      if (meta) meta.textContent = [latest.readTime, latest.date].filter(Boolean).join(" · ");
      if (image && latest.cover) image.style.backgroundImage = `url('${String(latest.cover).replace(/'/g, "\\'")}')`;
    }

    if (list) {
      list.innerHTML = sorted.map(article => `
        <a class="story-card" href="${esc(url(article))}">
          <div class="story-thumb" style="${article.cover ? `background-image:url('${esc(article.cover)}');background-size:cover;background-position:center` : ""}" aria-hidden="true"></div>
          <div>
            <div class="story-category">${esc(article.category || "Story")}</div>
            <h3>${esc(article.title || "")}</h3>
            <p class="story-excerpt">${esc(article.description || article.dek || "")}</p>
            <div class="story-meta">${esc(article.readTime || "")}${article.date ? ` · ${esc(article.date)}` : ""}</div>
          </div>
        </a>
      `).join("");
    }

    if (popular) {
      popular.innerHTML = sorted.slice(0, 5).map(article => `
        <li class="popular-item"><a href="${esc(url(article))}"><h3>${esc(article.title || "")}</h3><div class="story-meta">${esc(article.category || "Trending")} · ${esc(article.readTime || "")}</div></a></li>
      `).join("");
    }
  }

  fetch(DATA_URL, { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error(`articles.json HTTP ${response.status}`);
      return response.json();
    })
    .then(data => render(Array.isArray(data.articles) ? data.articles : []))
    .catch(error => console.error("Jaziel final homepage loader:", error));
})();
