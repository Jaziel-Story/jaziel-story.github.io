/* =========================================================
   JAZIEL — Main JavaScript
   Shared across every page. Reads all article data from
   articles.json (root of the repo) — no backend required.
   ========================================================= */

const ARTICLES_URL = "articles.json";
let articlesCache = null;

document.addEventListener("DOMContentLoaded", () => {
  setupSearchButton();

  const page = document.body.dataset.page;

  if (page === "home") initHomePage();
  else if (page === "article") initArticlePage();
});

/* =========================================================
   Data loading
   ========================================================= */

async function getArticles() {
  if (articlesCache) return articlesCache;

  const response = await fetch(ARTICLES_URL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Could not load articles.json (${response.status})`);
  }

  const data = await response.json();
  articlesCache = Array.isArray(data.articles) ? data.articles : [];
  return articlesCache;
}

/* =========================================================
   Home page
   ========================================================= */

async function initHomePage() {
  const featuredCard = document.querySelector(".featured-card");
  const latestList = document.querySelector(".story-list");
  const popularList = document.querySelector(".popular-list");

  try {
    const articles = await getArticles();

    if (!articles.length) {
      hideElement(featuredCard);
      renderMessage(latestList, "No stories yet. Check back soon.");
      renderMessage(popularList, "");
      return;
    }

    const sortedByDate = sortByDateDesc(articles);
    const featured = articles.find(a => a.featured) || sortedByDate[0];

    renderFeatured(featuredCard, featured);
    renderStoryList(latestList, sortedByDate);
    renderPopularList(popularList, rankArticles(articles));
  } catch (error) {
    console.warn("Jaziel:", error);
    hideElement(featuredCard);
    renderMessage(latestList, "Stories couldn't be loaded right now. Please try again later.");
    renderMessage(popularList, "");
  }
}

function sortByDateDesc(articles) {
  return [...articles].sort(
    (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
  );
}

function rankArticles(articles) {
  return [...articles]
    .sort(
      (a, b) =>
        (b.views || 0) - (a.views || 0) ||
        new Date(b.date || 0) - new Date(a.date || 0)
    )
    .slice(0, 5);
}

function renderFeatured(card, article) {
  if (!card || !article) return;

  const category = card.querySelector(".story-category");
  const title = card.querySelector("h2");
  const description = card.querySelector("p");
  const meta = card.querySelector(".story-meta");
  const image = card.querySelector(".featured-image");

  if (category) category.textContent = article.category || "Featured Story";
  if (title) title.textContent = article.title || "";
  if (description) {
    description.textContent = article.description || article.dek || "";
  }

  if (meta) {
    meta.textContent = [article.readTime, formatDate(article.date)]
      .filter(Boolean)
      .join(" · ");
  }

  if (image && article.cover) {
    image.style.backgroundImage = `url('${article.cover}')`;
    image.style.backgroundSize = "cover";
    image.style.backgroundPosition = "center";
  }

  card.href = articleUrl(article);
}

/* =========================================================
   Shared story list / card rendering
   (used by home and related stories)
   ========================================================= */

function renderStoryList(container, articles, emptyMessage = "No stories to show yet.") {
  if (!container) return;

  if (!articles.length) {
    renderMessage(container, emptyMessage);
    return;
  }

  container.innerHTML = articles.map(storyCardHTML).join("");
}

function storyCardHTML(article) {
  const hasCover = Boolean(article.cover);

  return `
    <a class="story-card" href="${escapeAttribute(articleUrl(article))}">
      <div
        class="story-thumb"
        ${hasCover ? `style="background-image:url('${escapeAttribute(article.cover)}');background-size:cover;background-position:center"` : ""}
        aria-hidden="true">
      </div>

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

function renderPopularList(list, articles) {
  if (!list) return;

  if (!articles.length) {
    renderMessage(list, "");
    return;
  }

  list.innerHTML = articles
    .map(
      article => `
    <li class="popular-item">
      <a href="${escapeAttribute(articleUrl(article))}">
        <h3>${escapeHTML(article.title || "")}</h3>
        <div class="story-meta">
          ${escapeHTML(article.category || "Trending")} · ${escapeHTML(article.readTime || "")}
        </div>
      </a>
    </li>
  `
    )
    .join("");
}

function renderMessage(container, message) {
  if (!container) return;
  container.innerHTML = message
    ? `<p class="empty-state">${escapeHTML(message)}</p>`
    : "";
}

function hideElement(el) {
  if (el) el.style.display = "none";
}

/* =========================================================
   Article page
   ========================================================= */

async function initArticlePage() {
  const root = document.getElementById("article-root");
  const relatedSection = document.getElementById("related-section");
  const relatedList = document.getElementById("related-list");
  const slug = getQueryParam("slug");

  try {
    const articles = await getArticles();
    const article = slug ? articles.find(a => a.slug === slug) : null;

    if (!article) {
      renderNotFound(root);
      document.title = "Story Not Found | Jaziel";
      return;
    }

    renderArticle(root, article);
    updateArticleMeta(article);

  } catch (error) {
    console.warn("Jaziel:", error);
    renderErrorState(root);
  }
}

function renderNotFound(root) {
  if (!root) return;
  root.innerHTML = `
    <div class="not-found">
      <p class="story-category">404</p>
      <h1>Story Not Found</h1>
      <p>We couldn't find the story you're looking for. It may have been moved, renamed, or doesn't exist yet.</p>
      <a class="back-link" href="index.html">← Back to homepage</a>
    </div>
  `;
}

function renderErrorState(root) {
  if (!root) return;
  root.innerHTML = `
    <div class="not-found">
      <h1>Something went wrong</h1>
      <p>This story couldn't be loaded right now. Please try again later.</p>
      <a class="back-link" href="index.html">← Back to homepage</a>
    </div>
  `;
}

function renderArticle(root, article) {
  if (!root) return;

  const meta = [article.readTime, formatDate(article.date)]
    .filter(Boolean)
    .join(" · ");
  const dek = article.dek || article.description || "";

  const coverHTML = article.cover
    ? `<div class="article-cover"><img src="${escapeAttribute(article.cover)}" alt="${escapeAttribute(article.title || "")}" loading="lazy" decoding="async"></div>`
    : "";

  const sectionsHTML = Array.isArray(article.sections)
    ? article.sections
        .map(
          section => `
        ${section.heading ? `<h2>${escapeHTML(section.heading)}</h2>` : ""}
        ${(section.paragraphs || []).map(p => `<p>${escapeHTML(p)}</p>`).join("")}
      `
        )
        .join("")
    : "";

  const imagesHTML =
    Array.isArray(article.images) && article.images.length
      ? article.images.map(articleImageHTML).join("")
      : "";

  const verseHTML = renderBibleVerse(article.bibleVerse);

  const tagsHTML =
    Array.isArray(article.tags) && article.tags.length
      ? `<div class="tag-list">${article.tags
          .map(
            tag =>
              `<a class="tag-chip" href="${escapeAttribute(searchUrl(tag))}">#${escapeHTML(tag)}</a>`
          )
          .join("")}</div>`
      : "";

  root.innerHTML = `
    <article class="article">
      <p class="back-link"><a href="index.html">← Back to Jaziel</a></p>
      ${article.category ? `<a class="story-category" href="${escapeAttribute(categoryUrl(article.category))}">${escapeHTML(article.category)}</a>` : ""}
      <h1 class="article-title">${escapeHTML(article.title || "")}</h1>
      ${dek ? `<p class="article-dek">${escapeHTML(dek)}</p>` : ""}
      <div class="story-meta">${escapeHTML(meta)}</div>
      ${coverHTML}
      <div class="article-body">
        ${article.intro ? `<p>${escapeHTML(article.intro)}</p>` : ""}
        ${sectionsHTML}
        ${imagesHTML}
        ${verseHTML}
        ${article.closing ? `<p class="article-closing">${escapeHTML(article.closing)}</p>` : ""}
      </div>
      ${tagsHTML}
    </article>
  `;
}

function articleImageHTML(image) {
  const src = typeof image === "string" ? image : image && image.src;
  if (!src) return "";

  const alt = typeof image === "object" && image.alt ? image.alt : "";
  const caption = typeof image === "object" && image.caption ? image.caption : "";

  return `
    <figure class="article-figure">
      <img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" loading="lazy" decoding="async">
      ${caption ? `<figcaption>${escapeHTML(caption)}</figcaption>` : ""}
    </figure>
  `;
}

function renderBibleVerse(verse) {
  if (!verse) return "";

  if (typeof verse === "string") {
    return `<blockquote class="verse-block">${escapeHTML(verse)}</blockquote>`;
  }

  const text = verse.text || "";
  const reference = verse.reference || "";
  if (!text) return "";

  return `
    <blockquote class="verse-block">
      <p>${escapeHTML(text)}</p>
      ${reference ? `<cite>${escapeHTML(reference)}</cite>` : ""}
    </blockquote>
  `;
}

function updateArticleMeta(article) {
  const title =
    (article.seo && article.seo.title) || `${article.title || "Story"} | Jaziel`;
  const description =
    (article.seo && article.seo.description) ||
    article.dek ||
    article.description ||
    "";
  const ogTitle = (article.og && article.og.title) || article.title || "";
  const ogDescription = (article.og && article.og.description) || description;
  const ogImage = (article.og && article.og.image) || article.cover || "";
  const url = `${window.location.origin}/articles/${encodeURIComponent(article.slug || "")}.html`;

  document.title = title;
  setMeta('meta[name="description"]', "content", description);
  setMeta('link[rel="canonical"]', "href", url);
  setMeta('meta[property="og:title"]', "content", ogTitle);
  setMeta('meta[property="og:description"]', "content", ogDescription);
  setMeta('meta[property="og:image"]', "content", ogImage);
  setMeta('meta[property="og:url"]', "content", url);
  setMeta('meta[name="twitter:title"]', "content", ogTitle);
  setMeta('meta[name="twitter:description"]', "content", ogDescription);
  setMeta('meta[name="twitter:image"]', "content", ogImage);
}

function setMeta(selector, attr, value) {
  const el = document.querySelector(selector);
  if (el && value) el.setAttribute(attr, value);
}

/* =========================================================
   Search/category page ownership
   =========================================================
   Search and Category are intentionally initialized only by
   search-category-fix.js. Keeping their legacy implementations
   out of the DOMContentLoaded path prevents duplicate fetches,
   listeners, and competing renders without changing the page UI.
   ========================================================= */

/* =========================================================
   Search button (header, all pages)
   ========================================================= */

function setupSearchButton() {
  const button = document.querySelector(".icon-button");
  if (!button) return;

  button.addEventListener("click", () => {
    const query = window.prompt("Search Jaziel");

    if (!query || !query.trim()) return;

    window.location.href = searchUrl(query.trim());
  });
}

/* =========================================================
   Helpers
   ========================================================= */

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function articleUrl(article) {
  if (!article || !article.slug) return "#";
  return `articles/${encodeURIComponent(article.slug)}.html`;
}

function categoryUrl(category) {
  return `category.html?category=${encodeURIComponent(category)}`;
}

function searchUrl(query) {
  return `search.html?q=${encodeURIComponent(query)}`;
}

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}
