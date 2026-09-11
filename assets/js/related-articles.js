/* =========================================================
   JAZIEL — Related Articles
   Relevance-based related story ranking.
   Article Schema v1 remains unchanged.
   ========================================================= */

(() => {
  const isStaticArticle = /\/articles\/[^/]+\.html$/i.test(window.location.pathname);
  const ARTICLES_URL = isStaticArticle ? "../articles.json" : "articles.json";
  const LIMIT = 3;

  document.addEventListener("DOMContentLoaded", initRelatedArticles);

  async function initRelatedArticles() {
    try {
      const articles = await loadArticles();
      const current = getCurrentArticle(articles);
      if (!current) return;

      const related = findRelatedArticles(articles, current, LIMIT);
      if (!related.length) return;

      const section = getOrCreateSection();
      const list = section.querySelector("#related-list");
      if (!list) return;

      list.innerHTML = related.map(storyCardHTML).join("");
      section.hidden = false;
    } catch (error) {
      console.warn("Jaziel related articles:", error);
    }
  }

  async function loadArticles() {
    const response = await fetch(ARTICLES_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load articles.json (${response.status})`);
    const data = await response.json();
    return Array.isArray(data.articles) ? data.articles : [];
  }

  function getCurrentArticle(articles) {
    const staticMatch = window.location.pathname.match(/\/articles\/([^/]+)\.html$/i);
    const slug = staticMatch
      ? decodeURIComponent(staticMatch[1])
      : new URLSearchParams(window.location.search).get("slug");

    return slug ? articles.find(article => article && article.slug === slug) : null;
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function normalizeList(value) {
    return Array.isArray(value)
      ? value.map(normalize).filter(Boolean)
      : [];
  }

  function articleText(article) {
    const sections = Array.isArray(article.sections) ? article.sections : [];
    return normalize([
      article.title,
      article.description,
      article.dek,
      article.intro,
      article.closing,
      ...sections.flatMap(section => [section?.heading, ...(section?.paragraphs || [])])
    ].join(" "));
  }

  function tokens(text) {
    return new Set(
      normalize(text)
        .split(/[^\p{L}\p{N}]+/u)
        .filter(token => token.length >= 3)
    );
  }

  function overlap(a, b) {
    let count = 0;
    for (const value of a) if (b.has(value)) count += 1;
    return count;
  }

  function findRelatedArticles(articles, current, limit) {
    const currentCategory = normalize(current.category);
    const currentTags = new Set(normalizeList(current.tags));
    const currentTokens = tokens(articleText(current));

    const scored = articles
      .filter(article => article && article.slug && article.slug !== current.slug)
      .map(article => {
        const category = normalize(article.category);
        const tags = new Set(normalizeList(article.tags));
        const textTokens = tokens(articleText(article));

        const sharedTags = overlap(currentTags, tags);
        const sharedWords = overlap(currentTokens, textTokens);

        let score = 0;

        // Strongest signal: explicit category match.
        if (currentCategory && category === currentCategory) score += 5;

        // Tags are highly intentional metadata.
        score += Math.min(sharedTags, 5) * 3;

        // Content similarity helps when tags are sparse.
        score += Math.min(sharedWords, 8) * 0.5;

        // A small title/description signal helps break ties naturally.
        const currentTitle = tokens(current.title);
        const candidateTitle = tokens(article.title);
        const titleOverlap = overlap(currentTitle, candidateTitle);
        score += Math.min(titleOverlap, 4) * 1.5;

        return {
          article,
          score,
          sharedTags,
          sharedWords,
          titleOverlap
        };
      })
      .filter(entry => entry.score > 0)
      .sort((a, b) =>
        b.score - a.score ||
        b.sharedTags - a.sharedTags ||
        b.sharedWords - a.sharedWords ||
        b.titleOverlap - a.titleOverlap ||
        new Date(b.article.date || 0) - new Date(a.article.date || 0)
      );

    return scored.slice(0, limit).map(entry => entry.article);
  }

  function getOrCreateSection() {
    let section = document.getElementById("related-section");
    if (section) return section;

    section = document.createElement("section");
    section.id = "related-section";
    section.hidden = true;
    section.innerHTML = `
      <div class="section-title">
        <h2>Related Stories</h2>
      </div>
      <div class="story-list" id="related-list"></div>
    `;

    const article = document.querySelector("main .article");
    if (article && article.parentElement) {
      article.parentElement.insertAdjacentElement("afterend", section);
    }

    return section;
  }

  function storyCardHTML(article) {
    const cover = article.cover
      ? `style="background-image:url('${escapeAttribute(article.cover)}');background-size:cover;background-position:center"`
      : "";
    const href = isStaticArticle
      ? `${encodeURIComponent(article.slug)}.html`
      : `articles/${encodeURIComponent(article.slug)}.html`;

    return `
      <a class="story-card" href="${escapeAttribute(href)}">
        <div class="story-thumb" ${cover} aria-hidden="true"></div>
        <div>
          <div class="story-category">${escapeHTML(article.category || "Story")}</div>
          <h3>${escapeHTML(article.title || "")}</h3>
          <p class="story-excerpt">${escapeHTML(article.description || article.dek || "")}</p>
          <div class="story-meta">
            ${escapeHTML(article.readTime || "")}${article.date ? ` · ${escapeHTML(formatDate(article.date))}` : ""}
          </div>
        </div>
      </a>
    `;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || "");
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(date);
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHTML(value);
  }
})();
